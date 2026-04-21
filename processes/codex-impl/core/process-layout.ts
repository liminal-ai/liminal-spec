import { mkdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import type { FeatureStep, StoryStep } from "./state";

export interface ProcessLayout {
  specPackRoot: string;
  processRoot: string;
  processStatePath: string;
  phaseLedgerPath: string;
  processLogPath: string;
  escalationLogPath: string;
  storyCyclesRoot: string;
  featureVerificationRoot: string;
  storyVerificationRoot: string;
  visibleFeatureVerificationRoot: string;
}

export interface PrimitiveAttemptLayout {
  attemptDir: string;
  promptPath: string;
  readingJourneyPath: string;
  stdoutPath: string;
  stderrPath: string;
  reportPath: string;
  receiptPath: string;
  statusPath: string;
  invocationPath: string;
  modelSchemaPath: string;
}

export function getProcessLayout(specPackRoot: string): ProcessLayout {
  const root = resolve(specPackRoot, ".processes", "codex-impl");
  return {
    specPackRoot: resolve(specPackRoot),
    processRoot: root,
    processStatePath: join(root, "process-state.json"),
    phaseLedgerPath: join(root, "phase-ledger.json"),
    processLogPath: join(root, "process-log.md"),
    escalationLogPath: join(root, "escalation-log.md"),
    storyCyclesRoot: join(root, "story-cycles"),
    featureVerificationRoot: join(root, "feature-verification"),
    storyVerificationRoot: resolve(specPackRoot, "story-verification"),
    visibleFeatureVerificationRoot: resolve(specPackRoot, "feature-verification"),
  };
}

export async function ensureProcessLayout(
  specPackRoot: string
): Promise<ProcessLayout> {
  const layout = getProcessLayout(specPackRoot);
  await mkdir(layout.storyCyclesRoot, { recursive: true });
  await mkdir(layout.featureVerificationRoot, { recursive: true });
  await mkdir(layout.storyVerificationRoot, { recursive: true });
  await mkdir(layout.visibleFeatureVerificationRoot, { recursive: true });
  return layout;
}

export function getStoryAttemptLayout(
  layout: ProcessLayout,
  storyId: string,
  step: StoryStep,
  attempt: number
): PrimitiveAttemptLayout {
  const attemptDir = join(
    layout.storyCyclesRoot,
    storyId,
    step,
    `attempt-${attempt}`
  );
  return getAttemptLayout(attemptDir);
}

export function getFeatureAttemptLayout(
  layout: ProcessLayout,
  step: FeatureStep,
  attempt: number
): PrimitiveAttemptLayout {
  const attemptDir = join(
    layout.featureVerificationRoot,
    step,
    `attempt-${attempt}`
  );
  return getAttemptLayout(attemptDir);
}

function getAttemptLayout(attemptDir: string): PrimitiveAttemptLayout {
  return {
    attemptDir,
    promptPath: join(attemptDir, "prompt.md"),
    readingJourneyPath: join(attemptDir, "reading-journey.md"),
    stdoutPath: join(attemptDir, "stdout.jsonl"),
    stderrPath: join(attemptDir, "stderr.log"),
    reportPath: join(attemptDir, "report.md"),
    receiptPath: join(attemptDir, "receipt.md"),
    statusPath: join(attemptDir, "status.json"),
    invocationPath: join(attemptDir, "invocation.json"),
    modelSchemaPath: join(attemptDir, "model-output-schema.json"),
  };
}

export async function ensureAttemptLayout(
  layout: PrimitiveAttemptLayout
): Promise<void> {
  await mkdir(layout.attemptDir, { recursive: true });
}

export function getVisibleStoryVerificationDir(
  layout: ProcessLayout,
  storyId: string
): string {
  return join(layout.storyVerificationRoot, storyId);
}

export function getVisibleFeatureVerificationDir(layout: ProcessLayout): string {
  return layout.visibleFeatureVerificationRoot;
}

export function storyVerificationFileName(
  primitiveKind: "verification-bundle" | "primary-review" | "secondary-review" | "synthesis" | "fix-batch",
  attempt: number
): string {
  return `${primitiveKind}-attempt-${attempt}.md`;
}

export function featureVerificationFileName(
  primitiveKind: "verification-bundle" | "primary-review" | "secondary-review" | "synthesis" | "fix-batch",
  attempt: number
): string {
  return `${primitiveKind}-attempt-${attempt}.md`;
}

export function humanLabelFromPath(path: string): string {
  return basename(path);
}
