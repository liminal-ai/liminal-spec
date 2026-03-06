import { afterEach, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { runOrchestration } from "../src/core/loop";
import { writeRunNarrativeReport } from "../src/core/report";
import { RUNS_ROOT } from "../src/core/state";

const cleanupRunIds: string[] = [];

afterEach(async () => {
  while (cleanupRunIds.length > 0) {
    const runId = cleanupRunIds.pop()!;
    await rm(resolve(RUNS_ROOT, runId), { recursive: true, force: true });
  }
});

describe("narrative report generator", () => {
  test("builds a friendly end-to-end report from dry run", async () => {
    const runId = `test-report-${Date.now()}`;
    cleanupRunIds.push(runId);

    await runOrchestration({
      flowId: "team-impl",
      cwd: process.cwd(),
      runId,
      dryRun: true,
      dryRunScenarioPath: resolve(import.meta.dir, "scenarios/team-impl-happy.json"),
      terminalMode: "none",
      inputs: { stories: ["/tmp/story-a.md"] },
      resume: false,
      maxReworks: 2,
    });

    const outputPath = await writeRunNarrativeReport({ runId });
    const report = await Bun.file(outputPath).text();

    expect(report.includes("# Orchestration Narrative Report")).toBe(true);
    expect(report.includes("## Phase-by-Phase Narrative")).toBe(true);
    expect(report.includes("#### Attempt 1")).toBe(true);
    expect(report.includes("Gate Criteria Evaluation (ordered)")).toBe(true);
    expect(report.includes("Prompt excerpt")).toBe(true);
    expect(report.includes("Drill-Down Index")).toBe(true);
  });
});
