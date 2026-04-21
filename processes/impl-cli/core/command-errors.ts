import { ConfigLoadError } from "./config-schema";

export function classifyCommandError(
  error: unknown,
  blockedOutcome: "blocked" | "block" = "blocked"
): {
  code: "INVALID_RUN_CONFIG" | "UNEXPECTED_ERROR";
  outcome: "blocked" | "block" | "error";
} {
  if (error instanceof ConfigLoadError) {
    return {
      code: "INVALID_RUN_CONFIG",
      outcome: blockedOutcome,
    };
  }

  return {
    code: "UNEXPECTED_ERROR",
    outcome: "error",
  };
}
