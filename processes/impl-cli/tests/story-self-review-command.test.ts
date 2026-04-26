import { expect, test } from "bun:test";

import { buildRuntimeProgressPaths } from "../core/artifact-writer";
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

function codexJsonlEventStream(threadId: string, payload: ImplementorPayload): string {
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
        text: JSON.stringify(payload),
      },
    }),
    JSON.stringify({
      type: "turn.completed",
    }),
  ].join("\n");
}

function basePayload(
  overrides: Partial<ImplementorPayload> = {}
): ImplementorPayload {
  const payload: ImplementorPayload = {
    outcome: "ready-for-verification",
    planSummary:
      "ACs: AC-4.1 to AC-4.5. TCs: TC-4.2a, TC-4.3a, TC-4.3b, TC-4.4a, TC-4.4b. Approach: run retained self-review with explicit continuation and bounded artifacts.",
    changedFiles: [
      {
        path: "processes/impl-cli/commands/story-self-review.ts",
        reason: "Run explicit self-review passes against the retained implementor session.",
      },
    ],
    tests: {
      added: ["processes/impl-cli/tests/story-self-review-command.test.ts"],
      modified: ["processes/impl-cli/tests/story-implement-command.test.ts"],
      removed: [],
      totalAfterStory: 150,
      deltaFromPriorBaseline: 9,
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

async function launchInitialImplementorSession(input: {
  specPackRoot: string;
  storyId: string;
  providerBinDir: string;
  env: Record<string, string>;
}) {
  return runSourceCli(
    [
      "story-implement",
      "--spec-pack-root",
      input.specPackRoot,
      "--story-id",
      input.storyId,
      "--json",
    ],
    {
      env: {
        PATH: `${input.providerBinDir}:${process.env.PATH ?? ""}`,
        ...input.env,
      },
    }
  );
}

test("runs story-self-review from an explicit continuation handle using the configured pass count and writes per-pass artifacts plus a final batch", async () => {
  const fixture = await createImplementorSpecPack("story-self-review-default-passes");
  await writeRunConfig(
    fixture.specPackRoot,
    createRunConfig({
      self_review: {
        passes: 3,
      },
    })
  );
  const providerBinDir = await createTempDir("story-self-review-default-passes-provider");
  const sessionId = "codex-session-self-review-001";
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(sessionId, basePayload()),
      },
      ...Array.from({ length: 3 }, () => ({
        stdout: codexJsonlEventStream(sessionId, basePayload()),
        lastMessage: JSON.stringify(basePayload()),
      })),
    ],
  });

  const initialRun = await launchInitialImplementorSession({
    specPackRoot: fixture.specPackRoot,
    storyId: fixture.storyId,
    providerBinDir,
    env,
  });
  expect(initialRun.exitCode).toBe(0);

  const selfReviewRun = await runSourceCli(
    [
      "story-self-review",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      sessionId,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(selfReviewRun.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(selfReviewRun.stdout);
  expect(envelope.command).toBe("story-self-review");
  expect(envelope.outcome).toBe("ready-for-verification");
  expect(envelope.result.provider).toBe("codex");
  expect(envelope.result.sessionId).toBe(sessionId);
  expect(envelope.result.passesRequested).toBe(3);
  expect(envelope.result.passesCompleted).toBe(3);
  expect(envelope.result.selfReview.passesRun).toBe(3);
  expect(envelope.result.passArtifacts).toEqual([
    {
      passNumber: 1,
      path: expect.stringContaining(`/artifacts/${fixture.storyId}/002-self-review-pass-1.json`),
    },
    {
      passNumber: 2,
      path: expect.stringContaining(`/artifacts/${fixture.storyId}/003-self-review-pass-2.json`),
    },
    {
      passNumber: 3,
      path: expect.stringContaining(`/artifacts/${fixture.storyId}/004-self-review-pass-3.json`),
    },
  ]);

  const artifactPath = envelope.artifacts[envelope.artifacts.length - 1].path as string;
  expect(artifactPath).toContain(`/artifacts/${fixture.storyId}/005-self-review-batch.json`);
  const persisted = JSON.parse(await Bun.file(artifactPath).text());
  expect(persisted).toEqual(envelope);

  for (const artifact of envelope.result.passArtifacts as Array<{
    passNumber: number;
    path: string;
  }>) {
    const passPayload = JSON.parse(await Bun.file(artifact.path).text()) as {
      status: string;
      passNumber: number;
    };
    expect(passPayload.status).toBe("completed");
    expect(passPayload.passNumber).toBe(artifact.passNumber);
  }

  const progressPaths = buildRuntimeProgressPaths(artifactPath);
  const runtimeStatus = JSON.parse(
    await Bun.file(progressPaths.statusPath).text()
  ) as {
    status: string;
    selfReviewPassesCompleted?: number;
    selfReviewPassesPlanned?: number;
  };
  const progressEvents = await readJsonLines<{ event: string }>(
    progressPaths.progressPath
  );
  expect(runtimeStatus.status).toBe("completed");
  expect(runtimeStatus.selfReviewPassesCompleted).toBe(3);
  expect(runtimeStatus.selfReviewPassesPlanned).toBe(3);
  expect(progressEvents.map((event) => event.event)).toEqual(
    expect.arrayContaining([
      "command-started",
      "self-review-pass-started",
      "self-review-pass-completed",
      "completed",
    ])
  );
  expect(progressEvents.map((event) => event.event)).not.toContain(
    "initial-pass-started"
  );

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(4);
});

test("honors --passes as a command-level override over impl-run.config.json", async () => {
  const fixture = await createImplementorSpecPack("story-self-review-pass-override");
  await writeRunConfig(
    fixture.specPackRoot,
    createRunConfig({
      self_review: {
        passes: 3,
      },
    })
  );
  const providerBinDir = await createTempDir("story-self-review-pass-override-provider");
  const sessionId = "codex-session-self-review-002";
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
    ],
  });

  const initialRun = await launchInitialImplementorSession({
    specPackRoot: fixture.specPackRoot,
    storyId: fixture.storyId,
    providerBinDir,
    env,
  });
  expect(initialRun.exitCode).toBe(0);

  const selfReviewRun = await runSourceCli(
    [
      "story-self-review",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      sessionId,
      "--passes",
      "2",
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(selfReviewRun.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(selfReviewRun.stdout);
  expect(envelope.result.passesRequested).toBe(2);
  expect(envelope.result.passesCompleted).toBe(2);
  expect(envelope.result.passArtifacts).toHaveLength(2);
  expect(envelope.artifacts[envelope.artifacts.length - 1]?.path).toContain(
    `/artifacts/${fixture.storyId}/004-self-review-batch.json`
  );

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(3);
});

test("rejects invalid --passes values before provider dispatch", async () => {
  const fixture = await createImplementorSpecPack("story-self-review-invalid-passes");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-self-review-invalid-passes-provider");
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult("unused", basePayload()),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "story-self-review",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      "codex-session-invalid",
      "--passes",
      "6",
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(run.exitCode).toBe(1);
  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("error");
  expect(envelope.errors).toContainEqual(
    expect.objectContaining({
      code: "INVALID_INVOCATION",
    })
  );
});

test("stops early on needs-human-ruling, preserves completed evidence, and writes skipped artifacts for the remaining passes", async () => {
  const fixture = await createImplementorSpecPack("story-self-review-early-stop");
  await writeRunConfig(
    fixture.specPackRoot,
    createRunConfig({
      self_review: {
        passes: 3,
      },
    })
  );
  const providerBinDir = await createTempDir("story-self-review-early-stop-provider");
  const sessionId = "codex-session-self-review-003";
  const surfacedFinding =
    "Potential design ambiguity needs a human ruling before more self-review passes run.";
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
            outcome: "needs-human-ruling",
            selfReview: {
              findingsFixed: [],
              findingsSurfaced: [surfacedFinding],
            },
            recommendedNextStep: "Pause for orchestrator review before continuing.",
          })
        ),
      },
    ],
  });

  const initialRun = await launchInitialImplementorSession({
    specPackRoot: fixture.specPackRoot,
    storyId: fixture.storyId,
    providerBinDir,
    env,
  });
  expect(initialRun.exitCode).toBe(0);

  const selfReviewRun = await runSourceCli(
    [
      "story-self-review",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      sessionId,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(selfReviewRun.exitCode).toBe(2);
  const envelope = parseJsonOutput<any>(selfReviewRun.stdout);
  expect(envelope.status).toBe("needs-user-decision");
  expect(envelope.outcome).toBe("needs-human-ruling");
  expect(envelope.result.passesRequested).toBe(3);
  expect(envelope.result.passesCompleted).toBe(1);
  expect(envelope.result.selfReview.findingsSurfaced).toContain(surfacedFinding);
  expect(envelope.result.passArtifacts).toHaveLength(3);

  const passOne = JSON.parse(
    await Bun.file(envelope.result.passArtifacts[0].path).text()
  ) as {
    status: string;
  };
  const passTwo = JSON.parse(
    await Bun.file(envelope.result.passArtifacts[1].path).text()
  ) as {
    status: string;
    skippedReason: string;
  };
  const passThree = JSON.parse(
    await Bun.file(envelope.result.passArtifacts[2].path).text()
  ) as {
    status: string;
  };
  expect(passOne.status).toBe("completed");
  expect(passTwo.status).toBe("skipped");
  expect(passTwo.skippedReason).toContain("needs-human-ruling");
  expect(passThree.status).toBe("skipped");
});

test("accepts an explicit self-review continuation handle without local story-ownership validation", async () => {
  const fixture = await createImplementorSpecPack("story-self-review-wrong-story");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-self-review-wrong-story-provider");
  const sessionId = "codex-session-self-review-004";
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(sessionId, basePayload()),
      },
    ],
  });

  const initialRun = await launchInitialImplementorSession({
    specPackRoot: fixture.specPackRoot,
    storyId: fixture.storyId,
    providerBinDir,
    env,
  });
  expect(initialRun.exitCode).toBe(0);

  const selfReviewRun = await runSourceCli(
    [
      "story-self-review",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      "01-next",
      "--provider",
      "codex",
      "--session-id",
      sessionId,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(selfReviewRun.exitCode).toBe(0);
  const envelope = parseJsonOutput<any>(selfReviewRun.stdout);
  expect(envelope.outcome).toBe("ready-for-verification");
  expect(envelope.result.provider).toBe("codex");
  expect(envelope.result.sessionId).toBe(sessionId);
});

test("rejects copilot as an invalid retained self-review provider before provider dispatch", async () => {
  const fixture = await createImplementorSpecPack("story-self-review-copilot-rejected");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const run = await runSourceCli(
    [
      "story-self-review",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "copilot",
      "--session-id",
      "copilot-session-001",
      "--json",
    ],
    {
      env: {
        FORCE_COLOR: "0",
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

test("writes partial pass evidence and skips the remaining passes when provider execution fails mid-review", async () => {
  const fixture = await createImplementorSpecPack("story-self-review-provider-failure");
  await writeRunConfig(
    fixture.specPackRoot,
    createRunConfig({
      self_review: {
        passes: 3,
      },
    })
  );
  const providerBinDir = await createTempDir("story-self-review-provider-failure-provider");
  const sessionId = "codex-session-self-review-005";
  const { env } = await writeFakeProviderExecutable({
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
        stderr: "provider exited unexpectedly",
        exitCode: 70,
      },
    ],
  });

  const initialRun = await launchInitialImplementorSession({
    specPackRoot: fixture.specPackRoot,
    storyId: fixture.storyId,
    providerBinDir,
    env,
  });
  expect(initialRun.exitCode).toBe(0);

  const selfReviewRun = await runSourceCli(
    [
      "story-self-review",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      sessionId,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(selfReviewRun.exitCode).toBe(3);
  const envelope = parseJsonOutput<any>(selfReviewRun.stdout);
  expect(envelope.status).toBe("blocked");
  expect(envelope.errors).toContainEqual(
    expect.objectContaining({
      code: "PROVIDER_UNAVAILABLE",
    })
  );
  expect(envelope.artifacts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "self-review-pass",
        path: expect.stringContaining(`/artifacts/${fixture.storyId}/002-self-review-pass-1.json`),
      }),
      expect.objectContaining({
        kind: "self-review-pass",
        path: expect.stringContaining(`/artifacts/${fixture.storyId}/003-self-review-pass-2.json`),
      }),
      expect.objectContaining({
        kind: "self-review-pass",
        path: expect.stringContaining(`/artifacts/${fixture.storyId}/004-self-review-pass-3.json`),
      }),
    ])
  );

  const skippedPass = JSON.parse(
    await Bun.file(
      envelope.artifacts.find((artifact: any) =>
        String(artifact.path).includes("003-self-review-pass-2.json")
      ).path
    ).text()
  ) as {
    status: string;
  };
  expect(skippedPass.status).toBe("skipped");
});
