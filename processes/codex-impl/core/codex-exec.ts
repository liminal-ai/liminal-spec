import { createWriteStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import type { PrimitiveSlug } from "./state";

export interface PrimitiveModelProfile {
  model: string;
  reasoningEffort: "high" | "xhigh";
}

export interface CodexExecOptions {
  cwd: string;
  codexBin?: string;
  promptPath: string;
  stdoutPath: string;
  stderrPath: string;
  statusPath: string;
  schemaPath: string;
  primitiveSlug: PrimitiveSlug;
  profile: PrimitiveModelProfile;
  heartbeatMs?: number;
  pollIntervalMs?: number;
}

export interface CodexExecResult {
  outcome: "success" | "stall" | "error";
  exitCode: number | null;
  durationMs: number;
}

export async function runCodexExec(
  options: CodexExecOptions
): Promise<CodexExecResult> {
  const prompt = await readFile(options.promptPath, "utf8");
  const codexBin = options.codexBin || process.env.CODEX_IMPL_CODEX_BIN || "codex";
  const heartbeatMs = options.heartbeatMs ?? 300_000;
  const pollIntervalMs = options.pollIntervalMs ?? 5_000;

  const args = [
    "exec",
    "--json",
    "--dangerously-bypass-approvals-and-sandbox",
    "--model",
    options.profile.model,
    "-c",
    `model_reasoning_effort="${options.profile.reasoningEffort}"`,
    "-C",
    options.cwd,
    "--output-schema",
    options.schemaPath,
    "-o",
    options.statusPath,
    "-",
  ];

  const startedAt = Date.now();
  const child = spawn(codexBin, args, {
    cwd: options.cwd,
    stdio: ["pipe", "pipe", "pipe"],
  });

  const stdoutStream = createWriteStream(options.stdoutPath, { flags: "w" });
  const stderrStream = createWriteStream(options.stderrPath, { flags: "w" });
  child.stdout.pipe(stdoutStream);
  child.stderr.pipe(stderrStream);
  child.stdin.end(prompt);

  let lastActivityAt = Date.now();
  let previousSizes = { stdout: 0, stderr: 0 };
  let stalled = false;

  const updateActivity = async () => {
    const [stdoutSize, stderrSize] = await Promise.all([
      readSize(options.stdoutPath),
      readSize(options.stderrPath),
    ]);

    if (
      stdoutSize > previousSizes.stdout ||
      stderrSize > previousSizes.stderr
    ) {
      previousSizes = { stdout: stdoutSize, stderr: stderrSize };
      lastActivityAt = Date.now();
      return;
    }

    if (Date.now() - lastActivityAt >= heartbeatMs) {
      stalled = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        child.kill("SIGKILL");
      }, 2_000);
    }
  };

  const interval = setInterval(() => {
    void updateActivity();
  }, pollIntervalMs);

  const exitCode = await new Promise<number | null>((resolve) => {
    child.on("error", () => {
      clearInterval(interval);
      stdoutStream.end();
      stderrStream.end();
      resolve(-1);
    });
    child.on("close", (code) => {
      clearInterval(interval);
      stdoutStream.end();
      stderrStream.end();
      resolve(code);
    });
  });

  const durationMs = Date.now() - startedAt;

  if (stalled) {
    return {
      outcome: "stall",
      exitCode,
      durationMs,
    };
  }

  if (exitCode !== 0) {
    return {
      outcome: "error",
      exitCode,
      durationMs,
    };
  }

  return {
    outcome: "success",
    exitCode,
    durationMs,
  };
}

async function readSize(path: string): Promise<number> {
  try {
    const result = await stat(path);
    return result.size;
  } catch {
    return 0;
  }
}
