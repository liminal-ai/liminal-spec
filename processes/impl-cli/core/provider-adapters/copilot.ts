import {
  parseProviderPayload,
  runProviderCommand,
  type ProviderAdapter,
  type ProviderExecutionRequest,
} from "./shared";

interface CopilotAdapterOptions {
  env?: Record<string, string | undefined>;
}

export function createCopilotAdapter(
  options: CopilotAdapterOptions = {}
): ProviderAdapter {
  return {
    provider: "copilot",
    async execute<TResult>(
      request: ProviderExecutionRequest<TResult>
    ) {
      const execution = await runProviderCommand({
        provider: "copilot",
        executable: "copilot",
        args: [
          ...(request.resumeSessionId
            ? [`--resume=${request.resumeSessionId}`]
            : []),
          "-p",
          request.prompt,
          "--output-format",
          "json",
          "--model",
          request.model,
          "--effort",
          request.reasoningEffort,
        ],
        cwd: request.cwd,
        env: options.env,
        timeoutMs: request.timeoutMs,
        streamOutputPaths: request.streamOutputPaths,
        lifecycleCallback: request.lifecycleCallback,
      });

      if (execution.exitCode !== 0) {
        return execution;
      }

      const parsed = parseProviderPayload({
        stdout: execution.stdout,
        resultSchema: request.resultSchema,
      }) ??
        undefined;
      const copilotParsed =
        parseCopilotJsonlPayload({
          stdout: execution.stdout,
          resultSchema: request.resultSchema,
        }) ?? parsed;

      return {
        ...execution,
        sessionId: copilotParsed.sessionId ?? request.resumeSessionId,
        parsedResult: copilotParsed.parsedResult,
        parseError: copilotParsed.parseError,
      };
    },
  };
}

function parseCopilotJsonlPayload<TResult>(input: {
  stdout: string;
  resultSchema?: ProviderExecutionRequest<TResult>["resultSchema"];
}):
  | {
      parsedResult?: TResult;
      sessionId?: string;
      parseError?: string;
    }
  | undefined {
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

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as unknown;
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        continue;
      }

      const record = entry as Record<string, unknown>;
      if (typeof record.type === "string") {
        sawEventStream = true;
      }

      if (typeof record.sessionId === "string" && record.sessionId.length > 0) {
        sessionId = record.sessionId;
      }
    } catch {}
  }

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const entry = JSON.parse(lines[index] ?? "") as unknown;
      const candidates = extractCopilotPayloadCandidates(entry);
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

  return sessionId || lastParseError
    ? {
        ...(sessionId ? { sessionId } : {}),
        ...(lastParseError ? { parseError: lastParseError } : {}),
      }
    : undefined;
}

function extractCopilotPayloadCandidates(entry: unknown): string[] {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return [];
  }

  const candidates: string[] = [];
  const record = entry as Record<string, unknown>;
  const pushCandidate = (value: unknown) => {
    if (typeof value === "string" && value.trim().length > 0) {
      candidates.push(value);
    }
  };

  pushCandidate(record.text);
  pushCandidate(record.result);

  const data = record.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const dataRecord = data as Record<string, unknown>;
    pushCandidate(dataRecord.content);
    pushCandidate(dataRecord.text);
    pushCandidate(dataRecord.result);
  }

  return candidates;
}
