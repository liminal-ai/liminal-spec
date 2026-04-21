import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  getFeatureAttemptLayout,
  getProcessLayout,
  getStoryAttemptLayout,
} from "../core/process-layout";
import { resolveSpecPack } from "../core/spec-pack";
import { discoverVerificationGates } from "../core/gates";
import { createInitialProcessState, saveProcessState } from "../core/state";
import { resumeProcess, startProcess } from "../core/loop";
import { runCodexSmokeCheck } from "../core/smoke";
import { runCodexExec } from "../core/codex-exec";
import {
  materializeAndPersistPrimitiveResult,
  parsePrimitiveStatusFile,
  parseSynthesisStatusFile,
} from "../core/synthesis";
import { buildReadingJourneyPlan, renderReadingJourney } from "../core/reading-journeys";
import { validateReportMarkdown } from "../core/report-contracts";

let tempRoot = "";

beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "liminal-spec-codex-impl-"));
});

afterEach(async () => {
  delete process.env.CODEX_IMPL_CODEX_BIN;
  delete process.env.MOCK_CODEX_MODE;
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

describe("codex process runner", () => {
  test("resolves canonical spec-pack layout", async () => {
    const specPackRoot = await createSpecPackRepo("canonical");
    const resolved = await resolveSpecPack(specPackRoot);

    expect(resolved.stories.map((story) => story.id)).toEqual([
      "00-foundation",
      "01-feature",
    ]);
    expect(resolved.techDesignCompanionPaths.length).toBe(1);
    expect(resolved.repoRoot).toBe(tempRoot);
  });

  test("discovers story and feature gates from package.json scripts", async () => {
    const specPackRoot = await createSpecPackRepo("gates");
    const resolved = await resolveSpecPack(specPackRoot);
    const gates = await discoverVerificationGates(resolved.repoRoot);

    expect(gates.storyAcceptanceGate).toBe("bun run verify");
    expect(gates.featureAcceptanceGate).toBe("bun run verify-all");
  });

  test(
    "dry-run happy path completes full epic process",
    { timeout: 20_000 },
    async () => {
    const specPackRoot = await createSpecPackRepo("dry-run-happy");
    const scenarioPath = join(
      import.meta.dir,
      "scenarios",
      "happy-full-epic.json"
    );

    const state = await startProcess({
      specPackRoot,
      dryRun: true,
      scenarioPath,
    });

    expect(state.status).toBe("COMPLETE");

    const layout = getProcessLayout(specPackRoot);
    expect(await Bun.file(layout.processStatePath).exists()).toBe(true);
    expect(
      await Bun.file(
        join(specPackRoot, "feature-verification", "primary-review-attempt-1.md")
      ).exists()
    ).toBe(true);
    }
  );

  test(
    "dry-run fix batch loop creates visible fix batch artifact",
    { timeout: 20_000 },
    async () => {
    const specPackRoot = await createSpecPackRepo("dry-run-fix", 1);
    const scenarioPath = join(
      import.meta.dir,
      "scenarios",
      "story-fix-batch.json"
    );

    const state = await startProcess({
      specPackRoot,
      dryRun: true,
      scenarioPath,
    });

    expect(state.status).toBe("COMPLETE");
    expect(
      await Bun.file(
        join(
          specPackRoot,
          "story-verification",
          "00-foundation",
          "fix-batch-attempt-1.md"
        )
      ).exists()
    ).toBe(true);
    }
  );

  test(
    "dry-run stall twice transitions to WAITING_USER",
    { timeout: 20_000 },
    async () => {
    const specPackRoot = await createSpecPackRepo("dry-run-stall", 1);
    const scenarioPath = join(
      import.meta.dir,
      "scenarios",
      "stall-twice.json"
    );

    const state = await startProcess({
      specPackRoot,
      dryRun: true,
      scenarioPath,
    });

    expect(state.status).toBe("WAITING_USER");
    expect(state.blocker).toContain("stalled twice");
    }
  );

  test(
    "resume continues an interrupted story from saved process state",
    { timeout: 20_000 },
    async () => {
    const specPackRoot = await createSpecPackRepo("resume-story");
    const scenarioPath = join(
      import.meta.dir,
      "scenarios",
      "happy-full-epic.json"
    );
    const resolved = await resolveSpecPack(specPackRoot);
    const layout = getProcessLayout(specPackRoot);
    await mkdir(layout.processRoot, { recursive: true });

    const state = createInitialProcessState({
      specPackRoot,
      repoRoot: resolved.repoRoot,
      storyIds: resolved.stories.map((story) => story.id),
      gatePolicy: { packageManager: "bun", storyAcceptanceGate: "bun run verify", featureAcceptanceGate: "bun run verify-all" },
      dryRun: { scenarioPath, nextEventIndex: 1 },
    });
    state.status = "STORY_ACTIVE";
    state.currentStoryIndex = 0;
    state.currentStoryId = "00-foundation";
    state.currentStep = "story_verify_primary";
    state.activePrimitive = "codex54-xhigh-story-verify-primary";
    state.storyContext = { verificationRound: 1 };
    state.storyAttempts = {
      "00-foundation": { story_implement: 1 },
    };

    await saveProcessState(layout.processStatePath, state);
    await writeFile(
      layout.phaseLedgerPath,
      JSON.stringify({ entries: [] }, null, 2) + "\n",
      "utf8"
    );

    const resumed = await resumeProcess({ specPackRoot });
    expect(resumed.status).toBe("COMPLETE");
    }
  );

  test(
    "resume continues an interrupted feature verification from saved process state",
    { timeout: 20_000 },
    async () => {
    const specPackRoot = await createSpecPackRepo("resume-feature");
    const scenarioPath = join(
      import.meta.dir,
      "scenarios",
      "happy-full-epic.json"
    );
    const resolved = await resolveSpecPack(specPackRoot);
    const layout = getProcessLayout(specPackRoot);
    await mkdir(layout.processRoot, { recursive: true });

    const state = createInitialProcessState({
      specPackRoot,
      repoRoot: resolved.repoRoot,
      storyIds: resolved.stories.map((story) => story.id),
      gatePolicy: { packageManager: "bun", storyAcceptanceGate: "bun run verify", featureAcceptanceGate: "bun run verify-all" },
      dryRun: { scenarioPath, nextEventIndex: 8 },
    });
    state.status = "FEATURE_VERIFY_ACTIVE";
    state.currentStoryIndex = 2;
    state.currentStep = "feature_verify_primary";
    state.activePrimitive = "codex54-xhigh-feature-verify-primary";
    state.featureContext = { verificationRound: 1 };

    await saveProcessState(layout.processStatePath, state);
    await writeFile(
      layout.phaseLedgerPath,
      JSON.stringify({ entries: [] }, null, 2) + "\n",
      "utf8"
    );

    const resumed = await resumeProcess({ specPackRoot });
    expect(resumed.status).toBe("COMPLETE");
    }
  );

  test("smoke check succeeds against mocked codex binary", async () => {
    const specPackRoot = await createSpecPackRepo("smoke");
    process.env.CODEX_IMPL_CODEX_BIN = await prepareMockCodex();

    const result = await runCodexSmokeCheck({
      repoRoot: tempRoot,
      timeoutMs: 2_000,
    });

    expect(result.ok).toBe(true);
    expect(result.stdout).toContain("turn.completed");
    expect(specPackRoot).toContain("smoke");
  });

  test("codex exec captures stdout, writes status.json, and parses status", async () => {
    const specPackRoot = await createSpecPackRepo("mocked-exec");
    const layout = getProcessLayout(specPackRoot);
    const attemptLayout = getStoryAttemptLayout(
      layout,
      "00-foundation",
      "story_implement",
      1
    );
    await mkdir(attemptLayout.attemptDir, { recursive: true });
    process.env.CODEX_IMPL_CODEX_BIN = await prepareMockCodex();

    const promptPath = join(attemptLayout.attemptDir, "prompt.md");
    await writeFile(promptPath, "# Story Implement Primitive\n", "utf8");
    await writeFile(attemptLayout.readingJourneyPath, "# Reading Journey\n", "utf8");

    const result = await runCodexExec({
      cwd: tempRoot,
      promptPath,
      stdoutPath: attemptLayout.stdoutPath,
      stderrPath: attemptLayout.stderrPath,
      statusPath: attemptLayout.statusPath,
      schemaPath: attemptLayout.modelSchemaPath,
      primitiveSlug: "codex54-xhigh-story-implement",
      profile: { model: "gpt-5.4", reasoningEffort: "xhigh" },
      heartbeatMs: 500,
      pollIntervalMs: 50,
    });

    expect(result.outcome).toBe("success");
    await materializeAndPersistPrimitiveResult({
      rawStatusPath: attemptLayout.statusPath,
      reportPath: attemptLayout.reportPath,
      readingJourneyPath: attemptLayout.readingJourneyPath,
      allowSynthesisDecision: false,
    });
    const parsed = await parsePrimitiveStatusFile(attemptLayout.statusPath);
    expect(parsed.status).toBe("DONE");
    expect(parsed.reportRef).toBe(attemptLayout.reportPath);
    expect(parsed.readingJourneyRef).toBe(attemptLayout.readingJourneyPath);
    expect(await Bun.file(attemptLayout.reportPath).exists()).toBe(true);
    expect(await Bun.file(attemptLayout.readingJourneyPath).exists()).toBe(true);
  });

  test("codex exec marks stalled processes when no output advances", async () => {
    const specPackRoot = await createSpecPackRepo("mocked-stall");
    const layout = getProcessLayout(specPackRoot);
    const attemptLayout = getFeatureAttemptLayout(
      layout,
      "feature_synthesize",
      1
    );
    await mkdir(attemptLayout.attemptDir, { recursive: true });
    process.env.CODEX_IMPL_CODEX_BIN = await prepareMockCodex();
    process.env.MOCK_CODEX_MODE = "stall";

    const promptPath = join(attemptLayout.attemptDir, "prompt.md");
    await writeFile(promptPath, "# Feature Synthesis Primitive\n", "utf8");

    const result = await runCodexExec({
      cwd: tempRoot,
      promptPath,
      stdoutPath: attemptLayout.stdoutPath,
      stderrPath: attemptLayout.stderrPath,
      statusPath: attemptLayout.statusPath,
      schemaPath: attemptLayout.modelSchemaPath,
      primitiveSlug: "codex54-xhigh-feature-synthesize",
      profile: { model: "gpt-5.4", reasoningEffort: "xhigh" },
      heartbeatMs: 200,
      pollIntervalMs: 25,
    });

    expect(result.outcome).toBe("stall");
  });

  test("parses synthesis status files", async () => {
    const path = join(tempRoot, "synthesis-status.json");
    await writeFile(
      path,
      JSON.stringify(
        {
          processType: "codex-impl",
          primitiveSlug: "codex54-xhigh-story-synthesize",
          storyId: "00-foundation",
          status: "DONE",
          decision: "PASS",
          codexEvidenceRef: "stdout.jsonl",
          reportRef: "report.md",
          readingJourneyRef: "reading-journey.md",
          milestones: ["accepted"],
          unresolvedFindings: [],
          notes: "pass",
          requiresUserDecision: false,
          nextRecommendedAction: "story_accept"
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    const parsed = await parseSynthesisStatusFile(path);
    expect(parsed.decision).toBe("PASS");
    expect(parsed.status).toBe("DONE");
  });

  test("builds reading journeys with ordered artifact context", () => {
    const plan = buildReadingJourneyPlan("codex54-xhigh-story-implement", {
      repoRoot: tempRoot,
      specPackRoot: join(tempRoot, "spec-pack"),
      storyId: "00-foundation",
      storyTitle: "Story 0",
      storyPath: "/tmp/story.md",
      epicPath: "/tmp/epic.md",
      techDesignPath: "/tmp/tech-design.md",
      techDesignCompanionPaths: ["/tmp/tech-design-server.md"],
      testPlanPath: "/tmp/test-plan.md",
      priorReceiptPaths: ["/tmp/prior-receipt.md"],
      storyGate: "bun run verify",
      storyBaseCommit: "abc123",
      cumulativeTestBaselineBefore: 40,
      expectedCumulativeTestBaselineAfter: 40,
      boundaryInventorySummary: "No boundary inventory recorded by the scripted runtime yet.",
    });

    expect(plan.items[0]?.label).toBe("Tech Design Index");
    expect(plan.roleLens).toContain("story slice");
    expect(renderReadingJourney(plan)).toContain("Story base commit: abc123");
  });

  test("report completeness validator rejects missing headings", () => {
    const errors = validateReportMarkdown(
      "codex54-xhigh-story-verify-primary",
      "# Review\n\n## VERDICT\n\nPASS\n"
    );

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toContain("ARCHITECTURE_FINDINGS");
  });

  test(
    "dry-run invalid verifier report blocks process advancement",
    { timeout: 20_000 },
    async () => {
      const specPackRoot = await createSpecPackRepo("invalid-report", 1);
      const scenarioPath = join(
        import.meta.dir,
        "scenarios",
        "invalid-verifier-report.json"
      );

      const state = await startProcess({
        specPackRoot,
        dryRun: true,
        scenarioPath,
      });

      expect(state.status).toBe("WAITING_USER");
      expect(state.blocker).toContain("report");
    }
  );

});

async function createSpecPackRepo(
  name: string,
  storyCount = 2
): Promise<string> {
  const repoRoot = tempRoot;
  const specPackRoot = join(repoRoot, "docs", "spec-build", name);

  await mkdir(join(specPackRoot, "stories"), { recursive: true });
  await writeFile(
    join(repoRoot, "package.json"),
    JSON.stringify(
      {
        name: "test-repo",
        private: true,
        packageManager: "bun@1.3.9",
        scripts: {
          verify: 'node -e "process.exit(0)"',
          "verify-all": 'node -e "process.exit(0)"'
        }
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  await writeFile(join(repoRoot, "AGENTS.md"), "Test repo.\n", "utf8");
  await writeFile(join(specPackRoot, "epic.md"), "# Epic\n", "utf8");
  await writeFile(join(specPackRoot, "tech-design.md"), "# Tech Design\n", "utf8");
  await writeFile(
    join(specPackRoot, "tech-design-server.md"),
    "# Tech Design Server\n",
    "utf8"
  );
  await writeFile(join(specPackRoot, "test-plan.md"), "# Test Plan\n", "utf8");
  await writeFile(join(specPackRoot, "stories", "coverage.md"), "# Coverage\n", "utf8");
  await writeFile(
    join(specPackRoot, "stories", "00-foundation.md"),
    "# Story 0: Foundation\n",
    "utf8"
  );
  if (storyCount > 1) {
    await writeFile(
      join(specPackRoot, "stories", "01-feature.md"),
      "# Story 1: Feature\n",
      "utf8"
    );
  }

  await Bun.spawn(["git", "init"], { cwd: repoRoot, stdout: "ignore", stderr: "ignore" }).exited;
  await Bun.spawn(["git", "config", "user.email", "test@example.com"], {
    cwd: repoRoot,
    stdout: "ignore",
    stderr: "ignore",
  }).exited;
  await Bun.spawn(["git", "config", "user.name", "Test User"], {
    cwd: repoRoot,
    stdout: "ignore",
    stderr: "ignore",
  }).exited;
  await Bun.spawn(["git", "add", "-A"], { cwd: repoRoot, stdout: "ignore", stderr: "ignore" }).exited;
  await Bun.spawn(["git", "commit", "-m", "initial"], {
    cwd: repoRoot,
    stdout: "ignore",
    stderr: "ignore",
  }).exited;

  return specPackRoot;
}

async function prepareMockCodex(): Promise<string> {
  const scriptPath = join(import.meta.dir, "fixtures", "mock-codex.js");
  await chmod(scriptPath, 0o755);
  return scriptPath;
}
