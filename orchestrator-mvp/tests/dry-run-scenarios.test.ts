import { afterEach, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { runOrchestration } from "../src/core/loop";
import { RUNS_ROOT } from "../src/core/state";

const cleanupRunIds: string[] = [];

afterEach(async () => {
  while (cleanupRunIds.length > 0) {
    const runId = cleanupRunIds.pop()!;
    await rm(resolve(RUNS_ROOT, runId), { recursive: true, force: true });
  }
});

describe("dry-run scenario evals", () => {
  test("team-impl happy scenario completes and generates audit artifacts", async () => {
    const runId = `test-dry-team-impl-${Date.now()}`;
    cleanupRunIds.push(runId);

    const result = await runOrchestration({
      flowId: "team-impl",
      cwd: process.cwd(),
      runId,
      dryRun: true,
      dryRunScenarioPath: resolve(import.meta.dir, "scenarios/team-impl-happy.json"),
      terminalMode: "none",
      inputs: {
        stories: ["/tmp/story-1.md"],
      },
      resume: false,
      maxReworks: 2,
    });

    expect(result.status).toBe("completed");

    const promptPath = resolve(
      RUNS_ROOT,
      runId,
      "phase/story-cycle/attempt-1/prompt.md"
    );
    const callPath = resolve(
      RUNS_ROOT,
      runId,
      "phase/story-cycle/attempt-1/call.sh"
    );
    const decisionLogPath = resolve(RUNS_ROOT, runId, "logs/decision-log.md");

    expect(await Bun.file(promptPath).exists()).toBe(true);
    expect(await Bun.file(callPath).exists()).toBe(true);
    expect((await Bun.file(decisionLogPath).text()).includes("story-cycle")).toBe(
      true
    );
  });

  test("team-spec scenario supports deterministic rework then approve", async () => {
    const runId = `test-dry-team-spec-${Date.now()}`;
    cleanupRunIds.push(runId);

    const result = await runOrchestration({
      flowId: "team-spec",
      cwd: process.cwd(),
      runId,
      dryRun: true,
      dryRunScenarioPath: resolve(import.meta.dir, "scenarios/team-spec-rework.json"),
      terminalMode: "none",
      inputs: {
        requirementsPath: "/tmp/requirements.md",
      },
      resume: false,
      maxReworks: 2,
    });

    expect(result.status).toBe("completed");

    const reworkAttemptPath = resolve(
      RUNS_ROOT,
      runId,
      "phase/epic/attempt-1/status.json"
    );
    const approveAttemptPath = resolve(
      RUNS_ROOT,
      runId,
      "phase/epic/attempt-2/status.json"
    );

    expect(await Bun.file(reworkAttemptPath).exists()).toBe(true);
    expect(await Bun.file(approveAttemptPath).exists()).toBe(true);
  });

  test("single-story escalation scenario stops early", async () => {
    const runId = `test-dry-single-story-${Date.now()}`;
    cleanupRunIds.push(runId);

    const result = await runOrchestration({
      flowId: "single-story",
      cwd: process.cwd(),
      runId,
      dryRun: true,
      dryRunScenarioPath: resolve(import.meta.dir, "scenarios/single-story-escalate.json"),
      terminalMode: "none",
      inputs: {
        storyPath: "/tmp/story.md",
      },
      resume: false,
      maxReworks: 2,
    });

    expect(result.status).toBe("waiting_user");

    const escalationLogPath = resolve(
      RUNS_ROOT,
      runId,
      "logs/escalation-log.md"
    );
    expect(await Bun.file(escalationLogPath).exists()).toBe(true);
  });

  test("resume requires user response when run is waiting_user", async () => {
    const runId = `test-dry-resume-${Date.now()}`;
    cleanupRunIds.push(runId);

    const firstPass = await runOrchestration({
      flowId: "single-story",
      cwd: process.cwd(),
      runId,
      dryRun: true,
      dryRunScenarioPath: resolve(
        import.meta.dir,
        "scenarios/single-story-escalate.json"
      ),
      terminalMode: "none",
      inputs: {
        storyPath: "/tmp/story.md",
      },
      resume: false,
      maxReworks: 2,
    });

    expect(firstPass.status).toBe("waiting_user");

    await expect(
      runOrchestration({
        flowId: "single-story",
        cwd: process.cwd(),
        runId,
        dryRun: true,
        dryRunScenarioPath: resolve(
          import.meta.dir,
          "scenarios/single-story-escalate.json"
        ),
        terminalMode: "none",
        inputs: {
          storyPath: "/tmp/story.md",
        },
        resume: true,
        maxReworks: 2,
      })
    ).rejects.toThrow("waiting_user");

    const resumed = await runOrchestration({
      flowId: "single-story",
      cwd: process.cwd(),
      runId,
      dryRun: true,
      dryRunScenarioPath: resolve(import.meta.dir, "scenarios/single-story-escalate.json"),
      terminalMode: "none",
      inputs: {
        storyPath: "/tmp/story.md",
      },
      resume: true,
      maxReworks: 2,
      userResponseText: "Proceed with revised assumptions and continue.",
    });

    expect(resumed.status).toBe("completed");
  });
});
