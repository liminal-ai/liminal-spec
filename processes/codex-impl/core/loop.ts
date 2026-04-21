import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { runCodexSmokeCheck } from "./smoke";
import {
  hasBlockingStubBoundary,
  loadBoundaryInventory,
  summarizeBoundaryInventory,
} from "./boundary-inventory";
import {
  appendEscalationLog,
  appendLedgerEntry,
  appendProcessLog,
  clearActiveBlockingDependency,
  clearBlocker,
  clearFeatureContext,
  clearStoryContext,
  createEmptyLedger,
  createInitialProcessState,
  incrementFeatureAttempt,
  incrementStoryAttempt,
  loadProcessLedger,
  loadProcessState,
  markPrimitiveCompleted,
  nowIso,
  registerStall,
  saveProcessLedger,
  saveProcessState,
  setActiveBlockingDependency,
  setBlocker,
  type FeatureStep,
  type PrimitiveSlug,
  type ProcessLedger,
  type ProcessLedgerEntry,
  type ProcessState,
  type StoryStep,
} from "./state";
import {
  ensureProcessLayout,
  featureVerificationFileName,
  getFeatureAttemptLayout,
  getProcessLayout,
  getStoryAttemptLayout,
  getVisibleFeatureVerificationDir,
  getVisibleStoryVerificationDir,
  storyVerificationFileName,
} from "./process-layout";
import {
  discoverVerificationGates,
  runShellCommand,
} from "./gates";
import { commitAllChanges, getHeadCommit, getWorkingTreeSummary } from "./git";
import {
  runFeaturePrimitive,
  runStoryPrimitive,
  type DryRunEvent,
} from "./primitives";
import { countTestBaseline } from "./test-baseline";
import { resolveSpecPack, type ResolvedSpecPack, type StoryDefinition } from "./spec-pack";
import type {
  ParsedPrimitiveStatus,
  ParsedSynthesisResult,
} from "./synthesis";

interface DryRunScenario {
  events: DryRunEvent[];
}

export async function startProcess(params: {
  specPackRoot: string;
  dryRun?: boolean;
  scenarioPath?: string;
}): Promise<ProcessState> {
  const specPack = await resolveSpecPack(params.specPackRoot);
  const layout = await ensureProcessLayout(specPack.specPackRoot);

  const smoke = await runCodexSmokeCheck({
    repoRoot: specPack.repoRoot,
  });
  if (!params.dryRun && !smoke.ok) {
    const state = createInitialProcessState({
      specPackRoot: specPack.specPackRoot,
      repoRoot: specPack.repoRoot,
      storyIds: specPack.stories.map((story) => story.id),
      gatePolicy: await discoverVerificationGates(specPack.repoRoot),
    });
    setBlocker(
      state,
      `Codex CLI unavailable after smoke test (exit=${smoke.exitCode}, timedOut=${smoke.timedOut}).`
    );
    await saveProcessState(layout.processStatePath, state);
    await saveProcessLedger(layout.phaseLedgerPath, createEmptyLedger());
    await appendEscalationLog(layout.escalationLogPath, [
      "Smoke test failed before process start.",
      `stdout: ${smoke.stdout.trim() || "(empty)"}`,
      `stderr: ${smoke.stderr.trim() || "(empty)"}`,
    ]);
    return state;
  }

  const processState = createInitialProcessState({
    specPackRoot: specPack.specPackRoot,
    repoRoot: specPack.repoRoot,
    storyIds: specPack.stories.map((story) => story.id),
    gatePolicy: await discoverVerificationGates(specPack.repoRoot),
    dryRun:
      params.dryRun && params.scenarioPath
        ? { scenarioPath: resolve(params.scenarioPath), nextEventIndex: 0 }
        : undefined,
  });

  await saveProcessState(layout.processStatePath, processState);
  await saveProcessLedger(layout.phaseLedgerPath, createEmptyLedger());
  await appendProcessLog(layout.processLogPath, "Process initialized", [
    `specPackRoot: ${specPack.specPackRoot}`,
    `repoRoot: ${specPack.repoRoot}`,
    `story count: ${specPack.stories.length}`,
    `story ids: ${specPack.stories.map((story) => story.id).join(", ")}`,
  ]);

  return runLoop(specPack, processState, layout, false);
}

export async function resumeProcess(params: {
  specPackRoot: string;
}): Promise<ProcessState> {
  const specPack = await resolveSpecPack(params.specPackRoot);
  const layout = await ensureProcessLayout(specPack.specPackRoot);

  try {
    const processState = await loadProcessState(layout.processStatePath);
    return runLoop(specPack, processState, layout, true);
  } catch {
    throw new Error(
      `No Codex process state found under '${layout.processRoot}'. Start a process first.`
    );
  }
}

export async function readProcessSummary(
  specPackRoot: string
): Promise<string> {
  const layout = getProcessLayout(specPackRoot);
  const state = await loadProcessState(layout.processStatePath);
  const lines = [
    `processType: ${state.processType}`,
    `status: ${state.status}`,
    `currentStory: ${state.currentStoryId || "(none)"}`,
    `currentStep: ${state.currentStep || "(none)"}`,
    `activePrimitive: ${state.activePrimitive || "(none)"}`,
    `lastCompletedPrimitive: ${state.lastCompletedPrimitive || "(none)"}`,
    `activeBlockingDependency: ${
      state.activeBlockingDependency
        ? `${state.activeBlockingDependency.primitiveSlug}#${state.activeBlockingDependency.attempt}`
        : "(none)"
    }`,
    `blocker: ${state.blocker || "(none)"}`,
  ];
  return lines.join("\n");
}

async function runLoop(
  specPack: ResolvedSpecPack,
  processState: ProcessState,
  layout: ReturnType<typeof getProcessLayout>,
  allowAttemptRecovery: boolean
): Promise<ProcessState> {
  const ledger = await loadOrCreateLedger(layout.phaseLedgerPath);

  while (true) {
    if (
      processState.status === "WAITING_USER" ||
      processState.status === "COMPLETE" ||
      processState.status === "FAILED"
    ) {
      await saveProcessState(layout.processStatePath, processState);
      await saveProcessLedger(layout.phaseLedgerPath, ledger);
      return processState;
    }

    if (processState.status === "SETUP") {
      processState.status = "BETWEEN_STORIES";
      await appendProcessLog(layout.processLogPath, "Setup complete", [
        "Transitioned into BETWEEN_STORIES.",
      ]);
      await saveProcessState(layout.processStatePath, processState);
      continue;
    }

    if (processState.status === "BETWEEN_STORIES") {
      clearBlocker(processState);
      if (processState.currentStoryIndex >= specPack.stories.length) {
        processState.status = "PRE_FEATURE_VERIFY";
        await appendProcessLog(layout.processLogPath, "Story set complete", [
          "All stories accepted. Advancing to feature verification.",
        ]);
        await saveProcessState(layout.processStatePath, processState);
        continue;
      }

      const story = specPack.stories[processState.currentStoryIndex];
      const storyBaseCommit = await getHeadCommit(specPack.repoRoot);
      const baselineBefore = await countTestBaseline(specPack.repoRoot);
      processState.status = "STORY_ACTIVE";
      processState.currentStoryId = story.id;
      processState.currentStep = "story_implement";
      processState.storyContext = {
        verificationRound: 1,
        storyBaseCommit,
        cumulativeTestBaselineBefore: baselineBefore,
        expectedCumulativeTestBaselineAfter: baselineBefore,
      };
      processState.activePrimitive = "codex54-xhigh-story-implement";
      await appendProcessLog(layout.processLogPath, "Story preflight", [
        `storyId: ${story.id}`,
        `storyTitle: ${story.title}`,
        `storyBaseCommit: ${storyBaseCommit}`,
        `cumulativeTestBaselineBefore: ${baselineBefore}`,
        `expectedCumulativeTestBaselineAfter: ${baselineBefore}`,
      ]);
      await saveProcessState(layout.processStatePath, processState);
      continue;
    }

    if (processState.status === "PRE_FEATURE_VERIFY") {
      const cleanupBatchPath = await materializePreFeatureCleanupBatch(
        specPack,
        processState,
        layout
      );
      processState.status = "FEATURE_VERIFY_ACTIVE";
      processState.featureContext = {
        verificationRound: 1,
        currentCleanupReceiptPath: cleanupBatchPath,
        currentFixBatchPath: cleanupBatchPath,
      };

      if (cleanupBatchPath) {
        processState.currentStep = "feature_fix_batch";
        processState.activePrimitive = "codex54-xhigh-story-fix-batch";
        await appendProcessLog(layout.processLogPath, "Pre-feature cleanup", [
          `cleanupBatchPath: ${cleanupBatchPath}`,
        ]);
      } else {
        processState.currentStep = "feature_verify_primary";
        processState.activePrimitive = "codex54-xhigh-feature-verify-primary";
        await appendProcessLog(layout.processLogPath, "Feature verification", [
          "Starting feature-level verification.",
        ]);
      }
      await saveProcessState(layout.processStatePath, processState);
      continue;
    }

    if (processState.status === "STORY_ACTIVE") {
      const story = requireCurrentStory(specPack, processState);
      await runStoryStep(
        specPack,
        story,
        processState,
        layout,
        ledger,
        allowAttemptRecovery
      );
      await saveProcessState(layout.processStatePath, processState);
      continue;
    }

    if (processState.status === "FEATURE_VERIFY_ACTIVE") {
      await runFeatureStep(
        specPack,
        processState,
        layout,
        ledger,
        allowAttemptRecovery
      );
      await saveProcessState(layout.processStatePath, processState);
      continue;
    }
  }
}

async function runStoryStep(
  specPack: ResolvedSpecPack,
  story: StoryDefinition,
  processState: ProcessState,
  layout: ReturnType<typeof getProcessLayout>,
  ledger: ProcessLedger,
  allowAttemptRecovery: boolean
): Promise<void> {
  const contextBase = await buildSharedContext(specPack, processState, story);

  switch (processState.currentStep) {
    case "story_implement": {
      const result = await executeStoryStep({
        specPack,
        story,
        processState,
        layout,
        ledger,
        allowAttemptRecovery,
        step: "story_implement",
        primitiveSlug: "codex54-xhigh-story-implement",
        context: contextBase,
      });

      if (!(await handlePrimitiveOutcome(processState, layout, ledger, result))) {
        return;
      }

      processState.currentStep = "story_verify_primary";
      processState.activePrimitive = "codex54-xhigh-story-verify-primary";
      return;
    }

    case "story_verify_primary": {
      const bundlePath = await buildStoryVerificationBundle(
        specPack,
        story,
        processState,
        layout
      );
      processState.storyContext = {
        ...(processState.storyContext ?? { verificationRound: 1 }),
        currentVerificationBundlePath: bundlePath,
      };

      const result = await executeStoryStep({
        specPack,
        story,
        processState,
        layout,
        ledger,
        allowAttemptRecovery,
        step: "story_verify_primary",
        primitiveSlug: "codex54-xhigh-story-verify-primary",
        context: {
          ...contextBase,
          verificationBundlePath: bundlePath,
        },
      });

      if (!(await handlePrimitiveOutcome(processState, layout, ledger, result))) {
        return;
      }

      processState.storyContext = {
        ...(processState.storyContext ?? { verificationRound: 1 }),
        currentPrimaryReviewPath:
          result.visibleArtifactPath || result.attemptLayout.receiptPath,
      };
      processState.currentStep = "story_verify_secondary";
      processState.activePrimitive = "gpt53-codex-high-story-verify-secondary";
      return;
    }

    case "story_verify_secondary": {
      const result = await executeStoryStep({
        specPack,
        story,
        processState,
        layout,
        ledger,
        allowAttemptRecovery,
        step: "story_verify_secondary",
        primitiveSlug: "gpt53-codex-high-story-verify-secondary",
        context: {
          ...contextBase,
          verificationBundlePath:
            processState.storyContext?.currentVerificationBundlePath,
        },
      });

      if (!(await handlePrimitiveOutcome(processState, layout, ledger, result))) {
        return;
      }

      processState.storyContext = {
        ...(processState.storyContext ?? { verificationRound: 1 }),
        currentSecondaryReviewPath:
          result.visibleArtifactPath || result.attemptLayout.receiptPath,
      };
      processState.currentStep = "story_synthesize";
      processState.activePrimitive = "codex54-xhigh-story-synthesize";
      return;
    }

    case "story_synthesize": {
      const result = await executeStoryStep({
        specPack,
        story,
        processState,
        layout,
        ledger,
        allowAttemptRecovery,
        step: "story_synthesize",
        primitiveSlug: "codex54-xhigh-story-synthesize",
        context: {
          ...contextBase,
          verificationBundlePath:
            processState.storyContext?.currentVerificationBundlePath,
          primaryReviewPath: processState.storyContext?.currentPrimaryReviewPath,
          secondaryReviewPath:
            processState.storyContext?.currentSecondaryReviewPath,
        },
      });

      if (!(await handlePrimitiveOutcome(processState, layout, ledger, result))) {
        return;
      }

      const synthesis = result.status as ParsedSynthesisResult;
      processState.storyContext = {
        ...(processState.storyContext ?? { verificationRound: 1 }),
        currentSynthesisPath:
          result.visibleArtifactPath || result.attemptLayout.receiptPath,
      };

      if (synthesis.decision === "PASS") {
        processState.currentStep = "story_accept";
        processState.activePrimitive = undefined;
        return;
      }

      if (synthesis.decision === "REVISE") {
        const fixBatchPath = await materializeStoryFixBatch(
          story,
          processState,
          layout,
          synthesis
        );
        processState.storyContext = {
          ...(processState.storyContext ?? { verificationRound: 1 }),
          currentFixBatchPath: fixBatchPath,
        };
        processState.currentStep = "story_fix_batch";
        processState.activePrimitive = "codex54-xhigh-story-fix-batch";
        return;
      }

      setBlocker(
        processState,
        synthesis.notes || "Synthesis returned BLOCK for the story."
      );
      await appendEscalationLog(layout.escalationLogPath, [
        `story: ${story.id}`,
        `step: story_synthesize`,
        `reason: ${processState.blocker}`,
      ]);
      return;
    }

    case "story_fix_batch": {
      const result = await executeStoryStep({
        specPack,
        story,
        processState,
        layout,
        ledger,
        allowAttemptRecovery,
        step: "story_fix_batch",
        primitiveSlug: "codex54-xhigh-story-fix-batch",
        context: {
          ...contextBase,
          verificationBundlePath:
            processState.storyContext?.currentVerificationBundlePath,
          fixBatchPath: processState.storyContext?.currentFixBatchPath,
        },
      });

      if (!(await handlePrimitiveOutcome(processState, layout, ledger, result))) {
        return;
      }

      processState.storyContext = {
        verificationRound:
          (processState.storyContext?.verificationRound ?? 1) + 1,
        currentFixBatchPath: processState.storyContext?.currentFixBatchPath,
        currentVerificationBundlePath: undefined,
        currentPrimaryReviewPath: undefined,
        currentSecondaryReviewPath: undefined,
        currentSynthesisPath: undefined,
      };
      processState.currentStep = "story_verify_primary";
      processState.activePrimitive = "codex54-xhigh-story-verify-primary";
      return;
    }

    case "story_accept": {
      const gate = await runShellCommand(
        specPack.repoRoot,
        processState.gatePolicy.storyAcceptanceGate
      );

      if (gate.exitCode !== 0) {
        setBlocker(
          processState,
          `Story acceptance gate failed for '${story.id}': ${gate.stderr.trim() || gate.stdout.trim()}`
        );
        await appendEscalationLog(layout.escalationLogPath, [
          `story: ${story.id}`,
          `step: story_accept`,
          `gate: ${processState.gatePolicy.storyAcceptanceGate}`,
          `stdout: ${gate.stdout.trim() || "(empty)"}`,
          `stderr: ${gate.stderr.trim() || "(empty)"}`,
        ]);
        return;
      }

      const commit = await commitAllChanges({
        repoRoot: specPack.repoRoot,
        message: `feat: Story ${story.index} - ${story.title}`,
      });

      if (commit.status === "failed") {
        setBlocker(
          processState,
          `Failed to commit accepted story '${story.id}': ${commit.summary}`
        );
        return;
      }

      processState.currentStoryIndex += 1;
      processState.currentStoryId = undefined;
      processState.currentStep = undefined;
      processState.activePrimitive = undefined;
      processState.status = "BETWEEN_STORIES";
      const postStoryBaseline = await countTestBaseline(specPack.repoRoot);
      clearStoryContext(processState);
      await appendProcessLog(layout.processLogPath, "Story accepted", [
        `storyId: ${story.id}`,
        `gate: ${processState.gatePolicy.storyAcceptanceGate}`,
        `commit: ${commit.summary}`,
        `postStoryBaseline: ${postStoryBaseline}`,
      ]);
      return;
    }
  }
}

async function runFeatureStep(
  specPack: ResolvedSpecPack,
  processState: ProcessState,
  layout: ReturnType<typeof getProcessLayout>,
  ledger: ProcessLedger,
  allowAttemptRecovery: boolean
): Promise<void> {
  const contextBase = await buildSharedContext(specPack, processState);

  switch (processState.currentStep) {
    case "feature_verify_primary": {
      const bundlePath = await buildFeatureVerificationBundle(
        specPack,
        processState,
        layout
      );
      processState.featureContext = {
        ...(processState.featureContext ?? { verificationRound: 1 }),
        currentVerificationBundlePath: bundlePath,
      };
      const result = await executeFeatureStep({
        specPack,
        processState,
        layout,
        ledger,
        allowAttemptRecovery,
        step: "feature_verify_primary",
        primitiveSlug: "codex54-xhigh-feature-verify-primary",
        context: { ...contextBase, verificationBundlePath: bundlePath },
      });
      if (!(await handlePrimitiveOutcome(processState, layout, ledger, result))) {
        return;
      }
      processState.featureContext = {
        ...(processState.featureContext ?? { verificationRound: 1 }),
        currentPrimaryReviewPath:
          result.visibleArtifactPath || result.attemptLayout.receiptPath,
      };
      processState.currentStep = "feature_verify_secondary";
      processState.activePrimitive =
        "gpt53-codex-high-feature-verify-secondary";
      return;
    }

    case "feature_verify_secondary": {
      const result = await executeFeatureStep({
        specPack,
        processState,
        layout,
        ledger,
        allowAttemptRecovery,
        step: "feature_verify_secondary",
        primitiveSlug: "gpt53-codex-high-feature-verify-secondary",
        context: {
          ...contextBase,
          verificationBundlePath:
            processState.featureContext?.currentVerificationBundlePath,
        },
      });
      if (!(await handlePrimitiveOutcome(processState, layout, ledger, result))) {
        return;
      }
      processState.featureContext = {
        ...(processState.featureContext ?? { verificationRound: 1 }),
        currentSecondaryReviewPath:
          result.visibleArtifactPath || result.attemptLayout.receiptPath,
      };
      processState.currentStep = "feature_synthesize";
      processState.activePrimitive = "codex54-xhigh-feature-synthesize";
      return;
    }

    case "feature_synthesize": {
      const result = await executeFeatureStep({
        specPack,
        processState,
        layout,
        ledger,
        allowAttemptRecovery,
        step: "feature_synthesize",
        primitiveSlug: "codex54-xhigh-feature-synthesize",
        context: {
          ...contextBase,
          verificationBundlePath:
            processState.featureContext?.currentVerificationBundlePath,
          primaryReviewPath:
            processState.featureContext?.currentPrimaryReviewPath,
          secondaryReviewPath:
            processState.featureContext?.currentSecondaryReviewPath,
        },
      });
      if (!(await handlePrimitiveOutcome(processState, layout, ledger, result))) {
        return;
      }

      const synthesis = result.status as ParsedSynthesisResult;
      processState.featureContext = {
        ...(processState.featureContext ?? { verificationRound: 1 }),
        currentSynthesisPath:
          result.visibleArtifactPath || result.attemptLayout.receiptPath,
      };

      if (synthesis.decision === "PASS") {
        processState.currentStep = "feature_accept";
        processState.activePrimitive = undefined;
        return;
      }

      if (synthesis.decision === "REVISE") {
        const fixBatchPath = await materializeFeatureFixBatch(
          processState,
          layout,
          synthesis
        );
        processState.featureContext = {
          ...(processState.featureContext ?? { verificationRound: 1 }),
          currentFixBatchPath: fixBatchPath,
        };
        processState.currentStep = "feature_fix_batch";
        processState.activePrimitive = "codex54-xhigh-story-fix-batch";
        return;
      }

      setBlocker(
        processState,
        synthesis.notes || "Feature synthesis returned BLOCK."
      );
      await appendEscalationLog(layout.escalationLogPath, [
        "target: feature",
        "step: feature_synthesize",
        `reason: ${processState.blocker}`,
      ]);
      return;
    }

    case "feature_fix_batch": {
      const result = await executeFeatureStep({
        specPack,
        processState,
        layout,
        ledger,
        allowAttemptRecovery,
        step: "feature_fix_batch",
        primitiveSlug: "codex54-xhigh-story-fix-batch",
        context: {
          ...contextBase,
          verificationBundlePath:
            processState.featureContext?.currentVerificationBundlePath,
          fixBatchPath: processState.featureContext?.currentFixBatchPath,
        },
      });
      if (!(await handlePrimitiveOutcome(processState, layout, ledger, result))) {
        return;
      }

      processState.featureContext = {
        verificationRound:
          (processState.featureContext?.verificationRound ?? 1) + 1,
        currentFixBatchPath: processState.featureContext?.currentFixBatchPath,
      };
      processState.currentStep = "feature_verify_primary";
      processState.activePrimitive = "codex54-xhigh-feature-verify-primary";
      return;
    }

    case "feature_accept": {
      const gate = await runShellCommand(
        specPack.repoRoot,
        processState.gatePolicy.featureAcceptanceGate
      );

      if (gate.exitCode !== 0) {
        setBlocker(
          processState,
          `Feature acceptance gate failed: ${gate.stderr.trim() || gate.stdout.trim()}`
        );
        return;
      }

      const boundaryInventory = await loadBoundaryInventory(
        specPack.boundaryInventoryPath
      );
      if (hasBlockingStubBoundary(boundaryInventory)) {
        setBlocker(
          processState,
          "Feature acceptance blocked: boundary inventory still contains stub dependencies."
        );
        await appendEscalationLog(layout.escalationLogPath, [
          "target: feature",
          "step: feature_accept",
          `boundaryInventory: ${summarizeBoundaryInventory(boundaryInventory)}`,
        ]);
        return;
      }

      const commit = await commitAllChanges({
        repoRoot: specPack.repoRoot,
        message: "fix: feature verification fixes",
      });

      processState.status = "COMPLETE";
      processState.currentStep = undefined;
      processState.activePrimitive = undefined;
      clearFeatureContext(processState);
      await appendProcessLog(layout.processLogPath, "Feature accepted", [
        `gate: ${processState.gatePolicy.featureAcceptanceGate}`,
        `commit: ${commit.summary}`,
      ]);
      return;
    }
  }
}

async function executeStoryStep(params: {
  specPack: ResolvedSpecPack;
  story: StoryDefinition;
  processState: ProcessState;
  layout: ReturnType<typeof getProcessLayout>;
  ledger: ProcessLedger;
  allowAttemptRecovery: boolean;
  step: StoryStep;
  primitiveSlug: PrimitiveSlug;
  context: Awaited<ReturnType<typeof buildSharedContext>>;
}): Promise<{
  status?: ParsedPrimitiveStatus | ParsedSynthesisResult;
  attemptLayout: {
    receiptPath: string;
    statusPath: string;
    attemptDir: string;
    reportPath: string;
    readingJourneyPath: string;
  };
  visibleArtifactPath?: string;
  outcome: "success" | "stall" | "error";
}> {
  if (params.allowAttemptRecovery) {
    const existing = await maybeConsumeStoryAttempt(
      params.layout,
      params.processState,
      params.story.id,
      params.step,
      params.primitiveSlug
    );
    if (existing) {
      return existing;
    }
  }

  const attempt = incrementStoryAttempt(
    params.processState,
    params.story.id,
    params.step
  );

  const dryRunEvent = await nextDryRunEvent(
    params.processState,
    params.story.id,
    params.step
  );

  setActiveBlockingDependency(params.processState, {
    primitiveSlug: params.primitiveSlug,
    attempt,
    artifactDir: getStoryAttemptLayout(
      params.layout,
      params.story.id,
      params.step,
      attempt
    ).attemptDir,
    kind: "codex-exec",
  });
  await saveProcessState(params.layout.processStatePath, params.processState);

  const result = await runStoryPrimitive({
    layout: params.layout,
    storyId: params.story.id,
    storyTitle: params.story.title,
    step: params.step,
    attempt,
    primitiveSlug: params.primitiveSlug,
    context: params.context,
    dryRunEvent,
  });
  clearActiveBlockingDependency(params.processState);

  await recordAttempt(params.ledger, params.layout.phaseLedgerPath, {
    targetType: "story",
    targetId: params.story.id,
    step: params.step,
    primitiveSlug: params.primitiveSlug,
    attempt,
    outcome: result.outcome,
    status: result.status?.status,
    artifactDir: result.attemptLayout.attemptDir,
    receiptPath: result.attemptLayout.receiptPath,
    statusPath: result.attemptLayout.statusPath,
    startedAt: nowIso(),
    completedAt: nowIso(),
    note:
      result.outcome === "stall"
        ? "Primitive stalled."
        : result.outcome === "error"
          ? `Primitive exited non-zero (${result.exitCode ?? "unknown"}).`
          : undefined,
  });

  return result;
}

async function executeFeatureStep(params: {
  specPack: ResolvedSpecPack;
  processState: ProcessState;
  layout: ReturnType<typeof getProcessLayout>;
  ledger: ProcessLedger;
  allowAttemptRecovery: boolean;
  step: FeatureStep;
  primitiveSlug: PrimitiveSlug;
  context: Awaited<ReturnType<typeof buildSharedContext>>;
}): Promise<{
  status?: ParsedPrimitiveStatus | ParsedSynthesisResult;
  attemptLayout: {
    receiptPath: string;
    statusPath: string;
    attemptDir: string;
    reportPath: string;
    readingJourneyPath: string;
  };
  visibleArtifactPath?: string;
  outcome: "success" | "stall" | "error";
}> {
  if (params.allowAttemptRecovery) {
    const existing = await maybeConsumeFeatureAttempt(
      params.layout,
      params.processState,
      params.step,
      params.primitiveSlug
    );
    if (existing) {
      return existing;
    }
  }

  const attempt = incrementFeatureAttempt(params.processState, params.step);
  const dryRunEvent = await nextDryRunEvent(params.processState, "feature", params.step);

  setActiveBlockingDependency(params.processState, {
    primitiveSlug: params.primitiveSlug,
    attempt,
    artifactDir: getFeatureAttemptLayout(
      params.layout,
      params.step,
      attempt
    ).attemptDir,
    kind: "codex-exec",
  });
  await saveProcessState(params.layout.processStatePath, params.processState);

  const result = await runFeaturePrimitive({
    layout: params.layout,
    step: params.step,
    attempt,
    primitiveSlug: params.primitiveSlug,
    context: params.context,
    dryRunEvent,
  });
  clearActiveBlockingDependency(params.processState);

  await recordAttempt(params.ledger, params.layout.phaseLedgerPath, {
    targetType: "feature",
    targetId: "feature",
    step: params.step,
    primitiveSlug: params.primitiveSlug,
    attempt,
    outcome: result.outcome,
    status: result.status?.status,
    artifactDir: result.attemptLayout.attemptDir,
    receiptPath: result.attemptLayout.receiptPath,
    statusPath: result.attemptLayout.statusPath,
    startedAt: nowIso(),
    completedAt: nowIso(),
    note:
      result.outcome === "stall"
        ? "Primitive stalled."
        : result.outcome === "error"
          ? `Primitive exited non-zero (${result.exitCode ?? "unknown"}).`
          : undefined,
  });

  return result;
}

async function handlePrimitiveOutcome(
  processState: ProcessState,
  layout: ReturnType<typeof getProcessLayout>,
  ledger: ProcessLedger,
  result: {
    outcome: "success" | "stall" | "error";
    status?: ParsedPrimitiveStatus | ParsedSynthesisResult;
  }
): Promise<boolean> {
  if (result.outcome === "success" && result.status) {
    markPrimitiveCompleted(processState, result.status.primitiveSlug as PrimitiveSlug);
    if (result.status.status === "BLOCKED" || result.status.requiresUserDecision) {
      setBlocker(processState, result.status.notes || "Primitive requested user action.");
      await appendEscalationLog(layout.escalationLogPath, [
        `primitive: ${result.status.primitiveSlug}`,
        `notes: ${result.status.notes}`,
      ]);
      return false;
    }
    return true;
  }

  if (result.outcome === "stall") {
    registerStall(processState);
    if (processState.stepRetryCount >= 2) {
      setBlocker(
        processState,
        `Primitive '${processState.activePrimitive}' stalled twice.`
      );
      await appendEscalationLog(layout.escalationLogPath, [
        `primitive: ${processState.activePrimitive}`,
        "reason: stalled twice",
      ]);
      return false;
    }
    await appendProcessLog(layout.processLogPath, "Primitive stall recovery", [
      `primitive: ${processState.activePrimitive}`,
      `retryCount: ${processState.stepRetryCount}`,
    ]);
    return false;
  }

  const smoke = await runCodexSmokeCheck({
    repoRoot: processState.repoRoot,
  });
  setBlocker(
    processState,
    `Primitive '${processState.activePrimitive}' exited unexpectedly. Smoke ok=${smoke.ok}.`
  );
  await appendEscalationLog(layout.escalationLogPath, [
    `primitive: ${processState.activePrimitive}`,
    `smoke ok: ${smoke.ok}`,
    `smoke stdout: ${smoke.stdout.trim() || "(empty)"}`,
    `smoke stderr: ${smoke.stderr.trim() || "(empty)"}`,
  ]);
  return false;
}

function requireCurrentStory(
  specPack: ResolvedSpecPack,
  processState: ProcessState
): StoryDefinition {
  const story = specPack.stories[processState.currentStoryIndex];
  if (!story) {
    throw new Error("Current story index is out of range.");
  }
  return story;
}

async function buildSharedContext(
  specPack: ResolvedSpecPack,
  processState: ProcessState,
  story?: StoryDefinition
) {
  const priorReceiptPaths =
    story && processState.currentStoryIndex > 0
      ? specPack.stories
          .slice(0, processState.currentStoryIndex)
          .map((candidate) =>
            join(
              getVisibleStoryVerificationDir(
                getProcessLayout(specPack.specPackRoot),
                candidate.id
              ),
              storyVerificationFileName(
                "synthesis",
                processState.storyAttempts[candidate.id]?.story_synthesize ?? 1
              )
            )
          )
      : [];

  const boundaryInventorySummary = summarizeBoundaryInventory(
    await loadBoundaryInventory(specPack.boundaryInventoryPath),
    specPack.boundaryInventoryPath
      ? "Boundary inventory present but empty."
      : "Boundary inventory missing."
  );

  return {
    repoRoot: specPack.repoRoot,
    specPackRoot: specPack.specPackRoot,
    storyId: story?.id,
    storyTitle: story?.title,
    storyPath: story?.path,
    epicPath: specPack.epicPath,
    techDesignPath: specPack.techDesignPath,
    techDesignCompanionPaths: specPack.techDesignCompanionPaths,
    testPlanPath: specPack.testPlanPath,
    storyGate: processState.gatePolicy.storyAcceptanceGate,
    featureGate: processState.gatePolicy.featureAcceptanceGate,
    storyBaseCommit: processState.storyContext?.storyBaseCommit,
    cumulativeTestBaselineBefore:
      processState.storyContext?.cumulativeTestBaselineBefore,
    expectedCumulativeTestBaselineAfter:
      processState.storyContext?.expectedCumulativeTestBaselineAfter,
    cleanupReceiptPath: processState.featureContext?.currentCleanupReceiptPath,
    boundaryInventorySummary,
    priorReceiptPaths,
    diffSummary: await getWorkingTreeSummary(specPack.repoRoot),
  };
}

async function buildStoryVerificationBundle(
  specPack: ResolvedSpecPack,
  story: StoryDefinition,
  processState: ProcessState,
  layout: ReturnType<typeof getProcessLayout>
): Promise<string> {
  const attempt = processState.storyContext?.verificationRound ?? 1;
  const visibleDir = getVisibleStoryVerificationDir(layout, story.id);
  await mkdir(visibleDir, { recursive: true });
  const bundlePath = join(
    visibleDir,
    storyVerificationFileName("verification-bundle", attempt)
  );

  const boundaryInventorySummary = summarizeBoundaryInventory(
    await loadBoundaryInventory(specPack.boundaryInventoryPath),
    specPack.boundaryInventoryPath
      ? "Boundary inventory present but empty."
      : "Boundary inventory missing."
  );

  const content = [
    `# Story Verification Bundle — ${story.title}`,
    "",
    `- storyId: \`${story.id}\``,
    `- storyPath: \`${story.path}\``,
    processState.storyContext?.storyBaseCommit
      ? `- storyBaseCommit: \`${processState.storyContext.storyBaseCommit}\``
      : "",
    typeof processState.storyContext?.cumulativeTestBaselineBefore === "number"
      ? `- cumulativeTestBaselineBefore: \`${processState.storyContext.cumulativeTestBaselineBefore}\``
      : "",
    typeof processState.storyContext?.expectedCumulativeTestBaselineAfter === "number"
      ? `- expectedCumulativeTestBaselineAfter: \`${processState.storyContext.expectedCumulativeTestBaselineAfter}\``
      : "",
    `- epic: \`${specPack.epicPath}\``,
    `- techDesign: \`${specPack.techDesignPath}\``,
    ...specPack.techDesignCompanionPaths.map(
      (path) => `- techDesignCompanion: \`${path}\``
    ),
    `- testPlan: \`${specPack.testPlanPath}\``,
    `- storyGate: \`${processState.gatePolicy.storyAcceptanceGate}\``,
    `- boundaryInventorySnapshot: \`${boundaryInventorySummary}\``,
    "",
    "## Prior Receipts",
    "",
    ...(processState.currentStoryIndex > 0
      ? specPack.stories
          .slice(0, processState.currentStoryIndex)
          .map((candidate) => `- ${candidate.id}`)
      : ["- none"]),
    "",
    "## Working Tree Summary",
    "",
    await getWorkingTreeSummary(specPack.repoRoot),
    "",
    "## Changed Files",
    "",
    await gitChangedFilesSince(
      specPack.repoRoot,
      processState.storyContext?.storyBaseCommit
    ),
    "",
    "## Changed Test Files",
    "",
    await gitChangedTestFilesSince(
      specPack.repoRoot,
      processState.storyContext?.storyBaseCommit
    ),
    "",
  ].join("\n");

  await writeFile(bundlePath, content, "utf8");
  return bundlePath;
}

async function buildFeatureVerificationBundle(
  specPack: ResolvedSpecPack,
  processState: ProcessState,
  layout: ReturnType<typeof getProcessLayout>
): Promise<string> {
  const attempt = processState.featureContext?.verificationRound ?? 1;
  const visibleDir = getVisibleFeatureVerificationDir(layout);
  await mkdir(visibleDir, { recursive: true });
  const bundlePath = join(
    visibleDir,
    featureVerificationFileName("verification-bundle", attempt)
  );

  const boundaryInventorySummary = summarizeBoundaryInventory(
    await loadBoundaryInventory(specPack.boundaryInventoryPath),
    specPack.boundaryInventoryPath
      ? "Boundary inventory present but empty."
      : "Boundary inventory missing."
  );

  const content = [
    "# Feature Verification Bundle",
    "",
    `- epic: \`${specPack.epicPath}\``,
    `- techDesign: \`${specPack.techDesignPath}\``,
    ...specPack.techDesignCompanionPaths.map(
      (path) => `- techDesignCompanion: \`${path}\``
    ),
    `- testPlan: \`${specPack.testPlanPath}\``,
    `- featureGate: \`${processState.gatePolicy.featureAcceptanceGate}\``,
    `- boundaryInventorySnapshot: \`${boundaryInventorySummary}\``,
    "",
    "## Story Set",
    "",
    ...specPack.stories.map((story) => `- ${story.id}: ${story.title}`),
    "",
    "## Story Receipt Refs",
    "",
    ...specPack.stories.map((story) => {
      const synthAttempt = processState.storyAttempts[story.id]?.story_synthesize ?? 1;
      return `- ${join(
        getVisibleStoryVerificationDir(layout, story.id),
        storyVerificationFileName("synthesis", synthAttempt)
      )}`;
    }),
    "",
    processState.featureContext?.currentCleanupReceiptPath
      ? "## Cleanup Receipt"
      : "",
    processState.featureContext?.currentCleanupReceiptPath
      ? ""
      : "",
    processState.featureContext?.currentCleanupReceiptPath
      ? `- ${processState.featureContext.currentCleanupReceiptPath}`
      : "",
    "",
    "## Working Tree Summary",
    "",
    await getWorkingTreeSummary(specPack.repoRoot),
    "",
  ].join("\n");

  await writeFile(bundlePath, content, "utf8");
  return bundlePath;
}

async function materializeStoryFixBatch(
  story: StoryDefinition,
  processState: ProcessState,
  layout: ReturnType<typeof getProcessLayout>,
  synthesis: ParsedSynthesisResult
): Promise<string> {
  const attempt = processState.storyAttempts[story.id]?.story_fix_batch
    ? (processState.storyAttempts[story.id]?.story_fix_batch ?? 0) + 1
    : 1;
  const dir = getVisibleStoryVerificationDir(layout, story.id);
  await mkdir(dir, { recursive: true });
  const path = join(dir, storyVerificationFileName("fix-batch", attempt));
  const lines = [
    `# Story Fix Batch — ${story.title}`,
    "",
    "## Findings To Address",
    "",
    ...(synthesis.unresolvedFindings.length > 0
      ? synthesis.unresolvedFindings.map((finding) => {
          const label = finding.title || finding.id || "finding";
          return `- ${label} -> ${finding.disposition}`;
        })
      : ["- No explicit findings listed; use synthesis notes."]),
    "",
    "## Notes",
    "",
    synthesis.notes || "(none)",
    "",
  ];
  await writeFile(path, lines.join("\n"), "utf8");
  return path;
}

async function materializeFeatureFixBatch(
  processState: ProcessState,
  layout: ReturnType<typeof getProcessLayout>,
  synthesis: ParsedSynthesisResult
): Promise<string> {
  const attempt = processState.featureAttempts.feature_fix_batch
    ? (processState.featureAttempts.feature_fix_batch ?? 0) + 1
    : 1;
  const dir = getVisibleFeatureVerificationDir(layout);
  await mkdir(dir, { recursive: true });
  const path = join(dir, featureVerificationFileName("fix-batch", attempt));
  const lines = [
    "# Feature Fix Batch",
    "",
    "## Findings To Address",
    "",
    ...(synthesis.unresolvedFindings.length > 0
      ? synthesis.unresolvedFindings.map((finding) => {
          const label = finding.title || finding.id || "finding";
          return `- ${label} -> ${finding.disposition}`;
        })
      : ["- No explicit findings listed; use synthesis notes."]),
    "",
    "## Notes",
    "",
    synthesis.notes || "(none)",
    "",
  ];
  await writeFile(path, lines.join("\n"), "utf8");
  return path;
}

async function materializePreFeatureCleanupBatch(
  specPack: ResolvedSpecPack,
  processState: ProcessState,
  layout: ReturnType<typeof getProcessLayout>
): Promise<string | undefined> {
  const items: string[] = [];

  for (const story of specPack.stories) {
    const synthAttempt = processState.storyAttempts[story.id]?.story_synthesize;
    if (!synthAttempt) {
      continue;
    }

    const statusPath = getStoryAttemptLayout(
      layout,
      story.id,
      "story_synthesize",
      synthAttempt
    ).statusPath;

    try {
      const synthesis = await parseSynthesisStatusFile(statusPath);
      for (const finding of synthesis.unresolvedFindings) {
        if (
          finding.disposition === "accepted-risk" ||
          finding.disposition === "defer"
        ) {
          items.push(
            `${story.id}: ${finding.title || finding.id || "finding"} -> ${finding.disposition}`
          );
        }
      }
    } catch {
      // Ignore malformed or missing synthesis files; later verification will surface real issues.
    }
  }

  if (items.length === 0) {
    return undefined;
  }

  const dir = getVisibleFeatureVerificationDir(layout);
  await mkdir(dir, { recursive: true });
  const path = join(dir, "cleanup-fix-batch-attempt-1.md");
  const content = [
    "# Pre-Feature Cleanup Fix Batch",
    "",
    "## Findings To Address",
    "",
    ...items.map((item) => `- ${item}`),
    "",
    "## Notes",
    "",
    "Carry-forward deferred and accepted-risk items before feature verification.",
    "",
  ].join("\n");

  await writeFile(path, content, "utf8");
  return path;
}

async function nextDryRunEvent(
  processState: ProcessState,
  target: string,
  step: string
): Promise<DryRunEvent | undefined> {
  if (!processState.dryRun) {
    return undefined;
  }

  const raw = JSON.parse(
    await readFile(processState.dryRun.scenarioPath, "utf8")
  ) as DryRunScenario;
  const event = raw.events[processState.dryRun.nextEventIndex];
  if (!event) {
    throw new Error(
      `Dry-run scenario exhausted while waiting for ${target}:${step}.`
    );
  }

  if (event.target !== target || event.step !== step) {
    throw new Error(
      `Dry-run scenario mismatch: expected ${target}:${step}, got ${event.target}:${event.step}.`
    );
  }

  processState.dryRun.nextEventIndex += 1;
  return event;
}

async function maybeConsumeStoryAttempt(
  layout: ReturnType<typeof getProcessLayout>,
  processState: ProcessState,
  storyId: string,
  step: StoryStep,
  primitiveSlug: PrimitiveSlug
): Promise<{
  status?: ParsedPrimitiveStatus | ParsedSynthesisResult;
  attemptLayout: { receiptPath: string; statusPath: string; attemptDir: string };
  visibleArtifactPath?: string;
  outcome: "success" | "stall" | "error";
} | null> {
  const attempt = processState.storyAttempts[storyId]?.[step];
  if (!attempt) {
    return null;
  }

  const attemptLayout = getStoryAttemptLayout(layout, storyId, step, attempt);
  const existingStatus = await safeReadJson(attemptLayout.statusPath);
  const existingReceipt = await safeReadText(attemptLayout.receiptPath);
  const existingReport = await safeReadText(attemptLayout.reportPath);
  const existingReadingJourney = await safeReadText(attemptLayout.readingJourneyPath);
  if (!existingStatus || !existingReceipt || !existingReport || !existingReadingJourney) {
    return null;
  }

  return {
    status: primitiveSlug.endsWith("synthesize")
      ? (existingStatus as ParsedSynthesisResult)
      : (existingStatus as ParsedPrimitiveStatus),
    attemptLayout,
    outcome: "success",
  };
}

async function maybeConsumeFeatureAttempt(
  layout: ReturnType<typeof getProcessLayout>,
  processState: ProcessState,
  step: FeatureStep,
  primitiveSlug: PrimitiveSlug
): Promise<{
  status?: ParsedPrimitiveStatus | ParsedSynthesisResult;
  attemptLayout: { receiptPath: string; statusPath: string; attemptDir: string };
  visibleArtifactPath?: string;
  outcome: "success" | "stall" | "error";
} | null> {
  const attempt = processState.featureAttempts[step];
  if (!attempt) {
    return null;
  }

  const attemptLayout = getFeatureAttemptLayout(layout, step, attempt);
  const existingStatus = await safeReadJson(attemptLayout.statusPath);
  const existingReceipt = await safeReadText(attemptLayout.receiptPath);
  const existingReport = await safeReadText(attemptLayout.reportPath);
  const existingReadingJourney = await safeReadText(attemptLayout.readingJourneyPath);
  if (!existingStatus || !existingReceipt || !existingReport || !existingReadingJourney) {
    return null;
  }

  return {
    status: primitiveSlug.endsWith("synthesize")
      ? (existingStatus as ParsedSynthesisResult)
      : (existingStatus as ParsedPrimitiveStatus),
    attemptLayout,
    outcome: "success",
  };
}

async function safeReadJson(path: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return undefined;
  }
}

async function gitChangedFilesSince(
  repoRoot: string,
  baseCommit?: string
): Promise<string> {
  if (!baseCommit) {
    return "- unavailable";
  }
  const result = await runShellCommand(
    repoRoot,
    `git diff --name-only ${baseCommit}`
  );
  return result.stdout.trim() ? result.stdout.trim() : "(none)";
}

async function gitChangedTestFilesSince(
  repoRoot: string,
  baseCommit?: string
): Promise<string> {
  if (!baseCommit) {
    return "- unavailable";
  }
  const result = await runShellCommand(
    repoRoot,
    `git diff --name-only ${baseCommit} -- **/*.test.* **/*.spec.*`
  );
  return result.stdout.trim() ? result.stdout.trim() : "(none)";
}

async function safeReadText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

async function loadOrCreateLedger(path: string): Promise<ProcessLedger> {
  try {
    return await loadProcessLedger(path);
  } catch {
    return createEmptyLedger();
  }
}

async function recordAttempt(
  ledger: ProcessLedger,
  ledgerPath: string,
  entry: ProcessLedgerEntry
): Promise<void> {
  appendLedgerEntry(ledger, entry);
  await saveProcessLedger(ledgerPath, ledger);
}
