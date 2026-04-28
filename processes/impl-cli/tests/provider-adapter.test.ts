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

function codexJsonlEventStream(threadId: string, finalText: string): string {
  return [
    JSON.stringify({
      type: "thread.started",
      thread_id: threadId,
    }),
    JSON.stringify({
      type: "item.completed",
      item: {
        id: "item_1",
        type: "agent_message",
        text: finalText,
      },
    }),
    JSON.stringify({
      type: "turn.completed",
    }),
  ].join("\n");
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
        story_verifier: {
          secondary_harness: "codex",
          model: "gpt-5.4",
          reasoning_effort: "xhigh",
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
        tier: "binary-present",
        authStatus: "unknown",
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
        story_verifier: {
          secondary_harness: "copilot",
          model: "gpt-5.4",
          reasoning_effort: "xhigh",
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
        story_verifier: {
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
        tier: "binary-present",
        authStatus: "unknown",
      })
    );
    const codexProvider = providerMatrix.secondary.find(
      (provider) => provider.harness === "codex"
    );
    expect(codexProvider?.notes.join(" ")).toContain(
      "No non-mutating auth status command is available for codex."
    );
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
        story_verifier: {
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
          stdout: codexJsonlEventStream(
            sessionId,
            JSON.stringify({
              ok: true,
            })
          ),
          lastMessage: JSON.stringify({
            ok: true,
          }),
        },
        {
          stdout: codexJsonlEventStream(
            sessionId,
            JSON.stringify({
              ok: true,
            })
          ),
          lastMessage: JSON.stringify({
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

    const initial = await adapter.execute({
      prompt: "{\"step\":\"implement\"}",
      cwd: ROOT,
      model: "gpt-5.4",
      reasoningEffort: "high",
      timeoutMs: 1_000,
      resultSchema: z.object({
        ok: z.boolean(),
      }),
    });
    const resumed = await adapter.execute({
      prompt: "{\"step\":\"self-review\"}",
      cwd: ROOT,
      model: "gpt-5.4",
      reasoningEffort: "high",
      resumeSessionId: sessionId,
      timeoutMs: 1_000,
      resultSchema: z.object({
        ok: z.boolean(),
      }),
    });

    expect(initial.sessionId).toBe(sessionId);
    expect(resumed.sessionId).toBe(sessionId);
    expect(initial.parsedResult).toEqual({
      ok: true,
    });
    expect(resumed.parsedResult).toEqual({
      ok: true,
    });

    const invocations = await readJsonLines<{ args: string[] }>(logPath);
    expect(invocations[0]?.args.slice(0, 6)).toEqual([
      "exec",
      "--json",
      "-m",
      "gpt-5.4",
      "-c",
      "model_reasoning_effort=high",
    ]);
    expect(invocations[0]?.args).toContain("--output-schema");
    expect(invocations[0]?.args).toContain("-o");
    expect(invocations[0]?.args).not.toContain("resume");
    expect(invocations[0]?.args[invocations[0].args.length - 1]).toBe(
      "{\"step\":\"implement\"}"
    );
    expect(invocations[1]?.args.slice(0, 3)).toEqual([
      "exec",
      "resume",
      "--json",
    ]);
    expect(invocations[1]?.args).toContain("-o");
    expect(invocations[1]?.args).toContain(sessionId);
    expect(invocations[1]?.args).not.toContain("--output-schema");
    expect(invocations[1]?.args[invocations[1].args.length - 1]).toBe(
      "{\"step\":\"self-review\"}"
    );
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
    expect(invocations[0]?.args).toContain("--effort");
    expect(invocations[0]?.args).toContain("high");
    expect(invocations[1]?.args).toContain("--resume");
    expect(invocations[1]?.args).toContain(sessionId);
    expect(invocations[1]?.args).toContain("--effort");
    expect(invocations[1]?.args).toContain("high");
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
          stdout: codexJsonlEventStream(
            "codex-verifier-fresh-001",
            JSON.stringify({
              ok: true,
            })
          ),
          lastMessage: JSON.stringify({
            ok: true,
          }),
        },
        {
          stdout: codexJsonlEventStream(
            "codex-verifier-fresh-002",
            JSON.stringify({
              ok: true,
            })
          ),
          lastMessage: JSON.stringify({
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

    const first = await adapter.execute({
      prompt: "{\"step\":\"verify-1\"}",
      cwd: ROOT,
      model: "gpt-5.4",
      reasoningEffort: "xhigh",
      timeoutMs: 1_000,
      resultSchema: z.object({
        ok: z.boolean(),
      }),
    });
    const second = await adapter.execute({
      prompt: "{\"step\":\"verify-2\"}",
      cwd: ROOT,
      model: "gpt-5.4",
      reasoningEffort: "xhigh",
      timeoutMs: 1_000,
      resultSchema: z.object({
        ok: z.boolean(),
      }),
    });

    expect(first.sessionId).toBe("codex-verifier-fresh-001");
    expect(second.sessionId).toBe("codex-verifier-fresh-002");

    const invocations = await readJsonLines<{ args: string[] }>(logPath);
    expect(invocations[0]?.args.slice(0, 6)).toEqual([
      "exec",
      "--json",
      "-m",
      "gpt-5.4",
      "-c",
      "model_reasoning_effort=xhigh",
    ]);
    expect(invocations[0]?.args).toContain("--output-schema");
    expect(invocations[0]?.args).toContain("-o");
    expect(invocations[0]?.args[invocations[0].args.length - 1]).toBe(
      "{\"step\":\"verify-1\"}"
    );
    expect(invocations[1]?.args.slice(0, 6)).toEqual([
      "exec",
      "--json",
      "-m",
      "gpt-5.4",
      "-c",
      "model_reasoning_effort=xhigh",
    ]);
    expect(invocations[1]?.args).toContain("--output-schema");
    expect(invocations[1]?.args).toContain("-o");
    expect(invocations[1]?.args[invocations[1].args.length - 1]).toBe(
      "{\"step\":\"verify-2\"}"
    );
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
    expect(invocations[0]?.args).toContain("--effort");
    expect(invocations[0]?.args).toContain("high");
    expect(invocations[1]?.args).toContain("--effort");
    expect(invocations[1]?.args).toContain("high");
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
          stdout: [
            JSON.stringify({
              type: "assistant.message",
              data: {
                content: JSON.stringify({
                  ok: true,
                }),
              },
            }),
            JSON.stringify({
              type: "result",
              sessionId,
              exitCode: 0,
            }),
          ].join("\n"),
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
      "--allow-all-tools",
      "--no-custom-instructions",
      "--output-format",
      "json",
      "--model",
      "gpt-5.4",
      "--effort",
      "xhigh",
    ]);
    expect(invocations[0]?.args).not.toContain("resume");
  });

  test("resumes Copilot retained sessions with the real resume flag and parses JSONL content", async () => {
    const { createCopilotAdapter } = await import(
      "../core/provider-adapters/copilot"
    );

    const providerBinDir = await createTempDir("provider-adapter-copilot-resume");
    const sessionId = "copilot-session-reuse-301";
    const { env, logPath } = await writeFakeProviderExecutable({
      binDir: providerBinDir,
      provider: "copilot",
      responses: [
        {
          stdout: [
            JSON.stringify({
              type: "assistant.message",
              data: {
                content: JSON.stringify({
                  ok: true,
                }),
              },
            }),
            JSON.stringify({
              type: "result",
              sessionId,
              exitCode: 0,
            }),
          ].join("\n"),
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
      prompt: "{\"step\":\"self-review\"}",
      cwd: ROOT,
      model: "gpt-5.4",
      reasoningEffort: "high",
      resumeSessionId: sessionId,
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
      `--resume=${sessionId}`,
      "-p",
      "{\"step\":\"self-review\"}",
      "--allow-all-tools",
      "--no-custom-instructions",
      "--output-format",
      "json",
      "--model",
      "gpt-5.4",
      "--effort",
      "high",
    ]);
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

  test("parses real Codex JSONL event streams when the final last-message file contains the structured payload", async () => {
    const { createCodexAdapter } = await import(
      "../core/provider-adapters/codex"
    );

    const providerBinDir = await createTempDir("provider-adapter-codex-jsonl");
    const sessionId = "codex-jsonl-parse-401";
    const { env } = await writeFakeProviderExecutable({
      binDir: providerBinDir,
      provider: "codex",
      responses: [
        {
          stdout: codexJsonlEventStream(
            sessionId,
            JSON.stringify({
              ok: true,
            })
          ),
          lastMessage: JSON.stringify({
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
      prompt: "{\"step\":\"verify-jsonl\"}",
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
    expect(execution.sessionId).toBe(sessionId);
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

  test("closes stdin for subprocesses that would otherwise block reading from stdin and streams output to disk", async () => {
    const { runProviderCommand } = await import(
      "../core/provider-adapters/shared"
    );

    const streamDir = await createTempDir("provider-runner-stdin-close");
    const stdoutPath = join(streamDir, "stdin-close.stdout.log");
    const stderrPath = join(streamDir, "stdin-close.stderr.log");
    const execution = await runProviderCommand({
      provider: "codex",
      executable: "sh",
      args: ["-lc", "read x; echo done"],
      cwd: ROOT,
      timeoutMs: 1_000,
      streamOutputPaths: {
        stdoutPath,
        stderrPath,
      },
    });

    expect(execution.exitCode).toBe(0);
    expect(execution.stdout).toBe("done");
    expect(await Bun.file(stdoutPath).text()).toBe("done\n");
    expect(await Bun.file(stderrPath).text()).toBe("");
  });

  test("classifies provider timeouts explicitly instead of collapsing them into generic execution failures", async () => {
    const { runProviderCommand } = await import(
      "../core/provider-adapters/shared"
    );

    const execution = await runProviderCommand({
      provider: "codex",
      executable: "sh",
      args: ["-lc", "sleep 2"],
      cwd: ROOT,
      timeoutMs: 50,
    });

    expect(execution.exitCode).toBe(124);
    expect(execution.errorCode).toBe("PROVIDER_TIMEOUT");
    expect(execution.timedOut).toBe(true);
    expect(execution.stderr).toContain("Provider timed out after");
  });
});
