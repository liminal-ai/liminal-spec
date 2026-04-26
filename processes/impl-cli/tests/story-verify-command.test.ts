import { expect, test } from "bun:test";

import { buildRuntimeProgressPaths } from "../core/artifact-writer";
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

interface StoryVerifierPayload {
  artifactsRead: string[];
  reviewScopeSummary: string;
  priorFindingStatuses: Array<{
    id: string;
    status: "resolved" | "still-open" | "needs-human-ruling";
    rationale: string;
  }>;
  newFindings: VerifierFindingPayload[];
  openFindings: VerifierFindingPayload[];
  requirementCoverage: {
    verified: string[];
    unverified: string[];
  };
  gatesRun: Array<{ command: string; result: "pass" | "fail" | "not-run" }>;
  mockOrShimAuditFindings: string[];
  recommendedNextStep: "pass" | "revise" | "block" | "needs-human-ruling";
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

function baseFinding(id: string): VerifierFindingPayload {
  return {
    id,
    severity: "major",
    title: `Finding ${id}`,
    evidence: `Verifier evidence for ${id}.`,
    affectedFiles: ["processes/impl-cli/commands/story-verify.ts"],
    requirementIds: ["TC-5.1a"],
    recommendedFixScope: "same-session-implementor",
    blocking: true,
  };
}

function baseInitialPayload(
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
      "Reviewed the story contract, tech design, and test-plan evidence.",
    priorFindingStatuses: [],
    newFindings: [],
    openFindings: [],
    requirementCoverage: {
      verified: ["AC-5.1", "TC-5.1a"],
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

test("initial story-verify starts one retained verifier session and returns continuation", async () => {
  const fixture = await createVerifierSpecPack("story-verify-initial-retained");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-verify-initial-retained-provider");
  const codexSessionId = "codex-story-verify-initial-001";
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: verifierProviderResult(
          codexSessionId,
          baseInitialPayload(fixture, {
            recommendedNextStep: "revise",
            newFindings: [baseFinding("F-001")],
            openFindings: [baseFinding("F-001")],
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
      },
    }
  );

  expect(run.exitCode).toBe(2);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.command).toBe("story-verify");
  expect(envelope.outcome).toBe("revise");
  expect(envelope.result.mode).toBe("initial");
  expect(envelope.result.role).toBe("story_verifier");
  expect(envelope.result.sessionId).toBe(codexSessionId);
  expect(envelope.result.continuation).toEqual({
    provider: "codex",
    sessionId: codexSessionId,
    storyId: fixture.storyId,
  });
  expect(envelope.result.newFindings).toHaveLength(1);
  expect(envelope.result.openFindings).toHaveLength(1);
  expect(envelope.artifacts[0].path).toContain(
    `/artifacts/${fixture.storyId}/001-verify.json`
  );

  const artifactPath = envelope.artifacts[0].path as string;
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
  expect(runtimeStatus.status).toBe("completed");
  expect(runtimeStatus.verifiersCompleted).toBe(1);
  expect(runtimeStatus.verifiersPlanned).toBe(1);

  const codexInvocations = await readJsonLines<{ args: string[] }>(
    codexProvider.logPath
  );
  expect(codexInvocations).toHaveLength(1);
  expect(codexInvocations[0]?.args.slice(0, 6)).toEqual([
    "exec",
    "--json",
    "-m",
    "gpt-5.4",
    "-c",
    "model_reasoning_effort=xhigh",
  ]);
  expect(codexInvocations[0]?.args).not.toContain("resume");
});

test("follow-up story-verify resumes the retained verifier session with implementor response and orchestrator context", async () => {
  const fixture = await createVerifierSpecPack("story-verify-followup-retained");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-verify-followup-retained-provider");
  const sessionId = "codex-story-verify-followup-001";
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: verifierProviderResult(
          sessionId,
          baseInitialPayload(fixture, {
            recommendedNextStep: "revise",
            newFindings: [baseFinding("F-001")],
            openFindings: [baseFinding("F-001")],
          })
        ),
      },
      {
        stdout: verifierProviderResult(
          sessionId,
          {
            ...baseInitialPayload(fixture, {
              recommendedNextStep: "pass",
              priorFindingStatuses: [
                {
                  id: "F-001",
                  status: "resolved",
                  rationale: "The retained implementor fixed the blocker.",
                },
              ],
              newFindings: [],
              openFindings: [],
            }),
            reviewScopeSummary:
              "Re-reviewed the prior open findings against the implementor response and touched surfaces.",
          }
        ),
      },
    ],
  });

  const sharedEnv = {
    PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
    ...codexProvider.env,
  };

  const initialRun = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--json",
    ],
    { env: sharedEnv }
  );
  expect(initialRun.exitCode).toBe(2);

  const followupRun = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      sessionId,
      "--response-text",
      "Implemented the requested fix and tightened the affected contract surface.",
      "--orchestrator-context-text",
      "Focus on the prior open blocker and only raise new regressions if the fix introduced them.",
      "--json",
    ],
    { env: sharedEnv }
  );

  expect(followupRun.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(followupRun.stdout);
  expect(envelope.outcome).toBe("pass");
  expect(envelope.result.mode).toBe("followup");
  expect(envelope.result.sessionId).toBe(sessionId);
  expect(envelope.result.priorFindingStatuses).toEqual([
    {
      id: "F-001",
      status: "resolved",
      rationale: "The retained implementor fixed the blocker.",
    },
  ]);
  expect(envelope.result.openFindings).toEqual([]);
  expect(envelope.result.newFindings).toEqual([]);
  expect(envelope.artifacts[0].path).toContain(
    `/artifacts/${fixture.storyId}/002-verify.json`
  );

  const codexInvocations = await readJsonLines<{ args: string[] }>(
    codexProvider.logPath
  );
  expect(codexInvocations).toHaveLength(2);
  expect(codexInvocations[1]?.args.slice(0, 4)).toEqual([
    "exec",
    "resume",
    "--json",
    "-o",
  ]);
  expect(codexInvocations[1]?.args).toContain(sessionId);
  const followupPrompt = codexInvocations[1]?.args[codexInvocations[1].args.length - 1];
  expect(followupPrompt).toContain(
    "the story implementor has responded to your feedback"
  );
  expect(followupPrompt).toContain("<response>");
  expect(followupPrompt).toContain("F-001");
  expect(followupPrompt).toContain("Focus on the prior open blocker");
});

test("follow-up story-verify rejects missing provider or session id", async () => {
  const fixture = await createVerifierSpecPack("story-verify-missing-followup-handle");

  const run = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--response-text",
      "Implemented the fix.",
      "--json",
    ]
  );

  expect(run.exitCode).toBe(1);
  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.outcome).toBe("error");
  expect(envelope.errors[0]?.code).toBe("INVALID_INVOCATION");
});

test("follow-up story-verify rejects missing or duplicate response inputs", async () => {
  const fixture = await createVerifierSpecPack("story-verify-invalid-followup-response");

  const missingRun = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      "codex-story-verify-missing-response-001",
      "--json",
    ]
  );
  expect(missingRun.exitCode).toBe(1);
  expect(parseJsonOutput<any>(missingRun.stdout).errors[0]?.code).toBe(
    "INVALID_INVOCATION"
  );

  const duplicateRun = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      "codex-story-verify-duplicate-response-001",
      "--response-text",
      "Implemented the fix.",
      "--response-file",
      fixture.storyPath,
      "--json",
    ]
  );
  expect(duplicateRun.exitCode).toBe(1);
  expect(parseJsonOutput<any>(duplicateRun.stdout).errors[0]?.code).toBe(
    "INVALID_INVOCATION"
  );
});

test("initial story-verify rejects response-only follow-up flags", async () => {
  const fixture = await createVerifierSpecPack("story-verify-initial-rejects-response");

  const run = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--response-text",
      "Implemented the fix.",
      "--json",
    ]
  );

  expect(run.exitCode).toBe(1);
  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.outcome).toBe("error");
  expect(envelope.errors[0]?.code).toBe("INVALID_INVOCATION");
});

test("follow-up story-verify blocks when the retained verifier continuation cannot be recovered from prior artifacts", async () => {
  const fixture = await createVerifierSpecPack("story-verify-stale-continuation");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());

  const run = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      "codex-story-verify-stale-001",
      "--response-text",
      "Implemented the fix.",
      "--json",
    ]
  );

  expect(run.exitCode).toBe(3);
  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("blocked");
  expect(envelope.outcome).toBe("block");
  expect(envelope.errors[0]?.code).toBe("CONTINUATION_HANDLE_INVALID");
});

test("follow-up story-verify preserves prior finding ids and accepts directly touched-surface regressions as new findings", async () => {
  const fixture = await createVerifierSpecPack("story-verify-followup-findings");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-verify-followup-findings-provider");
  const sessionId = "codex-story-verify-followup-findings-001";
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: verifierProviderResult(
          sessionId,
          baseInitialPayload(fixture, {
            recommendedNextStep: "revise",
            newFindings: [baseFinding("F-001")],
            openFindings: [baseFinding("F-001")],
          })
        ),
      },
      {
        stdout: verifierProviderResult(
          sessionId,
          {
            ...baseInitialPayload(fixture, {
              recommendedNextStep: "revise",
              priorFindingStatuses: [
                {
                  id: "F-001",
                  status: "still-open",
                  rationale: "The main blocker remains unresolved.",
                },
              ],
              newFindings: [
                {
                  ...baseFinding("F-002"),
                  title: "New regression on touched surface",
                  evidence: "The fix introduced a touched-surface regression.",
                  blocking: false,
                },
              ],
              openFindings: [
                baseFinding("F-001"),
                {
                  ...baseFinding("F-002"),
                  title: "New regression on touched surface",
                  evidence: "The fix introduced a touched-surface regression.",
                  blocking: false,
                },
              ],
            }),
          }
        ),
      },
    ],
  });

  const sharedEnv = {
    PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
    ...codexProvider.env,
  };

  const initialRun = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--json",
    ],
    { env: sharedEnv }
  );
  expect(initialRun.exitCode).toBe(2);

  const followupRun = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      sessionId,
      "--response-text",
      "Implemented a partial fix that touched the same service surface.",
      "--json",
    ],
    { env: sharedEnv }
  );

  expect(followupRun.exitCode).toBe(2);
  const envelope = parseJsonOutput<any>(followupRun.stdout);
  expect(envelope.outcome).toBe("revise");
  expect(envelope.result.priorFindingStatuses).toEqual([
    {
      id: "F-001",
      status: "still-open",
      rationale: "The main blocker remains unresolved.",
    },
  ]);
  expect(envelope.result.newFindings).toEqual([
    expect.objectContaining({
      id: "F-002",
      title: "New regression on touched surface",
    }),
  ]);
  expect(envelope.result.openFindings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "F-001" }),
      expect.objectContaining({ id: "F-002" }),
    ])
  );
});

test("follow-up story-verify surfaces needs-human-ruling as a top-level outcome when prior finding status requires it", async () => {
  const fixture = await createVerifierSpecPack("story-verify-needs-human-ruling");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-verify-needs-human-ruling-provider");
  const sessionId = "codex-story-verify-human-ruling-001";
  const codexProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: verifierProviderResult(
          sessionId,
          baseInitialPayload(fixture, {
            recommendedNextStep: "revise",
            newFindings: [baseFinding("F-001")],
            openFindings: [baseFinding("F-001")],
          })
        ),
      },
      {
        stdout: verifierProviderResult(
          sessionId,
          {
            ...baseInitialPayload(fixture, {
              recommendedNextStep: "needs-human-ruling",
              priorFindingStatuses: [
                {
                  id: "F-001",
                  status: "needs-human-ruling",
                  rationale: "The verifier and implementor disagree on scope and the spec evidence is ambiguous.",
                },
              ],
              newFindings: [],
              openFindings: [baseFinding("F-001")],
            }),
          }
        ),
      },
    ],
  });

  const sharedEnv = {
    PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
    ...codexProvider.env,
  };

  const initialRun = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--json",
    ],
    { env: sharedEnv }
  );
  expect(initialRun.exitCode).toBe(2);

  const followupRun = await runSourceCli(
    [
      "story-verify",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      sessionId,
      "--response-text",
      "I believe this is out of scope based on the current story wording.",
      "--json",
    ],
    { env: sharedEnv }
  );

  expect(followupRun.exitCode).toBe(2);
  const envelope = parseJsonOutput<any>(followupRun.stdout);
  expect(envelope.status).toBe("needs-user-decision");
  expect(envelope.outcome).toBe("needs-human-ruling");
  expect(envelope.result.recommendedNextStep).toBe("needs-human-ruling");
  expect(envelope.result.priorFindingStatuses).toEqual([
    {
      id: "F-001",
      status: "needs-human-ruling",
      rationale:
        "The verifier and implementor disagree on scope and the spec evidence is ambiguous.",
    },
  ]);
});

test("story-verify runs through Copilot for fresh initial verification when configured", async () => {
  const fixture = await createVerifierSpecPack("story-verify-copilot-initial");
  await writeRunConfig(
    fixture.specPackRoot,
    createRunConfig({
      story_verifier: {
        secondary_harness: "copilot",
        model: "gpt-5.4",
        reasoning_effort: "xhigh",
      },
    })
  );
  const providerBinDir = await createTempDir("story-verify-copilot-initial-provider");
  const copilotProvider = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "copilot",
    responses: [
      {
        stdout: verifierProviderResult(
          "copilot-story-verify-initial-001",
          baseInitialPayload(fixture)
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
      },
    }
  );

  expect(run.exitCode).toBe(0);
  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.result.provider).toBe("copilot");
  expect(envelope.result.mode).toBe("initial");

  const copilotInvocations = await readJsonLines<{ args: string[] }>(
    copilotProvider.logPath
  );
  expect(copilotInvocations).toHaveLength(1);
  expect(copilotInvocations[0]?.args).toEqual([
    "-p",
    expect.stringContaining("# Story Verifier Base Prompt"),
    "--output-format",
    "json",
    "--model",
    "gpt-5.4",
    "--effort",
    "xhigh",
  ]);
  expect(copilotInvocations[0]?.args).not.toContain("resume");
});
