import { resolve } from "node:path";
import { z } from "zod";
import type {
  CommandExecutor,
  GateReport,
  PhaseDefinition,
  PhaseStatusFile,
  SupervisorDecision,
} from "../types";

const SupervisorDecisionSchema = z.object({
  decision: z.enum(["approve", "rework", "escalate"]),
  rationale: z.string().min(1),
  useExceptionToken: z.boolean(),
  note: z.string().optional(),
});

const CommitResultSchema = z.object({
  status: z.enum(["committed", "no_changes", "failed"]),
  summary: z.string().min(1),
});

export interface CodexDecisionInput {
  cwd: string;
  promptPath: string;
  outputPath: string;
  stdoutPath: string;
  stderrPath: string;
  schemaPath: string;
}

export interface CommitInput {
  cwd: string;
  promptPath: string;
  outputPath: string;
  stdoutPath: string;
  stderrPath: string;
  schemaPath: string;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildSupervisorPrompt(params: {
  phase: PhaseDefinition;
  attempt: number;
  gateReport: GateReport;
  phaseStatus?: PhaseStatusFile;
  receiptText: string;
}): string {
  const unresolved = params.phaseStatus?.unresolvedFindings ?? [];
  const unresolvedSummary = unresolved.length
    ? unresolved
        .map((finding, index) => {
          return `- ${index + 1}. ${finding.title || finding.id || "finding"}: ${finding.disposition}`;
        })
        .join("\n")
    : "- none";

  return [
    `You are the Codex supervisor for phase '${params.phase.id}' attempt ${params.attempt}.`,
    "Decide whether this phase should be approved, reworked, or escalated.",
    "Hard blockers should normally force rework or escalate unless explicitly using exception token.",
    "",
    "Gate report:",
    `Hard blockers (${params.gateReport.hardBlockers.length}):`,
    ...params.gateReport.hardBlockers.map((item) => `- ${item}`),
    `Soft warnings (${params.gateReport.softWarnings.length}):`,
    ...params.gateReport.softWarnings.map((item) => `- ${item}`),
    "",
    "Phase status summary:",
    `- status: ${params.phaseStatus?.status || "missing"}`,
    `- codexEvidenceRef: ${params.phaseStatus?.codexEvidenceRef || "missing"}`,
    `- milestones: ${(params.phaseStatus?.milestones || []).join(", ") || "none"}`,
    "",
    "Unresolved findings:",
    unresolvedSummary,
    "",
    "Receipt:",
    params.receiptText,
    "",
    "Return strictly valid JSON matching the schema.",
  ].join("\n");
}

export function buildCommitPrompt(commitMessage: string): string {
  return [
    "You are the Codex supervisor and own commit authority.",
    "Stage all changes and create one commit with the exact message below.",
    "If there are no changes, return status no_changes.",
    `Commit message: ${commitMessage}`,
    "Return strictly valid JSON matching schema.",
  ].join("\n");
}

export async function requestSupervisorDecision(
  input: CodexDecisionInput,
  executor: CommandExecutor
): Promise<SupervisorDecision> {
  const cwd = resolve(input.cwd);
  const command = [
    `cat ${quote(resolve(input.promptPath))}`,
    "|",
    "codex exec",
    "--dangerously-bypass-approvals-and-sandbox",
    "--model gpt-5.3-codex",
    `--output-schema ${quote(resolve(input.schemaPath))}`,
    `-o ${quote(resolve(input.outputPath))}`,
    `-C ${quote(cwd)}`,
    ">",
    quote(resolve(input.stdoutPath)),
    "2>",
    quote(resolve(input.stderrPath)),
    "-",
  ].join(" ");

  const result = await executor.run(command, cwd);
  if (result.exitCode !== 0) {
    throw new Error(
      `Codex supervisor command failed (exit ${result.exitCode}): ${result.stderr.trim() || result.stdout.trim()}`
    );
  }

  const decisionText = await Bun.file(resolve(input.outputPath)).text();
  const decisionJson = JSON.parse(decisionText);
  return SupervisorDecisionSchema.parse(decisionJson);
}

export async function runSupervisorCommit(
  input: CommitInput,
  executor: CommandExecutor
): Promise<{ status: "committed" | "no_changes" | "failed"; summary: string }> {
  const cwd = resolve(input.cwd);
  const command = [
    `cat ${quote(resolve(input.promptPath))}`,
    "|",
    "codex exec",
    "--dangerously-bypass-approvals-and-sandbox",
    "--model gpt-5.3-codex",
    `--output-schema ${quote(resolve(input.schemaPath))}`,
    `-o ${quote(resolve(input.outputPath))}`,
    `-C ${quote(cwd)}`,
    ">",
    quote(resolve(input.stdoutPath)),
    "2>",
    quote(resolve(input.stderrPath)),
    "-",
  ].join(" ");

  const result = await executor.run(command, cwd);
  if (result.exitCode !== 0) {
    return {
      status: "failed",
      summary: `Commit command failed: ${result.stderr.trim() || result.stdout.trim()}`,
    };
  }

  const commitText = await Bun.file(resolve(input.outputPath)).text();
  const commitJson = JSON.parse(commitText);
  return CommitResultSchema.parse(commitJson);
}
