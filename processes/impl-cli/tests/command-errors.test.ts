import { describe, expect, test } from "bun:test";

describe("command error classification", () => {
  test("maps ConfigLoadError instances to INVALID_RUN_CONFIG", async () => {
    const { ConfigLoadError } = await import("../core/config-schema");
    const { classifyCommandError } = await import("../core/command-errors");

    expect(
      classifyCommandError(new ConfigLoadError("Malformed run-config JSON."))
    ).toEqual({
      code: "INVALID_RUN_CONFIG",
      outcome: "blocked",
    });
  });

  test("does not misclassify unrelated errors that merely mention config", async () => {
    const { classifyCommandError } = await import("../core/command-errors");

    expect(
      classifyCommandError(new Error("provider config drift in downstream output"))
    ).toEqual({
      code: "UNEXPECTED_ERROR",
      outcome: "error",
    });
  });
});
