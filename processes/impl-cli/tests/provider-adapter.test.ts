import { chmod, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
  ROOT,
  createSpecPack,
  createTempDir,
  readJsonLines,
  writeFakeProviderExecutable,
  writeTextFile,
} from "./test-helpers";

async function writeProviderBinary(params: {
  dir: string;
  name: string;
  version: string;
  authStatus?: "authenticated" | "missing";
  authBehavior?: "normal" | "timeout" | "unknown" | "unsupported";
  captureCwdPath?: string;
  failureStderr?: string;
  authFailureStderr?: string;
}) {
  const authStatus = params.authStatus ?? "authenticated";
  const scriptPath = join(params.dir, params.name);
  const script = [
    "#!/bin/sh",
    params.captureCwdPath
      ? `printf '%s' \"$PWD\" > "${params.captureCwdPath}"`
      : "",
    'if [ "$1" = "--version" ]; then',
    params.failureStderr
      ? `  echo "${params.failureStderr}" >&2`
      : "",
    `  echo "${params.version}"`,
    "  exit 0",
    "fi",
    'if [ "$1" = "auth" ] && [ "$2" = "status" ]; then',
    params.authBehavior === "timeout"
      ? "  sleep 2"
      : params.authBehavior === "unsupported"
        ? `  echo "${params.authFailureStderr ?? "unexpected auth invocation"}" >&2`
      : params.authBehavior === "unknown"
        ? `  echo "${params.authFailureStderr ?? "transient provider failure"}" >&2`
        : authStatus === "authenticated"
          ? '  echo "authenticated"'
          : '  echo "missing" >&2',
    params.authBehavior === "timeout"
      ? "  exit 0"
      : params.authBehavior === "unsupported"
        ? "  exit 1"
      : params.authBehavior === "unknown"
        ? "  exit 70"
        : authStatus === "authenticated"
          ? "  exit 0"
          : "  exit 1",
    "fi",
    'echo "unexpected invocation" >&2',
    "exit 1",
    "",
  ].join("\n");
  await writeTextFile(scriptPath, script);
  await chmod(scriptPath, 0o755);
}

describe("provider availability checks", () => {
  test("resolves requested provider availability from real subprocess calls against PATH binaries", async () => {
    const { resolveProviderMatrix } = await import("../core/provider-checks");

    const specPackRoot = await createSpecPack("provider-checks-available");
    const providerBinDir = await createTempDir("provider-bin-available");
    await writeProviderBinary({
      dir: providerBinDir,
      name: "claude",
      version: "claude 1.0.0",
    });
    await writeProviderBinary({
      dir: providerBinDir,
      name: "codex",
      version: "codex 2.0.0",
    });

    const providerMatrix = await resolveProviderMatrix({
      specPackRoot,
      config: {
        version: 1,
        primary_harness: "claude-code",
        story_implementor: {
          secondary_harness: "codex",
          model: "gpt-5.4",
          reasoning_effort: "high",
        },
        quick_fixer: {
          secondary_harness: "codex",
          model: "gpt-5.4",
          reasoning_effort: "medium",
        },
        story_verifier_1: {
          secondary_harness: "codex",
          model: "gpt-5.4",
          reasoning_effort: "xhigh",
        },
        story_verifier_2: {
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
        self_review: {
          passes: 3,
        },
        epic_verifiers: [
          {
            label: "epic-verifier-1",
            secondary_harness: "codex",
            model: "gpt-5.4",
            reasoning_effort: "xhigh",
          },
        ],
        epic_synthesizer: {
          secondary_harness: "codex",
          model: "gpt-5.4",
          reasoning_effort: "xhigh",
        },
      },
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
      },
    });

    expect(providerMatrix.primary).toMatchObject({
      harness: "claude-code",
      available: true,
      tier: "authenticated-known",
      authStatus: "authenticated",
      version: "claude 1.0.0",
    });
    expect(providerMatrix.secondary).toContainEqual(
      expect.objectContaining({
        harness: "codex",
        available: true,
        tier: "authenticated-known",
        authStatus: "authenticated",
        version: "codex 2.0.0",
      })
    );
  });

  test("marks requested providers unavailable when the binary is missing or unauthenticated", async () => {
    const { resolveProviderMatrix } = await import("../core/provider-checks");

    const specPackRoot = await createSpecPack("provider-checks-missing");
    const providerBinDir = await createTempDir("provider-bin-missing");
    await mkdir(providerBinDir, { recursive: true });
    await writeProviderBinary({
      dir: providerBinDir,
      name: "claude",
      version: "claude 1.0.0",
    });
    await writeProviderBinary({
      dir: providerBinDir,
      name: "copilot",
      version: "copilot 3.0.0",
      authStatus: "missing",
    });

    const providerMatrix = await resolveProviderMatrix({
      specPackRoot,
      config: {
        version: 1,
        primary_harness: "claude-code",
        story_implementor: {
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
        quick_fixer: {
          secondary_harness: "copilot",
          model: "gpt-5.4",
          reasoning_effort: "medium",
        },
        story_verifier_1: {
          secondary_harness: "copilot",
          model: "gpt-5.4",
          reasoning_effort: "xhigh",
        },
        story_verifier_2: {
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
        self_review: {
          passes: 2,
        },
        epic_verifiers: [
          {
            label: "epic-verifier-1",
            secondary_harness: "copilot",
            model: "gpt-5.4",
            reasoning_effort: "xhigh",
          },
        ],
        epic_synthesizer: {
          secondary_harness: "copilot",
          model: "gpt-5.4",
          reasoning_effort: "xhigh",
        },
      },
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
      },
    });

    expect(providerMatrix.secondary).toContainEqual(
      expect.objectContaining({
        harness: "copilot",
        available: false,
        tier: "unavailable",
        authStatus: "missing",
      })
    );
  });

  test("runs provider availability checks from the repo root and redacts sensitive stderr details", async () => {
    const { resolveProviderMatrix } = await import("../core/provider-checks");

    const specPackRoot = await createSpecPack("provider-checks-cwd-redaction");
    const providerBinDir = await createTempDir("provider-bin-cwd-redaction");
    const cwdCapturePath = join(providerBinDir, "cwd.txt");
    await writeProviderBinary({
      dir: providerBinDir,
      name: "claude",
      version: "claude 1.0.0",
      captureCwdPath: cwdCapturePath,
    });
    await writeProviderBinary({
      dir: providerBinDir,
      name: "codex",
      version: "codex 2.0.0",
      authBehavior: "unknown",
      authFailureStderr: "Bearer secret-token-123",
    });

    const providerMatrix = await resolveProviderMatrix({
      specPackRoot,
      config: {
        version: 1,
        primary_harness: "claude-code",
        story_implementor: {
          secondary_harness: "codex",
          model: "gpt-5.4",
          reasoning_effort: "high",
        },
        quick_fixer: {
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "medium",
        },
        story_verifier_1: {
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
        story_verifier_2: {
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
        self_review: {
          passes: 2,
        },
        epic_verifiers: [
          {
            label: "epic-verifier-1",
            secondary_harness: "none",
            model: "claude-sonnet",
            reasoning_effort: "high",
          },
        ],
        epic_synthesizer: {
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
      },
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
      },
    });

    expect(await Bun.file(cwdCapturePath).text()).toBe(ROOT);
    expect(providerMatrix.secondary).toContainEqual(
      expect.objectContaining({
        harness: "codex",
        available: true,
        tier: "auth-unknown",
        authStatus: "unknown",
      })
    );
    const codexProvider = providerMatrix.secondary.find(
      (provider) => provider.harness === "codex"
    );
    expect(codexProvider?.notes.join(" ")).toContain("Bearer [REDACTED]");
    expect(codexProvider?.notes.join(" ")).not.toContain("secret-token-123");
  });

  test("treats provider auth timeouts as unavailable with unknown auth status", async () => {
    const { resolveProviderMatrix } = await import("../core/provider-checks");

    const specPackRoot = await createSpecPack("provider-checks-timeout");
    const providerBinDir = await createTempDir("provider-bin-timeout");
    await writeProviderBinary({
      dir: providerBinDir,
      name: "claude",
      version: "claude 1.0.0",
    });
    await writeProviderBinary({
      dir: providerBinDir,
      name: "copilot",
      version: "copilot 3.0.0",
      authBehavior: "timeout",
    });

    const providerMatrix = await resolveProviderMatrix({
      specPackRoot,
      config: {
        version: 1,
        primary_harness: "claude-code",
        story_implementor: {
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
        quick_fixer: {
          secondary_harness: "copilot",
          model: "gpt-5.4",
          reasoning_effort: "medium",
        },
        story_verifier_1: {
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
        story_verifier_2: {
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
        self_review: {
          passes: 2,
        },
        epic_verifiers: [
          {
            label: "epic-verifier-1",
            secondary_harness: "none",
            model: "claude-sonnet",
            reasoning_effort: "high",
          },
        ],
        epic_synthesizer: {
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
      },
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
      },
      timeoutMs: 250,
    });

    expect(providerMatrix.secondary).toContainEqual(
      expect.objectContaining({
        harness: "copilot",
        available: false,
        authStatus: "unknown",
      })
    );
  });

  test("TC-4.2a reuses the same Codex session id for self-review continuation instead of creating a fresh session", async () => {
    const { createCodexAdapter } = await import(
      "../core/provider-adapters/codex"
    );

    const providerBinDir = await createTempDir("provider-adapter-codex-resume");
    const sessionId = "codex-session-reuse-201";
    const { env, logPath } = await writeFakeProviderExecutable({
      binDir: providerBinDir,
      provider: "codex",
      responses: [
        {
          stdout: JSON.stringify({
            sessionId,
            result: {
              ok: true,
            },
          }),
        },
        {
          stdout: JSON.stringify({
            sessionId,
            result: {
              ok: true,
            },
          }),
        },
      ],
    });
    const adapter = createCodexAdapter({
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    });

    const initial = await adapter.execute({
      prompt: "{\"step\":\"implement\"}",
      cwd: ROOT,
      model: "gpt-5.4",
      reasoningEffort: "high",
      timeoutMs: 1_000,
    });
    const resumed = await adapter.execute({
      prompt: "{\"step\":\"self-review\"}",
      cwd: ROOT,
      model: "gpt-5.4",
      reasoningEffort: "high",
      resumeSessionId: sessionId,
      timeoutMs: 1_000,
    });

    expect(initial.sessionId).toBe(sessionId);
    expect(resumed.sessionId).toBe(sessionId);

    const invocations = await readJsonLines<{ args: string[] }>(logPath);
    expect(invocations[0]?.args).toEqual([
      "exec",
      "--json",
      "-m",
      "gpt-5.4",
      "-c",
      "model_reasoning_effort=high",
      "{\"step\":\"implement\"}",
    ]);
    expect(invocations[1]?.args).toEqual([
      "exec",
      "resume",
      "--json",
      sessionId,
      "{\"step\":\"self-review\"}",
    ]);
  });

  test("uses an explicit Claude resume flag and never falls back to latest-session-by-cwd continuation", async () => {
    const { createClaudeCodeAdapter } = await import(
      "../core/provider-adapters/claude-code"
    );

    const providerBinDir = await createTempDir("provider-adapter-claude-resume");
    const sessionId = "claude-session-reuse-202";
    const { env, logPath } = await writeFakeProviderExecutable({
      binDir: providerBinDir,
      provider: "claude",
      responses: [
        {
          stdout: JSON.stringify({
            sessionId,
            result: {
              ok: true,
            },
          }),
        },
        {
          stdout: JSON.stringify({
            sessionId,
            result: {
              ok: true,
            },
          }),
        },
      ],
    });
    const adapter = createClaudeCodeAdapter({
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    });

    await adapter.execute({
      prompt: "{\"step\":\"implement\"}",
      cwd: ROOT,
      model: "claude-sonnet",
      reasoningEffort: "high",
      timeoutMs: 1_000,
    });
    await adapter.execute({
      prompt: "{\"step\":\"self-review\"}",
      cwd: ROOT,
      model: "claude-sonnet",
      reasoningEffort: "high",
      resumeSessionId: sessionId,
      timeoutMs: 1_000,
    });

    const invocations = await readJsonLines<{ args: string[] }>(logPath);
    expect(invocations[1]?.args).toContain("--resume");
    expect(invocations[1]?.args).toContain(sessionId);
    expect(invocations[1]?.args).not.toContain("--continue");
  });

  test("launches fresh Codex executions without implicit resume when a verifier reruns", async () => {
    const { createCodexAdapter } = await import(
      "../core/provider-adapters/codex"
    );

    const providerBinDir = await createTempDir("provider-adapter-codex-fresh");
    const { env, logPath } = await writeFakeProviderExecutable({
      binDir: providerBinDir,
      provider: "codex",
      responses: [
        {
          stdout: JSON.stringify({
            sessionId: "codex-verifier-fresh-001",
            result: {
              ok: true,
            },
          }),
        },
        {
          stdout: JSON.stringify({
            sessionId: "codex-verifier-fresh-002",
            result: {
              ok: true,
            },
          }),
        },
      ],
    });
    const adapter = createCodexAdapter({
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    });

    const first = await adapter.execute({
      prompt: "{\"step\":\"verify-1\"}",
      cwd: ROOT,
      model: "gpt-5.4",
      reasoningEffort: "xhigh",
      timeoutMs: 1_000,
    });
    const second = await adapter.execute({
      prompt: "{\"step\":\"verify-2\"}",
      cwd: ROOT,
      model: "gpt-5.4",
      reasoningEffort: "xhigh",
      timeoutMs: 1_000,
    });

    expect(first.sessionId).toBe("codex-verifier-fresh-001");
    expect(second.sessionId).toBe("codex-verifier-fresh-002");

    const invocations = await readJsonLines<{ args: string[] }>(logPath);
    expect(invocations[0]?.args).toEqual([
      "exec",
      "--json",
      "-m",
      "gpt-5.4",
      "-c",
      "model_reasoning_effort=xhigh",
      "{\"step\":\"verify-1\"}",
    ]);
    expect(invocations[1]?.args).toEqual([
      "exec",
      "--json",
      "-m",
      "gpt-5.4",
      "-c",
      "model_reasoning_effort=xhigh",
      "{\"step\":\"verify-2\"}",
    ]);
  });

  test("launches fresh Claude executions without implicit resume when a verifier reruns", async () => {
    const { createClaudeCodeAdapter } = await import(
      "../core/provider-adapters/claude-code"
    );

    const providerBinDir = await createTempDir("provider-adapter-claude-fresh");
    const { env, logPath } = await writeFakeProviderExecutable({
      binDir: providerBinDir,
      provider: "claude",
      responses: [
        {
          stdout: JSON.stringify({
            sessionId: "claude-verifier-fresh-001",
            result: {
              ok: true,
            },
          }),
        },
        {
          stdout: JSON.stringify({
            sessionId: "claude-verifier-fresh-002",
            result: {
              ok: true,
            },
          }),
        },
      ],
    });
    const adapter = createClaudeCodeAdapter({
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    });

    const first = await adapter.execute({
      prompt: "{\"step\":\"verify-1\"}",
      cwd: ROOT,
      model: "claude-sonnet",
      reasoningEffort: "high",
      timeoutMs: 1_000,
    });
    const second = await adapter.execute({
      prompt: "{\"step\":\"verify-2\"}",
      cwd: ROOT,
      model: "claude-sonnet",
      reasoningEffort: "high",
      timeoutMs: 1_000,
    });

    expect(first.sessionId).toBe("claude-verifier-fresh-001");
    expect(second.sessionId).toBe("claude-verifier-fresh-002");

    const invocations = await readJsonLines<{ args: string[] }>(logPath);
    expect(invocations[0]?.args).not.toContain("--resume");
    expect(invocations[1]?.args).not.toContain("--resume");
  });

  test("launches fresh Copilot executions with prompt and model flags and parses the structured result", async () => {
    const { createCopilotAdapter } = await import(
      "../core/provider-adapters/copilot"
    );

    const providerBinDir = await createTempDir("provider-adapter-copilot-fresh");
    const sessionId = "copilot-verifier-fresh-001";
    const { env, logPath } = await writeFakeProviderExecutable({
      binDir: providerBinDir,
      provider: "copilot",
      responses: [
        {
          stdout: JSON.stringify({
            sessionId,
            result: {
              ok: true,
            },
          }),
        },
      ],
    });
    const adapter = createCopilotAdapter({
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    });

    const execution = await adapter.execute({
      prompt: "{\"step\":\"verify\"}",
      cwd: ROOT,
      model: "gpt-5.4",
      reasoningEffort: "xhigh",
      timeoutMs: 1_000,
      resultSchema: z.object({
        ok: z.boolean(),
      }),
    });

    expect(execution.exitCode).toBe(0);
    expect(execution.parseError).toBeUndefined();
    expect(execution.sessionId).toBe(sessionId);
    expect(execution.parsedResult).toEqual({
      ok: true,
    });

    const invocations = await readJsonLines<{ args: string[] }>(logPath);
    expect(invocations).toHaveLength(1);
    expect(invocations[0]?.args).toEqual([
      "-p",
      "{\"step\":\"verify\"}",
      "-s",
      "--model",
      "gpt-5.4",
    ]);
    expect(invocations[0]?.args).not.toContain("resume");
  });

  test("rejects Copilot retained-session requests with CONTINUATION_HANDLE_INVALID", async () => {
    const { createCopilotAdapter } = await import(
      "../core/provider-adapters/copilot"
    );

    const adapter = createCopilotAdapter();
    const execution = await adapter.execute({
      prompt: "{\"step\":\"self-review\"}",
      cwd: ROOT,
      model: "gpt-5.4",
      reasoningEffort: "high",
      resumeSessionId: "copilot-session-reuse-301",
      timeoutMs: 1_000,
      resultSchema: z.object({
        ok: z.boolean(),
      }),
    });

    expect(execution.exitCode).toBe(1);
    expect(execution.errorCode).toBe("CONTINUATION_HANDLE_INVALID");
    expect(execution.stderr).toContain("not supported");
  });

  test("parses provider-native JSON when the final text field contains the expected payload object", async () => {
    const { createCodexAdapter } = await import(
      "../core/provider-adapters/codex"
    );

    const providerBinDir = await createTempDir("provider-adapter-text-wrapper");
    const { env } = await writeFakeProviderExecutable({
      binDir: providerBinDir,
      provider: "codex",
      responses: [
        {
          stdout: JSON.stringify({
            sessionId: "codex-parse-text-001",
            text: JSON.stringify({
              ok: true,
            }),
          }),
        },
      ],
    });
    const adapter = createCodexAdapter({
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    });

    const execution = await adapter.execute({
      prompt: "{\"step\":\"verify-text-wrapper\"}",
      cwd: ROOT,
      model: "gpt-5.4",
      reasoningEffort: "high",
      timeoutMs: 1_000,
      resultSchema: z.object({
        ok: z.boolean(),
      }),
    });

    expect(execution.exitCode).toBe(0);
    expect(execution.parseError).toBeUndefined();
    expect(execution.sessionId).toBe("codex-parse-text-001");
    expect(execution.parsedResult).toEqual({
      ok: true,
    });
  });

  test("parses raw stdout when it is exactly the expected payload object", async () => {
    const { createCodexAdapter } = await import(
      "../core/provider-adapters/codex"
    );

    const providerBinDir = await createTempDir("provider-adapter-naked-payload");
    const { env } = await writeFakeProviderExecutable({
      binDir: providerBinDir,
      provider: "codex",
      responses: [
        {
          stdout: JSON.stringify({
            ok: true,
          }),
        },
      ],
    });
    const adapter = createCodexAdapter({
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    });

    const execution = await adapter.execute({
      prompt: "{\"step\":\"verify-naked-payload\"}",
      cwd: ROOT,
      model: "gpt-5.4",
      reasoningEffort: "high",
      timeoutMs: 1_000,
      resultSchema: z.object({
        ok: z.boolean(),
      }),
    });

    expect(execution.exitCode).toBe(0);
    expect(execution.parseError).toBeUndefined();
    expect(execution.parsedResult).toEqual({
      ok: true,
    });
  });
});
