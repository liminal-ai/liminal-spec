import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { describe, expect, test } from "bun:test";

import {
  ROOT,
  createImplementorSpecPack,
  createRunConfig,
  createSpecPack,
  createTempDir,
  createVerifierSpecPack,
  parseJsonOutput,
  writeFakeProviderExecutable,
  writeRunConfig,
  runSourceCli,
  writeTextFile,
} from "./test-helpers";

async function createExternalSpecPack(): Promise<string> {
  const specPackRoot = await mkdtemp(join(tmpdir(), "impl-cli-outside-git-"));
  await mkdir(join(specPackRoot, "stories"), { recursive: true });
  await writeFile(join(specPackRoot, "epic.md"), "# Epic\n", "utf8");
  await writeFile(
    join(specPackRoot, "tech-design.md"),
    "# Technical Design\n",
    "utf8"
  );
  await writeFile(join(specPackRoot, "test-plan.md"), "# Test Plan\n", "utf8");
  await writeFile(
    join(specPackRoot, "stories", "00-foundation.md"),
    "# Story 0: Foundation\n",
    "utf8"
  );
  return specPackRoot;
}

describe("security guardrails", () => {
  test("resolves spec-pack roots to absolute paths", async () => {
    const specPackRoot = await createSpecPack("security-absolute-root");
    const relativeSpecPackRoot = relative(ROOT, specPackRoot);
    const run = await runSourceCli([
      "inspect",
      "--spec-pack-root",
      relativeSpecPackRoot,
      "--json",
    ]);

    expect(run.exitCode).toBe(0);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.result.specPackRoot).toBe(specPackRoot);
  });

  test("rejects spec-pack roots outside a git repo", async () => {
    const specPackRoot = await createExternalSpecPack();
    const run = await runSourceCli([
      "inspect",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ]);

    expect(run.exitCode).toBe(3);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("blocked");
    expect(envelope.errors[0].code).toBe("INVALID_SPEC_PACK");
    expect(envelope.result.blockers).toContain(
      `Spec-pack root is not inside a git repo: ${specPackRoot}`
    );
  });

  test("rejects unreadable prompt inserts with PROMPT_INSERT_INVALID", async () => {
    const specPackRoot = await createSpecPack("security-unreadable-insert");
    const insertPath = join(
      specPackRoot,
      "custom-story-impl-prompt-insert.md"
    );
    await writeTextFile(insertPath, "Custom implementor insert\n");
    await chmod(insertPath, 0o000);

    try {
      const run = await runSourceCli([
        "inspect",
        "--spec-pack-root",
        specPackRoot,
        "--json",
      ]);

      expect(run.exitCode).toBe(3);

      const envelope = parseJsonOutput<any>(run.stdout);
      expect(envelope.status).toBe("blocked");
      expect(envelope.errors[0].code).toBe("PROMPT_INSERT_INVALID");
      expect(envelope.result.blockers).toContain(
        "Unreadable prompt insert: custom-story-impl-prompt-insert.md"
      );
    } finally {
      await chmod(insertPath, 0o644);
    }
  });

  test("rejects oversized public prompt inserts with PROMPT_INSERT_INVALID through the prompt assembly path", async () => {
    const fixture = await createImplementorSpecPack("security-oversized-insert");
    await writeRunConfig(fixture.specPackRoot, createRunConfig());
    await writeTextFile(
      join(fixture.specPackRoot, "custom-story-impl-prompt-insert.md"),
      `${"x".repeat(64 * 1024 + 1)}\n`
    );

    const run = await runSourceCli([
      "story-implement",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--json",
    ]);

    expect(run.exitCode).toBe(3);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("blocked");
    expect(envelope.errors).toContainEqual(
      expect.objectContaining({
        code: "PROMPT_INSERT_INVALID",
      })
    );
  });

  test("rejects oversized verifier prompt inserts with PROMPT_INSERT_INVALID through story-verify", async () => {
    const fixture = await createVerifierSpecPack("security-oversized-verifier-insert");
    await writeRunConfig(fixture.specPackRoot, createRunConfig());
    await writeTextFile(
      join(fixture.specPackRoot, "custom-story-verifier-prompt-insert.md"),
      `${"x".repeat(64 * 1024 + 1)}\n`
    );

    const run = await runSourceCli([
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--json",
    ]);

    expect(run.exitCode).toBe(3);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("blocked");
    expect(envelope.errors).toContainEqual(
      expect.objectContaining({
        code: "PROMPT_INSERT_INVALID",
      })
    );
  });

  test("returns needs-user-decision instead of guessing when gate discovery is ambiguous", async () => {
    const specPackRoot = await createSpecPack("security-ambiguous-gates");
    await writeTextFile(
      join(specPackRoot, "impl-run.config.json"),
      JSON.stringify(
        {
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
        },
        null,
        2
      )
    );
    await writeTextFile(
      join(specPackRoot, "README.md"),
      [
        "# Verification",
        "",
        "Story Gate: bun run story-check-a",
        "Story Gate: bun run story-check-b",
        "Epic Gate: bun run epic-check-a",
        "",
      ].join("\n")
    );

    const providerBinDir = await mkdtemp(join(tmpdir(), "impl-cli-provider-bin-"));
    const claudePath = join(providerBinDir, "claude");
    await writeFile(
      claudePath,
      [
        "#!/bin/sh",
        'if [ "$1" = "--version" ]; then',
        '  echo "claude 1.0.0"',
        "  exit 0",
        "fi",
        'if [ "$1" = "auth" ] && [ "$2" = "status" ]; then',
        '  echo "authenticated"',
        "  exit 0",
        "fi",
        "exit 1",
        "",
      ].join("\n"),
      "utf8"
    );
    await chmod(claudePath, 0o755);

    const run = await runSourceCli(
      ["preflight", "--spec-pack-root", specPackRoot, "--json"],
      {
        env: {
          PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        },
      }
    );

    expect(run.exitCode).toBe(2);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("needs-user-decision");
    expect(envelope.errors).toContainEqual(
      expect.objectContaining({
        code: "VERIFICATION_GATE_UNRESOLVED",
      })
    );
  });

  test("rejects fenced provider output with PROVIDER_OUTPUT_INVALID", async () => {
    const fixture = await createImplementorSpecPack(
      "security-invalid-provider-output"
    );
    await writeRunConfig(fixture.specPackRoot, createRunConfig());
    const providerBinDir = await createTempDir(
      "security-invalid-provider-output-provider"
    );
    const { env } = await writeFakeProviderExecutable({
      binDir: providerBinDir,
      provider: "codex",
      responses: [
        {
          stdout: [
            "```json",
            JSON.stringify({
              sessionId: "codex-session-invalid-001",
              result: {
                outcome: "ready-for-verification",
                planSummary:
                  "ACs: AC-4.1 to AC-4.5. TCs: TC-4.1a, TC-4.2a, TC-4.2b, TC-4.3a, TC-4.4a, TC-4.4b, TC-4.5a.",
                changedFiles: [
                  {
                    path: "processes/impl-cli/commands/story-implement.ts",
                    reason:
                      "Launch the implementor workflow and persist continuation metadata.",
                  },
                ],
                tests: {
                  added: ["processes/impl-cli/tests/story-implement-command.test.ts"],
                  modified: ["processes/impl-cli/tests/provider-adapter.test.ts"],
                  removed: [],
                  totalAfterStory: 141,
                  deltaFromPriorBaseline: 5,
                },
                gatesRun: [
                  {
                    command: "bun run green-verify",
                    result: "not-run",
                  },
                ],
                selfReview: {
                  findingsFixed: [],
                  findingsSurfaced: [],
                },
                openQuestions: [],
                specDeviations: [],
                recommendedNextStep: "Run story verification.",
              },
            }),
            "```",
          ].join("\n"),
        },
      ],
    });

    const run = await runSourceCli(
      [
        "story-implement",
        "--spec-pack-root",
        fixture.specPackRoot,
        "--story-id",
        fixture.storyId,
        "--json",
      ],
      {
        env: {
          PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
          ...env,
        },
      }
    );

    expect(run.exitCode).toBe(3);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("blocked");
    expect(envelope.errors).toContainEqual(
      expect.objectContaining({
        code: "PROVIDER_OUTPUT_INVALID",
        detail: expect.stringContaining("not exact JSON"),
      })
    );
  });

  test("rejects provider prose output with PROVIDER_OUTPUT_INVALID", async () => {
    const fixture = await createImplementorSpecPack(
      "security-prose-provider-output"
    );
    await writeRunConfig(fixture.specPackRoot, createRunConfig());
    const providerBinDir = await createTempDir(
      "security-prose-provider-output-provider"
    );
    const { env } = await writeFakeProviderExecutable({
      binDir: providerBinDir,
      provider: "codex",
      responses: [
        {
          stdout: "Implementation complete. I updated the files and ran the checks.",
        },
      ],
    });

    const run = await runSourceCli(
      [
        "story-implement",
        "--spec-pack-root",
        fixture.specPackRoot,
        "--story-id",
        fixture.storyId,
        "--json",
      ],
      {
        env: {
          PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
          ...env,
        },
      }
    );

    expect(run.exitCode).toBe(3);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("blocked");
    expect(envelope.errors).toContainEqual(
      expect.objectContaining({
        code: "PROVIDER_OUTPUT_INVALID",
      })
    );
  });
});
