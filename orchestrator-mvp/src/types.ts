export type FlowId = "team-impl" | "team-spec" | "single-story";

export type Decision = "approve" | "rework" | "escalate";

export type PhaseMachineStatus = "DONE" | "NEEDS_REWORK" | "BLOCKED";

export type RunLifecycleStatus =
  | "running"
  | "waiting_user"
  | "completed"
  | "escalated"
  | "failed";

export type TerminalMode = "auto" | "iterm2" | "ghostty" | "terminal" | "none";

export interface UnresolvedFinding {
  id?: string;
  title?: string;
  disposition: string;
}

export interface PhaseStatusFile {
  phaseId: string;
  status: PhaseMachineStatus;
  codexEvidenceRef?: string;
  unresolvedFindings?: UnresolvedFinding[];
  milestones?: string[];
  notes?: string;
  escalationQuestions?: string[];
  requiresUserDecision?: boolean;
  supervisorResolutionHint?: string;
}

export interface GateReport {
  hardBlockers: string[];
  softWarnings: string[];
}

export interface PhaseDefinition {
  id: string;
  title: string;
  promptTemplatePath: string;
  requiredMilestones: string[];
  requiresCodexEvidenceRef: boolean;
  commitMessageTemplate?: string;
}

export interface FlowDefinition {
  id: FlowId;
  phases: PhaseDefinition[];
}

export interface PhaseAttemptRecord {
  attempt: number;
  decision: Decision;
  status: PhaseMachineStatus;
  hardBlockers: string[];
  softWarnings: string[];
  note?: string;
  usedExceptionToken?: boolean;
  timestamp: string;
}

export interface PhaseLedgerEntry {
  phaseId: string;
  attempts: PhaseAttemptRecord[];
}

export interface ExceptionTokenState {
  available: boolean;
  used: boolean;
  usedInAttempt?: string;
}

export interface RunState {
  runId: string;
  flowId: FlowId;
  cwd: string;
  dryRun: boolean;
  status: RunLifecycleStatus;
  currentPhaseIndex: number;
  attemptsByPhase: Record<string, number>;
  exceptionToken: ExceptionTokenState;
  pendingEscalationId?: string;
  waitingForUserSince?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DryRunScenarioEntry {
  phaseId: string;
  attempt: number;
  decision: Decision;
  note?: string;
}

export interface DryRunScenario {
  phases: DryRunScenarioEntry[];
}

export interface SupervisorDecision {
  decision: Decision;
  rationale: string;
  useExceptionToken: boolean;
  note?: string;
}

export interface FlowInputs {
  epicPath?: string;
  techDesignPath?: string;
  storyPath?: string;
  stories?: string[];
  requirementsPath?: string;
}

export interface RunOptions {
  flowId: FlowId;
  cwd: string;
  runId?: string;
  dryRun: boolean;
  dryRunScenarioPath?: string;
  terminalMode: TerminalMode;
  inputs: FlowInputs;
  entryPoint?: string;
  resume: boolean;
  maxReworks: number;
  userResponseText?: string;
  userResponseFile?: string;
}

export interface PhaseContext {
  runRoot: string;
  phaseDir: string;
  promptPath: string;
  callScriptPath: string;
  stdoutPath: string;
  stderrPath: string;
  receiptPath: string;
  statusPath: string;
}

export interface ShellExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CommandExecutor {
  run(command: string, cwd: string): Promise<ShellExecutionResult>;
}
