import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { loadRunConfig } from "./config-schema";
import { resolveVerificationGates } from "./gate-discovery";
import { assemblePrompt, PromptInsertError } from "./prompt-assembly";
import { createProviderAdapter, type ProviderName } from "./provider-adapters";
import {
  aggregateVerifierBatchOutcome,
  storyVerifierResultSchema,
  type CliError,
  type StoryVerifierBatchResult,
  type StoryVerifierResult,
} from "./result-contracts";
import { inspectSpecPack } from "./spec-pack";

const providerPayloadSchema = storyVerifierResultSchema.omit({
  resultId: true,
  verifierLabel: true,
  provider: true,
  model: true,
  story: true,
}).strict();

type ProviderPayload = typeof providerPayloadSchema._output;

interface PreparedVerifier {
  label: string;
  provider: ProviderName;
  model: string;
  reasoningEffort: string;
}

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
  verifiers: PreparedVerifier[];
}

interface WorkflowFailure {
  outcome: "block";
  errors: CliError[];
}

interface VerifierExecutionSuccess {
  payload: ProviderPayload;
}

interface VerifierExecutionFailure {
  errors: CliError[];
}

export interface StoryVerifyWorkflowResult {
  outcome: "pass" | "revise" | "block";
  result?: StoryVerifierBatchResult;
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
    verifiers: [
      {
        label: "story-verifier-1",
        provider: providerForHarness(config.story_verifier_1.secondary_harness),
        model: config.story_verifier_1.model,
        reasoningEffort: config.story_verifier_1.reasoning_effort,
      },
      {
        label: "story-verifier-2",
        provider: providerForHarness(config.story_verifier_2.secondary_harness),
        model: config.story_verifier_2.model,
        reasoningEffort: config.story_verifier_2.reasoning_effort,
      },
    ],
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

async function executeVerifier(input: {
  provider: ProviderName;
  specPackRoot: string;
  model: string;
  reasoningEffort: string;
  prompt: string;
  env?: Record<string, string | undefined>;
}): Promise<VerifierExecutionSuccess | VerifierExecutionFailure> {
  const adapter = createProviderAdapter(input.provider, {
    env: input.env,
  });
  const execution = await adapter.execute({
    prompt: input.prompt,
    cwd: input.specPackRoot,
    model: input.model,
    reasoningEffort: input.reasoningEffort,
    timeoutMs: 30_000,
    resultSchema: providerPayloadSchema,
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

  return {
    payload: execution.parsedResult,
  };
}

function buildVerifierResult(input: {
  verifier: PreparedVerifier;
  story: PreparedStoryContext["story"];
  payload: ProviderPayload;
}): StoryVerifierResult {
  return {
    resultId: randomUUID(),
    verifierLabel: input.verifier.label,
    provider: input.verifier.provider,
    model: input.verifier.model,
    story: {
      id: input.story.id,
      title: input.story.title,
    },
    artifactsRead: input.payload.artifactsRead,
    reviewScopeSummary: input.payload.reviewScopeSummary,
    findings: input.payload.findings,
    requirementCoverage: input.payload.requirementCoverage,
    gatesRun: input.payload.gatesRun,
    mockOrShimAuditFindings: input.payload.mockOrShimAuditFindings,
    recommendedNextStep: input.payload.recommendedNextStep,
    recommendedFixScope: input.payload.recommendedFixScope,
    openQuestions: input.payload.openQuestions,
    additionalObservations: input.payload.additionalObservations,
  };
}

function buildVerifierBatchResult(input: {
  outcome: "pass" | "revise" | "block";
  story: PreparedStoryContext["story"];
  verifierResults: StoryVerifierResult[];
}): StoryVerifierBatchResult {
  return {
    outcome: input.outcome,
    story: {
      id: input.story.id,
      title: input.story.title,
    },
    verifierResults: input.verifierResults,
  };
}

export async function runStoryVerify(input: {
  specPackRoot: string;
  storyId: string;
  configPath?: string;
  env?: Record<string, string | undefined>;
}): Promise<StoryVerifyWorkflowResult> {
  const context = await prepareStoryVerifyContext(input);
  if ("errors" in context) {
    return {
      outcome: "block",
      errors: context.errors,
      warnings: [],
    };
  }

  try {
    const executions = await Promise.all(
      context.verifiers.map(async (verifier) => {
        const prompt = await assemblePrompt({
          role: "story_verifier",
          verifierLabel: verifier.label,
          storyId: context.story.id,
          storyTitle: context.story.title,
          storyPath: context.story.path,
          techDesignPath: context.paths.techDesignPath,
          techDesignCompanionPaths: context.paths.techDesignCompanionPaths,
          testPlanPath: context.paths.testPlanPath,
          gateCommands: context.gateCommands,
          verifierPromptInsertPath: context.verifierPromptInsertPath,
        });
        const execution = await executeVerifier({
          provider: verifier.provider,
          specPackRoot: context.specPackRoot,
          model: verifier.model,
          reasoningEffort: verifier.reasoningEffort,
          prompt: prompt.prompt,
          env: input.env,
        });

        if ("errors" in execution) {
          return execution;
        }

        return {
          result: buildVerifierResult({
            verifier,
            story: context.story,
            payload: execution.payload,
          }),
        };
      })
    );

    const errors = executions.flatMap((execution) =>
      "errors" in execution ? execution.errors : []
    );
    const verifierResults = executions.flatMap((execution) =>
      "result" in execution ? [execution.result] : []
    );
    if (errors.length > 0) {
      return {
        outcome: "block",
        result:
          verifierResults.length > 0
            ? buildVerifierBatchResult({
                outcome: "block",
                story: context.story,
                verifierResults,
              })
            : undefined,
        errors,
        warnings: [],
      };
    }

    const outcome = aggregateVerifierBatchOutcome(verifierResults);

    return {
      outcome,
      result: buildVerifierBatchResult({
        outcome,
        story: context.story,
        verifierResults,
      }),
      errors: [],
      warnings: [],
    };
  } catch (error) {
    const failure = promptInsertFailure(error);
    if (failure) {
      return failure;
    }

    throw error;
  }
}
