import { spawn } from "node:child_process";

export interface CodexSmokeResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export async function runCodexSmokeCheck(params: {
  repoRoot: string;
  model?: string;
  codexBin?: string;
  timeoutMs?: number;
}): Promise<CodexSmokeResult> {
  const codexBin = params.codexBin || process.env.CODEX_IMPL_CODEX_BIN || "codex";
  const timeoutMs = params.timeoutMs ?? 10_000;
  const model = params.model ?? "gpt-5.4";

  const args = [
    "exec",
    "--json",
    "--dangerously-bypass-approvals-and-sandbox",
    "--model",
    model,
    "-c",
    'model_reasoning_effort="low"',
    "-C",
    params.repoRoot,
    "Reply with OK only.",
  ];

  const child = spawn(codexBin, args, {
    cwd: params.repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
  }, timeoutMs);

  const exitCode = await new Promise<number | null>((resolve) => {
    child.on("error", () => {
      clearTimeout(timer);
      timedOut = false;
      resolve(-1);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });

  return {
    ok: !timedOut && exitCode === 0,
    exitCode,
    stdout,
    stderr,
    timedOut,
  };
}
