import { randomUUID } from "node:crypto";

import { z } from "zod";

import {
  loadRunConfig,
  resolveConfiguredVerificationGates,
  resolveRunTimeouts,
} from "./config-schema";
import { resolveVerificationGates } from "./gate-discovery";
import { resolveProviderCwd } from "./git-repo";
import { assemblePrompt } from "./prompt-assembly";
import {
  createProviderAdapter,
  type ProviderLifecycleEvent,
  type ProviderName,
  type ProviderStreamOutputPaths,
} from "./provider-adapters";
import {
  RuntimeProgressTracker,
  type RuntimeProgressPaths,
} from "./runtime-progress";
import {
  aggregateEpicVerifierBatchOutcome,
  epicVerifierResultSchema,
  type CliError,
  type EpicVerifierBatchResult,
  type EpicVerifierResult,
} from "./result-contracts";
import { inspectSpecPack } from "./spec-pack";

export const epicVerifierProviderPayloadSchema = epicVerifierResultSchema.omit({
  resultId: true,
  provider: true,
  model: true,
  reviewerLabel: true,
}).strict();

type ProviderPayload = z.infer<typeof epicVerifierProviderPayloadSchema>;

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
  providerCwd: string;
  verifiers: PreparedVerifier[];
  timeoutMs: number;
  startupTimeoutMs: number;
  silenceTimeoutMs: number;
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
    persistedVerificationGates: resolveConfiguredVerificationGates(config),
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
    providerCwd: await resolveProviderCwd(inspection.specPackRoot),
    verifiers: config.epic_verifiers.map((verifier) => ({
      label: verifier.label,
      provider: providerForHarness(verifier.secondary_harness),
      model: verifier.model,
      reasoningEffort: verifier.reasoning_effort,
    })),
    timeoutMs: resolveRunTimeouts(config).epic_verifier_ms,
    startupTimeoutMs: resolveRunTimeouts(config).provider_startup_timeout_ms,
    silenceTimeoutMs: resolveRunTimeouts(config).epic_verifier_silence_timeout_ms,
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

async function executeVerifier(input: {
  provider: ProviderName;
  cwd: string;
  model: string;
  reasoningEffort: string;
  prompt: string;
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
    timeoutMs: input.timeoutMs,
    startupTimeoutMs: input.startupTimeoutMs,
    silenceTimeoutMs: input.silenceTimeoutMs,
    resultSchema: epicVerifierProviderPayloadSchema,
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
  artifactPath?: string;
  streamOutputPaths?: ProviderStreamOutputPaths;
  runtimeProgressPaths?: RuntimeProgressPaths;
}): Promise<EpicVerifyWorkflowResult> {
  const context = await prepareEpicVerifyContext(input);
  if ("errors" in context) {
    return {
      outcome: "block",
      errors: context.errors,
      warnings: [],
    };
  }

  const progressTracker = input.runtimeProgressPaths
    ? await RuntimeProgressTracker.start({
        command: "epic-verify",
        phase: "epic-verifier-1",
        provider: context.verifiers[0]?.provider ?? "claude-code",
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
        verifiersPlanned: context.verifiers.length,
      })
    : undefined;

  let completedVerifiers = 0;
  const executions = await Promise.all(
    context.verifiers.map(async (verifier, index) => {
      const prompt = await assemblePrompt({
        role: "epic_verifier",
        reviewerLabel: verifier.label,
        epicPath: context.paths.epicPath,
        techDesignPath: context.paths.techDesignPath,
        techDesignCompanionPaths: context.paths.techDesignCompanionPaths,
        testPlanPath: context.paths.testPlanPath,
        gateCommands: context.gateCommands,
      });
      await progressTracker?.recordEvent({
        phase: `epic-verifier-${index + 1}`,
        event: "verifier-started",
        summary: `${verifier.label} started for epic verification.`,
        metadata: {
          verifierLabel: verifier.label,
        },
        patch: {
          provider: verifier.provider,
        },
      });
      const execution = await executeVerifier({
        provider: verifier.provider,
        cwd: context.providerCwd,
        model: verifier.model,
        reasoningEffort: verifier.reasoningEffort,
        prompt: prompt.prompt,
        env: input.env,
        timeoutMs: context.timeoutMs,
      startupTimeoutMs: context.startupTimeoutMs,
      silenceTimeoutMs: context.silenceTimeoutMs,
        streamOutputPaths: input.streamOutputPaths,
        lifecycleCallback: (event) =>
          progressTracker?.handleProviderLifecycle(event),
      });

      if ("errors" in execution) {
        return execution;
      }

      completedVerifiers += 1;
      await progressTracker?.recordEvent({
        phase: `epic-verifier-${index + 1}`,
        event: "verifier-completed",
        summary: `${verifier.label} completed for epic verification.`,
        metadata: {
          verifierLabel: verifier.label,
          gateResult: execution.payload.gateResult,
        },
        patch: {
          provider: verifier.provider,
          verifiersCompleted: completedVerifiers,
        },
      });

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
    await progressTracker?.markFailed("epic-verify failed during provider execution.", {
      errors: errors.map((error) => error.code),
      verifiersCompleted: completedVerifiers,
    });
    await progressTracker?.flush();
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

  await progressTracker?.markCompleted(
    `epic-verify completed with outcome ${outcome}.`,
    {
      outcome,
      verifiersCompleted: completedVerifiers,
    }
  );
  await progressTracker?.flush();

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
