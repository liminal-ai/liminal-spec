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
      if (request.resumeSessionId) {
        return {
          provider: "copilot" as const,
          stdout: "",
          stderr: "Copilot continuation is not supported for retained implementor sessions in v1.",
          exitCode: 1,
          errorCode: "CONTINUATION_HANDLE_INVALID",
        };
      }

      const execution = await runProviderCommand({
        provider: "copilot",
        executable: "copilot",
        args: ["-p", request.prompt, "-s", "--model", request.model],
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
        sessionId: parsed.sessionId,
        parsedResult: parsed.parsedResult,
        parseError: parsed.parseError,
      };
    },
  };
}
