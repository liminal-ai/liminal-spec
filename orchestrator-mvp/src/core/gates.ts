import type {
  GateReport,
  PhaseDefinition,
  PhaseStatusFile,
  UnresolvedFinding,
} from "../types";

const VALID_DISPOSITIONS = new Set(["fixed", "accepted-risk", "defer"]);

function dispositionError(finding: UnresolvedFinding, index: number): string | null {
  if (!finding.disposition || !VALID_DISPOSITIONS.has(finding.disposition)) {
    const label = finding.title || finding.id || `finding-${index + 1}`;
    return `Unresolved finding '${label}' has invalid disposition '${finding.disposition || "missing"}'.`;
  }

  return null;
}

export function evaluateGates(params: {
  phase: PhaseDefinition;
  statusFile?: PhaseStatusFile;
  hasReceipt: boolean;
  hasStatusFile: boolean;
}): GateReport {
  const hardBlockers: string[] = [];
  const softWarnings: string[] = [];
  const { phase, statusFile, hasReceipt, hasStatusFile } = params;

  if (!hasReceipt) {
    hardBlockers.push("Missing required receipt.md artifact.");
  }

  if (!hasStatusFile) {
    hardBlockers.push("Missing required status.json artifact.");
  }

  if (!statusFile) {
    return { hardBlockers, softWarnings };
  }

  if (statusFile.phaseId && statusFile.phaseId !== phase.id) {
    hardBlockers.push(
      `status.json phaseId mismatch (expected '${phase.id}', got '${statusFile.phaseId}').`
    );
  }

  if (statusFile.status === "NEEDS_REWORK") {
    hardBlockers.push("Phase status is NEEDS_REWORK.");
  }

  if (statusFile.status === "BLOCKED") {
    hardBlockers.push("Phase status is BLOCKED.");
  }

  if (statusFile.requiresUserDecision) {
    hardBlockers.push(
      "Phase explicitly requires user decision before acceptance."
    );
  }

  if (phase.requiresCodexEvidenceRef && !statusFile.codexEvidenceRef) {
    hardBlockers.push("Missing required codexEvidenceRef in status.json.");
  }

  const observedMilestones = new Set(statusFile.milestones || []);
  for (const milestone of phase.requiredMilestones) {
    if (!observedMilestones.has(milestone)) {
      hardBlockers.push(`Missing required milestone '${milestone}'.`);
    }
  }

  const unresolved = statusFile.unresolvedFindings || [];
  for (let index = 0; index < unresolved.length; index += 1) {
    const error = dispositionError(unresolved[index], index);
    if (error) {
      hardBlockers.push(error);
    }
  }

  if (!statusFile.notes || !statusFile.notes.trim()) {
    softWarnings.push("status.json notes field is empty.");
  }

  if (!statusFile.unresolvedFindings || statusFile.unresolvedFindings.length === 0) {
    softWarnings.push("No unresolvedFindings provided; cannot assess residual risk quality.");
  }

  if (
    statusFile.escalationQuestions &&
    statusFile.escalationQuestions.length > 0 &&
    !statusFile.requiresUserDecision
  ) {
    softWarnings.push(
      "Escalation questions were provided; verify supervisor resolves or explicitly escalates."
    );
  }

  return { hardBlockers, softWarnings };
}
