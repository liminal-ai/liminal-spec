import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { z } from "zod";

const execFileAsync = promisify(execFile);

export type ProviderName = "claude-code" | "codex" | "copilot";

export interface ProviderExecutionRequest<TResult> {
  prompt: string;
  cwd: string;
  model: string;
  reasoningEffort: string;
  resumeSessionId?: string;
  timeoutMs: number;
  resultSchema?: z.ZodType<TResult>;
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

export async function runProviderCommand(params: {
  provider: ProviderName;
  executable: string;
  args: string[];
  cwd: string;
  env?: Record<string, string | undefined>;
  timeoutMs: number;
}): Promise<{
  provider: ProviderName;
  stdout: string;
  stderr: string;
  exitCode: number;
  errorCode?: string;
}> {
  try {
    const result = await execFileAsync(params.executable, params.args, {
      cwd: params.cwd,
      env: {
        ...process.env,
        ...params.env,
      },
      timeout: params.timeoutMs,
    });

    return {
      provider: params.provider,
      stdout: redactSensitiveText(result.stdout.trim()),
      stderr: redactSensitiveText(result.stderr.trim()),
      exitCode: 0,
    };
  } catch (error) {
    const failed = error as {
      code?: string | number;
      stdout?: string;
      stderr?: string;
      message?: string;
    };

    return {
      provider: params.provider,
      stdout: redactSensitiveText(failed.stdout?.trim() ?? ""),
      stderr: redactSensitiveText(
        failed.stderr?.trim() ?? failed.message ?? String(error)
      ),
      exitCode:
        typeof failed.code === "number" ? failed.code : 1,
      errorCode:
        typeof failed.code === "string" ? failed.code : undefined,
    };
  }
}
