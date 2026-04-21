import { join } from "node:path";
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
  writeTextFile,
} from "./test-helpers";

function providerResult(
  sessionId: string,
  payload: {
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
) {
  return JSON.stringify({
    sessionId,
    result: payload,
  });
}

function continuePayload(nextStep: string) {
  return {
    outcome: "ready-for-verification" as const,
    planSummary:
      "Continue the retained implementor session with the follow-up fixes applied in scope.",
    changedFiles: [
      {
        path: "processes/impl-cli/commands/story-continue.ts",
        reason: "Resume the explicit implementor session for bounded follow-up work.",
      },
    ],
    tests: {
      added: ["processes/impl-cli/tests/story-continue-command.test.ts"],
      modified: [],
      removed: [],
      totalAfterStory: 142,
      deltaFromPriorBaseline: 6,
    },
    gatesRun: [
      {
        command: "bun run green-verify",
        result: "not-run" as const,
      },
    ],
    selfReview: {
      findingsFixed: [],
      findingsSurfaced: [],
    },
    openQuestions: [],
    specDeviations: [],
    recommendedNextStep: nextStep,
  };
}

test("continues the retained implementor session from explicit provider and session inputs", async () => {
  const fixture = await createImplementorSpecPack("story-continue-explicit-session");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-continue-explicit-provider");
  const sessionId = "codex-session-continue-101";
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(
          sessionId,
          continuePayload("Hand the refreshed result back to story verification.")
        ),
      },
      {
        stdout: providerResult(
          sessionId,
          continuePayload("Hand the refreshed result back to story verification.")
        ),
      },
      {
        stdout: providerResult(
          sessionId,
          continuePayload("Hand the refreshed result back to story verification.")
        ),
      },
      {
        stdout: providerResult(
          sessionId,
          continuePayload("Hand the refreshed result back to story verification.")
        ),
      },
    ],
  });

  const initialRun = await runSourceCli(
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

  expect(initialRun.exitCode).toBe(0);

  const continuedRun = await runSourceCli(
    [
      "story-continue",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      sessionId,
      "--followup-text",
      "Tighten the continuation artifact validation and return the refreshed report.",
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(continuedRun.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(continuedRun.stdout);
  expect(envelope.command).toBe("story-continue");
  expect(envelope.result.provider).toBe("codex");
  expect(envelope.result.sessionId).toBe(sessionId);
  expect(envelope.result.continuation).toEqual({
    provider: "codex",
    sessionId,
    storyId: fixture.storyId,
  });
  const artifactPath = envelope.artifacts[0].path as string;
  expect(artifactPath).toContain(`/artifacts/${fixture.storyId}/002-continue.json`);
  const persisted = JSON.parse(await Bun.file(artifactPath).text());
  expect(persisted).toEqual(envelope);

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(8);
});

test("accepts a follow-up file when continuing the same implementor session", async () => {
  const fixture = await createImplementorSpecPack("story-continue-followup-file");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-continue-followup-provider");
  const sessionId = "codex-session-continue-102";
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(
          sessionId,
          continuePayload("Run the verifier batch against the follow-up edits.")
        ),
      },
      {
        stdout: providerResult(
          sessionId,
          continuePayload("Run the verifier batch against the follow-up edits.")
        ),
      },
      {
        stdout: providerResult(
          sessionId,
          continuePayload("Run the verifier batch against the follow-up edits.")
        ),
      },
      {
        stdout: providerResult(
          sessionId,
          continuePayload("Run the verifier batch against the follow-up edits.")
        ),
      },
    ],
  });
  const followupFile = join(fixture.specPackRoot, "followup.md");
  await writeTextFile(
    followupFile,
    "Apply the narrow continuation fix without widening scope.\n"
  );

  const initialRun = await runSourceCli(
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

  expect(initialRun.exitCode).toBe(0);

  const continuedRun = await runSourceCli(
    [
      "story-continue",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      sessionId,
      "--followup-file",
      followupFile,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(continuedRun.exitCode).toBe(0);

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations[4]?.args.join(" ")).toContain(sessionId);
});

test("returns exit code 2 when story-continue completes with a follow-up fix outcome", async () => {
  const fixture = await createImplementorSpecPack("story-continue-followup-exit");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-continue-followup-exit-provider");
  const sessionId = "codex-session-continue-followup-201";
  const followupPayload = {
    ...continuePayload(
      "Resume the retained implementor session and complete the bounded fix."
    ),
    outcome: "needs-followup-fix" as const,
  };
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(sessionId, followupPayload),
      },
      {
        stdout: providerResult(sessionId, followupPayload),
      },
      {
        stdout: providerResult(sessionId, followupPayload),
      },
      {
        stdout: providerResult(sessionId, followupPayload),
      },
    ],
  });

  const initialRun = await runSourceCli(
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

  expect(initialRun.exitCode).toBe(0);

  const continuedRun = await runSourceCli(
    [
      "story-continue",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      sessionId,
      "--followup-text",
      "Apply the bounded follow-up fix and report any remaining work.",
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(continuedRun.exitCode).toBe(2);

  const envelope = parseJsonOutput<any>(continuedRun.stdout);
  expect(envelope.status).toBe("ok");
  expect(envelope.outcome).toBe("needs-followup-fix");
});

test("blocks story-continue when the continued implementor payload includes an unknown top-level key", async () => {
  const fixture = await createImplementorSpecPack("story-continue-strict-payload");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-continue-strict-provider");
  const sessionId = "codex-session-continue-strict-301";
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: providerResult(sessionId, continuePayload("Resume verification.")),
      },
      {
        stdout: JSON.stringify({
          sessionId,
          result: {
            ...continuePayload("Resume verification."),
            extraField: "drift",
          },
        }),
      },
    ],
  });

  const initialRun = await runSourceCli(
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

  expect(initialRun.exitCode).toBe(0);

  const continuedRun = await runSourceCli(
    [
      "story-continue",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      sessionId,
      "--followup-text",
      "Apply the bounded follow-up fix and return the refreshed report.",
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(continuedRun.exitCode).toBe(3);

  const envelope = parseJsonOutput<any>(continuedRun.stdout);
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

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(5);
});

test("rejects a continuation handle when the session belongs to a different story", async () => {
  const fixture = await createImplementorSpecPack("story-continue-wrong-story");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-continue-wrong-story-provider");
  const sessionId = "codex-session-continue-103";
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: Array.from({ length: 4 }, () => ({
      stdout: providerResult(sessionId, continuePayload("Resume verification.")),
    })),
  });

  const initialRun = await runSourceCli(
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

  expect(initialRun.exitCode).toBe(0);

  const continuedRun = await runSourceCli(
    [
      "story-continue",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      "01-next",
      "--provider",
      "codex",
      "--session-id",
      sessionId,
      "--followup-text",
      "Try to reuse the continuation handle on the wrong story.",
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(continuedRun.exitCode).toBe(3);

  const envelope = parseJsonOutput<any>(continuedRun.stdout);
  expect(envelope.status).toBe("blocked");
  expect(envelope.errors).toContainEqual(
    expect.objectContaining({
      code: "CONTINUATION_HANDLE_INVALID",
    })
  );
});

test("rejects an unknown session id with a stable continuation error code", async () => {
  const fixture = await createImplementorSpecPack("story-continue-unknown-session");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const providerBinDir = await createTempDir("story-continue-unknown-session-provider");
  const sessionId = "codex-session-continue-104";
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: Array.from({ length: 4 }, () => ({
      stdout: providerResult(sessionId, continuePayload("Resume verification.")),
    })),
  });

  const initialRun = await runSourceCli(
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

  expect(initialRun.exitCode).toBe(0);

  const continuedRun = await runSourceCli(
    [
      "story-continue",
      "--spec-pack-root",
      fixture.specPackRoot,
      "--story-id",
      fixture.storyId,
      "--provider",
      "codex",
      "--session-id",
      "codex-session-continue-unknown",
      "--followup-text",
      "Try to resume a session id that was never emitted by story-implement.",
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(continuedRun.exitCode).toBe(3);

  const envelope = parseJsonOutput<any>(continuedRun.stdout);
  expect(envelope.status).toBe("blocked");
  expect(envelope.errors).toContainEqual(
    expect.objectContaining({
      code: "CONTINUATION_HANDLE_INVALID",
    })
  );
});

test("rejects a copilot continuation handle before provider dispatch", async () => {
  const fixture = await createImplementorSpecPack("story-continue-copilot-rejected");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());
  const sessionId = "copilot-session-continue-301";
  const artifactPath = join(
    fixture.specPackRoot,
    "artifacts",
    fixture.storyId,
    "001-implementor.json"
  );
  await writeTextFile(
    artifactPath,
    `${JSON.stringify(
      {
        command: "story-implement",
        version: 1,
        status: "ok",
        outcome: "ready-for-verification",
        result: {
          continuation: {
            provider: "copilot",
            sessionId,
            storyId: fixture.storyId,
          },
        },
        errors: [],
        warnings: [],
        artifacts: [],
        startedAt: "2026-04-20T00:00:00.000Z",
        finishedAt: "2026-04-20T00:00:01.000Z",
      },
      null,
      2
    )}\n`
  );

  const run = await runSourceCli([
    "story-continue",
    "--spec-pack-root",
    fixture.specPackRoot,
    "--story-id",
    fixture.storyId,
    "--provider",
    "copilot",
    "--session-id",
    sessionId,
    "--followup-text",
    "Attempt to continue a retained copilot session.",
    "--json",
  ]);

  expect(run.exitCode).toBe(3);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("blocked");
  expect(envelope.errors).toContainEqual(
    expect.objectContaining({
      code: "CONTINUATION_HANDLE_INVALID",
    })
  );
  expect(envelope.errors).not.toContainEqual(
    expect.objectContaining({
      code: "PROVIDER_UNAVAILABLE",
    })
  );
});

test("rejects a resume attempt when no follow-up content is provided", async () => {
  const fixture = await createImplementorSpecPack("story-continue-missing-followup");
  await writeRunConfig(fixture.specPackRoot, createRunConfig());

  const run = await runSourceCli([
    "story-continue",
    "--spec-pack-root",
    fixture.specPackRoot,
    "--story-id",
    fixture.storyId,
    "--provider",
    "codex",
    "--session-id",
    "codex-session-continue-105",
    "--json",
  ]);

  expect(run.exitCode).toBe(1);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("error");
  expect(envelope.errors).toContainEqual(
    expect.objectContaining({
      code: "INVALID_INVOCATION",
    })
  );
});
