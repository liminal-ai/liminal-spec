import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { z } from "zod";

import { loadRunConfig } from "./config-schema";
import { pathExists, pathReadable, readTextFile } from "./fs-utils";
import { resolveVerificationGates } from "./gate-discovery";
import { assemblePrompt } from "./prompt-assembly";
import { createProviderAdapter, type ProviderName } from "./provider-adapters";
import {
  cliResultEnvelopeSchema,
  epicSynthesisResultSchema,
  epicVerifierBatchResultSchema,
  epicVerifierResultSchema,
  type CliError,
  type EpicSynthesisResult,
  type EpicVerifierResult,
} from "./result-contracts";
import { inspectSpecPack } from "./spec-pack";

const providerPayloadSchema = epicSynthesisResultSchema.omit({
  resultId: true,
}).strict();

type ProviderPayload = z.infer<typeof providerPayloadSchema>;

interface PreparedSynthesisContext {
  specPackRoot: string;
  provider: ProviderName;
  model: string;
  reasoningEffort: string;
  verifierReportPaths: string[];
  verifierResults: EpicVerifierResult[];
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
}

export interface EpicSynthesisWorkflowResult {
  outcome:
    | "ready-for-closeout"
    | "needs-fixes"
    | "needs-more-verification"
    | "blocked";
  result?: EpicSynthesisResult;
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

function parseVerifierReportContent(content: string): EpicVerifierResult[] | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return undefined;
  }

  const directResult = epicVerifierResultSchema.safeParse(parsed);
  if (directResult.success) {
    return [directResult.data];
  }

  const directBatch = epicVerifierBatchResultSchema.safeParse(parsed);
  if (directBatch.success) {
    return directBatch.data.verifierResults;
  }

  const envelope = cliResultEnvelopeSchema(epicVerifierBatchResultSchema).safeParse(
    parsed
  );
  if (envelope.success && envelope.data.result) {
    return envelope.data.result.verifierResults;
  }

  return undefined;
}

async function loadVerifierReports(
  verifierReportPaths: string[]
): Promise<{ results?: EpicVerifierResult[]; errors?: CliError[] }> {
  const collected: EpicVerifierResult[] = [];

  for (const reportPath of verifierReportPaths) {
    const resolvedPath = resolve(reportPath);
    if (!(await pathExists(resolvedPath))) {
      return {
        errors: [
          blockedError(
            "INVALID_SPEC_PACK",
            `Verifier report was not found: ${resolvedPath}`
          ),
        ],
      };
    }

    if (!(await pathReadable(resolvedPath))) {
      return {
        errors: [
          blockedError(
            "INVALID_SPEC_PACK",
            `Verifier report is not readable: ${resolvedPath}`
          ),
        ],
      };
    }

    let content: string;
    try {
      content = await readTextFile(resolvedPath);
    } catch (error) {
      return {
        errors: [
          blockedError(
            "INVALID_SPEC_PACK",
            `Verifier report could not be read: ${resolvedPath}`,
            error instanceof Error ? error.message : String(error)
          ),
        ],
      };
    }

    const parsed = parseVerifierReportContent(content);
    if (!parsed) {
      return {
        errors: [
          blockedError(
            "INVALID_SPEC_PACK",
            `Verifier report was not valid JSON for the epic verifier contract: ${resolvedPath}`
          ),
        ],
      };
    }

    collected.push(...parsed);
  }

  return {
    results: collected,
  };
}

async function prepareSynthesisContext(input: {
  specPackRoot: string;
  verifierReportPaths: string[];
  configPath?: string;
}): Promise<PreparedSynthesisContext | { errors: CliError[] }> {
  const inspection = await inspectSpecPack(input.specPackRoot);
  if (inspection.status !== "ready") {
    return {
      errors: [
        blockedError(
          "INVALID_SPEC_PACK",
          "Spec-pack inspection must be ready before epic synthesis can start.",
          inspection.blockers.join("; ") || inspection.notes.join("; ")
        ),
      ],
    };
  }

  const reportResolution = await loadVerifierReports(input.verifierReportPaths);
  if (reportResolution.errors || !reportResolution.results) {
    return {
      errors:
        reportResolution.errors ??
        [
          blockedError(
            "INVALID_SPEC_PACK",
            "Epic synthesis requires at least one verifier report."
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
              "Verification gates must be resolved before epic synthesis can start."
            ),
          ],
    };
  }

  return {
    specPackRoot: inspection.specPackRoot,
    provider: providerForHarness(config.epic_synthesizer.secondary_harness),
    model: config.epic_synthesizer.model,
    reasoningEffort: config.epic_synthesizer.reasoning_effort,
    verifierReportPaths: input.verifierReportPaths.map((path) => resolve(path)),
    verifierResults: reportResolution.results,
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
  };
}

function buildSynthesisResult(payload: ProviderPayload): EpicSynthesisResult {
  return {
    resultId: randomUUID(),
    outcome: payload.outcome,
    confirmedIssues: payload.confirmedIssues,
    disputedOrUnconfirmedIssues: payload.disputedOrUnconfirmedIssues,
    readinessAssessment: payload.readinessAssessment,
    recommendedNextStep: payload.recommendedNextStep,
  };
}

export async function runEpicSynthesize(input: {
  specPackRoot: string;
  verifierReportPaths: string[];
  configPath?: string;
  env?: Record<string, string | undefined>;
}): Promise<EpicSynthesisWorkflowResult> {
  const context = await prepareSynthesisContext(input);
  if ("errors" in context) {
    return {
      outcome: "blocked",
      errors: context.errors,
      warnings: [],
    };
  }

  const prompt = await assemblePrompt({
    role: "epic_synthesizer",
    epicPath: context.paths.epicPath,
    techDesignPath: context.paths.techDesignPath,
    techDesignCompanionPaths: context.paths.techDesignCompanionPaths,
    testPlanPath: context.paths.testPlanPath,
    verifierReportPaths: context.verifierReportPaths,
    gateCommands: context.gateCommands,
  });
  const adapter = createProviderAdapter(context.provider, {
    env: input.env,
  });
  const execution = await adapter.execute({
    prompt: prompt.prompt,
    cwd: context.specPackRoot,
    model: context.model,
    reasoningEffort: context.reasoningEffort,
    timeoutMs: 30_000,
    resultSchema: providerPayloadSchema,
  });

  if (execution.exitCode !== 0) {
    return {
      outcome: "blocked",
      errors: [
        executionFailureError({
          provider: context.provider,
          stderr: execution.stderr,
          errorCode: execution.errorCode,
        }),
      ],
      warnings: [],
    };
  }

  if (execution.parseError || !execution.parsedResult) {
    return {
      outcome: "blocked",
      errors: [
        blockedError(
          "PROVIDER_OUTPUT_INVALID",
          `Provider output was invalid for ${context.provider}.`,
          execution.parseError
        ),
      ],
      warnings: [],
    };
  }

  const result = buildSynthesisResult(execution.parsedResult);
  return {
    outcome: result.outcome,
    result,
    errors: [],
    warnings: [],
  };
}
