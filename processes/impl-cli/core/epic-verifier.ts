import { randomUUID } from "node:crypto";

import { z } from "zod";

import { loadRunConfig } from "./config-schema";
import { resolveVerificationGates } from "./gate-discovery";
import { assemblePrompt } from "./prompt-assembly";
import { createProviderAdapter, type ProviderName } from "./provider-adapters";
import {
  aggregateEpicVerifierBatchOutcome,
  epicVerifierResultSchema,
  type CliError,
  type EpicVerifierBatchResult,
  type EpicVerifierResult,
} from "./result-contracts";
import { inspectSpecPack } from "./spec-pack";

const providerPayloadSchema = epicVerifierResultSchema.omit({
  resultId: true,
  provider: true,
  model: true,
  reviewerLabel: true,
}).strict();

type ProviderPayload = z.infer<typeof providerPayloadSchema>;

interface PreparedVerifier {
  label: string;
  provider: ProviderName;
  model: string;
  reasoningEffort: string;
}

interface PreparedEpicContext {
  specPackRoot: string;
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
  errors: CliError[];
}

interface VerifierExecutionSuccess {
  payload: ProviderPayload;
}

interface VerifierExecutionFailure {
  errors: CliError[];
}

export interface EpicVerifyWorkflowResult {
  outcome: "pass" | "revise" | "block";
  result?: EpicVerifierBatchResult;
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

function providerForHarness(harness: "codex" | "copilot" | "none"): ProviderName {
  if (harness === "none") {
    return "claude-code";
  }

  return harness;
}

async function prepareEpicVerifyContext(input: {
  specPackRoot: string;
  configPath?: string;
}): Promise<PreparedEpicContext | WorkflowFailure> {
  const inspection = await inspectSpecPack(input.specPackRoot);
  if (inspection.status !== "ready") {
    return {
      errors: [
        blockedError(
          "INVALID_SPEC_PACK",
          "Spec-pack inspection must be ready before epic verification can start.",
          inspection.blockers.join("; ") || inspection.notes.join("; ")
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
      errors: gateResolution.errors.length
        ? gateResolution.errors
        : [
            blockedError(
              "VERIFICATION_GATE_UNRESOLVED",
              "Verification gates must be resolved before epic verification can start."
            ),
          ],
    };
  }

  return {
    specPackRoot: inspection.specPackRoot,
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
    verifiers: config.epic_verifiers.map((verifier) => ({
      label: verifier.label,
      provider: providerForHarness(verifier.secondary_harness),
      model: verifier.model,
      reasoningEffort: verifier.reasoning_effort,
    })),
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
  payload: ProviderPayload;
}): EpicVerifierResult {
  return {
    resultId: randomUUID(),
    outcome: input.payload.outcome,
    provider: input.verifier.provider,
    model: input.verifier.model,
    reviewerLabel: input.verifier.label,
    crossStoryFindings: input.payload.crossStoryFindings,
    architectureFindings: input.payload.architectureFindings,
    epicCoverageAssessment: input.payload.epicCoverageAssessment,
    mockOrShimAuditFindings: input.payload.mockOrShimAuditFindings,
    blockingFindings: input.payload.blockingFindings,
    nonBlockingFindings: input.payload.nonBlockingFindings,
    unresolvedItems: input.payload.unresolvedItems,
    gateResult: input.payload.gateResult,
  };
}

function buildVerifierBatchResult(input: {
  outcome: "pass" | "revise" | "block";
  verifierResults: EpicVerifierResult[];
}): EpicVerifierBatchResult {
  return {
    outcome: input.outcome,
    verifierResults: input.verifierResults,
  };
}

export async function runEpicVerify(input: {
  specPackRoot: string;
  configPath?: string;
  env?: Record<string, string | undefined>;
}): Promise<EpicVerifyWorkflowResult> {
  const context = await prepareEpicVerifyContext(input);
  if ("errors" in context) {
    return {
      outcome: "block",
      errors: context.errors,
      warnings: [],
    };
  }

  const executions = await Promise.all(
    context.verifiers.map(async (verifier) => {
      const prompt = await assemblePrompt({
        role: "epic_verifier",
        reviewerLabel: verifier.label,
        epicPath: context.paths.epicPath,
        techDesignPath: context.paths.techDesignPath,
        techDesignCompanionPaths: context.paths.techDesignCompanionPaths,
        testPlanPath: context.paths.testPlanPath,
        gateCommands: context.gateCommands,
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
              verifierResults,
            })
          : undefined,
      errors,
      warnings: [],
    };
  }

  const outcome = aggregateEpicVerifierBatchOutcome(verifierResults);

  return {
    outcome,
    result: buildVerifierBatchResult({
      outcome,
      verifierResults,
    }),
    errors: [],
    warnings: [],
  };
}
