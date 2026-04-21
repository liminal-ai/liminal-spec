import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { z } from "zod";

import { loadRunConfig } from "./config-schema";
import { pathExists, readTextFile } from "./fs-utils";
import { resolveVerificationGates } from "./gate-discovery";
import { assemblePrompt, PromptInsertError } from "./prompt-assembly";
import { createProviderAdapter, type ProviderName } from "./provider-adapters";
import type { CliError, ImplementorResult } from "./result-contracts";
import { providerIdSchema } from "./result-contracts";
import { inspectSpecPack } from "./spec-pack";

const providerPayloadSchema = z
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
        totalAfterStory: z.number().int().optional(),
        deltaFromPriorBaseline: z.number().int().optional(),
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

type ProviderPayload = z.infer<typeof providerPayloadSchema>;

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
  selfReviewPasses: number;
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
    selfReviewPasses: config.self_review.passes,
  };
}

function executionFailureError(input: {
  provider: ProviderName;
  stderr: string;
  errorCode?: string;
}): CliError {
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
    tests: input.payload.tests,
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

async function executePrompt(input: {
  provider: ProviderName;
  specPackRoot: string;
  model: string;
  reasoningEffort: string;
  prompt: string;
  resumeSessionId?: string;
  env?: Record<string, string | undefined>;
}): Promise<PromptExecutionSuccess | PromptExecutionFailure> {
  const adapter = createProviderAdapter(input.provider, {
    env: input.env,
  });
  const execution = await adapter.execute({
    prompt: input.prompt,
    cwd: input.specPackRoot,
    model: input.model,
    reasoningEffort: input.reasoningEffort,
    resumeSessionId: input.resumeSessionId,
    timeoutMs: 30_000,
    resultSchema: providerPayloadSchema,
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

async function resolveContinuationOwner(input: {
  specPackRoot: string;
  provider: ProviderName;
  sessionId: string;
}): Promise<string | null> {
  const artifactsRoot = join(resolve(input.specPackRoot), "artifacts");
  if (!(await pathExists(artifactsRoot))) {
    return null;
  }

  const groups = await readdir(artifactsRoot, { withFileTypes: true });
  for (const group of groups) {
    if (!group.isDirectory()) {
      continue;
    }

    const groupPath = join(artifactsRoot, group.name);
    const entries = await readdir(groupPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }

      try {
        const content = JSON.parse(
          await readTextFile(join(groupPath, entry.name))
        ) as {
          result?: {
            continuation?: {
              provider?: string;
              sessionId?: string;
              storyId?: string;
            };
          };
        };
        const continuation = content.result?.continuation;
        if (
          continuation?.provider === input.provider &&
          continuation?.sessionId === input.sessionId
        ) {
          return continuation.storyId ?? group.name;
        }
      } catch {}
    }
  }

  return null;
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

  const owner = await resolveContinuationOwner({
    specPackRoot: input.specPackRoot,
    provider: provider.data,
    sessionId: input.sessionId,
  });
  if (owner === input.storyId) {
    return null;
  }

  if (owner) {
    return blockedError(
      "CONTINUATION_HANDLE_INVALID",
      `Continuation handle ${input.sessionId} belongs to '${owner}', not '${input.storyId}'.`
    );
  }

  return blockedError(
    "CONTINUATION_HANDLE_INVALID",
    `Continuation handle ${input.sessionId} was not found for story '${input.storyId}'.`
  );
}

export async function runStoryImplement(input: {
  specPackRoot: string;
  storyId: string;
  configPath?: string;
  env?: Record<string, string | undefined>;
}): Promise<StoryWorkflowResult> {
  const context = await prepareStoryContext(input);
  if ("errors" in context) {
    return {
      outcome: "blocked",
      errors: context.errors,
      warnings: [],
    };
  }

  try {
    const prompt = await assemblePrompt({
      role: "story_implementor",
      storyId: context.story.id,
      storyTitle: context.story.title,
      storyPath: context.story.path,
      techDesignPath: context.paths.techDesignPath,
      techDesignCompanionPaths: context.paths.techDesignCompanionPaths,
      testPlanPath: context.paths.testPlanPath,
      gateCommands: context.gateCommands,
      implementationPromptInsertPath: context.implementationPromptInsertPath,
    });
    const initial = await executePrompt({
      provider: context.provider,
      specPackRoot: context.specPackRoot,
      model: context.model,
      reasoningEffort: context.reasoningEffort,
      prompt: prompt.prompt,
      env: input.env,
    });
    if ("errors" in initial) {
      return {
        outcome: "blocked",
        errors: initial.errors,
        warnings: [],
      };
    }

    let payload = initial.payload;
    let sessionId = initial.sessionId;
    let passesRun = 0;

    if (payload.outcome !== "blocked" && payload.outcome !== "needs-human-ruling") {
      for (let pass = 1; pass <= context.selfReviewPasses; pass += 1) {
        const reviewPrompt = await assemblePrompt({
          role: "story_implementor",
          storyId: context.story.id,
          storyTitle: context.story.title,
          storyPath: context.story.path,
          techDesignPath: context.paths.techDesignPath,
          techDesignCompanionPaths: context.paths.techDesignCompanionPaths,
          testPlanPath: context.paths.testPlanPath,
          gateCommands: context.gateCommands,
          implementationPromptInsertPath: context.implementationPromptInsertPath,
          selfReviewPass: pass,
        });
        const review = await executePrompt({
          provider: context.provider,
          specPackRoot: context.specPackRoot,
          model: context.model,
          reasoningEffort: context.reasoningEffort,
          prompt: reviewPrompt.prompt,
          resumeSessionId: sessionId,
          env: input.env,
        });
        if ("errors" in review) {
          return {
            outcome: "blocked",
            errors: review.errors,
            warnings: [],
          };
        }

        payload = review.payload;
        sessionId = review.sessionId;
        passesRun = pass;

        if (payload.outcome === "blocked" || payload.outcome === "needs-human-ruling") {
          break;
        }
      }
    }

    const result = buildImplementorResult({
      provider: context.provider,
      model: context.model,
      sessionId,
      story: context.story,
      payload,
      passesRun,
    });

    return {
      outcome: payload.outcome,
      result,
      errors: [],
      warnings: [],
    };
  } catch (error) {
    const failure = promptInsertFailure(error);
    if (failure) {
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

  try {
    const prompt = await assemblePrompt({
      role: "story_implementor",
      storyId: context.story.id,
      storyTitle: context.story.title,
      storyPath: context.story.path,
      techDesignPath: context.paths.techDesignPath,
      techDesignCompanionPaths: context.paths.techDesignCompanionPaths,
      testPlanPath: context.paths.testPlanPath,
      gateCommands: context.gateCommands,
      implementationPromptInsertPath: context.implementationPromptInsertPath,
      followupRequest: input.followupRequest,
    });
    const initial = await executePrompt({
      provider: provider.data,
      specPackRoot: context.specPackRoot,
      model: context.model,
      reasoningEffort: context.reasoningEffort,
      prompt: prompt.prompt,
      resumeSessionId: input.sessionId,
      env: input.env,
    });
    if ("errors" in initial) {
      return {
        outcome: "blocked",
        errors: initial.errors,
        warnings: [],
      };
    }

    let payload = initial.payload;
    let sessionId = initial.sessionId;
    let passesRun = 0;

    if (payload.outcome !== "blocked" && payload.outcome !== "needs-human-ruling") {
      for (let pass = 1; pass <= context.selfReviewPasses; pass += 1) {
        const reviewPrompt = await assemblePrompt({
          role: "story_implementor",
          storyId: context.story.id,
          storyTitle: context.story.title,
          storyPath: context.story.path,
          techDesignPath: context.paths.techDesignPath,
          techDesignCompanionPaths: context.paths.techDesignCompanionPaths,
          testPlanPath: context.paths.testPlanPath,
          gateCommands: context.gateCommands,
          implementationPromptInsertPath: context.implementationPromptInsertPath,
          selfReviewPass: pass,
        });
        const review = await executePrompt({
          provider: provider.data,
          specPackRoot: context.specPackRoot,
          model: context.model,
          reasoningEffort: context.reasoningEffort,
          prompt: reviewPrompt.prompt,
          resumeSessionId: sessionId,
          env: input.env,
        });
        if ("errors" in review) {
          return {
            outcome: "blocked",
            errors: review.errors,
            warnings: [],
          };
        }

        payload = review.payload;
        sessionId = review.sessionId;
        passesRun = pass;

        if (payload.outcome === "blocked" || payload.outcome === "needs-human-ruling") {
          break;
        }
      }
    }

    const result = buildImplementorResult({
      provider: provider.data,
      model: context.model,
      sessionId,
      story: context.story,
      payload,
      passesRun,
    });

    return {
      outcome: payload.outcome,
      result,
      errors: [],
      warnings: [],
    };
  } catch (error) {
    const failure = promptInsertFailure(error);
    if (failure) {
      return {
        outcome: failure.outcome,
        errors: failure.errors,
        warnings: [],
      };
    }

    throw error;
  }
}
