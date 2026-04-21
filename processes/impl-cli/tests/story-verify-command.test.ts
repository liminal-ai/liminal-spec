import { expect, test } from "bun:test";

import {
  createRunConfig,
  createTempDir,
  createVerifierSpecPack,
  parseJsonOutput,
  readJsonLines,
  runSourceCli,
  writeFakeProviderExecutable,
  writeRunConfig,
} from "./test-helpers";

interface StoryVerifierPayload {
  artifactsRead: string[];
  reviewScopeSummary: string;
  findings: Array<{
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
  }>;
  requirementCoverage: {
    verified: string[];
    unverified: string[];
  };
  gatesRun: Array<{ command: string; result: "pass" | "fail" | "not-run" }>;
  mockOrShimAuditFindings: string[];
  recommendedNextStep: "pass" | "revise" | "block";
  recommendedFixScope:
    | "same-session-implementor"
    | "quick-fix"
    | "fresh-fix-path"
    | "human-ruling";
  openQuestions: string[];
  additionalObservations: string[];
}

function verifierProviderResult(
  sessionId: string,
  payload: StoryVerifierPayload
) {
  return JSON.stringify({
    sessionId,
    result: payload,
  });
}

function baseVerifierPayload(
  fixture: Awaited<ReturnType<typeof createVerifierSpecPack>>,
  overrides: Partial<StoryVerifierPayload> = {}
): StoryVerifierPayload {
  const payload: StoryVerifierPayload = {
    artifactsRead: [
      fixture.storyPath,
      fixture.techDesignPath,
      fixture.testPlanPath,
    ],
    reviewScopeSummary:
      "Reviewed the story contract, prompt assembly inputs, and verifier batch routing.",
    findings: [],
    requirementCoverage: {
      verified: ["AC-5.1", "AC-5.2", "TC-5.1a", "TC-5.2a"],
      unverified: [],
    },
    gatesRun: [
      {
        command: "bun run green-verify",
        result: "not-run",
      },
    ],
    mockOrShimAuditFindings: [],
    recommendedNextStep: "pass",
    recommendedFixScope: "same-session-implementor",
    openQuestions: [],
    additionalObservations: [],
  };

  return {
    ...payload,
    ...overrides,
    requirementCoverage: {
      ...payload.requirementCoverage,
      ...overrides.requirementCoverage,
    },
  };
}

test("TC-5.1a launches two fresh verifiers by default and returns the structured verifier batch", async () => {
  const fixture = await createVerifierSpecPack("story-verify-default-dual");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-verify-default-dual-provider");
  const codexSessionId = "codex-story-verify-001";
  const claudeSessionId = "claude-story-verify-001";
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: verifierProviderResult(
          codexSessionId,
          baseVerifierPayload(fixture)
        ),
      },
    ],
  });
  const claudeProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "claude",
    responses: [
      {
        stdout: verifierProviderResult(
          claudeSessionId,
          baseVerifierPayload(fixture)
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
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
  expect(envelope.command).toBe("story-verify");
  expect(envelope.outcome).toBe("pass");
  expect(envelope.result.story).toEqual({
    id: fixture.storyId,
    title: fixture.storyTitle,
  });
  expect(envelope.result.verifierResults).toHaveLength(2);
  expect(envelope.result.verifierResults).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        verifierLabel: "story-verifier-1",
        provider: "codex",
        model: "gpt-5.4",
        recommendedNextStep: "pass",
      }),
      expect.objectContaining({
        verifierLabel: "story-verifier-2",
        provider: "claude-code",
        model: "claude-sonnet",
        recommendedNextStep: "pass",
      }),
    ])
  );

  const artifactPath = envelope.artifacts[0].path as string;
  expect(artifactPath).toContain(`/artifacts/${fixture.storyId}/001-verify-batch.json`);
  const persisted = JSON.parse(await Bun.file(artifactPath).text());
  expect(persisted).toEqual(envelope);

  const codexInvocations = await readJsonLines<{ args: string[] }>(
    codexProvider.logPath
  );
  const claudeInvocations = await readJsonLines<{ args: string[] }>(
    claudeProvider.logPath
  );
  expect(codexInvocations).toHaveLength(1);
  expect(claudeInvocations).toHaveLength(1);
});

test("TC-5.1b launches fresh verifier sessions on re-verification instead of resuming prior verifier sessions", async () => {
  const fixture = await createVerifierSpecPack("story-verify-rerun-fresh");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-verify-rerun-fresh-provider");
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: verifierProviderResult(
          "codex-story-verify-rerun-001",
          baseVerifierPayload(fixture)
        ),
      },
      {
        stdout: verifierProviderResult(
          "codex-story-verify-rerun-002",
          baseVerifierPayload(fixture)
        ),
      },
    ],
  });
  const claudeProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "claude",
    responses: [
      {
        stdout: verifierProviderResult(
          "claude-story-verify-rerun-001",
          baseVerifierPayload(fixture)
        ),
      },
      {
        stdout: verifierProviderResult(
          "claude-story-verify-rerun-002",
          baseVerifierPayload(fixture)
        ),
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
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--json",
    ],
    {
      env: sharedEnv,
    }
  );
  const secondRun = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
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
    `/artifacts/${fixture.storyId}/002-verify-batch.json`
  );

  const codexInvocations = await readJsonLines<{ args: string[] }>(
    codexProvider.logPath
  );
  const claudeInvocations = await readJsonLines<{ args: string[] }>(
    claudeProvider.logPath
  );

  expect(codexInvocations).toHaveLength(2);
  expect(codexInvocations[0]?.args).toEqual([
    "exec",
    "--json",
    "-m",
    "gpt-5.4",
    "-c",
    "model_reasoning_effort=xhigh",
    expect.any(String),
  ]);
  expect(codexInvocations[1]?.args).toEqual([
    "exec",
    "--json",
    "-m",
    "gpt-5.4",
    "-c",
    "model_reasoning_effort=xhigh",
    expect.any(String),
  ]);
  expect(codexInvocations.flatMap((entry) => entry.args)).not.toContain("resume");

  expect(claudeInvocations).toHaveLength(2);
  expect(claudeInvocations[0]?.args).not.toContain("--resume");
  expect(claudeInvocations[1]?.args).not.toContain("--resume");
});

test("executes a Copilot-backed verifier lane end to end when the run config selects Copilot for a fresh-session verifier", async () => {
  const fixture = await createVerifierSpecPack("story-verify-copilot-fallback");
  await writeRunConfig(
    fixture.specPackRoot,
    createRunConfig({
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
    })
  );
  const providerBinDir = await createTempDir("story-verify-copilot-provider");
  const copilotProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "copilot",
    responses: [
      {
        stdout: verifierProviderResult(
          "copilot-story-verify-001",
          baseVerifierPayload(fixture)
        ),
      },
    ],
  });
  const claudeProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "claude",
    responses: [
      {
        stdout: verifierProviderResult(
          "claude-story-verify-copilot-001",
          baseVerifierPayload(fixture)
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
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
        verifierLabel: "story-verifier-1",
        provider: "copilot",
        model: "gpt-5.4",
      }),
      expect.objectContaining({
        verifierLabel: "story-verifier-2",
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
    expect.any(String),
    "-s",
    "--model",
    "gpt-5.4",
  ]);
  expect(copilotInvocations[0]?.args).not.toContain("resume");
});

test("blocks story-verify with PROVIDER_OUTPUT_INVALID when the Copilot verifier returns an invalid text-wrapped payload", async () => {
  const fixture = await createVerifierSpecPack("story-verify-copilot-invalid-output");
  await writeRunConfig(
    fixture.specPackRoot,
    createRunConfig({
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
    })
  );
  const providerBinDir = await createTempDir(
    "story-verify-copilot-invalid-output-provider"
  );
  const copilotProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "copilot",
    responses: [
      {
        stdout: JSON.stringify({
          sessionId: "copilot-story-verify-invalid-001",
          text: JSON.stringify({
            reviewScopeSummary: "Missing required verifier fields.",
          }),
        }),
      },
    ],
  });
  const claudeProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "claude",
    responses: [
      {
        stdout: verifierProviderResult(
          "claude-story-verify-copilot-invalid-001",
          baseVerifierPayload(fixture)
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
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

  expect(run.exitCode).toBe(3);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("blocked");
  expect(envelope.outcome).toBe("block");
  expect(envelope.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "PROVIDER_OUTPUT_INVALID",
      }),
    ])
  );

  const copilotInvocations = await readJsonLines<{ args: string[] }>(
    copilotProvider.logPath
  );
  expect(copilotInvocations).toHaveLength(1);
  expect(copilotInvocations[0]?.args).toEqual([
    "-p",
    expect.any(String),
    "-s",
    "--model",
    "gpt-5.4",
  ]);
});

test("blocks story-verify when a structured verifier payload includes an unknown key inside a gatesRun entry", async () => {
  const fixture = await createVerifierSpecPack("story-verify-strict-gates-run");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-verify-strict-gates-run-provider");
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: JSON.stringify({
          sessionId: "codex-story-verify-strict-001",
          result: {
            ...baseVerifierPayload(fixture),
            gatesRun: [
              {
                command: "bun run green-verify",
                result: "not-run",
                extraField: "drift",
              },
            ],
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
        stdout: verifierProviderResult(
          "claude-story-verify-strict-001",
          baseVerifierPayload(fixture)
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
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
          verifierLabel: "story-verifier-2",
          provider: "claude-code",
        }),
      ],
    })
  );
  expect(envelope.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "PROVIDER_OUTPUT_INVALID",
        detail: expect.stringContaining("extraField"),
      }),
    ])
  );
  expect(envelope.errors[0]?.detail).toContain("gatesRun");

  const codexInvocations = await readJsonLines<{ args: string[] }>(
    codexProvider.logPath
  );
  const claudeInvocations = await readJsonLines<{ args: string[] }>(
    claudeProvider.logPath
  );
  expect(codexInvocations).toHaveLength(1);
  expect(claudeInvocations).toHaveLength(1);
});

test("TC-5.2b preserves additional observations that do not rise to formal findings", async () => {
  const fixture = await createVerifierSpecPack("story-verify-observations");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-verify-observations-provider");
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: verifierProviderResult(
          "codex-story-verify-observations-001",
          baseVerifierPayload(fixture, {
            additionalObservations: [
              "The verifier notes that the artifact naming is consistent but could be documented more explicitly.",
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
        stdout: verifierProviderResult(
          "claude-story-verify-observations-001",
          baseVerifierPayload(fixture, {
            additionalObservations: [
              "No separate finding, but the verifier noticed the gate output would benefit from a brief summary line.",
            ],
          })
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
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
  expect(
    envelope.result.verifierResults.flatMap(
      (result: any) => result.additionalObservations
    )
  ).toEqual(
    expect.arrayContaining([
      "The verifier notes that the artifact naming is consistent but could be documented more explicitly.",
      "No separate finding, but the verifier noticed the gate output would benefit from a brief summary line.",
    ])
  );
});

test("TC-5.2c includes explicit mock and shim audit findings for integration-facing story verification", async () => {
  const fixture = await createVerifierSpecPack("story-verify-mock-audit", {
    storyBody: [
      "# Story 4: Story Verification Workflow",
      "",
      "This story verifies integration-facing command and provider-adapter behavior.",
      "",
    ].join("\n"),
  });
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-verify-mock-audit-provider");
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: verifierProviderResult(
          "codex-story-verify-mock-audit-001",
          baseVerifierPayload(fixture, {
            recommendedNextStep: "revise",
            recommendedFixScope: "quick-fix",
            mockOrShimAuditFindings: [
              "processes/impl-cli/core/provider-adapters/copilot.ts must stay on the real copilot subprocess path and avoid any fake success shim.",
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
        stdout: verifierProviderResult(
          "claude-story-verify-mock-audit-001",
          baseVerifierPayload(fixture, {
            recommendedNextStep: "revise",
            recommendedFixScope: "quick-fix",
            mockOrShimAuditFindings: [
              "The verification path should keep production adapters on the real invocation path and avoid fake success shims.",
            ],
          })
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
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
    envelope.result.verifierResults.flatMap(
      (result: any) => result.mockOrShimAuditFindings
    )
  ).toEqual(
    expect.arrayContaining([
      "processes/impl-cli/core/provider-adapters/copilot.ts must stay on the real copilot subprocess path and avoid any fake success shim.",
      "The verification path should keep production adapters on the real invocation path and avoid fake success shims.",
    ])
  );
});

test("preserves per-verifier disagreement while aggregating the batch outcome for routing", async () => {
  const fixture = await createVerifierSpecPack("story-verify-disagreement");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-verify-disagreement-provider");
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: verifierProviderResult(
          "codex-story-verify-disagreement-001",
          baseVerifierPayload(fixture)
        ),
      },
    ],
  });
  const claudeProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "claude",
    responses: [
      {
        stdout: verifierProviderResult(
          "claude-story-verify-disagreement-001",
          baseVerifierPayload(fixture, {
            recommendedNextStep: "revise",
            recommendedFixScope: "fresh-fix-path",
            findings: [
              {
                id: "finding-verify-001",
                severity: "major",
                title: "Verifier disagreement is visible to the orchestrator",
                evidence:
                  "The second verifier found missing evidence for TC-5.2c in the current implementation path.",
                affectedFiles: ["processes/impl-cli/commands/story-verify.ts"],
                requirementIds: ["TC-5.2c"],
                recommendedFixScope: "fresh-fix-path",
                blocking: false,
              },
            ],
            requirementCoverage: {
              verified: ["AC-5.1", "TC-5.1a"],
              unverified: ["TC-5.2c"],
            },
          })
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
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
    envelope.result.verifierResults.map(
      (result: any) => result.recommendedNextStep
    )
  ).toEqual(["pass", "revise"]);
  expect(envelope.result.verifierResults[0]).toMatchObject({
    verifierLabel: "story-verifier-1",
    findings: [],
    requirementCoverage: {
      verified: ["AC-5.1", "AC-5.2", "TC-5.1a", "TC-5.2a"],
      unverified: [],
    },
  });
  expect(envelope.result.verifierResults[1]).toMatchObject({
    verifierLabel: "story-verifier-2",
    findings: [
      expect.objectContaining({
        id: "finding-verify-001",
        title: "Verifier disagreement is visible to the orchestrator",
        requirementIds: ["TC-5.2c"],
      }),
    ],
    requirementCoverage: {
      verified: ["AC-5.1", "TC-5.1a"],
      unverified: ["TC-5.2c"],
    },
  });
});

test("preserves successful verifier results when a sibling verifier execution fails", async () => {
  const fixture = await createVerifierSpecPack("story-verify-partial-failure");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir(
    "story-verify-partial-failure-provider"
  );
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stderr: "codex verifier crashed before producing JSON output",
        exitCode: 1,
      },
    ],
  });
  const claudeProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "claude",
    responses: [
      {
        stdout: verifierProviderResult(
          "claude-story-verify-partial-failure-001",
          baseVerifierPayload(fixture, {
            recommendedNextStep: "revise",
            recommendedFixScope: "quick-fix",
            findings: [
              {
                id: "finding-partial-failure-001",
                severity: "major",
                title: "Surviving verifier evidence remains available",
                evidence:
                  "One verifier failed to launch, but the successful verifier still found a concrete fix-routing issue.",
                affectedFiles: ["processes/impl-cli/core/story-verifier.ts"],
                requirementIds: ["TC-5.2e"],
                recommendedFixScope: "quick-fix",
                blocking: false,
              },
            ],
            requirementCoverage: {
              verified: ["AC-5.1", "TC-5.2e"],
              unverified: ["AC-5.2"],
            },
          })
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
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
    verifierLabel: "story-verifier-2",
    provider: "claude-code",
    recommendedNextStep: "revise",
    recommendedFixScope: "quick-fix",
    findings: [
      expect.objectContaining({
        id: "finding-partial-failure-001",
        severity: "major",
        blocking: false,
      }),
    ],
    requirementCoverage: {
      verified: ["AC-5.1", "TC-5.2e"],
      unverified: ["AC-5.2"],
    },
  });
});

test("routes the verifier batch to block when any verifier recommends block", async () => {
  const fixture = await createVerifierSpecPack("story-verify-block");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-verify-block-provider");
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: verifierProviderResult(
          "codex-story-verify-block-001",
          baseVerifierPayload(fixture, {
            recommendedNextStep: "block",
            recommendedFixScope: "human-ruling",
            findings: [
              {
                id: "finding-verify-block-001",
                severity: "critical",
                title: "Blocking verifier issue is preserved",
                evidence:
                  "The verifier could not establish safe story readiness from the available evidence.",
                affectedFiles: ["processes/impl-cli/core/story-verifier.ts"],
                requirementIds: ["AC-5.2"],
                recommendedFixScope: "human-ruling",
                blocking: true,
              },
            ],
            requirementCoverage: {
              verified: ["AC-5.1"],
              unverified: ["AC-5.2"],
            },
            openQuestions: [
              "Does the orchestrator want a human ruling before any further fix routing?",
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
        stdout: verifierProviderResult(
          "claude-story-verify-block-001",
          baseVerifierPayload(fixture)
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
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
  expect(
    envelope.result.verifierResults.map(
      (result: any) => result.recommendedNextStep
    )
  ).toEqual(["block", "pass"]);
  expect(envelope.result.verifierResults[0]).toMatchObject({
    verifierLabel: "story-verifier-1",
    recommendedFixScope: "human-ruling",
    findings: [
      expect.objectContaining({
        id: "finding-verify-block-001",
        severity: "critical",
        blocking: true,
      }),
    ],
  });
});
