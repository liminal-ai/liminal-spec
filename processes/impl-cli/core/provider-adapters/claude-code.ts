import {
  parseProviderPayload,
  runProviderCommand,
  type ProviderAdapter,
  type ProviderExecutionRequest,
} from "./shared";

interface ClaudeCodeAdapterOptions {
  env?: Record<string, string | undefined>;
}

export function createClaudeCodeAdapter(
  options: ClaudeCodeAdapterOptions = {}
): ProviderAdapter {
  return {
    provider: "claude-code",
    async execute<TResult>(
      request: ProviderExecutionRequest<TResult>
    ) {
      const args = request.resumeSessionId
        ? [
            "-p",
            request.prompt,
            "--resume",
            request.resumeSessionId,
            "--output-format",
            "json",
            "--model",
            request.model,
            "--effort",
            request.reasoningEffort,
          ]
        : [
            "-p",
            request.prompt,
            "--output-format",
            "json",
            "--model",
            request.model,
            "--effort",
            request.reasoningEffort,
            "--permission-mode",
            "acceptEdits",
          ];
      const execution = await runProviderCommand({
        provider: "claude-code",
        executable: "claude",
        args,
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
