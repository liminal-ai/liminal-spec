import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { z } from "zod";

import { loadRunConfig } from "./config-schema";
import { pathExists, readTextFile } from "./fs-utils";
import { resolveVerificationGates } from "./gate-discovery";
import { createProviderAdapter, type ProviderName } from "./provider-adapters";
import {
  epicCleanupResultSchema,
  type CliError,
  type EpicCleanupResult,
} from "./result-contracts";
import { inspectSpecPack } from "./spec-pack";

const providerPayloadSchema = epicCleanupResultSchema.omit({
  resultId: true,
}).strict();

type ProviderPayload = z.infer<typeof providerPayloadSchema>;

export interface EpicCleanupWorkflowResult {
  outcome: "cleaned" | "needs-more-cleanup" | "blocked";
  result?: EpicCleanupResult;
  errors: CliError[];
  warnings: string[];
}

interface PreparedCleanupContext {
  specPackRoot: string;
  cleanupBatchPath: string;
  cleanupBatchContent: string;
  provider: ProviderName;
  model: string;
  reasoningEffort: string;
  gateCommands: {
    story: string;
    epic: string;
  };
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

async function prepareCleanupContext(input: {
  specPackRoot: string;
  cleanupBatchPath: string;
  configPath?: string;
}): Promise<PreparedCleanupContext | { errors: CliError[] }> {
  const inspection = await inspectSpecPack(input.specPackRoot);
  if (inspection.status !== "ready") {
    return {
      errors: [
        blockedError(
          "INVALID_SPEC_PACK",
          "Spec-pack inspection must be ready before epic cleanup can start.",
          inspection.blockers.join("; ") || inspection.notes.join("; ")
        ),
      ],
    };
  }

  const cleanupBatchPath = resolve(input.cleanupBatchPath);
  if (!(await pathExists(cleanupBatchPath))) {
    return {
      errors: [
        blockedError(
          "INVALID_SPEC_PACK",
          `Cleanup batch artifact was not found: ${cleanupBatchPath}`
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
              "Verification gates must be resolved before epic cleanup can start."
            ),
          ],
    };
  }

  return {
    specPackRoot: inspection.specPackRoot,
    cleanupBatchPath,
    cleanupBatchContent: await readTextFile(cleanupBatchPath),
    provider: providerForHarness(config.quick_fixer.secondary_harness),
    model: config.quick_fixer.model,
    reasoningEffort: config.quick_fixer.reasoning_effort,
    gateCommands: {
      story: gateResolution.verificationGates.storyGate,
      epic: gateResolution.verificationGates.epicGate,
    },
  };
}

function hasApprovedCleanupItems(content: string): boolean {
  return /\bAPPROVED\b/i.test(content);
}

function buildCleanupPrompt(context: PreparedCleanupContext): string {
  return [
    "# Epic Cleanup",
    "",
    "Apply only the approved cleanup items from the curated cleanup batch.",
    "Do not choose a different workflow, widen the scope, or decide whether the epic can close.",
    "Use the cleanup batch as the source of truth for this pass.",
    "",
    `Cleanup batch path: ${context.cleanupBatchPath}`,
    `Story gate command: ${context.gateCommands.story}`,
    `Epic gate command: ${context.gateCommands.epic}`,
    "",
    "## Cleanup Batch",
    context.cleanupBatchContent.trim(),
    "",
    "## Output Contract",
    "Return exactly one JSON object with: outcome, cleanupBatchPath, filesChanged, changeSummary, gatesRun, unresolvedConcerns, recommendedNextStep.",
  ].join("\n");
}

function buildCleanupResult(input: {
  cleanupBatchPath: string;
  payload: ProviderPayload;
}): EpicCleanupResult {
  return {
    resultId: randomUUID(),
    outcome: input.payload.outcome,
    cleanupBatchPath: input.cleanupBatchPath,
    filesChanged: input.payload.filesChanged,
    changeSummary: input.payload.changeSummary,
    gatesRun: input.payload.gatesRun,
    unresolvedConcerns: input.payload.unresolvedConcerns,
    recommendedNextStep: input.payload.recommendedNextStep,
  };
}

export async function runEpicCleanup(input: {
  specPackRoot: string;
  cleanupBatchPath: string;
  configPath?: string;
  env?: Record<string, string | undefined>;
}): Promise<EpicCleanupWorkflowResult> {
  const context = await prepareCleanupContext(input);
  if ("errors" in context) {
    return {
      outcome: "blocked",
      errors: context.errors,
      warnings: [],
    };
  }

  if (!hasApprovedCleanupItems(context.cleanupBatchContent)) {
    return {
      outcome: "cleaned",
      result: {
        resultId: randomUUID(),
        outcome: "cleaned",
        cleanupBatchPath: context.cleanupBatchPath,
        filesChanged: [],
        changeSummary:
          "No approved cleanup corrections remained, so the cleanup pass was a no-op.",
        gatesRun: [],
        unresolvedConcerns: [],
        recommendedNextStep:
          "Review the cleanup result, then launch epic verification.",
      },
      errors: [],
      warnings: [],
    };
  }

  const adapter = createProviderAdapter(context.provider, {
    env: input.env,
  });
  const execution = await adapter.execute({
    prompt: buildCleanupPrompt(context),
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

  const result = buildCleanupResult({
    cleanupBatchPath: context.cleanupBatchPath,
    payload: execution.parsedResult,
  });

  return {
    outcome: result.outcome,
    result,
    errors: [],
    warnings: [],
  };
}
