import { createClaudeCodeAdapter } from "./claude-code";
import { createCodexAdapter } from "./codex";
import { createCopilotAdapter } from "./copilot";
import type { ProviderAdapter, ProviderName } from "./shared";

interface ProviderAdapterOptions {
  env?: Record<string, string | undefined>;
}

export type {
  ProviderAdapter,
  ProviderExecutionRequest,
  ProviderExecutionResult,
  ProviderLifecycleEvent,
  ProviderName,
  ProviderStreamOutputPaths,
} from "./shared";

export function createProviderAdapter(
  provider: ProviderName,
  options: ProviderAdapterOptions = {}
): ProviderAdapter {
  switch (provider) {
    case "claude-code":
      return createClaudeCodeAdapter(options);
    case "codex":
      return createCodexAdapter(options);
    case "copilot":
      return createCopilotAdapter(options);
  }
}
