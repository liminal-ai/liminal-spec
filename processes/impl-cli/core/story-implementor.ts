import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";

import { z } from "zod";

import { writeJsonArtifact } from "./artifact-writer";
import {
  loadRunConfig,
  resolveConfiguredVerificationGates,
  resolveRunTimeouts,
} from "./config-schema";
import { resolveVerificationGates } from "./gate-discovery";
import { resolveProviderCwd } from "./git-repo";
import { assemblePrompt, PromptInsertError } from "./prompt-assembly";
import {
  createProviderAdapter,
  type ProviderLifecycleEvent,
  type ProviderName,
} from "./provider-adapters";
import type { ProviderStreamOutputPaths } from "./provider-adapters";
import type {
  CliError,
  ImplementorResult,
  StorySelfReviewResult,
} from "./result-contracts";
import { providerIdSchema } from "./result-contracts";
import {
  RuntimeProgressTracker,
  type RuntimeProgressPaths,
} from "./runtime-progress";
import { inspectSpecPack } from "./spec-pack";

export const storyImplementorProviderPayloadSchema = z
  .object({
    outcome: z.enum([
      "ready-for-verification",
      "needs-followup-fix",
      "needs-human-ruling",
      "blocked",
    ]),
    planSummary: z.string().min(1),
    changedFiles: z.array(
      z
        .object({
          path: z.string().min(1),
          reason: z.string().min(1),
        })
        .strict()
    ),
    tests: z
      .object({
        added: z.array(z.string().min(1)),
        modified: z.array(z.string().min(1)),
        removed: z.array(z.string().min(1)),
        totalAfterStory: z.number().int().nullable(),
        deltaFromPriorBaseline: z.number().int().nullable(),
      })
      .strict(),
    gatesRun: z.array(
      z
        .object({
          command: z.string().min(1),
          result: z.enum(["pass", "fail", "not-run"]),
        })
        .strict()
    ),
    selfReview: z
      .object({
        findingsFixed: z.array(z.string()),
        findingsSurfaced: z.array(z.string()),
      })
      .strict(),
    openQuestions: z.array(z.string()),
    specDeviations: z.array(z.string()),
    recommendedNextStep: z.string().min(1),
  })
  .strict();

type ProviderPayload = z.infer<typeof storyImplementorProviderPayloadSchema>;

function normalizeProviderTestSummary(
  tests: ProviderPayload["tests"]
): ImplementorResult["tests"] {
  return {
    added: tests.added,
    modified: tests.modified,
    removed: tests.removed,
    ...(tests.totalAfterStory === null
      ? {}
      : {
          totalAfterStory: tests.totalAfterStory,
        }),
    ...(tests.deltaFromPriorBaseline === null
      ? {}
      : {
          deltaFromPriorBaseline: tests.deltaFromPriorBaseline,
        }),
  };
}

interface PreparedStoryContext {
  specPackRoot: string;
  story: {
    id: string;
    title: string;
    path: string;
  };
  provider: ProviderName;
  model: string;
  reasoningEffort: string;
  implementationPromptInsertPath?: string;
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
  selfReviewPasses: number;
  timeoutMs: number;
  startupTimeoutMs: number;
  silenceTimeoutMs: number;
}

interface WorkflowFailure {
  outcome: "blocked";
  errors: CliError[];
}

interface PromptExecutionSuccess {
  outcome: ProviderPayload["outcome"];
  sessionId: string;
  payload: ProviderPayload;
}

interface PromptExecutionFailure {
  outcome: "blocked";
  errors: CliError[];
}

export interface StoryWorkflowResult {
  outcome:
    | "ready-for-verification"
    | "needs-followup-fix"
    | "needs-human-ruling"
    | "blocked";
  result?: ImplementorResult;
  errors: CliError[];
  warnings: string[];
}

export interface StorySelfReviewWorkflowResult {
  outcome:
    | "ready-for-verification"
    | "needs-followup-fix"
    | "needs-human-ruling"
    | "blocked";
  result?: StorySelfReviewResult;
  passArtifacts?: SelfReviewPassArtifactRef[];
  errors: CliError[];
  warnings: string[];
}

interface SelfReviewPassArtifactRef {
  passNumber: number;
  path: string;
}

function blockedError(code: string, message: string, detail?: string): CliError {
  return {
    code,
    message,
    ...(detail ? { detail } : {}),
  };
}

function promptInsertFailure(error: unknown): WorkflowFailure | undefined {
  if (!(error instanceof PromptInsertError)) {
    return undefined;
  }

  return {
    outcome: "blocked",
    errors: [
      blockedError(
        "PROMPT_INSERT_INVALID",
        "Prompt insert assembly failed.",
        error.message
      ),
    ],
  };
}

async function prepareStoryContext(input: {
  specPackRoot: string;
  storyId: string;
  configPath?: string;
  providerOverride?: ProviderName;
}): Promise<PreparedStoryContext | WorkflowFailure> {
  const inspection = await inspectSpecPack(input.specPackRoot);
  if (inspection.status !== "ready") {
    return {
      outcome: "blocked",
      errors: [
        blockedError(
          "INVALID_SPEC_PACK",
          "Spec-pack inspection must be ready before story implementation can start.",
          inspection.blockers.join("; ") || inspection.notes.join("; ")
        ),
      ],
    };
  }

  const story = inspection.stories.find((candidate) => candidate.id === input.storyId);
  if (!story) {
    return {
      outcome: "blocked",
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
      outcome: "blocked",
      errors: gateResolution.errors.length
        ? gateResolution.errors
        : [
            blockedError(
              "VERIFICATION_GATE_UNRESOLVED",
              "Verification gates must be resolved before story implementation can start."
            ),
          ],
    };
  }

  const provider =
    input.providerOverride ??
    (config.story_implementor.secondary_harness === "none"
      ? "claude-code"
      : config.story_implementor.secondary_harness);

  return {
    specPackRoot: inspection.specPackRoot,
    story: {
      id: story.id,
      title: story.title,
      path: story.path,
    },
    provider,
    model: config.story_implementor.model,
    reasoningEffort: config.story_implementor.reasoning_effort,
    implementationPromptInsertPath:
      inspection.inserts.customStoryImplPromptInsert === "present"
        ? join(inspection.specPackRoot, "custom-story-impl-prompt-insert.md")
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
    selfReviewPasses: config.self_review.passes,
    timeoutMs: resolveRunTimeouts(config).story_implementor_ms,
    startupTimeoutMs: resolveRunTimeouts(config).provider_startup_timeout_ms,
    silenceTimeoutMs: resolveRunTimeouts(config).story_implementor_silence_timeout_ms,
  };
}

function executionFailureError(input: {
  provider: ProviderName;
  stderr: string;
  errorCode?: string;
}): CliError {
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

function buildImplementorResult(input: {
  provider: ProviderName;
  model: string;
  sessionId: string;
  story: PreparedStoryContext["story"];
  payload: ProviderPayload;
  passesRun: number;
}): ImplementorResult {
  return {
    resultId: randomUUID(),
    provider: input.provider,
    model: input.model,
    role: "story_implementor",
    sessionId: input.sessionId,
    continuation: {
      provider: input.provider,
      sessionId: input.sessionId,
      storyId: input.story.id,
    },
    outcome: input.payload.outcome,
    story: {
      id: input.story.id,
      title: input.story.title,
    },
    planSummary: input.payload.planSummary,
    changedFiles: input.payload.changedFiles,
    tests: normalizeProviderTestSummary(input.payload.tests),
    gatesRun: input.payload.gatesRun,
    selfReview: {
      passesRun: input.passesRun,
      findingsFixed: input.payload.selfReview.findingsFixed,
      findingsSurfaced: input.payload.selfReview.findingsSurfaced,
    },
    openQuestions: input.payload.openQuestions,
    specDeviations: input.payload.specDeviations,
    recommendedNextStep: input.payload.recommendedNextStep,
  };
}

function buildStorySelfReviewResult(input: {
  provider: ProviderName;
  model: string;
  sessionId: string;
  story: PreparedStoryContext["story"];
  payload: ProviderPayload;
  passesRequested: number;
  passesCompleted: number;
  passArtifacts: SelfReviewPassArtifactRef[];
}): StorySelfReviewResult {
  return {
    resultId: randomUUID(),
    provider: input.provider,
    model: input.model,
    role: "story_self_review",
    sessionId: input.sessionId,
    continuation: {
      provider: input.provider,
      sessionId: input.sessionId,
      storyId: input.story.id,
    },
    outcome: input.payload.outcome,
    story: {
      id: input.story.id,
      title: input.story.title,
    },
    passesRequested: input.passesRequested,
    passesCompleted: input.passesCompleted,
    passArtifacts: input.passArtifacts,
    planSummary: input.payload.planSummary,
    changedFiles: input.payload.changedFiles,
    tests: normalizeProviderTestSummary(input.payload.tests),
    gatesRun: input.payload.gatesRun,
    selfReview: {
      passesRun: input.passesCompleted,
      findingsFixed: input.payload.selfReview.findingsFixed,
      findingsSurfaced: input.payload.selfReview.findingsSurfaced,
    },
    openQuestions: input.payload.openQuestions,
    specDeviations: input.payload.specDeviations,
    recommendedNextStep: input.payload.recommendedNextStep,
  };
}

function buildSelfReviewPassArtifact(input: {
  provider: ProviderName;
  model: string;
  sessionId: string;
  story: PreparedStoryContext["story"];
  payload: ProviderPayload;
  passNumber: number;
}) {
  return {
    resultId: randomUUID(),
    provider: input.provider,
    model: input.model,
    role: "story_self_review_pass" as const,
    status: "completed" as const,
    sessionId: input.sessionId,
    continuation: {
      provider: input.provider,
      sessionId: input.sessionId,
      storyId: input.story.id,
    },
    outcome: input.payload.outcome,
    story: {
      id: input.story.id,
      title: input.story.title,
    },
    passNumber: input.passNumber,
    planSummary: input.payload.planSummary,
    changedFiles: input.payload.changedFiles,
    tests: normalizeProviderTestSummary(input.payload.tests),
    gatesRun: input.payload.gatesRun,
    selfReview: {
      passesRun: input.passNumber,
      findingsFixed: input.payload.selfReview.findingsFixed,
      findingsSurfaced: input.payload.selfReview.findingsSurfaced,
    },
    openQuestions: input.payload.openQuestions,
    specDeviations: input.payload.specDeviations,
    recommendedNextStep: input.payload.recommendedNextStep,
  };
}

function buildSkippedSelfReviewPassArtifact(input: {
  provider: ProviderName;
  model: string;
  sessionId: string;
  story: PreparedStoryContext["story"];
  passNumber: number;
  skippedReason: string;
}) {
  return {
    resultId: randomUUID(),
    provider: input.provider,
    model: input.model,
    role: "story_self_review_pass" as const,
    status: "skipped" as const,
    sessionId: input.sessionId,
    continuation: {
      provider: input.provider,
      sessionId: input.sessionId,
      storyId: input.story.id,
    },
    story: {
      id: input.story.id,
      title: input.story.title,
    },
    passNumber: input.passNumber,
    skippedReason: input.skippedReason,
  };
}

async function executePrompt(input: {
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
}): Promise<PromptExecutionSuccess | PromptExecutionFailure> {
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
    resultSchema: storyImplementorProviderPayloadSchema,
    streamOutputPaths: input.streamOutputPaths,
    lifecycleCallback: input.lifecycleCallback,
  });

  if (execution.exitCode !== 0) {
    return {
      outcome: "blocked" as const,
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
      outcome: "blocked" as const,
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
      outcome: "blocked" as const,
      errors: [
        blockedError(
          "CONTINUATION_HANDLE_INVALID",
          `Provider ${input.provider} did not return a session id for a retained implementor workflow.`
        ),
      ],
    };
  }

  return {
    outcome: execution.parsedResult.outcome,
    sessionId,
    payload: execution.parsedResult,
  };
}

async function runImplementorPass(input: {
  context: PreparedStoryContext;
  phase: "initial-implement";
  summaryPrefix: string;
  resumeSessionId?: string;
  followupRequest?: string;
  env?: Record<string, string | undefined>;
  timeoutMs: number;
  startupTimeoutMs?: number;
  silenceTimeoutMs?: number;
  streamOutputPaths?: ProviderStreamOutputPaths;
  progressTracker?: RuntimeProgressTracker;
}): Promise<PromptExecutionSuccess | PromptExecutionFailure> {
  const prompt = await assemblePrompt({
    role: "story_implementor",
    storyId: input.context.story.id,
    storyTitle: input.context.story.title,
    storyPath: input.context.story.path,
    techDesignPath: input.context.paths.techDesignPath,
    techDesignCompanionPaths: input.context.paths.techDesignCompanionPaths,
    testPlanPath: input.context.paths.testPlanPath,
    gateCommands: input.context.gateCommands,
    implementationPromptInsertPath: input.context.implementationPromptInsertPath,
    ...(input.followupRequest
      ? {
          followupRequest: input.followupRequest,
        }
      : {}),
  });
  await input.progressTracker?.recordEvent({
    phase: input.phase,
    event: "initial-pass-started",
    summary: `${input.summaryPrefix} started for ${input.context.story.id}.`,
  });

  const result = await executePrompt({
    provider: input.context.provider,
    cwd: input.context.providerCwd,
    model: input.context.model,
    reasoningEffort: input.context.reasoningEffort,
    prompt: prompt.prompt,
    resumeSessionId: input.resumeSessionId,
    env: input.env,
    timeoutMs: input.timeoutMs,
    startupTimeoutMs: input.startupTimeoutMs,
    silenceTimeoutMs: input.silenceTimeoutMs,
    streamOutputPaths: input.streamOutputPaths,
    lifecycleCallback: (event) => input.progressTracker?.handleProviderLifecycle(event),
  });

  if ("errors" in result) {
    return result;
  }

  await input.progressTracker?.recordEvent({
    phase: input.phase,
    event: "initial-pass-completed",
    summary: `${input.summaryPrefix} completed for ${input.context.story.id}.`,
    metadata: {
      outcome: result.payload.outcome,
    },
  });

  return result;
}

async function runSelfReviewPasses(input: {
  context: PreparedStoryContext;
  provider: ProviderName;
  sessionId: string;
  passesRequested: number;
  env?: Record<string, string | undefined>;
  streamOutputPaths?: ProviderStreamOutputPaths;
  progressTracker?: RuntimeProgressTracker;
  passArtifactPaths?: string[];
}): Promise<
  | {
      outcome: "blocked";
      errors: CliError[];
      passArtifacts: SelfReviewPassArtifactRef[];
    }
  | {
      sessionId: string;
      payload: ProviderPayload;
      passesCompleted: number;
      passArtifacts: SelfReviewPassArtifactRef[];
    }
> {
  let sessionId = input.sessionId;
  let payload: ProviderPayload | undefined;
  const passArtifacts: SelfReviewPassArtifactRef[] = [];
  const writeSkippedPassArtifacts = async (startPass: number, reason: string) => {
    for (let pass = startPass; pass <= input.passesRequested; pass += 1) {
      const passArtifactPath = input.passArtifactPaths?.[pass - 1];
      if (!passArtifactPath) {
        continue;
      }

      await writeJsonArtifact(
        passArtifactPath,
        buildSkippedSelfReviewPassArtifact({
          provider: input.provider,
          model: input.context.model,
          sessionId,
          story: input.context.story,
          passNumber: pass,
          skippedReason: reason,
        })
      );
      passArtifacts.push({
        passNumber: pass,
        path: passArtifactPath,
      });
    }
  };

  for (let pass = 1; pass <= input.passesRequested; pass += 1) {
    const reviewPrompt = await assemblePrompt({
      role: "story_implementor",
      storyId: input.context.story.id,
      storyTitle: input.context.story.title,
      storyPath: input.context.story.path,
      techDesignPath: input.context.paths.techDesignPath,
      techDesignCompanionPaths: input.context.paths.techDesignCompanionPaths,
      testPlanPath: input.context.paths.testPlanPath,
      gateCommands: input.context.gateCommands,
      implementationPromptInsertPath: input.context.implementationPromptInsertPath,
      selfReviewPass: pass,
    });
    await input.progressTracker?.recordEvent({
      phase: `self-review-${pass}`,
      event: "self-review-pass-started",
      summary: `Self-review pass ${pass} started for ${input.context.story.id}.`,
    });

    const review = await executePrompt({
      provider: input.provider,
      cwd: input.context.providerCwd,
      model: input.context.model,
      reasoningEffort: input.context.reasoningEffort,
      prompt: reviewPrompt.prompt,
      resumeSessionId: sessionId,
      env: input.env,
      timeoutMs: input.context.timeoutMs,
      streamOutputPaths: input.streamOutputPaths,
      lifecycleCallback: (event) => input.progressTracker?.handleProviderLifecycle(event),
    });

    if ("errors" in review) {
      await writeSkippedPassArtifacts(
        pass,
        `Self-review stopped before pass ${pass} completed because provider execution failed.`
      );
      return {
        outcome: "blocked",
        errors: review.errors,
        passArtifacts,
      };
    }

    payload = review.payload;
    sessionId = review.sessionId;

    const passArtifactPath = input.passArtifactPaths?.[pass - 1];
    if (passArtifactPath) {
      await writeJsonArtifact(
        passArtifactPath,
        buildSelfReviewPassArtifact({
          provider: input.provider,
          model: input.context.model,
          sessionId,
          story: input.context.story,
          payload,
          passNumber: pass,
        })
      );
      passArtifacts.push({
        passNumber: pass,
        path: passArtifactPath,
      });
    }

    await input.progressTracker?.recordEvent({
      phase: `self-review-${pass}`,
      event: "self-review-pass-completed",
      summary: `Self-review pass ${pass} completed for ${input.context.story.id}.`,
      metadata: {
        outcome: payload.outcome,
        selfReviewPass: pass,
      },
      patch: {
        selfReviewPassesCompleted: pass,
      },
    });

    if (payload.outcome === "blocked" || payload.outcome === "needs-human-ruling") {
      await writeSkippedPassArtifacts(
        pass + 1,
        `Self-review stopped after pass ${pass} returned outcome '${payload.outcome}'.`
      );
      return {
        sessionId,
        payload,
        passesCompleted: pass,
        passArtifacts,
      };
    }
  }

  if (!payload) {
    return {
      outcome: "blocked",
      errors: [
        blockedError(
          "PROVIDER_OUTPUT_INVALID",
          "Self-review produced no payload."
        ),
      ],
      passArtifacts,
    };
  }

  return {
    sessionId,
    payload,
    passesCompleted: input.passesRequested,
    passArtifacts,
  };
}

export async function validateContinuationHandle(input: {
  specPackRoot: string;
  storyId: string;
  provider: string;
  sessionId: string;
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
      "Provider 'copilot' cannot be used for retained story_implementor continuation sessions."
    );
  }

  return null;
}

export async function runStoryImplement(input: {
  specPackRoot: string;
  storyId: string;
  configPath?: string;
  env?: Record<string, string | undefined>;
  artifactPath?: string;
  streamOutputPaths?: ProviderStreamOutputPaths;
  runtimeProgressPaths?: RuntimeProgressPaths;
}): Promise<StoryWorkflowResult> {
  const context = await prepareStoryContext(input);
  if ("errors" in context) {
    return {
      outcome: "blocked",
      errors: context.errors,
      warnings: [],
    };
  }

  const progressTracker = input.runtimeProgressPaths
    ? await RuntimeProgressTracker.start({
        command: "story-implement",
        phase: "initial-implement",
        provider: context.provider,
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
        selfReviewPassesCompleted: 0,
        selfReviewPassesPlanned: 0,
      })
    : undefined;

  try {
    const initial = await runImplementorPass({
      context,
      phase: "initial-implement",
      summaryPrefix: "Initial implementor pass",
      env: input.env,
      timeoutMs: context.timeoutMs,
      startupTimeoutMs: context.startupTimeoutMs,
      silenceTimeoutMs: context.silenceTimeoutMs,
      streamOutputPaths: input.streamOutputPaths,
      progressTracker,
    });
    if ("errors" in initial) {
      await progressTracker?.markFailed(
        `story-implement failed during the initial implementor pass for ${context.story.id}.`,
        {
          errors: initial.errors.map((error) => error.code),
        }
      );
      await progressTracker?.flush();
      return {
        outcome: "blocked",
        errors: initial.errors,
        warnings: [],
      };
    }

    const result = buildImplementorResult({
      provider: context.provider,
      model: context.model,
      sessionId: initial.sessionId,
      story: context.story,
      payload: initial.payload,
      passesRun: 0,
    });

    await progressTracker?.markCompleted(
      `story-implement completed for ${context.story.id} with outcome ${initial.payload.outcome}.`,
      {
        outcome: initial.payload.outcome,
        selfReviewPassesCompleted: 0,
      }
    );
    await progressTracker?.flush();

    return {
      outcome: initial.payload.outcome,
      result,
      errors: [],
      warnings: [],
    };
  } catch (error) {
    const failure = promptInsertFailure(error);
    if (failure) {
      await progressTracker?.markFailed(
        `story-implement failed before provider completion for ${context.story.id}.`,
        {
          errors: failure.errors.map((item) => item.code),
        }
      );
      await progressTracker?.flush();
      return {
        outcome: failure.outcome,
        errors: failure.errors,
        warnings: [],
      };
    }

    throw error;
  }
}

export async function runStoryContinue(input: {
  specPackRoot: string;
  storyId: string;
  provider: string;
  sessionId: string;
  followupRequest: string;
  configPath?: string;
  env?: Record<string, string | undefined>;
  artifactPath?: string;
  streamOutputPaths?: ProviderStreamOutputPaths;
  runtimeProgressPaths?: RuntimeProgressPaths;
}): Promise<StoryWorkflowResult> {
  const continuationError = await validateContinuationHandle({
    specPackRoot: input.specPackRoot,
    storyId: input.storyId,
    provider: input.provider,
    sessionId: input.sessionId,
  });
  if (continuationError) {
    return {
      outcome: "blocked",
      errors: [continuationError],
      warnings: [],
    };
  }

  const provider = providerIdSchema.safeParse(input.provider);
  if (!provider.success) {
    return {
      outcome: "blocked",
      errors: [
        blockedError(
          "CONTINUATION_HANDLE_INVALID",
          `Provider '${input.provider}' is not valid for continuation.`
        ),
      ],
      warnings: [],
    };
  }

  const context = await prepareStoryContext({
    specPackRoot: input.specPackRoot,
    storyId: input.storyId,
    configPath: input.configPath,
    providerOverride: provider.data,
  });
  if ("errors" in context) {
    return {
      outcome: "blocked",
      errors: context.errors,
      warnings: [],
    };
  }

  const progressTracker = input.runtimeProgressPaths
    ? await RuntimeProgressTracker.start({
        command: "story-continue",
        phase: "initial-implement",
        provider: provider.data,
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
        selfReviewPassesCompleted: 0,
        selfReviewPassesPlanned: 0,
      })
    : undefined;

  try {
    const initial = await runImplementorPass({
      context,
      phase: "initial-implement",
      summaryPrefix: "Continuation implementor pass",
      resumeSessionId: input.sessionId,
      followupRequest: input.followupRequest,
      env: input.env,
      timeoutMs: context.timeoutMs,
      startupTimeoutMs: context.startupTimeoutMs,
      silenceTimeoutMs: context.silenceTimeoutMs,
      streamOutputPaths: input.streamOutputPaths,
      progressTracker,
    });
    if ("errors" in initial) {
      await progressTracker?.markFailed(
        `story-continue failed during the follow-up implementor pass for ${context.story.id}.`,
        {
          errors: initial.errors.map((error) => error.code),
        }
      );
      await progressTracker?.flush();
      return {
        outcome: "blocked",
        errors: initial.errors,
        warnings: [],
      };
    }

    const result = buildImplementorResult({
      provider: provider.data,
      model: context.model,
      sessionId: initial.sessionId,
      story: context.story,
      payload: initial.payload,
      passesRun: 0,
    });

    await progressTracker?.markCompleted(
      `story-continue completed for ${context.story.id} with outcome ${initial.payload.outcome}.`,
      {
        outcome: initial.payload.outcome,
        selfReviewPassesCompleted: 0,
      }
    );
    await progressTracker?.flush();

    return {
      outcome: initial.payload.outcome,
      result,
      errors: [],
      warnings: [],
    };
  } catch (error) {
    const failure = promptInsertFailure(error);
    if (failure) {
      await progressTracker?.markFailed(
        `story-continue failed before provider completion for ${context.story.id}.`,
        {
          errors: failure.errors.map((item) => item.code),
        }
      );
      await progressTracker?.flush();
      return {
        outcome: failure.outcome,
        errors: failure.errors,
        warnings: [],
      };
    }

    throw error;
  }
}

export async function runStorySelfReview(input: {
  specPackRoot: string;
  storyId: string;
  provider: string;
  sessionId: string;
  passes: number;
  passArtifactPaths: string[];
  configPath?: string;
  env?: Record<string, string | undefined>;
  artifactPath?: string;
  streamOutputPaths?: ProviderStreamOutputPaths;
  runtimeProgressPaths?: RuntimeProgressPaths;
}): Promise<StorySelfReviewWorkflowResult> {
  const continuationError = await validateContinuationHandle({
    specPackRoot: input.specPackRoot,
    storyId: input.storyId,
    provider: input.provider,
    sessionId: input.sessionId,
  });
  if (continuationError) {
    return {
      outcome: "blocked",
      errors: [continuationError],
      warnings: [],
    };
  }

  const provider = providerIdSchema.safeParse(input.provider);
  if (!provider.success) {
    return {
      outcome: "blocked",
      errors: [
        blockedError(
          "CONTINUATION_HANDLE_INVALID",
          `Provider '${input.provider}' is not valid for continuation.`
        ),
      ],
      warnings: [],
    };
  }

  const context = await prepareStoryContext({
    specPackRoot: input.specPackRoot,
    storyId: input.storyId,
    configPath: input.configPath,
    providerOverride: provider.data,
  });
  if ("errors" in context) {
    return {
      outcome: "blocked",
      errors: context.errors,
      warnings: [],
    };
  }

  const progressTracker = input.runtimeProgressPaths
    ? await RuntimeProgressTracker.start({
        command: "story-self-review",
        phase: "self-review-1",
        provider: provider.data,
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
        selfReviewPassesCompleted: 0,
        selfReviewPassesPlanned: input.passes,
      })
    : undefined;

  try {
    const selfReview = await runSelfReviewPasses({
      context,
      provider: provider.data,
      sessionId: input.sessionId,
      passesRequested: input.passes,
      env: input.env,
      streamOutputPaths: input.streamOutputPaths,
      progressTracker,
      passArtifactPaths: input.passArtifactPaths,
    });

    if ("errors" in selfReview) {
      await progressTracker?.recordEvent({
        phase: "finalizing",
        event: "failed",
        summary: `story-self-review failed during self-review for ${context.story.id}.`,
        metadata: {
          errors: selfReview.errors.map((error) => error.code),
        },
        status: "failed",
        patch: {
          selfReviewPassesCompleted: selfReview.passArtifacts.length,
        },
      });
      await progressTracker?.flush();
      return {
        outcome: "blocked",
        errors: selfReview.errors,
        passArtifacts: selfReview.passArtifacts,
        warnings: [],
      };
    }

    const result = buildStorySelfReviewResult({
      provider: provider.data,
      model: context.model,
      sessionId: selfReview.sessionId,
      story: context.story,
      payload: selfReview.payload,
      passesRequested: input.passes,
      passesCompleted: selfReview.passesCompleted,
      passArtifacts: selfReview.passArtifacts,
    });

    await progressTracker?.markCompleted(
      `story-self-review completed for ${context.story.id} with outcome ${selfReview.payload.outcome}.`,
      {
        outcome: selfReview.payload.outcome,
        selfReviewPassesCompleted: selfReview.passesCompleted,
      }
    );
    await progressTracker?.flush();

    return {
      outcome: selfReview.payload.outcome,
      result,
      passArtifacts: selfReview.passArtifacts,
      errors: [],
      warnings: [],
    };
  } catch (error) {
    const failure = promptInsertFailure(error);
    if (failure) {
      await progressTracker?.markFailed(
        `story-self-review failed before provider completion for ${context.story.id}.`,
        {
          errors: failure.errors.map((item) => item.code),
        }
      );
      await progressTracker?.flush();
      return {
        outcome: failure.outcome,
        errors: failure.errors,
        warnings: [],
      };
    }

    throw error;
  }
}
