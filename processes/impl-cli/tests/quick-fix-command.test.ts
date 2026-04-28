import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";

import { buildRuntimeProgressPaths } from "../core/artifact-writer";
import {
  createRunConfig,
  createSpecPack,
  createTempDir,
  parseJsonOutput,
  readJsonLines,
  runSourceCli,
  writeFakeProviderExecutable,
  writeRunConfig,
  writeTextFile,
} from "./test-helpers";

async function createQuickFixSpecPack(scope: string): Promise<string> {
  const specPackRoot = await createSpecPack(scope, {
    companionMode: "four-file",
  });
  await writeTextFile(
    join(specPackRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "fixture-spec-pack",
        private: true,
        scripts: {
          "green-verify": "bun run green-verify",
          "verify-all": "bun run verify-all",
        },
      },
      null,
      2
    )}\n`
  );

  return specPackRoot;
}

test("TC-5.3a runs quick-fix from request-text without requiring story-aware inputs or restarting the full implementor path", async () => {
  const specPackRoot = await createQuickFixSpecPack("quick-fix-request-text");
  await writeRunConfig(specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("quick-fix-request-text-provider");
  const requestText =
    "Fix the failing quick-fix contract assertions only. Do not widen scope.";
  const rawProviderOutput = [
    "{\"type\":\"item.started\",\"message\":\"Editing src/references/claude-impl-cli-operations.md only.\"}",
    "{\"type\":\"item.completed\",\"message\":\"Updated src/references/claude-impl-cli-operations.md with the bounded routing note.\"}",
  ].join("\n");
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: rawProviderOutput,
      },
    ],
  });

  const run = await runSourceCli(
    [
      "quick-fix",
      "--spec-pack-root",
      specPackRoot,
      "--request-text",
      requestText,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(run.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.command).toBe("quick-fix");
  expect(envelope.status).toBe("ok");
  expect(envelope.outcome).toBe("ready-for-verification");
  expect(envelope.result).toMatchObject({
    provider: "codex",
    model: "gpt-5.4",
    rawProviderOutputPreview: rawProviderOutput,
    rawProviderOutputBytes: Buffer.byteLength(rawProviderOutput, "utf8"),
    rawProviderOutputTruncated: false,
    rawProviderOutputLogPath: expect.stringContaining(
      "/artifacts/quick-fix/streams/001-quick-fix.stdout.log"
    ),
  });
  expect(envelope.result.rawProviderOutputPreview).toContain(
    "src/references/claude-impl-cli-operations.md"
  );

  const artifactPath = envelope.artifacts[0].path as string;
  expect(artifactPath).toContain("/artifacts/quick-fix/001-quick-fix.json");
  const persisted = JSON.parse(await Bun.file(artifactPath).text());
  expect(persisted).toEqual(envelope);
  const progressPaths = buildRuntimeProgressPaths(artifactPath);
  const runtimeStatus = JSON.parse(
    await Bun.file(progressPaths.statusPath).text()
  ) as {
    status: string;
    phase: string;
  };
  const progressEvents = await readJsonLines<{ event: string }>(
    progressPaths.progressPath
  );
  expect(runtimeStatus.status).toBe("completed");
  expect(runtimeStatus.phase).toBe("finalizing");
  expect(progressEvents.map((event) => event.event)).toEqual(
    expect.arrayContaining([
      "command-started",
      "provider-spawned",
      "first-output-received",
      "provider-exit",
      "completed",
    ])
  );

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(1);
  expect(invocations[0]?.args.slice(0, 6)).toEqual([
    "exec",
    "--json",
    "-m",
    "gpt-5.4",
    "-c",
    "model_reasoning_effort=high",
  ]);
  expect(invocations[0]?.args).toContain("-o");
  expect(invocations[0]?.args).not.toContain("resume");
  expect(invocations[0]?.args[invocations[0].args.length - 1]).toBe(requestText);
});

test("TC-5.3b accepts --request-file, uses the selected working directory, and keeps provider output free-form inside the envelope", async () => {
  const specPackRoot = await createQuickFixSpecPack("quick-fix-request-file");
  await writeRunConfig(specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("quick-fix-request-file-provider");
  const rawProviderOutput =
    "Applied the requested fix and left one note for the orchestrator to review.";
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: rawProviderOutput,
      },
    ],
  });
  const requestFilePath = join(specPackRoot, "quick-fix-request.txt");
  const requestText = [
    "Update the quick-fix docs to reflect the plain-language handoff.",
    "Keep the change bounded to the Story 5 quick-fix surface.",
  ].join("\n");
  await writeTextFile(requestFilePath, requestText);
  const workingDirectory = await createTempDir("quick-fix-working-directory");

  const run = await runSourceCli(
    [
      "quick-fix",
      "--spec-pack-root",
      specPackRoot,
      "--request-file",
      requestFilePath,
      "--working-directory",
      workingDirectory,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(run.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.result).toMatchObject({
    provider: "codex",
    model: "gpt-5.4",
    rawProviderOutputPreview: rawProviderOutput,
    rawProviderOutputBytes: Buffer.byteLength(rawProviderOutput, "utf8"),
    rawProviderOutputTruncated: false,
    rawProviderOutputLogPath: expect.stringContaining(
      "/artifacts/quick-fix/streams/001-quick-fix.stdout.log"
    ),
  });
  expect(envelope.result.filesChanged).toBeUndefined();
  expect(envelope.result.changeSummary).toBeUndefined();
  expect(envelope.result.unresolvedConcerns).toBeUndefined();

  const invocations = await readJsonLines<{ args: string[]; cwd: string }>(logPath);
  expect(invocations).toHaveLength(1);
  expect(invocations[0]?.cwd).toBe(workingDirectory);
  expect(invocations[0]?.args[invocations[0].args.length - 1]).toBe(requestText);
});

test("runs quick-fix through Copilot when the run config selects the Copilot fresh-session fallback", async () => {
  const specPackRoot = await createQuickFixSpecPack("quick-fix-copilot-fallback");
  await writeRunConfig(
    specPackRoot,
    createRunConfig({
      quick_fixer: {
        secondary_harness: "copilot",
        model: "gpt-5.4",
        reasoning_effort: "medium",
      },
    })
  );
  const providerBinDir = await createTempDir("quick-fix-copilot-provider");
  const requestText =
    "Apply the bounded quick-fix correction only and return a short report.";
  const rawProviderOutput =
    "Applied the bounded quick-fix correction through the Copilot fallback lane.";
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "copilot",
    responses: [
      {
        stdout: rawProviderOutput,
      },
    ],
  });

  const run = await runSourceCli(
    [
      "quick-fix",
      "--spec-pack-root",
      specPackRoot,
      "--request-text",
      requestText,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(run.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.outcome).toBe("ready-for-verification");
  expect(envelope.result).toMatchObject({
    provider: "copilot",
    model: "gpt-5.4",
    rawProviderOutputPreview: rawProviderOutput,
    rawProviderOutputBytes: Buffer.byteLength(rawProviderOutput, "utf8"),
    rawProviderOutputTruncated: false,
    rawProviderOutputLogPath: expect.stringContaining(
      "/artifacts/quick-fix/streams/001-quick-fix.stdout.log"
    ),
  });

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(1);
  expect(invocations[0]?.args).toEqual([
    "-p",
    requestText,
    "--allow-all-tools",
    "--no-custom-instructions",
    "--output-format",
    "json",
    "--model",
    "gpt-5.4",
    "--effort",
    "medium",
  ]);
});

test("rejects missing or duplicate quick-fix request sources", async () => {
  const specPackRoot = await createQuickFixSpecPack("quick-fix-request-source-errors");
  await writeRunConfig(specPackRoot, createRunConfig());
  const requestFilePath = join(specPackRoot, "quick-fix-request.txt");
  await writeTextFile(requestFilePath, "Apply the bounded correction only.\n");

  for (const args of [
    [
      "quick-fix",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ],
    [
      "quick-fix",
      "--spec-pack-root",
      specPackRoot,
      "--request-text",
      "Apply the bounded correction only.",
      "--request-file",
      requestFilePath,
      "--json",
    ],
  ] as const) {
    const run = await runSourceCli([...args]);
    expect(run.exitCode).toBe(1);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("error");
    expect(envelope.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_INVOCATION",
        }),
      ])
    );
  }
});

test("rejects empty quick-fix request text and empty quick-fix request files", async () => {
  const specPackRoot = await createQuickFixSpecPack("quick-fix-empty-requests");
  await writeRunConfig(specPackRoot, createRunConfig());
  const emptyRequestFilePath = join(specPackRoot, "empty-request.txt");
  await writeTextFile(emptyRequestFilePath, " \n");

  const emptyTextRun = await runSourceCli([
    "quick-fix",
    "--spec-pack-root",
    specPackRoot,
    "--request-text",
    "   ",
    "--json",
  ]);
  expect(emptyTextRun.exitCode).toBe(1);
  expect(parseJsonOutput<any>(emptyTextRun.stdout).errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "INVALID_INVOCATION",
        message: "--request-text cannot be empty.",
      }),
    ])
  );

  const emptyFileRun = await runSourceCli([
    "quick-fix",
    "--spec-pack-root",
    specPackRoot,
    "--request-file",
    emptyRequestFilePath,
    "--json",
  ]);
  expect(emptyFileRun.exitCode).toBe(1);
  expect(parseJsonOutput<any>(emptyFileRun.stdout).errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "INVALID_INVOCATION",
        message: "--request-file cannot point to an empty task description.",
      }),
    ])
  );
});

test("blocks quick-fix with exit code 3 when the spec-pack root is outside any git repo", async () => {
  const specPackRoot = await mkdtemp(join(tmpdir(), "quick-fix-no-git-repo-"));
  await writeRunConfig(specPackRoot, createRunConfig());

  const run = await runSourceCli([
    "quick-fix",
    "--spec-pack-root",
    specPackRoot,
    "--request-text",
    "Apply the bounded correction only.",
    "--json",
  ]);

  expect(run.exitCode).toBe(3);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("blocked");
  expect(envelope.outcome).toBe("blocked");
  expect(envelope.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "INVALID_SPEC_PACK",
      }),
    ])
  );
});

test("rejects oversized quick-fix request text and request files before provider dispatch", async () => {
  const specPackRoot = await createQuickFixSpecPack("quick-fix-oversized-requests");
  await writeRunConfig(specPackRoot, createRunConfig());
  const oversizedContent = "x".repeat(128 * 1024 + 1);
  const oversizedFilePath = join(specPackRoot, "oversized-request.txt");
  await writeTextFile(oversizedFilePath, oversizedContent);

  const oversizedTextRun = await runSourceCli([
    "quick-fix",
    "--spec-pack-root",
    specPackRoot,
    "--request-text",
    oversizedContent,
    "--json",
  ]);
  expect(oversizedTextRun.exitCode).toBe(1);
  expect(parseJsonOutput<any>(oversizedTextRun.stdout).errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "INVALID_INVOCATION",
        message: "--request-text exceeds the 128 KiB limit (131072 bytes).",
      }),
    ])
  );

  const oversizedFileRun = await runSourceCli([
    "quick-fix",
    "--spec-pack-root",
    specPackRoot,
    "--request-file",
    oversizedFilePath,
    "--json",
  ]);
  expect(oversizedFileRun.exitCode).toBe(1);
  expect(parseJsonOutput<any>(oversizedFileRun.stdout).errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "INVALID_INVOCATION",
        message: "--request-file exceeds the 128 KiB limit (131072 bytes).",
      }),
    ])
  );
});

test("routes quick-fix to needs-more-routing when the provider returns no stdout to route from", async () => {
  const specPackRoot = await createQuickFixSpecPack("quick-fix-empty-output");
  await writeRunConfig(specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("quick-fix-empty-output-provider");
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: "",
      },
    ],
  });

  const run = await runSourceCli(
    [
      "quick-fix",
      "--spec-pack-root",
      specPackRoot,
      "--request-text",
      "Apply the tiny routing correction and report back.",
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(run.exitCode).toBe(2);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("ok");
  expect(envelope.outcome).toBe("needs-more-routing");
  expect(envelope.result).toMatchObject({
    rawProviderOutputPreview: "",
    rawProviderOutputBytes: 0,
    rawProviderOutputTruncated: false,
    rawProviderOutputLogPath: expect.stringContaining(
      "/artifacts/quick-fix/streams/001-quick-fix.stdout.log"
    ),
  });
});

test("blocks quick-fix when the explicit working directory escapes the repo root", async () => {
  const specPackRoot = await createQuickFixSpecPack("quick-fix-working-directory-guard");
  await writeRunConfig(specPackRoot, createRunConfig());
  const outsideWorkingDirectory = await mkdtemp(
    join(tmpdir(), "quick-fix-outside-repo-")
  );

  const run = await runSourceCli([
    "quick-fix",
    "--spec-pack-root",
    specPackRoot,
    "--request-text",
    "Apply the bounded correction only.",
    "--working-directory",
    outsideWorkingDirectory,
    "--json",
  ]);

  expect(run.exitCode).toBe(3);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("blocked");
  expect(envelope.outcome).toBe("blocked");
  expect(envelope.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "INVALID_WORKING_DIRECTORY",
        message:
          "Quick-fix working directory must stay inside the resolved repo root.",
      }),
    ])
  );
});

test("routes quick-fix to blocked with exit code 3 when the provider fails", async () => {
  const specPackRoot = await createQuickFixSpecPack("quick-fix-blocked");
  await writeRunConfig(specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("quick-fix-blocked-provider");
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stderr: "provider execution failed before any edits were applied",
        exitCode: 70,
      },
    ],
  });

  const run = await runSourceCli(
    [
      "quick-fix",
      "--spec-pack-root",
      specPackRoot,
      "--request-text",
      "Apply the bounded correction only.",
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
  expect(envelope.outcome).toBe("blocked");
  expect(envelope.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "PROVIDER_UNAVAILABLE",
        detail: "provider execution failed before any edits were applied",
      }),
    ])
  );
});

test("rejects legacy story-aware flags such as --story-id, --story-title, and --story-path instead of silently accepting them", async () => {
  const specPackRoot = await createQuickFixSpecPack("quick-fix-reject-legacy-flags");
  await writeRunConfig(specPackRoot, createRunConfig());

  for (const [flag, value] of [
    ["--story-id", "story-05"],
    ["--story-title", "Fix Routing and Quick Fix"],
    ["--story-path", "/tmp/story-05.md"],
  ] as const) {
    const run = await runSourceCli([
      "quick-fix",
      "--spec-pack-root",
      specPackRoot,
      "--request-text",
      "Apply the narrow correction only.",
      flag,
      value,
      "--json",
    ]);

    expect(run.exitCode).toBe(1);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("error");
    expect(envelope.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_INVOCATION",
          message:
            "quick-fix does not accept story-aware flags such as --story-id, --story-title, --story-path, or --scope-file.",
        }),
      ])
    );
  }
});
