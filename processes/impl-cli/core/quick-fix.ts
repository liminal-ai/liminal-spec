import { isAbsolute, relative, resolve } from "node:path";

import { loadRunConfig } from "./config-schema";
import { resolveGitRepoRoot } from "./git-repo";
import { createProviderAdapter, type ProviderName } from "./provider-adapters";
import type { CliError } from "./result-contracts";

interface QuickFixResultPayload {
  provider: ProviderName;
  model: string;
  rawProviderOutput: string;
}

export interface QuickFixWorkflowResult {
  outcome: "ready-for-verification" | "needs-more-routing" | "blocked";
  result?: QuickFixResultPayload;
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

function isWithinRoot(root: string, target: string): boolean {
  const relativePath = relative(root, target);
  return (
    relativePath.length === 0 ||
    (!relativePath.startsWith("..") && !isAbsolute(relativePath))
  );
}

async function resolveWorkingDirectory(input: {
  specPackRoot: string;
  workingDirectory?: string;
}): Promise<{ workingDirectory?: string; errors?: CliError[] }> {
  const repoRoot = await resolveGitRepoRoot(input.specPackRoot);
  if (!repoRoot) {
    return {
      errors: [
        blockedError(
          "INVALID_SPEC_PACK",
          `Spec-pack root is not inside a git repo: ${resolve(input.specPackRoot)}`
        ),
      ],
    };
  }

  if (input.workingDirectory) {
    const workingDirectory = resolve(input.workingDirectory);
    if (!isWithinRoot(repoRoot, workingDirectory)) {
      return {
        errors: [
          blockedError(
            "INVALID_WORKING_DIRECTORY",
            "Quick-fix working directory must stay inside the resolved repo root.",
            `repoRoot=${repoRoot}; workingDirectory=${workingDirectory}`
          ),
        ],
      };
    }

    return {
      workingDirectory,
    };
  }

  return {
    workingDirectory: repoRoot,
  };
}

export async function runQuickFix(input: {
  specPackRoot: string;
  request: string;
  workingDirectory?: string;
  configPath?: string;
  env?: Record<string, string | undefined>;
}): Promise<QuickFixWorkflowResult> {
  const config = await loadRunConfig({
    specPackRoot: input.specPackRoot,
    configPath: input.configPath,
  });
  const provider = providerForHarness(config.quick_fixer.secondary_harness);
  const workingDirectoryResolution = await resolveWorkingDirectory({
    specPackRoot: input.specPackRoot,
    workingDirectory: input.workingDirectory,
  });
  if (workingDirectoryResolution.errors) {
    return {
      outcome: "blocked",
      errors: workingDirectoryResolution.errors,
      warnings: [],
    };
  }
  const workingDirectory = workingDirectoryResolution.workingDirectory;
  if (!workingDirectory) {
    return {
      outcome: "blocked",
      errors: [
        blockedError(
          "INVALID_WORKING_DIRECTORY",
          "Quick-fix working directory could not be resolved."
        ),
      ],
      warnings: [],
    };
  }
  const adapter = createProviderAdapter(provider, {
    env: input.env,
  });
  const execution = await adapter.execute({
    prompt: input.request,
    cwd: workingDirectory,
    model: config.quick_fixer.model,
    reasoningEffort: config.quick_fixer.reasoning_effort,
    timeoutMs: 30_000,
  });

  if (execution.exitCode !== 0) {
    return {
      outcome: "blocked",
      errors: [
        executionFailureError({
          provider,
          stderr: execution.stderr,
          errorCode: execution.errorCode,
        }),
      ],
      warnings: [],
    };
  }

  const rawProviderOutput = execution.stdout;
  if (rawProviderOutput.trim().length === 0) {
    return {
      outcome: "needs-more-routing",
      result: {
        provider,
        model: config.quick_fixer.model,
        rawProviderOutput,
      },
      errors: [],
      warnings: [
        "Quick-fix provider returned no stdout; inspect the run and choose the next routing step explicitly.",
      ],
    };
  }

  return {
    outcome: "ready-for-verification",
    result: {
      provider,
      model: config.quick_fixer.model,
      rawProviderOutput,
    },
    errors: [],
    warnings: [],
  };
}
