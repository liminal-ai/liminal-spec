import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type {
  Decision,
  ExceptionTokenState,
  FlowId,
  PhaseAttemptRecord,
  PhaseLedgerEntry,
  RunLifecycleStatus,
  RunState,
} from "../types";

export const ORCHESTRATOR_ROOT = resolve(import.meta.dir, "../..");
export const RUNS_ROOT = resolve(ORCHESTRATOR_ROOT, "runs");

export interface RunLayout {
  runRoot: string;
  stateDir: string;
  logsDir: string;
  phaseDir: string;
  escalationsDir: string;
  runStatePath: string;
  phaseLedgerPath: string;
  decisionLogPath: string;
  processRefinementLogPath: string;
  supervisorLogPath: string;
  escalationLogPath: string;
}

export interface PhaseAttemptPaths {
  phaseAttemptDir: string;
  promptPath: string;
  callScriptPath: string;
  stdoutPath: string;
  stderrPath: string;
  receiptPath: string;
  statusPath: string;
  supervisorPromptPath: string;
  supervisorOutPath: string;
  supervisorStdoutPath: string;
  supervisorStderrPath: string;
  commitPromptPath: string;
  commitOutPath: string;
  commitStdoutPath: string;
  commitStderrPath: string;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createRunId(flowId: FlowId): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${flowId}-${stamp}-${suffix}`;
}

export function getRunLayout(runId: string): RunLayout {
  const runRoot = resolve(RUNS_ROOT, runId);
  const stateDir = resolve(runRoot, "state");
  const logsDir = resolve(runRoot, "logs");
  const phaseDir = resolve(runRoot, "phase");
  const escalationsDir = resolve(runRoot, "escalations");

  return {
    runRoot,
    stateDir,
    logsDir,
    phaseDir,
    escalationsDir,
    runStatePath: resolve(stateDir, "run-state.json"),
    phaseLedgerPath: resolve(stateDir, "phase-ledger.json"),
    decisionLogPath: resolve(logsDir, "decision-log.md"),
    processRefinementLogPath: resolve(logsDir, "process-refinement-log.md"),
    supervisorLogPath: resolve(logsDir, "supervisor-log.md"),
    escalationLogPath: resolve(logsDir, "escalation-log.md"),
  };
}

export async function ensureRunLayout(runId: string): Promise<RunLayout> {
  const layout = getRunLayout(runId);

  await mkdir(layout.stateDir, { recursive: true });
  await mkdir(layout.logsDir, { recursive: true });
  await mkdir(layout.phaseDir, { recursive: true });
  await mkdir(layout.escalationsDir, { recursive: true });

  return layout;
}

export function initialExceptionTokenState(): ExceptionTokenState {
  return {
    available: true,
    used: false,
  };
}

export function createInitialRunState(params: {
  runId: string;
  flowId: FlowId;
  cwd: string;
  dryRun: boolean;
}): RunState {
  const now = nowIso();
  return {
    runId: params.runId,
    flowId: params.flowId,
    cwd: params.cwd,
    dryRun: params.dryRun,
    status: "running",
    currentPhaseIndex: 0,
    attemptsByPhase: {},
    exceptionToken: initialExceptionTokenState(),
    createdAt: now,
    updatedAt: now,
  };
}

export async function saveRunState(
  path: string,
  runState: RunState
): Promise<void> {
  runState.updatedAt = nowIso();
  await writeJson(path, runState);
}

export async function loadRunState(path: string): Promise<RunState> {
  return readJson<RunState>(path);
}

export type PhaseLedger = Record<string, PhaseLedgerEntry>;

export function createEmptyPhaseLedger(): PhaseLedger {
  return {};
}

export async function savePhaseLedger(
  path: string,
  ledger: PhaseLedger
): Promise<void> {
  await writeJson(path, ledger);
}

export async function loadPhaseLedger(path: string): Promise<PhaseLedger> {
  return readJson<PhaseLedger>(path);
}

export function appendPhaseAttempt(
  ledger: PhaseLedger,
  phaseId: string,
  attemptRecord: PhaseAttemptRecord
): void {
  if (!ledger[phaseId]) {
    ledger[phaseId] = { phaseId, attempts: [] };
  }

  ledger[phaseId].attempts.push(attemptRecord);
}

export function setRunStatus(
  runState: RunState,
  status: RunLifecycleStatus
): void {
  runState.status = status;
  runState.updatedAt = nowIso();
}

export function registerDecision(
  runState: RunState,
  phaseId: string,
  decision: Decision
): void {
  if (decision === "approve") {
    runState.currentPhaseIndex += 1;
  }

  runState.updatedAt = nowIso();
  if (!runState.attemptsByPhase[phaseId]) {
    runState.attemptsByPhase[phaseId] = 0;
  }
}

export function incrementAttempt(runState: RunState, phaseId: string): number {
  const current = runState.attemptsByPhase[phaseId] || 0;
  const next = current + 1;
  runState.attemptsByPhase[phaseId] = next;
  runState.updatedAt = nowIso();
  return next;
}

export function beginPhaseAttemptToken(runState: RunState, phaseAttemptKey: string): void {
  runState.exceptionToken = {
    available: true,
    used: false,
    usedInAttempt: phaseAttemptKey,
  };
}

export function consumeExceptionToken(runState: RunState): boolean {
  if (!runState.exceptionToken.available || runState.exceptionToken.used) {
    return false;
  }

  runState.exceptionToken.used = true;
  runState.exceptionToken.available = false;
  runState.updatedAt = nowIso();
  return true;
}

export function clearExceptionToken(runState: RunState): void {
  runState.exceptionToken = initialExceptionTokenState();
  runState.updatedAt = nowIso();
}

export function setWaitingForUser(runState: RunState, escalationId: string): void {
  runState.status = "waiting_user";
  runState.pendingEscalationId = escalationId;
  runState.waitingForUserSince = nowIso();
  runState.updatedAt = nowIso();
}

export function clearWaitingForUser(runState: RunState): void {
  runState.pendingEscalationId = undefined;
  runState.waitingForUserSince = undefined;
  runState.updatedAt = nowIso();
}

export function getPhaseAttemptPaths(
  phaseDirRoot: string,
  phaseId: string,
  attempt: number
): PhaseAttemptPaths {
  const phaseAttemptDir = resolve(phaseDirRoot, phaseId, `attempt-${attempt}`);
  return {
    phaseAttemptDir,
    promptPath: resolve(phaseAttemptDir, "prompt.md"),
    callScriptPath: resolve(phaseAttemptDir, "call.sh"),
    stdoutPath: resolve(phaseAttemptDir, "stdout.log"),
    stderrPath: resolve(phaseAttemptDir, "stderr.log"),
    receiptPath: resolve(phaseAttemptDir, "receipt.md"),
    statusPath: resolve(phaseAttemptDir, "status.json"),
    supervisorPromptPath: resolve(phaseAttemptDir, "supervisor-prompt.md"),
    supervisorOutPath: resolve(phaseAttemptDir, "supervisor-decision.json"),
    supervisorStdoutPath: resolve(phaseAttemptDir, "supervisor-stdout.log"),
    supervisorStderrPath: resolve(phaseAttemptDir, "supervisor-stderr.log"),
    commitPromptPath: resolve(phaseAttemptDir, "commit-prompt.md"),
    commitOutPath: resolve(phaseAttemptDir, "commit-result.json"),
    commitStdoutPath: resolve(phaseAttemptDir, "commit-stdout.log"),
    commitStderrPath: resolve(phaseAttemptDir, "commit-stderr.log"),
  };
}

export async function ensurePhaseAttemptDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function appendLog(path: string, markdownEntry: string): Promise<void> {
  await ensureParent(path);
  let existing = "";

  try {
    existing = await readFile(path, "utf8");
  } catch {
    existing = "";
  }

  const next = `${existing}${existing ? "\n\n" : ""}${markdownEntry}`;
  await writeFile(path, next, "utf8");
}

export async function readText(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export async function writeText(path: string, content: string): Promise<void> {
  await ensureParent(path);
  await writeFile(path, content, "utf8");
}

export async function fileExists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

async function ensureParent(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await ensureParent(path);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJson<T>(path: string): Promise<T> {
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as T;
}
