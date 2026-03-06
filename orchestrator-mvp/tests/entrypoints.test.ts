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

describe("entry point behavior", () => {
  test("team-spec epic entry skips research-entry by default", async () => {
    const runId = `test-entry-team-spec-${Date.now()}`;
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
      entryPoint: "epic",
      resume: false,
      maxReworks: 2,
    });

    expect(result.status).toBe("completed");

    const researchPrompt = resolve(
      RUNS_ROOT,
      runId,
      "phase/research-entry/attempt-1/prompt.md"
    );
    const epicPrompt = resolve(RUNS_ROOT, runId, "phase/epic/attempt-1/prompt.md");

    expect(await Bun.file(researchPrompt).exists()).toBe(false);
    expect(await Bun.file(epicPrompt).exists()).toBe(true);
  });

  test("single-story can start at single-tech when functional story already exists", async () => {
    const runId = `test-entry-single-story-${Date.now()}`;
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
      entryPoint: "single-tech",
      resume: false,
      maxReworks: 2,
    });

    expect(result.status).toBe("waiting_user");

    const singleSpecPrompt = resolve(
      RUNS_ROOT,
      runId,
      "phase/single-spec/attempt-1/prompt.md"
    );
    const singleTechPrompt = resolve(
      RUNS_ROOT,
      runId,
      "phase/single-tech/attempt-1/prompt.md"
    );

    expect(await Bun.file(singleSpecPrompt).exists()).toBe(false);
    expect(await Bun.file(singleTechPrompt).exists()).toBe(true);
  });
});
