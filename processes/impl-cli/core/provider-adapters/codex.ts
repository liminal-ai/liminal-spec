import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { z } from "zod";

import {
  buildStrictCodexOutputSchema,
  extractCodexStructuredOutputError,
} from "./codex-output-schema";
import {
  parseProviderPayload,
  runProviderCommand,
  type ProviderAdapter,
  type ProviderExecutionRequest,
} from "./shared";

interface CodexAdapterOptions {
  env?: Record<string, string | undefined>;
}

export function createCodexAdapter(
  options: CodexAdapterOptions = {}
): ProviderAdapter {
  return {
    provider: "codex",
    async execute<TResult>(
      request: ProviderExecutionRequest<TResult>
    ) {
      const tempDir = await mkdtemp(join(tmpdir(), "ls-impl-cli-codex-"));
      const outputLastMessagePath = join(tempDir, "output-last-message.json");
      const outputSchemaPath = join(tempDir, "output-schema.json");

      try {
        if (request.resultSchema && !request.resumeSessionId) {
          await writeFile(
            outputSchemaPath,
            `${JSON.stringify(buildStrictCodexOutputSchema(request.resultSchema), null, 2)}\n`
          );
        }

        const args = request.resumeSessionId
          ? [
              "exec",
              "resume",
              "--json",
              "-o",
              outputLastMessagePath,
              request.resumeSessionId,
              request.prompt,
            ]
          : [
              "exec",
              "--json",
              "-m",
              request.model,
              "-c",
              `model_reasoning_effort=${request.reasoningEffort}`,
              ...(request.resultSchema
                ? ["--output-schema", outputSchemaPath]
                : []),
              "-o",
              outputLastMessagePath,
              request.prompt,
            ];
        const execution = await runProviderCommand({
          provider: "codex",
          executable: "codex",
          args,
          cwd: request.cwd,
          env: options.env,
          timeoutMs: request.timeoutMs,
          streamOutputPaths: request.streamOutputPaths,
          lifecycleCallback: request.lifecycleCallback,
        });

        if (execution.exitCode !== 0) {
          const structuredOutputError = extractCodexStructuredOutputError(
            execution.stdout
          );
          return {
            ...execution,
            stderr: structuredOutputError ?? execution.stderr,
            errorCode:
              structuredOutputError &&
              structuredOutputError.includes("invalid_json_schema")
                ? "INVALID_OUTPUT_SCHEMA"
                : execution.errorCode,
          };
        }

        const outputLastMessage = await readOptionalFile(outputLastMessagePath);
        const parsed =
          parseCodexStructuredOutput({
            outputLastMessage,
            stdout: execution.stdout,
            resultSchema: request.resultSchema,
          }) ??
          parseProviderPayload({
            stdout: execution.stdout,
            resultSchema: request.resultSchema,
          });
        const sessionId =
          extractSessionIdFromCodexJsonl(execution.stdout) ??
          parsed.sessionId ??
          request.resumeSessionId;

        return {
          ...execution,
          sessionId,
          parsedResult: parsed.parsedResult,
          parseError: parsed.parseError,
        };
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    },
  };
}

async function readOptionalFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

function parseCodexStructuredOutput<TResult>(input: {
  outputLastMessage?: string;
  stdout: string;
  resultSchema?: z.ZodType<TResult>;
}): 
  | {
      parsedResult?: TResult;
      sessionId?: string;
      parseError?: string;
    }
  | undefined {
  let outputLastMessageParseError: string | undefined;

  if (typeof input.outputLastMessage === "string") {
    const parsed = parseProviderPayload({
      stdout: input.outputLastMessage,
      resultSchema: input.resultSchema,
    });

    if (!parsed.parseError || parsed.parsedResult) {
      return parsed;
    }

    outputLastMessageParseError = parsed.parseError;
  }

  const jsonlParsed = parseCodexJsonlPayload({
    stdout: input.stdout,
    resultSchema: input.resultSchema,
  });

  if (jsonlParsed?.parsedResult || !outputLastMessageParseError) {
    return jsonlParsed;
  }

  return {
    ...jsonlParsed,
    parseError: outputLastMessageParseError,
  };
}

function parseCodexJsonlPayload<TResult>(input: {
  stdout: string;
  resultSchema?: z.ZodType<TResult>;
}): {
  parsedResult?: TResult;
  sessionId?: string;
  parseError?: string;
} | undefined {
  const lines = input.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return undefined;
  }

  let sessionId: string | undefined;
  let lastParseError: string | undefined;
  let sawEventStream = false;

  for (let index = 0; index < lines.length; index += 1) {
    try {
      const entry = JSON.parse(lines[index] ?? "") as unknown;
      sawEventStream ||= isCodexEventStreamEntry(entry);
      sessionId ||= extractSessionIdFromCodexJsonlValue(entry);
    } catch {}
  }

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const entry = JSON.parse(lines[index] ?? "") as unknown;
      const candidates = extractPayloadCandidatesFromCodexJsonlEntry(entry);

      for (const candidate of candidates) {
        const parsed = parseProviderPayload({
          stdout: candidate,
          resultSchema: input.resultSchema,
        });

        if (!parsed.parseError || parsed.parsedResult) {
          return {
            ...parsed,
            sessionId: sessionId ?? parsed.sessionId,
          };
        }

        lastParseError = parsed.parseError;
      }
    } catch {}
  }

  if (!sawEventStream) {
    return undefined;
  }

  return sessionId
    ? {
        sessionId,
        ...(lastParseError
          ? {
              parseError: lastParseError,
            }
          : {}),
      }
    : undefined;
}

function isCodexEventStreamEntry(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.type === "string" ||
    typeof record.thread_id === "string" ||
    typeof record.threadId === "string" ||
    (record.item !== undefined && typeof record.item === "object")
  );
}

function extractPayloadCandidatesFromCodexJsonlEntry(entry: unknown): string[] {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return [];
  }

  const record = entry as Record<string, unknown>;
  const candidates: string[] = [];
  const pushCandidate = (value: unknown) => {
    if (typeof value !== "string" || value.trim().length === 0) {
      return;
    }
    candidates.push(value);
  };

  pushCandidate(record.text);
  pushCandidate(record.result);

  const item = record.item;
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const itemRecord = item as Record<string, unknown>;
    pushCandidate(itemRecord.text);
    pushCandidate(itemRecord.result);
  }

  return candidates;
}

function extractSessionIdFromCodexJsonl(stdout: string): string | undefined {
  const lines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as unknown;
      const sessionId = extractSessionIdFromCodexJsonlValue(parsed);
      if (sessionId) {
        return sessionId;
      }
    } catch {}
  }

  return undefined;
}

function extractSessionIdFromCodexJsonlValue(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const sessionCandidate = record.sessionId ?? record.session_id;
  if (typeof sessionCandidate === "string" && sessionCandidate.trim().length > 0) {
    return sessionCandidate.trim();
  }

  const threadCandidate = record.thread_id ?? record.threadId;
  if (typeof threadCandidate === "string" && threadCandidate.trim().length > 0) {
    return threadCandidate.trim();
  }

  const nestedItem = record.item;
  if (nestedItem && typeof nestedItem === "object" && !Array.isArray(nestedItem)) {
    return extractSessionIdFromCodexJsonlValue(nestedItem);
  }

  return undefined;
}
