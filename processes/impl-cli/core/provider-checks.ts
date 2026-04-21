import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { ImplRunConfig, SecondaryHarness } from "./config-schema";
import { resolveGitRepoRoot } from "./git-repo";
import type { HarnessAvailability, ProviderMatrix } from "./result-contracts";

const execFileAsync = promisify(execFile);
const DEFAULT_PROVIDER_CHECK_TIMEOUT_MS = 1_000;

function redactSensitiveText(text: string): string {
  return text
    .replace(/\bBearer\s+[A-Za-z0-9._-]+\b/gi, "Bearer [REDACTED]")
    .replace(/\b(token|auth|authorization|api[_-]?key)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
}

async function runCommand(params: {
  file: string;
  args: string[];
  cwd: string;
  env?: Record<string, string | undefined>;
  timeoutMs: number;
}) {
  try {
    const result = await execFileAsync(params.file, params.args, {
      cwd: params.cwd,
      env: {
        ...process.env,
        ...params.env,
      },
      timeout: params.timeoutMs,
    });
    return {
      success: true as const,
      stdout: redactSensitiveText(result.stdout.trim()),
      stderr: redactSensitiveText(result.stderr.trim()),
    };
  } catch (error) {
    const failed = error as {
      stdout?: string;
      stderr?: string;
      code?: string | number;
      message?: string;
      killed?: boolean;
      signal?: string;
    };
    return {
      success: false as const,
      stdout: redactSensitiveText(failed.stdout?.trim() ?? ""),
      stderr: redactSensitiveText(
        failed.stderr?.trim() ?? failed.message ?? String(error)
      ),
      code: failed.code,
      timedOut: failed.signal === "SIGTERM" || failed.killed === true,
    };
  }
}

function executableForHarness(harness: "claude-code" | SecondaryHarness): string | null {
  switch (harness) {
    case "claude-code":
      return "claude";
    case "codex":
      return "codex";
    case "copilot":
      return "copilot";
    case "none":
      return null;
  }
}

function authCommandForHarness(
  harness: "claude-code" | SecondaryHarness
): string[] | undefined {
  switch (harness) {
    case "claude-code":
    case "codex":
    case "copilot":
      return ["auth", "status"];
    case "none":
      return undefined;
  }
}

function failureNotes(result: {
  stderr: string;
  timedOut?: boolean;
  code?: string | number;
}, executable: string, step: string): string[] {
  if (result.stderr) {
    return [result.stderr];
  }

  if (result.timedOut) {
    return [`${executable} ${step} timed out`];
  }

  return [`Unable to execute ${executable} ${step}`];
}

function looksLikeMissingAuthCommand(stderr: string): boolean {
  const lower = stderr.toLowerCase();
  return lower.includes("unexpected auth invocation");
}

function looksLikeExplicitAuthFailure(stderr: string): boolean {
  const lower = stderr.toLowerCase();
  return (
    lower.includes("missing") ||
    lower.includes("not logged in") ||
    lower.includes("unauth") ||
    lower.includes("sign in")
  );
}

async function checkHarnessAvailability(input: {
  harness: "claude-code" | SecondaryHarness;
  cwd: string;
  env?: Record<string, string | undefined>;
  timeoutMs: number;
}): Promise<HarnessAvailability> {
  const executable = executableForHarness(input.harness);
  if (!executable) {
    return {
      harness: "none",
      available: true,
      tier: "binary-present",
      authStatus: "unknown",
      notes: [],
    };
  }

  const version = await runCommand({
    file: executable,
    args: ["--version"],
    cwd: input.cwd,
    env: input.env,
    timeoutMs: input.timeoutMs,
  });
  if (!version.success) {
    return {
      harness: input.harness,
      available: false,
      tier: "unavailable",
      authStatus: version.code === "ENOENT" ? "missing" : "unknown",
      notes: failureNotes(version, executable, "--version"),
    };
  }

  const authCommand = authCommandForHarness(input.harness);
  if (!authCommand) {
    return {
      harness: input.harness,
      available: true,
      tier: "binary-present",
      version: version.stdout,
      authStatus: "unknown",
      notes: [
        `No non-mutating auth status command is available for ${input.harness}.`,
      ],
    };
  }

  const auth = await runCommand({
    file: executable,
    args: authCommand,
    cwd: input.cwd,
    env: input.env,
    timeoutMs: input.timeoutMs,
  });
  if (!auth.success) {
    if (looksLikeMissingAuthCommand(auth.stderr)) {
      return {
        harness: input.harness,
        available: true,
        tier: "binary-present",
        version: version.stdout,
        authStatus: "unknown",
        notes: failureNotes(auth, executable, "auth status"),
      };
    }

    if (!auth.timedOut && !looksLikeExplicitAuthFailure(auth.stderr)) {
      return {
        harness: input.harness,
        available: true,
        tier: "auth-unknown",
        version: version.stdout,
        authStatus: "unknown",
        notes: failureNotes(auth, executable, "auth status"),
      };
    }

    return {
      harness: input.harness,
      available: false,
      tier: "unavailable",
      version: version.stdout,
      authStatus: looksLikeExplicitAuthFailure(auth.stderr) ? "missing" : "unknown",
      notes: failureNotes(auth, executable, "auth status"),
    };
  }

  return {
    harness: input.harness,
    available: true,
    tier: "authenticated-known",
    version: version.stdout,
    authStatus: "authenticated",
    notes: auth.stdout ? [auth.stdout] : [],
  };
}

function requestedSecondaryHarnesses(config: ImplRunConfig): SecondaryHarness[] {
  const harnesses = new Set<SecondaryHarness>();
  for (const assignment of [
    config.story_implementor,
    config.quick_fixer,
    config.story_verifier_1,
    config.story_verifier_2,
    ...config.epic_verifiers,
    config.epic_synthesizer,
  ]) {
    if (assignment.secondary_harness !== "none") {
      harnesses.add(assignment.secondary_harness);
    }
  }
  return [...harnesses];
}

export async function resolveProviderMatrix(input: {
  specPackRoot: string;
  config: ImplRunConfig;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
}): Promise<ProviderMatrix> {
  const cwd = (await resolveGitRepoRoot(input.specPackRoot)) ?? input.specPackRoot;
  const timeoutMs = input.timeoutMs ?? DEFAULT_PROVIDER_CHECK_TIMEOUT_MS;
  const primary = await checkHarnessAvailability({
    harness: "claude-code",
    cwd,
    env: input.env,
    timeoutMs,
  });
  const secondary: HarnessAvailability[] = [];

  for (const harness of requestedSecondaryHarnesses(input.config)) {
    secondary.push(
      await checkHarnessAvailability({
        harness,
        cwd,
        env: input.env,
        timeoutMs,
      })
    );
  }

  return {
    primary,
    secondary,
  };
}
