import { join } from "node:path";
import { expect, test } from "bun:test";

import { buildRuntimeProgressPaths } from "../core/artifact-writer";
import {
  ROOT,
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

interface VerifierFindingPayload {
  id: string;
  severity: "critical" | "major" | "minor" | "observation";
  title: string;
  evidence: string;
  affectedFiles: string[];
  requirementIds: string[];
  recommendedFixScope:
    | "same-session-implementor"
    | "quick-fix"
    | "fresh-fix-path"
    | "human-ruling";
  blocking: boolean;
}

interface EpicVerifierPayload {
  outcome: "pass" | "revise" | "block";
  crossStoryFindings: string[];
  architectureFindings: string[];
  epicCoverageAssessment: string[];
  mockOrShimAuditFindings: string[];
  blockingFindings: VerifierFindingPayload[];
  nonBlockingFindings: VerifierFindingPayload[];
  unresolvedItems: string[];
  gateResult: "pass" | "fail" | "not-run";
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
  await writeTextFile(
    join(specPackRoot, "src", "runtime.ts"),
    "export const runtime = 'production-path';\n"
  );

  return specPackRoot;
}

function providerResult(sessionId: string, payload: EpicVerifierPayload) {
  return JSON.stringify({
    sessionId,
    result: payload,
  });
}

function basePayload(
  overrides: Partial<EpicVerifierPayload> = {}
): EpicVerifierPayload {
  const payload: EpicVerifierPayload = {
    outcome: "pass",
    crossStoryFindings: [
      "Cleanup, verification, and synthesis are routed in one closeout sequence.",
    ],
    architectureFindings: [
      "Artifact persistence remains consistent across story and epic workflows.",
    ],
    epicCoverageAssessment: [
      "AC-7.1 through AC-8.4 were reviewed against the whole implementation set.",
    ],
    mockOrShimAuditFindings: [
      "No inappropriate mocks, shims, placeholders, or fake adapters remain on production paths.",
    ],
    blockingFindings: [],
    nonBlockingFindings: [],
    unresolvedItems: [],
    gateResult: "not-run",
  };

  return {
    ...payload,
    ...overrides,
    crossStoryFindings:
      overrides.crossStoryFindings ?? payload.crossStoryFindings,
    architectureFindings:
      overrides.architectureFindings ?? payload.architectureFindings,
    epicCoverageAssessment:
      overrides.epicCoverageAssessment ?? payload.epicCoverageAssessment,
    mockOrShimAuditFindings:
      overrides.mockOrShimAuditFindings ?? payload.mockOrShimAuditFindings,
    blockingFindings:
      overrides.blockingFindings ?? payload.blockingFindings,
    nonBlockingFindings:
      overrides.nonBlockingFindings ?? payload.nonBlockingFindings,
    unresolvedItems: overrides.unresolvedItems ?? payload.unresolvedItems,
  };
}

test("TC-8.1c launches fresh epic verifiers and returns explicit mock or shim audit findings for production paths", async () => {
  const specPackRoot = await createEpicSpecPack("epic-verify-contract");
  await writeRunConfig(
    specPackRoot,
    createRunConfig({
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
    })
  );
  const providerBinDir = await createTempDir("epic-verify-contract-provider");
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult("codex-epic-verify-001", basePayload()),
      },
    ],
  });
  const claudeProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "claude",
    responses: [
      {
        stdout: providerResult("claude-epic-verify-001", basePayload()),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-verify",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...codexProvider.env,
        ...claudeProvider.env,
      },
    }
  );

  expect(run.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.command).toBe("epic-verify");
  expect(envelope.outcome).toBe("pass");
  expect(envelope.result.verifierResults).toHaveLength(2);
  expect(envelope.result.verifierResults).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        reviewerLabel: "epic-verifier-1",
        provider: "codex",
      }),
      expect.objectContaining({
        reviewerLabel: "epic-verifier-2",
        provider: "claude-code",
      }),
    ])
  );
  for (const result of envelope.result.verifierResults) {
    expect(result.mockOrShimAuditFindings).toEqual(
      expect.arrayContaining([
        "No inappropriate mocks, shims, placeholders, or fake adapters remain on production paths.",
      ])
    );
  }

  const artifactPath = envelope.artifacts[0].path as string;
  expect(artifactPath).toContain("/artifacts/epic/001-epic-verifier-batch.json");
  const persisted = JSON.parse(await Bun.file(artifactPath).text());
  expect(persisted).toEqual(envelope);
  const progressPaths = buildRuntimeProgressPaths(artifactPath);
  const runtimeStatus = JSON.parse(
    await Bun.file(progressPaths.statusPath).text()
  ) as {
    status: string;
    verifiersCompleted?: number;
    verifiersPlanned?: number;
  };
  const progressEvents = await readJsonLines<{ event: string }>(
    progressPaths.progressPath
  );
  expect(runtimeStatus.status).toBe("completed");
  expect(runtimeStatus.verifiersCompleted).toBe(2);
  expect(runtimeStatus.verifiersPlanned).toBe(2);
  expect(progressEvents.map((event) => event.event)).toEqual(
    expect.arrayContaining([
      "command-started",
      "verifier-started",
      "verifier-completed",
      "completed",
    ])
  );

  const codexInvocations = await readJsonLines<{ args: string[]; cwd: string }>(
    codexProvider.logPath
  );
  const claudeInvocations = await readJsonLines<{ args: string[]; cwd: string }>(
    claudeProvider.logPath
  );
  expect(codexInvocations).toHaveLength(1);
  expect(claudeInvocations).toHaveLength(1);
  expect(codexInvocations[0]?.cwd).toBe(ROOT);
  expect(claudeInvocations[0]?.cwd).toBe(ROOT);
  expect(codexInvocations[0]?.args).not.toContain("resume");
  expect(claudeInvocations[0]?.args).not.toContain("--resume");
});

test("blocks epic-verify with INVALID_SPEC_PACK when the spec-pack root is outside any git repo", async () => {
  const specPackRoot = await createExternalSpecPack("epic-verify-no-git-repo");

  const run = await runSourceCli([
    "epic-verify",
    "--spec-pack-root",
    specPackRoot,
    "--json",
  ]);

  expect(run.exitCode).toBe(3);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("blocked");
  expect(envelope.outcome).toBe("block");
  expect(envelope.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "INVALID_SPEC_PACK",
      }),
    ])
  );
});

test("blocks epic-verify when a verifier finding inside blockingFindings includes an unknown key", async () => {
  const specPackRoot = await createEpicSpecPack("epic-verify-strict-finding");
  await writeRunConfig(
    specPackRoot,
    createRunConfig({
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
    })
  );
  const providerBinDir = await createTempDir("epic-verify-strict-finding-provider");
  const invalidFinding = {
    id: "epic-strict-finding-001",
    severity: "major",
    title: "Unexpected finding drift",
    evidence: "The verifier emitted an extra key in a blocking finding.",
    affectedFiles: ["processes/impl-cli/core/result-contracts.ts"],
    requirementIds: ["TC-8.1c"],
    recommendedFixScope: "fresh-fix-path",
    blocking: true,
    extraField: "drift",
  } as VerifierFindingPayload & { extraField: string };
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: JSON.stringify({
          sessionId: "codex-epic-verify-strict-001",
          result: {
            ...basePayload({
              blockingFindings: [invalidFinding],
            }),
          },
        }),
      },
    ],
  });
  const claudeProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "claude",
    responses: [
      {
        stdout: providerResult("claude-epic-verify-strict-001", basePayload()),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-verify",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...codexProvider.env,
        ...claudeProvider.env,
      },
    }
  );

  expect(run.exitCode).toBe(3);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("blocked");
  expect(envelope.outcome).toBe("block");
  expect(envelope.result).toEqual(
    expect.objectContaining({
      outcome: "block",
      verifierResults: [
        expect.objectContaining({
          reviewerLabel: "epic-verifier-2",
          provider: "claude-code",
        }),
      ],
    })
  );
  expect(envelope.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "PROVIDER_OUTPUT_INVALID",
      }),
    ])
  );
});

test("preserves successful epic verifier results when a sibling epic verifier execution fails", async () => {
  const specPackRoot = await createEpicSpecPack("epic-verify-partial-failure");
  await writeRunConfig(
    specPackRoot,
    createRunConfig({
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
    })
  );
  const providerBinDir = await createTempDir(
    "epic-verify-partial-failure-provider"
  );
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stderr: "codex epic verifier crashed before returning JSON",
        exitCode: 1,
      },
    ],
  });
  const claudeProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "claude",
    responses: [
      {
        stdout: providerResult(
          "claude-epic-verify-partial-001",
          basePayload({
            outcome: "revise",
            nonBlockingFindings: [
              {
                id: "epic-finding-partial-001",
                severity: "major",
                title: "The surviving epic verifier evidence is still available",
                evidence:
                  "One epic verifier failed, but the successful verifier still found a real closeout gap.",
                affectedFiles: ["processes/impl-cli/commands/epic-synthesize.ts"],
                requirementIds: ["TC-8.2a"],
                recommendedFixScope: "fresh-fix-path",
                blocking: false,
              },
            ],
          })
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-verify",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...codexProvider.env,
        ...claudeProvider.env,
      },
    }
  );

  expect(run.exitCode).toBe(3);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("blocked");
  expect(envelope.outcome).toBe("block");
  expect(envelope.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "PROVIDER_UNAVAILABLE",
        message: "Provider execution failed for codex.",
      }),
    ])
  );
  expect(envelope.result.verifierResults).toHaveLength(1);
  expect(envelope.result.verifierResults[0]).toMatchObject({
    reviewerLabel: "epic-verifier-2",
    provider: "claude-code",
    outcome: "revise",
    nonBlockingFindings: [
      expect.objectContaining({
        id: "epic-finding-partial-001",
        severity: "major",
      }),
    ],
  });
});

test("executes a Copilot-backed epic verifier lane end to end when the run config selects Copilot for epic verification", async () => {
  const specPackRoot = await createEpicSpecPack("epic-verify-copilot");
  await writeRunConfig(
    specPackRoot,
    createRunConfig({
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
    })
  );
  const providerBinDir = await createTempDir("epic-verify-copilot-provider");
  const copilotProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "copilot",
    responses: [
      {
        stdout: providerResult("copilot-epic-verify-001", basePayload()),
      },
    ],
  });
  const claudeProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "claude",
    responses: [
      {
        stdout: providerResult("claude-epic-verify-copilot-001", basePayload()),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-verify",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...copilotProvider.env,
        ...claudeProvider.env,
      },
    }
  );

  expect(run.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.outcome).toBe("pass");
  expect(envelope.result.verifierResults).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        reviewerLabel: "epic-verifier-1",
        provider: "copilot",
        model: "gpt-5.4",
      }),
      expect.objectContaining({
        reviewerLabel: "epic-verifier-2",
        provider: "claude-code",
      }),
    ])
  );

  const copilotInvocations = await readJsonLines<{ args: string[] }>(
    copilotProvider.logPath
  );
  expect(copilotInvocations).toHaveLength(1);
  expect(copilotInvocations[0]?.args).toEqual([
    "-p",
    expect.stringContaining("# Epic Verifier Base Prompt"),
    "--output-format",
    "json",
    "--model",
    "gpt-5.4",
    "--effort",
    "xhigh",
  ]);
});

test("returns exit code 2 when the epic verifier batch outcome is revise", async () => {
  const specPackRoot = await createEpicSpecPack("epic-verify-revise");
  await writeRunConfig(
    specPackRoot,
    createRunConfig({
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
    })
  );
  const providerBinDir = await createTempDir("epic-verify-revise-provider");
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(
          "codex-epic-verify-revise-001",
          basePayload({
            outcome: "revise",
            nonBlockingFindings: [
              {
                id: "epic-finding-revise-001",
                severity: "major",
                title: "Epic verifier found a non-blocking closeout gap",
                evidence:
                  "The epic verifier found a remaining fix before closeout is safe.",
                affectedFiles: ["src/references/claude-impl-cli-operations.md"],
                requirementIds: ["TC-8.2a"],
                recommendedFixScope: "fresh-fix-path",
                blocking: false,
              },
            ],
          })
        ),
      },
    ],
  });
  const claudeProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "claude",
    responses: [
      {
        stdout: providerResult("claude-epic-verify-revise-001", basePayload()),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-verify",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...codexProvider.env,
        ...claudeProvider.env,
      },
    }
  );

  expect(run.exitCode).toBe(2);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.outcome).toBe("revise");
  expect(
    envelope.result.verifierResults.map((result: any) => result.outcome)
  ).toEqual(["revise", "pass"]);
});

test("reruns epic verification with fresh sessions and increments the epic verifier artifact path", async () => {
  const specPackRoot = await createEpicSpecPack("epic-verify-rerun");
  await writeRunConfig(
    specPackRoot,
    createRunConfig({
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
    })
  );
  const providerBinDir = await createTempDir("epic-verify-rerun-provider");
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult("codex-epic-verify-rerun-001", basePayload()),
      },
      {
        stdout: providerResult("codex-epic-verify-rerun-002", basePayload()),
      },
    ],
  });
  const claudeProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "claude",
    responses: [
      {
        stdout: providerResult("claude-epic-verify-rerun-001", basePayload()),
      },
      {
        stdout: providerResult("claude-epic-verify-rerun-002", basePayload()),
      },
    ],
  });

  const sharedEnv = {
    PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
    ...codexProvider.env,
    ...claudeProvider.env,
  };

  const firstRun = await runSourceCli(
    [
      "epic-verify",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ],
    {
      env: sharedEnv,
    }
  );
  const secondRun = await runSourceCli(
    [
      "epic-verify",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ],
    {
      env: sharedEnv,
    }
  );

  expect(firstRun.exitCode).toBe(0);
  expect(secondRun.exitCode).toBe(0);

  const secondEnvelope = parseJsonOutput<any>(secondRun.stdout);
  expect(secondEnvelope.artifacts[0].path).toContain(
    "/artifacts/epic/002-epic-verifier-batch.json"
  );

  const codexInvocations = await readJsonLines<{ args: string[] }>(
    codexProvider.logPath
  );
  const claudeInvocations = await readJsonLines<{ args: string[] }>(
    claudeProvider.logPath
  );

  expect(codexInvocations).toHaveLength(2);
  expect(claudeInvocations).toHaveLength(2);
  expect(codexInvocations[0]?.args).not.toContain("resume");
  expect(codexInvocations[1]?.args).not.toContain("resume");
  expect(claudeInvocations[0]?.args).not.toContain("--resume");
  expect(claudeInvocations[1]?.args).not.toContain("--resume");
});
