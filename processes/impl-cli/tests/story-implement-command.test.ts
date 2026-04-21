import { expect, test } from "bun:test";

import {
  createImplementorSpecPack,
  createRunConfig,
  createTempDir,
  parseJsonOutput,
  readJsonLines,
  runSourceCli,
  writeFakeProviderExecutable,
  writeRunConfig,
} from "./test-helpers";

interface ImplementorPayload {
  outcome:
    | "ready-for-verification"
    | "needs-followup-fix"
    | "needs-human-ruling"
    | "blocked";
  planSummary: string;
  changedFiles: Array<{ path: string; reason: string }>;
  tests: {
    added: string[];
    modified: string[];
    removed: string[];
    totalAfterStory?: number;
    deltaFromPriorBaseline?: number;
  };
  gatesRun: Array<{ command: string; result: "pass" | "fail" | "not-run" }>;
  selfReview: {
    findingsFixed: string[];
    findingsSurfaced: string[];
  };
  openQuestions: string[];
  specDeviations: string[];
  recommendedNextStep: string;
}

function providerResult(sessionId: string, payload: ImplementorPayload) {
  return JSON.stringify({
    sessionId,
    result: payload,
  });
}

function basePayload(
  overrides: Partial<ImplementorPayload> = {}
): ImplementorPayload {
  const payload: ImplementorPayload = {
    outcome: "ready-for-verification",
    planSummary:
      "ACs: AC-4.1 to AC-4.5. TCs: TC-4.1a, TC-4.2a, TC-4.2b, TC-4.3a, TC-4.4a, TC-4.4b, TC-4.5a. Approach: implement commands, adapters, and self-review loop. Likely failure modes: provider parsing drift and session continuity regressions.",
    changedFiles: [
      {
        path: "processes/impl-cli/commands/story-implement.ts",
        reason: "Launch the implementor workflow and persist continuation metadata.",
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
    recommendedNextStep: "Run the fresh verifier batch for story-03.",
  };

  return {
    ...payload,
    ...overrides,
    selfReview: {
      ...payload.selfReview,
      ...overrides.selfReview,
    },
    tests: {
      ...payload.tests,
      ...overrides.tests,
    },
  };
}

test("TC-4.1a launches story-implement with the documented inputs and returns a structured implementor result", async () => {
  const fixture = await createImplementorSpecPack("story-implement-contract");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-implement-contract-provider");
  const sessionId = "codex-session-001";
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(sessionId, basePayload()),
      },
      {
        stdout: providerResult(sessionId, basePayload()),
      },
      {
        stdout: providerResult(sessionId, basePayload()),
      },
      {
        stdout: providerResult(sessionId, basePayload()),
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

  expect(run.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.command).toBe("story-implement");
  expect(envelope.outcome).toBe("ready-for-verification");
  expect(envelope.result.story).toEqual({
    id: fixture.storyId,
    title: fixture.storyTitle,
  });
  expect(envelope.result.planSummary).toContain("AC-4.1 to AC-4.5");
  expect(envelope.result.changedFiles).toEqual([
    expect.objectContaining({
      path: "processes/impl-cli/commands/story-implement.ts",
    }),
  ]);
  expect(envelope.result.tests).toEqual(
    expect.objectContaining({
      totalAfterStory: 141,
      deltaFromPriorBaseline: 5,
    })
  );

  const artifactPath = envelope.artifacts[0].path as string;
  expect(artifactPath).toContain(`/artifacts/${fixture.storyId}/001-implementor.json`);
  const persisted = JSON.parse(await Bun.file(artifactPath).text());
  expect(persisted).toEqual(envelope);

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(4);
});

test("stops self-review early when the provider reports a blocking condition", async () => {
  const fixture = await createImplementorSpecPack("story-implement-blocked-review");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-implement-blocked-review-provider");
  const sessionId = "codex-session-blocked-004";
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(sessionId, basePayload()),
      },
      {
        stdout: providerResult(
          sessionId,
          basePayload({
            outcome: "blocked",
            recommendedNextStep: "Pause for provider recovery before continuing.",
          })
        ),
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
  expect(envelope.outcome).toBe("blocked");
  expect(envelope.result.selfReview.passesRun).toBe(1);

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(2);
});

test("returns exit code 2 when story-implement completes with a follow-up fix outcome", async () => {
  const fixture = await createImplementorSpecPack("story-implement-followup-exit");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-implement-followup-exit-provider");
  const sessionId = "codex-session-followup-002";
  const followupPayload = basePayload({
    outcome: "needs-followup-fix",
    recommendedNextStep:
      "Resume the retained implementor session and apply the bounded follow-up fix.",
  });
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: Array.from({ length: 4 }, () => ({
      stdout: providerResult(sessionId, followupPayload),
    })),
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

  expect(run.exitCode).toBe(2);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("ok");
  expect(envelope.outcome).toBe("needs-followup-fix");
});

test("blocks when the provider payload includes unknown keys outside the documented implementor contract", async () => {
  const fixture = await createImplementorSpecPack("story-implement-strict-payload");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-implement-strict-payload-provider");
  const sessionId = "codex-session-strict-001";
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: JSON.stringify({
          sessionId,
          result: {
            ...basePayload(),
            extraField: "drift",
          },
        }),
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
  expect(envelope.outcome).toBe("blocked");
  expect(envelope.result).toBeUndefined();
  expect(envelope.errors).toEqual([
    expect.objectContaining({
      code: "PROVIDER_OUTPUT_INVALID",
      detail: expect.stringContaining("extraField"),
    }),
  ]);

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(1);
});

test("TC-4.2b returns the provider and session continuation handle needed for story-continue", async () => {
  const fixture = await createImplementorSpecPack(
    "story-implement-continuation-handle"
  );
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-implement-continuation-provider");
  const sessionId = "codex-session-continue-002";
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: Array.from({ length: 4 }, () => ({
      stdout: providerResult(sessionId, basePayload()),
    })),
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

  expect(run.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.result.provider).toBe("codex");
  expect(envelope.result.sessionId).toBe(sessionId);
  expect(envelope.result.continuation).toEqual({
    provider: "codex",
    sessionId,
    storyId: fixture.storyId,
  });
});

test("TC-4.5a returns the full implementor result contract through the public CLI", async () => {
  const fixture = await createImplementorSpecPack("story-implement-full-contract");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-implement-full-contract-provider");
  const sessionId = "codex-session-contract-003";
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: Array.from({ length: 4 }, () => ({
      stdout: providerResult(sessionId, basePayload()),
    })),
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

  expect(run.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.result).toEqual(
    expect.objectContaining({
      resultId: expect.any(String),
      provider: "codex",
      model: "gpt-5.4",
      role: "story_implementor",
      sessionId,
      continuation: {
        provider: "codex",
        sessionId,
        storyId: fixture.storyId,
      },
      outcome: "ready-for-verification",
      story: {
        id: fixture.storyId,
        title: fixture.storyTitle,
      },
      planSummary: expect.any(String),
      changedFiles: [
        expect.objectContaining({
          path: expect.any(String),
          reason: expect.any(String),
        }),
      ],
      tests: expect.objectContaining({
        added: expect.any(Array),
        modified: expect.any(Array),
        removed: expect.any(Array),
        totalAfterStory: expect.any(Number),
        deltaFromPriorBaseline: expect.any(Number),
      }),
      gatesRun: [
        expect.objectContaining({
          command: expect.any(String),
          result: "not-run",
        }),
      ],
      selfReview: expect.objectContaining({
        passesRun: 3,
        findingsFixed: expect.any(Array),
        findingsSurfaced: expect.any(Array),
      }),
      openQuestions: expect.any(Array),
      specDeviations: expect.any(Array),
      recommendedNextStep: expect.any(String),
    })
  );
});

test("TC-4.3a runs the configured self-review pass count in the same story-implement call unless a stop rule fires", async () => {
  const fixture = await createImplementorSpecPack("story-implement-self-review");
  await writeRunConfig(
    fixture.specPackRoot,
    createRunConfig({
      self_review: {
        passes: 3,
      },
    })
  );
  const providerBinDir = await createTempDir("story-implement-self-review-provider");
  const sessionId = "codex-session-review-003";
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: Array.from({ length: 4 }, () => ({
      stdout: providerResult(sessionId, basePayload()),
    })),
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

  expect(run.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.result.selfReview.passesRun).toBe(3);

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(4);
});

test("blocks with PROVIDER_UNAVAILABLE when the provider exits nonzero mid-conversation", async () => {
  const fixture = await createImplementorSpecPack("story-implement-nonzero-provider");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-implement-nonzero-provider-bin");
  const sessionId = "codex-session-nonzero-005";
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(sessionId, basePayload()),
      },
      {
        stderr: "provider exited unexpectedly",
        exitCode: 70,
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
      code: "PROVIDER_UNAVAILABLE",
      detail: expect.stringContaining("provider exited unexpectedly"),
    })
  );

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(2);
});

test("TC-4.3b drives pass-1, pass-2, and pass-3 self-review prompts through the runtime loop instead of repeating one unchanged prompt", async () => {
  const fixture = await createImplementorSpecPack(
    "story-implement-self-review-prompt-evolution"
  );
  await writeRunConfig(
    fixture.specPackRoot,
    createRunConfig({
      self_review: {
        passes: 3,
      },
    })
  );
  const providerBinDir = await createTempDir(
    "story-implement-self-review-prompt-evolution-provider"
  );
  const sessionId = "codex-session-review-004";
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: Array.from({ length: 4 }, () => ({
      stdout: providerResult(sessionId, basePayload()),
    })),
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

  expect(run.exitCode).toBe(0);

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  const reviewPrompts = invocations.slice(1).map((invocation) => {
    return invocation.args[invocation.args.length - 1] ?? "";
  });

  expect(reviewPrompts).toHaveLength(3);
  expect(reviewPrompts[0]).toContain(
    "Self-review pass 1: broad correctness and obvious omissions."
  );
  expect(reviewPrompts[1]).toContain(
    "Self-review pass 2: requirement alignment, test coverage, and missing evidence."
  );
  expect(reviewPrompts[2]).toContain(
    "Self-review pass 3: residual risks, scope edges, and cleanup before handoff."
  );
  expect(reviewPrompts[0]).not.toBe(reviewPrompts[1]);
  expect(reviewPrompts[1]).not.toBe(reviewPrompts[2]);
});

test("TC-4.4a records clear and local self-review fixes that were applied automatically during the same call", async () => {
  const fixture = await createImplementorSpecPack("story-implement-auto-fix");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-implement-auto-fix-provider");
  const sessionId = "codex-session-fix-004";
  const appliedFix = "Tightened the artifact persistence assertion in the story-implement command test.";
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(sessionId, basePayload()),
      },
      {
        stdout: providerResult(
          sessionId,
          basePayload({
            selfReview: {
              findingsFixed: [appliedFix],
              findingsSurfaced: [],
            },
          })
        ),
      },
      {
        stdout: providerResult(
          sessionId,
          basePayload({
            selfReview: {
              findingsFixed: [appliedFix],
              findingsSurfaced: [],
            },
          })
        ),
      },
      {
        stdout: providerResult(
          sessionId,
          basePayload({
            selfReview: {
              findingsFixed: [appliedFix],
              findingsSurfaced: [],
            },
          })
        ),
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

  expect(run.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.result.selfReview.findingsFixed).toContain(appliedFix);
  expect(envelope.result.outcome).toBe("ready-for-verification");
});

test("blocks with CONTINUATION_HANDLE_INVALID when the provider omits a session id for a retained implementor run", async () => {
  const fixture = await createImplementorSpecPack("story-implement-missing-session");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-implement-missing-session-provider");
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: JSON.stringify({
          result: basePayload(),
        }),
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
  expect(envelope.errors).toContainEqual(
    expect.objectContaining({
      code: "CONTINUATION_HANDLE_INVALID",
    })
  );
});

test("TC-4.4b surfaces uncertain fixes to the orchestrator instead of hiding them behind an automatic edit", async () => {
  const fixture = await createImplementorSpecPack("story-implement-surfaced-risk");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-implement-surfaced-risk-provider");
  const sessionId = "codex-session-risk-005";
  const surfacedFinding =
    "Potential scope leak in continuation-handle lookup needs a human ruling before any auto-fix.";
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(sessionId, basePayload()),
      },
      {
        stdout: providerResult(
          sessionId,
          basePayload({
            outcome: "needs-human-ruling",
            selfReview: {
              findingsFixed: [],
              findingsSurfaced: [surfacedFinding],
            },
            recommendedNextStep:
              "Pause for orchestrator review before continuing the session.",
          })
        ),
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

  expect(run.exitCode).toBe(2);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("needs-user-decision");
  expect(envelope.outcome).toBe("needs-human-ruling");
  expect(envelope.result.selfReview.passesRun).toBe(1);
  expect(envelope.result.selfReview.findingsSurfaced).toContain(surfacedFinding);

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(2);
});
