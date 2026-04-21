import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type ProcessLifecycleStatus =
  | "SETUP"
  | "BETWEEN_STORIES"
  | "STORY_ACTIVE"
  | "PRE_FEATURE_VERIFY"
  | "FEATURE_VERIFY_ACTIVE"
  | "WAITING_USER"
  | "COMPLETE"
  | "FAILED";

export type StoryStep =
  | "story_implement"
  | "story_verify_primary"
  | "story_verify_secondary"
  | "story_synthesize"
  | "story_fix_batch"
  | "story_accept";

export type FeatureStep =
  | "feature_verify_primary"
  | "feature_verify_secondary"
  | "feature_synthesize"
  | "feature_fix_batch"
  | "feature_accept";

export type ActiveStep = StoryStep | FeatureStep;

export type PrimitiveStatus = "DONE" | "NEEDS_REWORK" | "BLOCKED";

export type PrimitiveSlug =
  | "codex54-xhigh-story-implement"
  | "codex54-xhigh-story-verify-primary"
  | "gpt53-codex-high-story-verify-secondary"
  | "codex54-xhigh-story-synthesize"
  | "codex54-xhigh-story-fix-batch"
  | "codex54-xhigh-feature-verify-primary"
  | "gpt53-codex-high-feature-verify-secondary"
  | "codex54-xhigh-feature-synthesize";

export interface UnresolvedFinding {
  id?: string;
  title?: string;
  disposition: "fixed" | "accepted-risk" | "defer";
  severity?: "CRITICAL" | "MAJOR" | "MINOR" | "INFO";
}

export interface PrimitiveStatusRecord {
  processType: "codex-impl";
  primitiveSlug: PrimitiveSlug;
  storyId?: string;
  featureVerification?: boolean;
  status: PrimitiveStatus;
  codexEvidenceRef: string;
  reportRef: string;
  readingJourneyRef: string;
  milestones: string[];
  unresolvedFindings: UnresolvedFinding[];
  notes: string;
  requiresUserDecision: boolean;
  nextRecommendedAction: string;
  gateResultSummary?: string;
}

export interface GatePolicy {
  packageManager: "bun" | "pnpm" | "npm";
  storyAcceptanceGate: string;
  featureAcceptanceGate: string;
}

export interface StoryContextState {
  verificationRound: number;
  storyBaseCommit?: string;
  cumulativeTestBaselineBefore?: number;
  expectedCumulativeTestBaselineAfter?: number;
  currentVerificationBundlePath?: string;
  currentPrimaryReviewPath?: string;
  currentSecondaryReviewPath?: string;
  currentSynthesisPath?: string;
  currentFixBatchPath?: string;
}

export interface FeatureContextState {
  verificationRound: number;
  currentCleanupReceiptPath?: string;
  currentVerificationBundlePath?: string;
  currentPrimaryReviewPath?: string;
  currentSecondaryReviewPath?: string;
  currentSynthesisPath?: string;
  currentFixBatchPath?: string;
}

export interface ActiveBlockingDependency {
  primitiveSlug: PrimitiveSlug;
  attempt: number;
  artifactDir: string;
  kind: "codex-exec";
}

export interface DryRunState {
  scenarioPath: string;
  nextEventIndex: number;
}

export interface ProcessState {
  processType: "codex-impl";
  version: 1;
  specPackRoot: string;
  repoRoot: string;
  status: ProcessLifecycleStatus;
  storyIds: string[];
  currentStoryIndex: number;
  currentStoryId?: string;
  currentStep?: ActiveStep;
  activePrimitive?: PrimitiveSlug;
  lastCompletedPrimitive?: PrimitiveSlug;
  gatePolicy: GatePolicy;
  stepRetryCount: number;
  storyAttempts: Record<string, Partial<Record<StoryStep, number>>>;
  featureAttempts: Partial<Record<FeatureStep, number>>;
  storyContext?: StoryContextState;
  featureContext?: FeatureContextState;
  activeBlockingDependency?: ActiveBlockingDependency;
  blocker?: string;
  dryRun?: DryRunState;
  startedAt: string;
  updatedAt: string;
}

export interface ProcessLedgerEntry {
  targetType: "story" | "feature";
  targetId: string;
  step: ActiveStep;
  primitiveSlug: PrimitiveSlug;
  attempt: number;
  outcome: "success" | "stall" | "error";
  status?: PrimitiveStatus;
  artifactDir: string;
  receiptPath: string;
  statusPath: string;
  startedAt: string;
  completedAt: string;
  note?: string;
}

export interface ProcessLedger {
  entries: ProcessLedgerEntry[];
}

export interface ProcessStateSummary {
  status: ProcessLifecycleStatus;
  storyId?: string;
  step?: ActiveStep;
  activePrimitive?: PrimitiveSlug;
  lastCompletedPrimitive?: PrimitiveSlug;
  blocker?: string;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createInitialProcessState(params: {
  specPackRoot: string;
  repoRoot: string;
  storyIds: string[];
  gatePolicy: GatePolicy;
  dryRun?: DryRunState;
}): ProcessState {
  const now = nowIso();
  return {
    processType: "codex-impl",
    version: 1,
    specPackRoot: params.specPackRoot,
    repoRoot: params.repoRoot,
    status: "SETUP",
    storyIds: params.storyIds,
    currentStoryIndex: 0,
    gatePolicy: params.gatePolicy,
    stepRetryCount: 0,
    storyAttempts: {},
    featureAttempts: {},
    startedAt: now,
    updatedAt: now,
    dryRun: params.dryRun,
  };
}

export function createEmptyLedger(): ProcessLedger {
  return { entries: [] };
}

export function getAttemptCountForStoryStep(
  processState: ProcessState,
  storyId: string,
  step: StoryStep
): number {
  return processState.storyAttempts[storyId]?.[step] ?? 0;
}

export function getAttemptCountForFeatureStep(
  processState: ProcessState,
  step: FeatureStep
): number {
  return processState.featureAttempts[step] ?? 0;
}

export function incrementStoryAttempt(
  processState: ProcessState,
  storyId: string,
  step: StoryStep
): number {
  if (!processState.storyAttempts[storyId]) {
    processState.storyAttempts[storyId] = {};
  }

  const next = (processState.storyAttempts[storyId][step] ?? 0) + 1;
  processState.storyAttempts[storyId][step] = next;
  processState.updatedAt = nowIso();
  return next;
}

export function incrementFeatureAttempt(
  processState: ProcessState,
  step: FeatureStep
): number {
  const next = (processState.featureAttempts[step] ?? 0) + 1;
  processState.featureAttempts[step] = next;
  processState.updatedAt = nowIso();
  return next;
}

export function advanceToStep(
  processState: ProcessState,
  status: ProcessLifecycleStatus,
  step?: ActiveStep,
  primitive?: PrimitiveSlug
): void {
  processState.status = status;
  processState.currentStep = step;
  processState.activePrimitive = primitive;
  processState.stepRetryCount = 0;
  processState.updatedAt = nowIso();
}

export function markPrimitiveCompleted(
  processState: ProcessState,
  primitive: PrimitiveSlug
): void {
  processState.lastCompletedPrimitive = primitive;
  processState.activePrimitive = undefined;
  processState.activeBlockingDependency = undefined;
  processState.stepRetryCount = 0;
  processState.updatedAt = nowIso();
}

export function registerStall(processState: ProcessState): void {
  processState.stepRetryCount += 1;
  processState.updatedAt = nowIso();
}

export function setBlocker(processState: ProcessState, blocker: string): void {
  processState.blocker = blocker;
  processState.status = "WAITING_USER";
  processState.updatedAt = nowIso();
}

export function clearBlocker(processState: ProcessState): void {
  processState.blocker = undefined;
  processState.updatedAt = nowIso();
}

export function setActiveBlockingDependency(
  processState: ProcessState,
  dependency: ActiveBlockingDependency
): void {
  processState.activeBlockingDependency = dependency;
  processState.updatedAt = nowIso();
}

export function clearActiveBlockingDependency(processState: ProcessState): void {
  processState.activeBlockingDependency = undefined;
  processState.updatedAt = nowIso();
}

export function clearStoryContext(processState: ProcessState): void {
  processState.storyContext = undefined;
  processState.updatedAt = nowIso();
}

export function clearFeatureContext(processState: ProcessState): void {
  processState.featureContext = undefined;
  processState.updatedAt = nowIso();
}

export function appendLedgerEntry(
  ledger: ProcessLedger,
  entry: ProcessLedgerEntry
): void {
  ledger.entries.push(entry);
}

async function ensureParent(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await ensureParent(path);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function saveProcessState(
  path: string,
  processState: ProcessState
): Promise<void> {
  processState.updatedAt = nowIso();
  await writeJson(path, processState);
}

export async function loadProcessState(path: string): Promise<ProcessState> {
  return readJson<ProcessState>(resolve(path));
}

export async function saveProcessLedger(
  path: string,
  ledger: ProcessLedger
): Promise<void> {
  await writeJson(path, ledger);
}

export async function loadProcessLedger(path: string): Promise<ProcessLedger> {
  return readJson<ProcessLedger>(resolve(path));
}

export async function appendProcessLog(
  path: string,
  heading: string,
  lines: string[]
): Promise<void> {
  await ensureParent(path);

  let existing = "";
  try {
    existing = await readFile(path, "utf8");
  } catch {}

  const block = [
    existing.trimEnd(),
    existing ? "" : "# Codex Process Log",
    existing ? "" : "",
    `## ${nowIso()} — ${heading}`,
    ...lines,
    "",
  ]
    .filter(Boolean)
    .join("\n");

  await writeFile(path, `${block}\n`, "utf8");
}

export async function appendEscalationLog(
  path: string,
  lines: string[]
): Promise<void> {
  await ensureParent(path);

  let existing = "";
  try {
    existing = await readFile(path, "utf8");
  } catch {}

  const block = [
    existing.trimEnd(),
    existing ? "" : "# Codex Process Escalations",
    existing ? "" : "",
    `## ${nowIso()} — Escalation`,
    ...lines,
    "",
  ]
    .filter(Boolean)
    .join("\n");

  await writeFile(path, `${block}\n`, "utf8");
}
