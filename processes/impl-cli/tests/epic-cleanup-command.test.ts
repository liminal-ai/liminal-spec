import { join } from "node:path";
import { expect, test } from "bun:test";

import {
  createExternalSpecPack,
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

interface EpicCleanupPayload {
  outcome: "cleaned" | "needs-more-cleanup" | "blocked";
  cleanupBatchPath: string;
  filesChanged: string[];
  changeSummary: string;
  gatesRun: Array<{ command: string; result: "pass" | "fail" | "not-run" }>;
  unresolvedConcerns: string[];
  recommendedNextStep: string;
}

async function createEpicSpecPack(scope: string): Promise<string> {
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

function providerResult(sessionId: string, payload: EpicCleanupPayload) {
  return JSON.stringify({
    sessionId,
    result: payload,
  });
}

async function writeCleanupBatch(
  specPackRoot: string,
  fileName: string,
  body: string
): Promise<string> {
  const cleanupBatchPath = join(specPackRoot, "artifacts", "cleanup", fileName);
  await writeTextFile(cleanupBatchPath, body);
  return cleanupBatchPath;
}

function baseCleanupPayload(
  cleanupBatchPath: string,
  overrides: Partial<EpicCleanupPayload> = {}
): EpicCleanupPayload {
  const payload: EpicCleanupPayload = {
    outcome: "cleaned",
    cleanupBatchPath,
    filesChanged: [
      "src/references/claude-impl-process-playbook.md",
      "src/references/claude-impl-cli-operations.md",
    ],
    changeSummary:
      "Applied the approved cleanup-only closeout corrections before epic verification.",
    gatesRun: [
      {
        command: "bun run green-verify",
        result: "not-run",
      },
    ],
    unresolvedConcerns: [],
    recommendedNextStep:
      "Review the cleanup result, then launch epic verification.",
  };

  return {
    ...payload,
    ...overrides,
    gatesRun: overrides.gatesRun ?? payload.gatesRun,
    unresolvedConcerns:
      overrides.unresolvedConcerns ?? payload.unresolvedConcerns,
  };
}

test("TC-7.1a consumes a durable cleanup artifact and returns the structured cleanup result before epic verification", async () => {
  const specPackRoot = await createEpicSpecPack("epic-cleanup-contract");
  await writeRunConfig(specPackRoot, createRunConfig());
  const cleanupBatchPath = await writeCleanupBatch(
    specPackRoot,
    "cleanup-batch.md",
    [
      "# Cleanup Batch",
      "",
      "- APPROVED: tighten the closeout docs so cleanup precedes epic verification.",
      "- APPROVED: wire the synthesis command into the final closeout sequence.",
    ].join("\n")
  );
  const providerBinDir = await createTempDir("epic-cleanup-contract-provider");
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(
          "codex-epic-cleanup-001",
          baseCleanupPayload(cleanupBatchPath)
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-cleanup",
      "--spec-pack-root",
      specPackRoot,
      "--cleanup-batch",
      cleanupBatchPath,
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
  expect(envelope.command).toBe("epic-cleanup");
  expect(envelope.outcome).toBe("cleaned");
  expect(envelope.result.cleanupBatchPath).toBe(cleanupBatchPath);
  expect(envelope.result.filesChanged).toEqual(
    expect.arrayContaining([
      "src/references/claude-impl-process-playbook.md",
    ])
  );

  const artifactPath = envelope.artifacts[0].path as string;
  expect(artifactPath).toContain("/artifacts/cleanup/001-cleanup-result.json");
  const persisted = JSON.parse(await Bun.file(artifactPath).text());
  expect(persisted).toEqual(envelope);

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(1);
  expect(invocations[0]?.args).not.toContain("resume");
});

test("treats a reviewed cleanup batch with zero approved items as a cleaned no-op result", async () => {
  const specPackRoot = await createEpicSpecPack("epic-cleanup-noop");
  await writeRunConfig(specPackRoot, createRunConfig());
  const cleanupBatchPath = await writeCleanupBatch(
    specPackRoot,
    "cleanup-noop.md",
    [
      "# Cleanup Batch",
      "",
      "- REVIEWED: no approved cleanup corrections remain before epic verification.",
    ].join("\n")
  );
  const providerBinDir = await createTempDir("epic-cleanup-noop-provider");
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(
          "codex-epic-cleanup-002",
          baseCleanupPayload(cleanupBatchPath, {
            filesChanged: [],
            changeSummary:
              "No approved cleanup corrections remained, so the cleanup pass was a no-op.",
          })
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-cleanup",
      "--spec-pack-root",
      specPackRoot,
      "--cleanup-batch",
      cleanupBatchPath,
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
  expect(envelope.outcome).toBe("cleaned");
  expect(envelope.result.filesChanged).toEqual([]);
  expect(envelope.result.changeSummary).toContain("no-op");
});

test("blocks epic-cleanup with INVALID_SPEC_PACK when the spec-pack root is outside any git repo", async () => {
  const specPackRoot = await createExternalSpecPack("epic-cleanup-no-git-repo");
  const cleanupBatchPath = await writeCleanupBatch(
    specPackRoot,
    "cleanup-batch.md",
    "# Cleanup Batch\n\n- APPROVED: apply the bounded cleanup correction.\n"
  );

  const run = await runSourceCli([
    "epic-cleanup",
    "--spec-pack-root",
    specPackRoot,
    "--cleanup-batch",
    cleanupBatchPath,
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

test("blocks epic-cleanup when the structured cleanup payload includes an unknown top-level key", async () => {
  const specPackRoot = await createEpicSpecPack("epic-cleanup-strict-payload");
  await writeRunConfig(specPackRoot, createRunConfig());
  const cleanupBatchPath = await writeCleanupBatch(
    specPackRoot,
    "cleanup-strict.md",
    [
      "# Cleanup Batch",
      "",
      "- APPROVED: apply the bounded cleanup correction.",
    ].join("\n")
  );
  const providerBinDir = await createTempDir("epic-cleanup-strict-provider");
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: JSON.stringify({
          sessionId: "codex-epic-cleanup-strict-001",
          result: {
            ...baseCleanupPayload(cleanupBatchPath),
            extraField: "drift",
          },
        }),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-cleanup",
      "--spec-pack-root",
      specPackRoot,
      "--cleanup-batch",
      cleanupBatchPath,
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
  expect(envelope.result).toBeUndefined();
  expect(envelope.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "PROVIDER_OUTPUT_INVALID",
      }),
    ])
  );
});

test("returns exit code 2 when epic-cleanup reports needs-more-cleanup", async () => {
  const specPackRoot = await createEpicSpecPack("epic-cleanup-needs-more");
  await writeRunConfig(specPackRoot, createRunConfig());
  const cleanupBatchPath = await writeCleanupBatch(
    specPackRoot,
    "cleanup-needs-more.md",
    [
      "# Cleanup Batch",
      "",
      "- APPROVED: apply the closeout corrections in one bounded pass.",
    ].join("\n")
  );
  const providerBinDir = await createTempDir("epic-cleanup-needs-more-provider");
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(
          "codex-epic-cleanup-003",
          baseCleanupPayload(cleanupBatchPath, {
            outcome: "needs-more-cleanup",
            unresolvedConcerns: [
              "One approved cleanup item still needs a follow-up pass.",
            ],
            recommendedNextStep:
              "Review the remaining cleanup concern, then run another cleanup pass.",
          })
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-cleanup",
      "--spec-pack-root",
      specPackRoot,
      "--cleanup-batch",
      cleanupBatchPath,
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
  expect(envelope.outcome).toBe("needs-more-cleanup");
  expect(envelope.result.unresolvedConcerns).toEqual([
    "One approved cleanup item still needs a follow-up pass.",
  ]);
});

test("returns exit code 3 when epic-cleanup is blocked by provider execution failure", async () => {
  const specPackRoot = await createEpicSpecPack("epic-cleanup-blocked");
  await writeRunConfig(specPackRoot, createRunConfig());
  const cleanupBatchPath = await writeCleanupBatch(
    specPackRoot,
    "cleanup-blocked.md",
    [
      "# Cleanup Batch",
      "",
      "- APPROVED: apply the final cleanup corrections before epic verification.",
    ].join("\n")
  );
  const providerBinDir = await createTempDir("epic-cleanup-blocked-provider");
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stderr: "cleanup provider failed before producing JSON output",
        exitCode: 1,
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-cleanup",
      "--spec-pack-root",
      specPackRoot,
      "--cleanup-batch",
      cleanupBatchPath,
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
      }),
    ])
  );
});
