import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { z } from "zod";

import {
  loadRunConfig,
  resolveConfiguredVerificationGates,
  resolveRunTimeouts,
} from "./config-schema";
import { resolveVerificationGates } from "./gate-discovery";
import { pathExists, readTextFile } from "./fs-utils";
import { resolveProviderCwd } from "./git-repo";
import { assemblePrompt, PromptInsertError } from "./prompt-assembly";
import {
  createProviderAdapter,
  type ProviderLifecycleEvent,
  type ProviderName,
} from "./provider-adapters";
import type { ProviderStreamOutputPaths } from "./provider-adapters";
import {
  RuntimeProgressTracker,
  type RuntimeProgressPaths,
} from "./runtime-progress";
import {
  providerIdSchema,
  priorFindingStatusSchema,
  verifierFindingSchema,
  storyVerifierResultSchema,
  type CliError,
  type StoryVerifierResult,
} from "./result-contracts";
import { inspectSpecPack } from "./spec-pack";

const verifierRequirementCoverageSchema = z
  .object({
    verified: z.array(z.string().min(1)),
    unverified: z.array(z.string().min(1)),
  })
  .strict();

const verifierGateRunSchema = z
  .object({
    command: z.string().min(1),
    result: z.enum(["pass", "fail", "not-run"]),
  })
  .strict();

export const storyVerifierProviderPayloadSchema = z
  .object({
    artifactsRead: z.array(z.string().min(1)).min(1),
    reviewScopeSummary: z.string().min(1),
    priorFindingStatuses: z.array(priorFindingStatusSchema),
    newFindings: z.array(verifierFindingSchema),
    openFindings: z.array(verifierFindingSchema),
    requirementCoverage: verifierRequirementCoverageSchema,
    gatesRun: z.array(verifierGateRunSchema),
    mockOrShimAuditFindings: z.array(z.string()),
    recommendedNextStep: z.enum([
      "pass",
      "revise",
      "block",
      "needs-human-ruling",
    ]),
    recommendedFixScope: z.enum([
      "same-session-implementor",
      "quick-fix",
      "fresh-fix-path",
      "human-ruling",
    ]),
    openQuestions: z.array(z.string()),
    additionalObservations: z.array(z.string()),
  })
  .strict();

type ProviderPayload = typeof storyVerifierProviderPayloadSchema._output;

interface PreparedStoryContext {
  specPackRoot: string;
  story: {
    id: string;
    title: string;
    path: string;
  };
  verifierPromptInsertPath?: string;
  gateCommands: {
    story: string;
    epic: string;
  };
  paths: {
    epicPath: string;
    techDesignPath: string;
    techDesignCompanionPaths: string[];
    testPlanPath: string;
  };
  providerCwd: string;
  verifier: {
    provider: ProviderName;
    model: string;
    reasoningEffort: string;
  };
  timeoutMs: number;
  startupTimeoutMs: number;
  silenceTimeoutMs: number;
}

interface WorkflowFailure {
  outcome: "block";
  errors: CliError[];
}

interface VerifierExecutionSuccess {
  payload: ProviderPayload;
  sessionId: string;
}

interface VerifierExecutionFailure {
  errors: CliError[];
}

interface PriorVerifierContext {
  artifactPath: string;
  result: StoryVerifierResult;
}

export interface StoryVerifyWorkflowResult {
  outcome: "pass" | "revise" | "block" | "needs-human-ruling";
  result?: StoryVerifierResult;
  errors: CliError[];
  warnings: string[];
}

function blockedError(code: string, message: string, detail?: string): CliError {
  return {
    code,
    message,
    ...(detail ? { detail } : {}),
  };
}

function promptInsertFailure(error: unknown): StoryVerifyWorkflowResult | undefined {
  if (!(error instanceof PromptInsertError)) {
    return undefined;
  }

  return {
    outcome: "block",
    errors: [
      blockedError(
        "PROMPT_INSERT_INVALID",
        "Prompt insert assembly failed.",
        error.message
      ),
    ],
    warnings: [],
  };
}

function providerForHarness(harness: "codex" | "copilot" | "none"): ProviderName {
  if (harness === "none") {
    return "claude-code";
  }

  return harness;
}

async function prepareStoryVerifyContext(input: {
  specPackRoot: string;
  storyId: string;
  configPath?: string;
  providerOverride?: ProviderName;
}): Promise<PreparedStoryContext | WorkflowFailure> {
  const inspection = await inspectSpecPack(input.specPackRoot);
  if (inspection.status !== "ready") {
    return {
      outcome: "block",
      errors: [
        blockedError(
          "INVALID_SPEC_PACK",
          "Spec-pack inspection must be ready before story verification can start.",
          inspection.blockers.join("; ") || inspection.notes.join("; ")
        ),
      ],
    };
  }

  const story = inspection.stories.find((candidate) => candidate.id === input.storyId);
  if (!story) {
    return {
      outcome: "block",
      errors: [
        blockedError(
          "INVALID_SPEC_PACK",
          `Story '${input.storyId}' was not found in the resolved story inventory.`
        ),
      ],
    };
  }

  const config = await loadRunConfig({
    specPackRoot: inspection.specPackRoot,
    configPath: input.configPath,
  });
  const gateResolution = await resolveVerificationGates({
    specPackRoot: inspection.specPackRoot,
    persistedVerificationGates: resolveConfiguredVerificationGates(config),
  });
  if (gateResolution.status !== "ready" || !gateResolution.verificationGates) {
    return {
      outcome: "block",
      errors: gateResolution.errors.length
        ? gateResolution.errors
        : [
            blockedError(
              "VERIFICATION_GATE_UNRESOLVED",
              "Verification gates must be resolved before story verification can start."
            ),
          ],
    };
  }

  const configuredProvider = providerForHarness(
    config.story_verifier.secondary_harness
  );
  const verifierProvider = input.providerOverride ?? configuredProvider;

  return {
    specPackRoot: inspection.specPackRoot,
    story: {
      id: story.id,
      title: story.title,
      path: story.path,
    },
    verifierPromptInsertPath:
      inspection.inserts.customStoryVerifierPromptInsert === "present"
        ? join(inspection.specPackRoot, "custom-story-verifier-prompt-insert.md")
        : undefined,
    gateCommands: {
      story: gateResolution.verificationGates.storyGate,
      epic: gateResolution.verificationGates.epicGate,
    },
    paths: {
      epicPath: inspection.artifacts.epicPath,
      techDesignPath: inspection.artifacts.techDesignPath,
      techDesignCompanionPaths: inspection.artifacts.techDesignCompanionPaths,
      testPlanPath: inspection.artifacts.testPlanPath,
    },
    providerCwd: await resolveProviderCwd(inspection.specPackRoot),
    verifier: {
      provider: verifierProvider,
      model: config.story_verifier.model,
      reasoningEffort: config.story_verifier.reasoning_effort,
    },
    timeoutMs: resolveRunTimeouts(config).story_verifier_ms,
    startupTimeoutMs: resolveRunTimeouts(config).provider_startup_timeout_ms,
    silenceTimeoutMs: resolveRunTimeouts(config).story_verifier_silence_timeout_ms,
  };
}

function executionFailureError(input: {
  provider: ProviderName;
  stderr: string;
  errorCode?: string;
}): CliError {
  if (input.errorCode === "CONTINUATION_HANDLE_INVALID") {
    return blockedError(
      "CONTINUATION_HANDLE_INVALID",
      `Continuation handle is invalid for ${input.provider}.`,
      input.stderr
    );
  }

  if (input.errorCode === "INVALID_OUTPUT_SCHEMA") {
    return blockedError(
      "PROVIDER_OUTPUT_INVALID",
      `Provider output schema was invalid for ${input.provider}.`,
      input.stderr
    );
  }

  if (input.errorCode === "PROVIDER_TIMEOUT") {
    return blockedError(
      "PROVIDER_TIMEOUT",
      `Provider execution timed out for ${input.provider}.`,
      input.stderr
    );
  }

  if (input.errorCode === "PROVIDER_STALLED") {
    return blockedError(
      "PROVIDER_STALLED",
      `Provider execution stalled for ${input.provider}.`,
      input.stderr
    );
  }

  if (input.errorCode === "ENOENT") {
    return blockedError(
      "PROVIDER_UNAVAILABLE",
      `Provider executable is unavailable for ${input.provider}.`,
      input.stderr
    );
  }

  return blockedError(
    "PROVIDER_UNAVAILABLE",
    `Provider execution failed for ${input.provider}.`,
    input.stderr
  );
}

async function executeVerifier(input: {
  provider: ProviderName;
  cwd: string;
  model: string;
  reasoningEffort: string;
  prompt: string;
  resumeSessionId?: string;
  env?: Record<string, string | undefined>;
  timeoutMs: number;
  startupTimeoutMs?: number;
  silenceTimeoutMs?: number;
  streamOutputPaths?: ProviderStreamOutputPaths;
  lifecycleCallback?: (event: ProviderLifecycleEvent) => void | Promise<void>;
}): Promise<VerifierExecutionSuccess | VerifierExecutionFailure> {
  const adapter = createProviderAdapter(input.provider, {
    env: input.env,
  });
  const execution = await adapter.execute({
    prompt: input.prompt,
    cwd: input.cwd,
    model: input.model,
    reasoningEffort: input.reasoningEffort,
    resumeSessionId: input.resumeSessionId,
    timeoutMs: input.timeoutMs,
    startupTimeoutMs: input.startupTimeoutMs,
    silenceTimeoutMs: input.silenceTimeoutMs,
    resultSchema: storyVerifierProviderPayloadSchema,
    streamOutputPaths: input.streamOutputPaths,
    lifecycleCallback: input.lifecycleCallback,
  });

  if (execution.exitCode !== 0) {
    return {
      errors: [
        executionFailureError({
          provider: input.provider,
          stderr: execution.stderr,
          errorCode: execution.errorCode,
        }),
      ],
    };
  }

  if (execution.parseError || !execution.parsedResult) {
    return {
      errors: [
        blockedError(
          "PROVIDER_OUTPUT_INVALID",
          `Provider output was invalid for ${input.provider}.`,
          execution.parseError
        ),
      ],
    };
  }

  const sessionId = execution.sessionId ?? input.resumeSessionId;
  if (!sessionId) {
    return {
      errors: [
        blockedError(
          "CONTINUATION_HANDLE_INVALID",
          `Provider '${input.provider}' did not return a session id for the retained story verifier session.`
        ),
      ],
    };
  }

  return {
    payload: execution.parsedResult,
    sessionId,
  };
}

function buildVerifierResult(input: {
  provider: ProviderName;
  model: string;
  sessionId: string;
  mode: "initial" | "followup";
  story: PreparedStoryContext["story"];
  payload: ProviderPayload;
}): StoryVerifierResult {
  return {
    resultId: randomUUID(),
    role: "story_verifier",
    provider: input.provider,
    model: input.model,
    sessionId: input.sessionId,
    continuation: {
      provider: input.provider,
      sessionId: input.sessionId,
      storyId: input.story.id,
    },
    mode: input.mode,
    story: {
      id: input.story.id,
      title: input.story.title,
    },
    artifactsRead: input.payload.artifactsRead,
    reviewScopeSummary: input.payload.reviewScopeSummary,
    priorFindingStatuses: input.payload.priorFindingStatuses,
    newFindings: input.payload.newFindings,
    openFindings: input.payload.openFindings,
    requirementCoverage: input.payload.requirementCoverage,
    gatesRun: input.payload.gatesRun,
    mockOrShimAuditFindings: input.payload.mockOrShimAuditFindings,
    recommendedNextStep: input.payload.recommendedNextStep,
    recommendedFixScope: input.payload.recommendedFixScope,
    openQuestions: input.payload.openQuestions,
    additionalObservations: input.payload.additionalObservations,
  };
}

async function validateVerifierContinuationHandle(input: {
  provider: string;
}): Promise<CliError | null> {
  const provider = providerIdSchema.safeParse(input.provider);
  if (!provider.success) {
    return blockedError(
      "CONTINUATION_HANDLE_INVALID",
      `Provider '${input.provider}' is not a valid continuation provider.`
    );
  }

  if (provider.data === "copilot") {
    return blockedError(
      "CONTINUATION_HANDLE_INVALID",
      "Provider 'copilot' cannot be used for retained story_verifier continuation sessions."
    );
  }

  return null;
}

function buildFollowupResponse(response: string): string {
  return [
    "the story implementor has responded to your feedback",
    "<response>",
    response.trim(),
    "</response>",
  ].join("\n");
}

async function loadPriorVerifierContext(input: {
  specPackRoot: string;
  storyId: string;
  sessionId: string;
}): Promise<PriorVerifierContext | CliError> {
  const artifactDir = join(resolve(input.specPackRoot), "artifacts", input.storyId);
  if (!(await pathExists(artifactDir))) {
    return blockedError(
      "CONTINUATION_HANDLE_INVALID",
      `No prior verifier artifacts exist for story '${input.storyId}'.`
    );
  }

  const entries = await readdir(artifactDir, { withFileTypes: true });
  const verifyFiles = entries
    .filter(
      (entry) => entry.isFile() && /^\d{3}-verify\.json$/.test(entry.name)
    )
    .map((entry) => entry.name)
    .sort()
    .reverse();

  for (const fileName of verifyFiles) {
    const artifactPath = join(artifactDir, fileName);
    try {
      const parsed = JSON.parse(await readTextFile(artifactPath)) as {
        command?: string;
        result?: unknown;
      };
      if (parsed.command !== "story-verify") {
        continue;
      }
      const result = storyVerifierResultSchema.safeParse(parsed.result);
      if (!result.success) {
        continue;
      }
      if (result.data.sessionId !== input.sessionId) {
        continue;
      }
      return {
        artifactPath,
        result: result.data,
      };
    } catch {
      continue;
    }
  }

  return blockedError(
    "CONTINUATION_HANDLE_INVALID",
    `No prior verifier artifact was found for story '${input.storyId}' and session '${input.sessionId}'.`
  );
}

export async function runStoryVerify(input: {
  specPackRoot: string;
  storyId: string;
  provider?: string;
  sessionId?: string;
  response?: string;
  orchestratorContext?: string;
  configPath?: string;
  env?: Record<string, string | undefined>;
  artifactPath?: string;
  streamOutputPaths?: ProviderStreamOutputPaths;
  runtimeProgressPaths?: RuntimeProgressPaths;
}): Promise<StoryVerifyWorkflowResult> {
  const mode =
    typeof input.provider === "string" || typeof input.sessionId === "string"
      ? "followup"
      : "initial";

  if (mode === "followup") {
    const continuationError = await validateVerifierContinuationHandle({
      provider: input.provider ?? "",
    });
    if (continuationError) {
      return {
        outcome: "block",
        errors: [continuationError],
        warnings: [],
      };
    }
  }

  const provider =
    mode === "followup"
      ? providerIdSchema.parse(input.provider)
      : undefined;

  const context = await prepareStoryVerifyContext({
    specPackRoot: input.specPackRoot,
    storyId: input.storyId,
    configPath: input.configPath,
    providerOverride: provider,
  });
  if ("errors" in context) {
    return {
      outcome: "block",
      errors: context.errors,
      warnings: [],
    };
  }

  let priorVerifierContext: PriorVerifierContext | undefined;
  if (mode === "followup") {
    const prior = await loadPriorVerifierContext({
      specPackRoot: input.specPackRoot,
      storyId: input.storyId,
      sessionId: input.sessionId ?? "",
    });
    if ("code" in prior) {
      return {
        outcome: "block",
        errors: [prior],
        warnings: [],
      };
    }
    priorVerifierContext = prior;
  }

  const progressTracker = input.runtimeProgressPaths
    ? await RuntimeProgressTracker.start({
        command: "story-verify",
        phase: mode === "initial" ? "verifier-initial" : "verifier-followup",
        provider: context.verifier.provider,
        cwd: context.providerCwd,
        timeoutMs: context.timeoutMs,
        configuredStartupTimeoutMs: context.startupTimeoutMs,
        configuredSilenceTimeoutMs: context.silenceTimeoutMs,
        artifactPath: input.artifactPath ?? input.runtimeProgressPaths.statusPath,
        streamPaths: {
          stdoutPath: input.streamOutputPaths?.stdoutPath ?? "",
          stderrPath: input.streamOutputPaths?.stderrPath ?? "",
        },
        progressPaths: input.runtimeProgressPaths,
        verifiersCompleted: 0,
        verifiersPlanned: 1,
      })
    : undefined;

  try {
    const prompt = await assemblePrompt({
      role: "story_verifier",
      verifierMode: mode,
      storyId: context.story.id,
      storyTitle: context.story.title,
      storyPath: context.story.path,
      techDesignPath: context.paths.techDesignPath,
      techDesignCompanionPaths: context.paths.techDesignCompanionPaths,
      testPlanPath: context.paths.testPlanPath,
      gateCommands: context.gateCommands,
      verifierPromptInsertPath: context.verifierPromptInsertPath,
      ...(mode === "followup"
        ? {
            verifierSessionId: input.sessionId,
            priorOpenFindingsJson: JSON.stringify(
              priorVerifierContext?.result.openFindings ?? [],
              null,
              2
            ),
            followupResponse: buildFollowupResponse(input.response ?? ""),
            orchestratorContext: input.orchestratorContext?.trim().length
              ? input.orchestratorContext.trim()
              : "none",
          }
        : {}),
    });

    await progressTracker?.recordEvent({
      phase: mode === "initial" ? "verifier-initial" : "verifier-followup",
      event: "verifier-started",
      summary:
        mode === "initial"
          ? `Story verifier started for ${context.story.id}.`
          : `Story verifier follow-up started for ${context.story.id}.`,
      metadata:
        mode === "followup"
          ? {
              sessionId: input.sessionId,
              priorArtifactPath: priorVerifierContext?.artifactPath,
            }
          : undefined,
      patch: {
        provider: context.verifier.provider,
      },
    });

    const execution = await executeVerifier({
      provider: context.verifier.provider,
      cwd: context.providerCwd,
      model: context.verifier.model,
      reasoningEffort: context.verifier.reasoningEffort,
      prompt: prompt.prompt,
      resumeSessionId: mode === "followup" ? input.sessionId : undefined,
      env: input.env,
      timeoutMs: context.timeoutMs,
      startupTimeoutMs: context.startupTimeoutMs,
      silenceTimeoutMs: context.silenceTimeoutMs,
      streamOutputPaths: input.streamOutputPaths,
      lifecycleCallback: (event) =>
        progressTracker?.handleProviderLifecycle(event),
    });

    if ("errors" in execution) {
      await progressTracker?.markFailed(
        `story-verify failed for ${context.story.id}.`,
        {
          errors: execution.errors.map((error) => error.code),
          verifiersCompleted: 0,
        }
      );
      await progressTracker?.flush();
      return {
        outcome: "block",
        errors: execution.errors,
        warnings: [],
      };
    }

    const result = buildVerifierResult({
      provider: context.verifier.provider,
      model: context.verifier.model,
      sessionId: execution.sessionId,
      mode,
      story: context.story,
      payload: execution.payload,
    });

    await progressTracker?.recordEvent({
      phase: mode === "initial" ? "verifier-initial" : "verifier-followup",
      event: "verifier-completed",
      summary:
        mode === "initial"
          ? `Story verifier completed for ${context.story.id}.`
          : `Story verifier follow-up completed for ${context.story.id}.`,
      metadata: {
        outcome: execution.payload.recommendedNextStep,
      },
      patch: {
        provider: context.verifier.provider,
        verifiersCompleted: 1,
      },
    });

    await progressTracker?.markCompleted(
      `story-verify completed for ${context.story.id} with outcome ${execution.payload.recommendedNextStep}.`,
      {
        outcome: execution.payload.recommendedNextStep,
        verifiersCompleted: 1,
      }
    );
    await progressTracker?.flush();

    return {
      outcome: execution.payload.recommendedNextStep,
      result,
      errors: [],
      warnings: [],
    };
  } catch (error) {
    const failure = promptInsertFailure(error);
    if (failure) {
      await progressTracker?.markFailed(
        `story-verify failed before provider completion for ${context.story.id}.`,
        {
          errors: failure.errors.map((item) => item.code),
        }
      );
      await progressTracker?.flush();
      return failure;
    }

    throw error;
  }
}
