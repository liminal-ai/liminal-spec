import { isAbsolute, relative, resolve } from "node:path";

import { loadRunConfig, resolveRunTimeouts } from "./config-schema";
import { resolveGitRepoRoot } from "./git-repo";
import {
  createProviderAdapter,
  type ProviderLifecycleEvent,
  type ProviderName,
} from "./provider-adapters";
import type { ProviderStreamOutputPaths } from "./provider-adapters";
import type { CliError } from "./result-contracts";
import {
  RuntimeProgressTracker,
  type RuntimeProgressPaths,
} from "./runtime-progress";

interface QuickFixResultPayload {
  provider: ProviderName;
  model: string;
  rawProviderOutputPreview: string;
  rawProviderOutputBytes: number;
  rawProviderOutputTruncated: boolean;
  rawProviderOutputLogPath: string;
}

export interface QuickFixWorkflowResult {
  outcome: "ready-for-verification" | "needs-more-routing" | "blocked";
  result?: QuickFixResultPayload;
  errors: CliError[];
  warnings: string[];
}

const QUICK_FIX_OUTPUT_PREVIEW_BYTES = 8_192;

function buildQuickFixOutputPreview(rawProviderOutput: string): {
  preview: string;
  bytes: number;
  truncated: boolean;
} {
  const bytes = Buffer.byteLength(rawProviderOutput, "utf8");
  if (bytes <= QUICK_FIX_OUTPUT_PREVIEW_BYTES) {
    return {
      preview: rawProviderOutput,
      bytes,
      truncated: false,
    };
  }

  return {
    preview: Buffer.from(rawProviderOutput, "utf8")
      .subarray(0, QUICK_FIX_OUTPUT_PREVIEW_BYTES)
      .toString("utf8"),
    bytes,
    truncated: true,
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
  artifactPath?: string;
  streamOutputPaths?: ProviderStreamOutputPaths;
  runtimeProgressPaths?: RuntimeProgressPaths;
}): Promise<QuickFixWorkflowResult> {
  const config = await loadRunConfig({
    specPackRoot: input.specPackRoot,
    configPath: input.configPath,
  });
  const timeouts = resolveRunTimeouts(config);
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
  const progressTracker = input.runtimeProgressPaths
    ? await RuntimeProgressTracker.start({
        command: "quick-fix",
        phase: "quick-fix",
        provider,
        cwd: workingDirectory,
        timeoutMs: timeouts.quick_fixer_ms,
        configuredStartupTimeoutMs: timeouts.provider_startup_timeout_ms,
        configuredSilenceTimeoutMs: timeouts.quick_fixer_silence_timeout_ms,
        artifactPath: input.artifactPath ?? input.runtimeProgressPaths.statusPath,
        streamPaths: {
          stdoutPath: input.streamOutputPaths?.stdoutPath ?? "",
          stderrPath: input.streamOutputPaths?.stderrPath ?? "",
        },
        progressPaths: input.runtimeProgressPaths,
      })
    : undefined;
  const adapter = createProviderAdapter(provider, {
    env: input.env,
  });
  const execution = await adapter.execute({
    prompt: input.request,
    cwd: workingDirectory,
    model: config.quick_fixer.model,
    reasoningEffort: config.quick_fixer.reasoning_effort,
    timeoutMs: timeouts.quick_fixer_ms,
    startupTimeoutMs: timeouts.provider_startup_timeout_ms,
    silenceTimeoutMs: timeouts.quick_fixer_silence_timeout_ms,
    streamOutputPaths: input.streamOutputPaths,
    lifecycleCallback: (event: ProviderLifecycleEvent) =>
      progressTracker?.handleProviderLifecycle(event),
  });

  if (execution.exitCode !== 0) {
    await progressTracker?.markFailed(`quick-fix failed for provider ${provider}.`, {
      errorCode: execution.errorCode,
    });
    await progressTracker?.flush();
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
  const outputPreview = buildQuickFixOutputPreview(rawProviderOutput);
  const rawProviderOutputLogPath =
    input.streamOutputPaths?.stdoutPath ?? "";
  if (rawProviderOutput.trim().length === 0) {
    await progressTracker?.markCompleted(
      "quick-fix completed without provider stdout and needs more routing.",
      {
        outcome: "needs-more-routing",
      }
    );
    await progressTracker?.flush();
    return {
      outcome: "needs-more-routing",
      result: {
        provider,
        model: config.quick_fixer.model,
        rawProviderOutputPreview: outputPreview.preview,
        rawProviderOutputBytes: outputPreview.bytes,
        rawProviderOutputTruncated: outputPreview.truncated,
        rawProviderOutputLogPath,
      },
      errors: [],
      warnings: [
        "Quick-fix provider returned no stdout; inspect the run and choose the next routing step explicitly.",
      ],
    };
  }

  await progressTracker?.markCompleted(
    "quick-fix completed and is ready for verification.",
    {
      outcome: "ready-for-verification",
    }
  );
  await progressTracker?.flush();

  return {
    outcome: "ready-for-verification",
    result: {
      provider,
      model: config.quick_fixer.model,
      rawProviderOutputPreview: outputPreview.preview,
      rawProviderOutputBytes: outputPreview.bytes,
      rawProviderOutputTruncated: outputPreview.truncated,
      rawProviderOutputLogPath,
    },
    errors: [],
    warnings: [],
  };
}
