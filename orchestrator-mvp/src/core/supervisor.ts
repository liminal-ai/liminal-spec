import { resolve } from "node:path";
import {
  buildCommitPrompt,
  buildSupervisorPrompt,
  requestSupervisorDecision,
  runSupervisorCommit,
} from "../adapters/codex";
import {
  ORCHESTRATOR_ROOT,
  appendLog,
  nowIso,
  writeText,
} from "./state";
import type {
  CommandExecutor,
  GateReport,
  PhaseDefinition,
  PhaseStatusFile,
  SupervisorDecision,
} from "../types";

const SUPERVISOR_SCHEMA = resolve(
  ORCHESTRATOR_ROOT,
  "schemas/supervisor-decision.schema.json"
);
const COMMIT_SCHEMA = resolve(
  ORCHESTRATOR_ROOT,
  "schemas/supervisor-commit.schema.json"
);

export interface SupervisorDecisionParams {
  cwd: string;
  phase: PhaseDefinition;
  attempt: number;
  gateReport: GateReport;
  phaseStatus?: PhaseStatusFile;
  receiptText: string;
  supervisorPromptPath: string;
  supervisorOutPath: string;
  supervisorStdoutPath: string;
  supervisorStderrPath: string;
  supervisorLogPath: string;
}

export async function decidePhase(
  params: SupervisorDecisionParams,
  executor: CommandExecutor
): Promise<SupervisorDecision> {
  const prompt = buildSupervisorPrompt({
    phase: params.phase,
    attempt: params.attempt,
    gateReport: params.gateReport,
    phaseStatus: params.phaseStatus,
    receiptText: params.receiptText,
  });

  await writeText(params.supervisorPromptPath, `${prompt}\n`);

  const decision = await requestSupervisorDecision(
    {
      cwd: params.cwd,
      promptPath: params.supervisorPromptPath,
      outputPath: params.supervisorOutPath,
      stdoutPath: params.supervisorStdoutPath,
      stderrPath: params.supervisorStderrPath,
      schemaPath: SUPERVISOR_SCHEMA,
    },
    executor
  );

  const logEntry = [
    `### ${nowIso()} — Supervisor Decision (${params.phase.id} attempt ${params.attempt})`,
    `Decision: ${decision.decision}`,
    `Use exception token: ${decision.useExceptionToken ? "yes" : "no"}`,
    `Rationale: ${decision.rationale}`,
    decision.note ? `Note: ${decision.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  await appendLog(params.supervisorLogPath, logEntry);

  return decision;
}

export function normalizeDecisionAgainstGates(
  decision: SupervisorDecision,
  gateReport: GateReport
): SupervisorDecision {
  if (gateReport.hardBlockers.length > 0 && decision.decision === "approve" && !decision.useExceptionToken) {
    return {
      decision: "rework",
      useExceptionToken: false,
      rationale: `${decision.rationale} Auto-adjusted to rework because hard blockers exist and no exception token was requested.`,
      note: decision.note,
    };
  }

  return decision;
}

export interface CommitParams {
  cwd: string;
  commitMessage: string;
  commitPromptPath: string;
  commitOutPath: string;
  commitStdoutPath: string;
  commitStderrPath: string;
  supervisorLogPath: string;
}

export async function runPhaseCommit(
  params: CommitParams,
  executor: CommandExecutor
): Promise<{ status: "committed" | "no_changes" | "failed"; summary: string }> {
  const prompt = buildCommitPrompt(params.commitMessage);
  await writeText(params.commitPromptPath, `${prompt}\n`);

  const result = await runSupervisorCommit(
    {
      cwd: params.cwd,
      promptPath: params.commitPromptPath,
      outputPath: params.commitOutPath,
      stdoutPath: params.commitStdoutPath,
      stderrPath: params.commitStderrPath,
      schemaPath: COMMIT_SCHEMA,
    },
    executor
  );

  await appendLog(
    params.supervisorLogPath,
    [
      `### ${nowIso()} — Supervisor Commit`,
      `Commit message: ${params.commitMessage}`,
      `Status: ${result.status}`,
      `Summary: ${result.summary}`,
    ].join("\n")
  );

  return result;
}
