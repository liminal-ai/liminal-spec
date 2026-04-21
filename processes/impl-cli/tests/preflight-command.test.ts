import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import {
  createSpecPack,
  createTempDir,
  parseJsonOutput,
  runSourceCli,
  writeTextFile,
} from "./test-helpers";

function codexBackedConfig() {
  return {
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
      {
        label: "epic-verifier-2",
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "high",
      },
    ],
    epic_synthesizer: {
      secondary_harness: "codex",
      model: "gpt-5.4",
      reasoning_effort: "xhigh",
    },
  };
}

function copilotFallbackConfig() {
  return {
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
      passes: 3,
    },
    epic_verifiers: [
      {
        label: "epic-verifier-1",
        secondary_harness: "copilot",
        model: "gpt-5.4",
        reasoning_effort: "xhigh",
      },
      {
        label: "epic-verifier-2",
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "high",
      },
    ],
    epic_synthesizer: {
      secondary_harness: "copilot",
      model: "gpt-5.4",
      reasoning_effort: "xhigh",
    },
  };
}

function claudeOnlyConfig() {
  return {
    version: 1,
    primary_harness: "claude-code",
    story_implementor: {
      secondary_harness: "none",
      model: "claude-sonnet",
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
  };
}

async function writeProviderBinary(params: {
  dir: string;
  name: string;
  version: string;
  authStatus?: "authenticated" | "missing";
}) {
  const authStatus = params.authStatus ?? "authenticated";
  const scriptPath = join(params.dir, params.name);
  const script = [
    "#!/bin/sh",
    'if [ "$1" = "--version" ]; then',
    `  echo "${params.version}"`,
    "  exit 0",
    "fi",
    'if [ "$1" = "auth" ] && [ "$2" = "status" ]; then',
    authStatus === "authenticated" ? '  echo "authenticated"' : '  echo "missing" >&2',
    authStatus === "authenticated" ? "  exit 0" : "  exit 1",
    "fi",
    'echo "unexpected invocation" >&2',
    "exit 1",
    "",
  ].join("\n");
  await writeTextFile(scriptPath, script);
  await chmod(scriptPath, 0o755);
}

async function setupProviderPath(
  scope: string,
  providers: Array<{
    name: string;
    version: string;
    authStatus?: "authenticated" | "missing";
  }>
) {
  const providerBinDir = await createTempDir(scope);
  for (const provider of providers) {
    await writeProviderBinary({
      dir: providerBinDir,
      ...provider,
    });
  }
  return `${providerBinDir}:${process.env.PATH ?? ""}`;
}

async function writeRunConfig(specPackRoot: string, config: unknown) {
  await writeTextFile(
    join(specPackRoot, "impl-run.config.json"),
    `${JSON.stringify(config, null, 2)}\n`
  );
}

describe("preflight command", () => {
  test("blocks with INVALID_RUN_CONFIG when the run-config JSON is malformed", async () => {
    const specPackRoot = await createSpecPack("preflight-invalid-json");
    await writeTextFile(
      join(specPackRoot, "impl-run.config.json"),
      "{ invalid json\n"
    );
    await writeTextFile(
      join(specPackRoot, "package.json"),
      JSON.stringify(
        {
          scripts: {
            "green-verify": "pnpm test:story",
            "verify-all": "pnpm test:epic",
          },
        },
        null,
        2
      )
    );
    const pathValue = await setupProviderPath("preflight-invalid-json-bins", [
      {
        name: "claude",
        version: "claude 1.0.0",
      },
    ]);

    const run = await runSourceCli(
      ["preflight", "--spec-pack-root", specPackRoot, "--json"],
      {
        env: {
          PATH: pathValue,
        },
      }
    );

    expect(run.exitCode).toBe(3);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("blocked");
    expect(envelope.outcome).toBe("blocked");
    expect(envelope.errors).toContainEqual(
      expect.objectContaining({
        code: "INVALID_RUN_CONFIG",
      })
    );
  });

  test("blocks with INVALID_RUN_CONFIG when required role assignments are missing", async () => {
    const specPackRoot = await createSpecPack("preflight-missing-role");
    await writeRunConfig(specPackRoot, {
      version: 1,
      primary_harness: "claude-code",
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
    });
    await writeTextFile(
      join(specPackRoot, "package.json"),
      JSON.stringify(
        {
          scripts: {
            "green-verify": "pnpm test:story",
            "verify-all": "pnpm test:epic",
          },
        },
        null,
        2
      )
    );
    const pathValue = await setupProviderPath("preflight-missing-role-bins", [
      {
        name: "claude",
        version: "claude 1.0.0",
      },
    ]);

    const run = await runSourceCli(
      ["preflight", "--spec-pack-root", specPackRoot, "--json"],
      {
        env: {
          PATH: pathValue,
        },
      }
    );

    expect(run.exitCode).toBe(3);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("blocked");
    expect(envelope.errors).toContainEqual(
      expect.objectContaining({
        code: "INVALID_RUN_CONFIG",
      })
    );
  });

  test("TC-1.6a discovers gates from project policy and carries them into readiness output", async () => {
    const specPackRoot = await createSpecPack("preflight-gates");
    await writeRunConfig(specPackRoot, codexBackedConfig());
    await writeTextFile(
      join(specPackRoot, "package.json"),
      JSON.stringify(
        {
          scripts: {
            "green-verify": "pnpm lint && pnpm test:story",
            "verify-all": "pnpm test:epic",
          },
        },
        null,
        2
      )
    );
    const pathValue = await setupProviderPath("preflight-gates-bins", [
      {
        name: "claude",
        version: "claude 1.0.0",
      },
      {
        name: "codex",
        version: "codex 2.0.0",
      },
    ]);

    const run = await runSourceCli(
      ["preflight", "--spec-pack-root", specPackRoot, "--json"],
      {
        env: {
          PATH: pathValue,
        },
      }
    );

    expect(run.exitCode).toBe(0);
    expect(run.stderr).toBe("");

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.command).toBe("preflight");
    expect(envelope.status).toBe("ok");
    expect(envelope.outcome).toBe("ready");
    expect(envelope.result.verificationGates).toEqual({
      storyGate: "pnpm lint && pnpm test:story",
      epicGate: "pnpm test:epic",
      storyGateSource: "package.json scripts",
      epicGateSource: "package.json scripts",
    });
  });

  test("TC-1.6b returns needs-user-decision when gate policy stays ambiguous", async () => {
    const specPackRoot = await createSpecPack("preflight-ambiguous-gates");
    await writeRunConfig(specPackRoot, claudeOnlyConfig());
    await writeTextFile(
      join(specPackRoot, "README.md"),
      [
        "# Verification",
        "",
        "Story Gate: bun run local-story-check",
        "Story Gate: bun run ci-story-check",
        "",
      ].join("\n")
    );
    const pathValue = await setupProviderPath("preflight-ambiguous-bins", [
      {
        name: "claude",
        version: "claude 1.0.0",
      },
    ]);

    const run = await runSourceCli(
      ["preflight", "--spec-pack-root", specPackRoot, "--json"],
      {
        env: {
          PATH: pathValue,
        },
      }
    );

    expect(run.exitCode).toBe(2);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("needs-user-decision");
    expect(envelope.outcome).toBe("needs-user-decision");
    expect(envelope.errors).toContainEqual(
      expect.objectContaining({
        code: "VERIFICATION_GATE_UNRESOLVED",
      })
    );
  });

  test("TC-2.1a / TC-2.2a / TC-2.4a validates Codex-backed config and reports the primary harness in the provider matrix", async () => {
    const specPackRoot = await createSpecPack("preflight-codex");
    await writeRunConfig(specPackRoot, codexBackedConfig());
    await writeTextFile(
      join(specPackRoot, "package.json"),
      JSON.stringify(
        {
          scripts: {
            "green-verify": "bun run green-verify",
            "verify-all": "bun run verify-all",
          },
        },
        null,
        2
      )
    );
    const pathValue = await setupProviderPath("preflight-codex-bins", [
      {
        name: "claude",
        version: "claude 1.0.0",
      },
      {
        name: "codex",
        version: "codex 2.0.0",
      },
    ]);

    const run = await runSourceCli(
      ["preflight", "--spec-pack-root", specPackRoot, "--json"],
      {
        env: {
          PATH: pathValue,
        },
      }
    );

    expect(run.exitCode).toBe(0);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.result.validatedConfig.story_implementor.secondary_harness).toBe(
      "codex"
    );
    expect(envelope.result.providerMatrix.primary).toMatchObject({
      harness: "claude-code",
      available: true,
    });
    expect(envelope.result.providerMatrix.secondary).toContainEqual(
      expect.objectContaining({
        harness: "codex",
        available: true,
      })
    );
  });

  test("TC-2.2b validates Copilot-backed fresh-session roles when Codex is absent and Copilot is chosen", async () => {
    const specPackRoot = await createSpecPack("preflight-copilot");
    await writeRunConfig(specPackRoot, copilotFallbackConfig());
    await writeTextFile(
      join(specPackRoot, "package.json"),
      JSON.stringify(
        {
          scripts: {
            "green-verify": "bun run green-verify",
            "verify-all": "bun run verify-all",
          },
        },
        null,
        2
      )
    );
    const pathValue = await setupProviderPath("preflight-copilot-bins", [
      {
        name: "claude",
        version: "claude 1.0.0",
      },
      {
        name: "copilot",
        version: "copilot 3.0.0",
      },
    ]);

    const run = await runSourceCli(
      ["preflight", "--spec-pack-root", specPackRoot, "--json"],
      {
        env: {
          PATH: pathValue,
        },
      }
    );

    expect(run.exitCode).toBe(0);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.result.validatedConfig.story_implementor.secondary_harness).toBe(
      "none"
    );
    expect(envelope.result.providerMatrix.secondary).toContainEqual(
      expect.objectContaining({
        harness: "copilot",
        available: true,
      })
    );
  });

  test("TC-2.2c accepts Claude-only configs without requiring Codex or Copilot binaries", async () => {
    const specPackRoot = await createSpecPack("preflight-claude-only");
    await writeRunConfig(specPackRoot, claudeOnlyConfig());
    await writeTextFile(
      join(specPackRoot, "package.json"),
      JSON.stringify(
        {
          scripts: {
            "green-verify": "bun run green-verify",
            "verify-all": "bun run verify-all",
          },
        },
        null,
        2
      )
    );
    const pathValue = await setupProviderPath("preflight-claude-only-bins", [
      {
        name: "claude",
        version: "claude 1.0.0",
      },
    ]);

    const run = await runSourceCli(
      ["preflight", "--spec-pack-root", specPackRoot, "--json"],
      {
        env: {
          PATH: pathValue,
        },
      }
    );

    expect(run.exitCode).toBe(0);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.result.validatedConfig.story_implementor.secondary_harness).toBe(
      "none"
    );
    expect(envelope.result.providerMatrix.secondary).toEqual([]);
    expect(envelope.result.notes).toContain(
      "GPT-capable secondary harnesses are unavailable for this run; the orchestrator should record the Claude-only degraded mode."
    );
  });
});
