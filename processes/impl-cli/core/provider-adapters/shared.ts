import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { z } from "zod";

export type ProviderName = "claude-code" | "codex" | "copilot";

export type ProviderLifecycleEvent =
  | {
      type: "provider-spawned";
      pid: number | null;
      timestamp: string;
    }
  | {
      type: "output";
      stream: "stdout" | "stderr";
      timestamp: string;
    }
  | {
      type: "stalled";
      silenceMs: number;
      configuredSilenceTimeoutMs: number;
      configuredStartupTimeoutMs: number;
      timestamp: string;
    }
  | {
      type: "timeout";
      elapsedMs: number;
      configuredTimeoutMs: number;
      timestamp: string;
    }
  | {
      type: "provider-exit";
      exitCode: number;
      signal: NodeJS.Signals | null;
      elapsedMs: number;
      configuredTimeoutMs: number;
      timestamp: string;
    };

export interface ProviderStreamOutputPaths {
  stdoutPath?: string;
  stderrPath?: string;
}

export interface ProviderExecutionRequest<TResult> {
  prompt: string;
  cwd: string;
  model: string;
  reasoningEffort: string;
  resumeSessionId?: string;
  timeoutMs: number;
  startupTimeoutMs?: number;
  silenceTimeoutMs?: number;
  resultSchema?: z.ZodType<TResult>;
  streamOutputPaths?: ProviderStreamOutputPaths;
  lifecycleCallback?: (
    event: ProviderLifecycleEvent
  ) => void | Promise<void>;
}

export interface ProviderExecutionResult<TResult> {
  provider: ProviderName;
  sessionId?: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  parsedResult?: TResult;
  parseError?: string;
  errorCode?: string;
  signal?: NodeJS.Signals | null;
  timedOut?: boolean;
  elapsedMs?: number;
  configuredTimeoutMs?: number;
}

export interface ProviderAdapter {
  provider: ProviderName;
  execute<TResult>(
    request: ProviderExecutionRequest<TResult>
  ): Promise<ProviderExecutionResult<TResult>>;
}

function redactSensitiveText(text: string): string {
  return text
    .replace(/\bBearer\s+[A-Za-z0-9._-]+\b/gi, "Bearer [REDACTED]")
    .replace(/\b(token|auth|authorization|api[_-]?key)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
}

function extractSessionId(value: Record<string, unknown>): string | undefined {
  for (const key of ["sessionId", "session_id"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return undefined;
}

function parseNestedJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function formatIssuePath(path: ReadonlyArray<PropertyKey>): string {
  if (path.length === 0) {
    return "<root>";
  }

  return path.reduce<string>((formatted, segment) => {
    if (typeof segment === "number") {
      return `${formatted}[${segment}]`;
    }

    const label = typeof segment === "symbol" ? segment.toString() : segment;
    return formatted.length === 0 ? label : `${formatted}.${label}`;
  }, "");
}

function formatZodIssue(issue: z.ZodIssue): string {
  if (issue.code === "unrecognized_keys") {
    return `unexpected key(s) at ${formatIssuePath(issue.path)}: ${issue.keys.join(", ")}`;
  }

  if (issue.path.length === 0) {
    return issue.message;
  }

  return `${formatIssuePath(issue.path)}: ${issue.message}`;
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map(formatZodIssue).join("; ");
}

export function parseProviderPayload<TResult>(input: {
  stdout: string;
  resultSchema?: z.ZodType<TResult>;
}): {
  parsedResult?: TResult;
  sessionId?: string;
  parseError?: string;
} {
  const trimmed = input.stdout.trim();
  if (trimmed.length === 0) {
    return {
      parseError: "Provider stdout was empty.",
    };
  }

  let root: unknown;
  try {
    root = JSON.parse(trimmed);
  } catch {
    return {
      parseError: "Provider stdout was not exact JSON.",
    };
  }

  if (!root || typeof root !== "object" || Array.isArray(root)) {
    return {
      parseError: "Provider stdout was not a JSON object.",
    };
  }

  const rootRecord = root as Record<string, unknown>;
  const resultSchema = input.resultSchema ?? z.unknown();
  const direct = resultSchema.safeParse(rootRecord);
  if (direct.success) {
    return {
      parsedResult: direct.data as TResult,
      sessionId: extractSessionId(rootRecord),
    };
  }

  const parseDiagnostics = [`direct payload: ${formatZodError(direct.error)}`];
  for (const field of ["result", "text"]) {
    if (!(field in rootRecord)) {
      continue;
    }

    const nested = parseNestedJson(rootRecord[field]);
    if (typeof rootRecord[field] === "string" && nested === undefined) {
      parseDiagnostics.push(`${field} payload: wrapper value was not valid JSON`);
      continue;
    }

    const parsed = resultSchema.safeParse(nested);
    if (parsed.success) {
      return {
        parsedResult: parsed.data as TResult,
        sessionId: extractSessionId(rootRecord),
      };
    }

    parseDiagnostics.push(`${field} payload: ${formatZodError(parsed.error)}`);
  }

  return {
    parseError: `Provider output did not match the expected JSON payload. ${parseDiagnostics.join("; ")}`,
  };
}

async function ensureStreamDirectories(
  streamOutputPaths: ProviderStreamOutputPaths | undefined
): Promise<void> {
  const paths = [
    streamOutputPaths?.stdoutPath,
    streamOutputPaths?.stderrPath,
  ].filter((path): path is string => typeof path === "string" && path.length > 0);

  await Promise.all(
    paths.map((path) =>
      mkdir(dirname(path), {
        recursive: true,
      })
    )
  );
}

function closeStream(
  stream: ReturnType<typeof createWriteStream> | undefined
): Promise<void> {
  if (!stream) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    stream.end(() => resolve());
  });
}

export async function runProviderCommand(params: {
  provider: ProviderName;
  executable: string;
  args: string[];
  cwd: string;
  env?: Record<string, string | undefined>;
  timeoutMs: number;
  startupTimeoutMs?: number;
  silenceTimeoutMs?: number;
  streamOutputPaths?: ProviderStreamOutputPaths;
  lifecycleCallback?: (
    event: ProviderLifecycleEvent
  ) => void | Promise<void>;
}): Promise<{
  provider: ProviderName;
  stdout: string;
  stderr: string;
  exitCode: number;
  errorCode?: string;
  signal?: NodeJS.Signals | null;
  timedOut?: boolean;
  elapsedMs?: number;
  configuredTimeoutMs?: number;
}> {
  await ensureStreamDirectories(params.streamOutputPaths);

  const stdoutStream = params.streamOutputPaths?.stdoutPath
    ? createWriteStream(params.streamOutputPaths.stdoutPath, {
        flags: "a",
      })
    : undefined;
  const stderrStream = params.streamOutputPaths?.stderrPath
    ? createWriteStream(params.streamOutputPaths.stderrPath, {
        flags: "a",
      })
    : undefined;
  const startedAt = Date.now();
  const emitLifecycleEvent = (event: ProviderLifecycleEvent) => {
    void params.lifecycleCallback?.(event);
  };

  return await new Promise((resolveResult) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    let stalled = false;
    let forceKillTimer: ReturnType<typeof setTimeout> | undefined;
    let startupTimeout: ReturnType<typeof setTimeout> | undefined;
    let silenceTimeout: ReturnType<typeof setTimeout> | undefined;
    let firstOutputReceived = false;

    const child = spawn(params.executable, params.args, {
      cwd: params.cwd,
      env: {
        ...process.env,
        ...params.env,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    emitLifecycleEvent({
      type: "provider-spawned",
      pid: child.pid ?? null,
      timestamp: new Date().toISOString(),
    });

    const finish = async (result: {
      provider: ProviderName;
      stdout: string;
      stderr: string;
      exitCode: number;
      errorCode?: string;
      signal?: NodeJS.Signals | null;
      timedOut?: boolean;
      elapsedMs?: number;
      configuredTimeoutMs?: number;
    }) => {
      if (settled) {
        return;
      }
      settled = true;

      if (timeout) {
        clearTimeout(timeout);
      }
      if (startupTimeout) {
        clearTimeout(startupTimeout);
      }
      if (silenceTimeout) {
        clearTimeout(silenceTimeout);
      }
      if (forceKillTimer) {
        clearTimeout(forceKillTimer);
      }

      await Promise.all([closeStream(stdoutStream), closeStream(stderrStream)]);
      resolveResult(result);
    };

    const armSilenceTimeout = (timestamp: number) => {
      if (params.silenceTimeoutMs === undefined || params.silenceTimeoutMs <= 0) {
        return;
      }

      if (silenceTimeout) {
        clearTimeout(silenceTimeout);
      }

      silenceTimeout = setTimeout(() => {
        if (settled) {
          return;
        }
        stalled = true;
        emitLifecycleEvent({
          type: "stalled",
          silenceMs: Date.now() - timestamp,
          configuredSilenceTimeoutMs: params.silenceTimeoutMs ?? 0,
          configuredStartupTimeoutMs: params.startupTimeoutMs ?? 0,
          timestamp: new Date().toISOString(),
        });
        child.kill("SIGTERM");
        forceKillTimer = setTimeout(() => {
          child.kill("SIGKILL");
        }, 1_000);
      }, params.silenceTimeoutMs);
    };

    child.stdin.on("error", () => {
      // Ignore EPIPE-like noise if the provider exits before stdin closes.
    });
    child.stdin.end();

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      stdoutStream?.write(text);
      const outputTimestamp = Date.now();
      if (!firstOutputReceived) {
        firstOutputReceived = true;
        if (startupTimeout) {
          clearTimeout(startupTimeout);
        }
      }
      armSilenceTimeout(outputTimestamp);
      emitLifecycleEvent({
        type: "output",
        stream: "stdout",
        timestamp: new Date().toISOString(),
      });
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      stderrStream?.write(text);
      const outputTimestamp = Date.now();
      if (!firstOutputReceived) {
        firstOutputReceived = true;
        if (startupTimeout) {
          clearTimeout(startupTimeout);
        }
      }
      armSilenceTimeout(outputTimestamp);
      emitLifecycleEvent({
        type: "output",
        stream: "stderr",
        timestamp: new Date().toISOString(),
      });
    });

    child.on("error", async (error) => {
      const message = error instanceof Error ? error.message : String(error);
      await finish({
        provider: params.provider,
        stdout: redactSensitiveText(stdout.trim()),
        stderr: redactSensitiveText((stderr || message).trim()),
        exitCode: 1,
        errorCode:
          error instanceof Error && "code" in error && typeof error.code === "string"
            ? error.code
            : undefined,
        signal: null,
        timedOut,
        elapsedMs: Date.now() - startedAt,
        configuredTimeoutMs: params.timeoutMs,
      });
    });

    child.on("close", async (code, signal) => {
      const elapsedMs = Date.now() - startedAt;
      emitLifecycleEvent({
        type: "provider-exit",
        exitCode: typeof code === "number" ? code : timedOut ? 124 : 1,
        signal,
        elapsedMs,
        configuredTimeoutMs: params.timeoutMs,
        timestamp: new Date().toISOString(),
      });
      const timeoutMessage =
        stalled
          ? `Provider stalled after ${elapsedMs}ms without sufficient output activity.`
          : timedOut || signal === "SIGTERM" || signal === "SIGKILL"
            ? `Provider timed out after ${elapsedMs}ms (configured ${params.timeoutMs}ms).`
            : "";
      const finalStderr =
        (timedOut || stalled) && stderr.trim().length === 0 ? timeoutMessage : stderr;

      if ((timedOut || stalled) && timeoutMessage.length > 0 && stderrStream) {
        stderrStream.write(
          `${finalStderr.endsWith("\n") ? "" : "\n"}${timeoutMessage}\n`
        );
      }

      await finish({
        provider: params.provider,
        stdout: redactSensitiveText(stdout.trim()),
        stderr: redactSensitiveText(finalStderr.trim()),
        exitCode: typeof code === "number" ? code : timedOut ? 124 : 1,
        errorCode: stalled
          ? "PROVIDER_STALLED"
          : timedOut
            ? "PROVIDER_TIMEOUT"
            : undefined,
        signal,
        timedOut,
        elapsedMs,
        configuredTimeoutMs: params.timeoutMs,
      });
    });

    const timeout =
      params.timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            emitLifecycleEvent({
              type: "timeout",
              elapsedMs: Date.now() - startedAt,
              configuredTimeoutMs: params.timeoutMs,
              timestamp: new Date().toISOString(),
            });
            child.kill("SIGTERM");
            forceKillTimer = setTimeout(() => {
              child.kill("SIGKILL");
            }, 1_000);
          }, params.timeoutMs)
        : undefined;

    startupTimeout =
      params.startupTimeoutMs && params.startupTimeoutMs > 0
        ? setTimeout(() => {
            if (settled || firstOutputReceived) {
              return;
            }
            stalled = true;
            emitLifecycleEvent({
              type: "stalled",
              silenceMs: params.startupTimeoutMs ?? 0,
              configuredSilenceTimeoutMs: params.silenceTimeoutMs ?? 0,
              configuredStartupTimeoutMs: params.startupTimeoutMs ?? 0,
              timestamp: new Date().toISOString(),
            });
            child.kill("SIGTERM");
            forceKillTimer = setTimeout(() => {
              child.kill("SIGKILL");
            }, 1_000);
          }, params.startupTimeoutMs)
        : undefined;
  });
}
