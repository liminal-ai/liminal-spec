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
      const args = request.resumeSessionId
        ? [
            "exec",
            "resume",
            "--json",
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
            request.prompt,
          ];
      const execution = await runProviderCommand({
        provider: "codex",
        executable: "codex",
        args,
        cwd: request.cwd,
        env: options.env,
        timeoutMs: request.timeoutMs,
      });

      if (execution.exitCode !== 0) {
        return execution;
      }

      const parsed = parseProviderPayload({
        stdout: execution.stdout,
        resultSchema: request.resultSchema,
      });

      return {
        ...execution,
        sessionId: parsed.sessionId ?? request.resumeSessionId,
        parsedResult: parsed.parsedResult,
        parseError: parsed.parseError,
      };
    },
  };
}
