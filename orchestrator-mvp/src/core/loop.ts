import { chmod, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { z } from "zod";
import { buildClaudePhaseCommand } from "../adapters/claude";
import { BunCommandExecutor } from "../adapters/shell";
import { sendEscalationSms } from "../adapters/sms";
import {
  detectTerminalMode,
  launchWithoutTmux,
  type EffectiveTerminal,
} from "../adapters/terminal";
import { launchWithTmux, waitForTmuxSessionExit } from "../adapters/tmux";
import { evaluateGates } from "./gates";
import { buildInlinedSkillBundle } from "./skills";
import {
  decidePhase,
  normalizeDecisionAgainstGates,
  runPhaseCommit,
} from "./supervisor";
import {
  appendLog,
  appendPhaseAttempt,
  beginPhaseAttemptToken,
  clearWaitingForUser,
  clearExceptionToken,
  consumeExceptionToken,
  createEmptyPhaseLedger,
  createInitialRunState,
  createRunId,
  ensurePhaseAttemptDir,
  ensureRunLayout,
  fileExists,
  getPhaseAttemptPaths,
  getRunLayout,
  incrementAttempt,
  loadPhaseLedger,
  loadRunState,
  nowIso,
  savePhaseLedger,
  saveRunState,
  setWaitingForUser,
  setRunStatus,
  writeText,
  type PhaseLedger,
} from "./state";
import { getFlowDefinition } from "../flows";
import type {
  CommandExecutor,
  Decision,
  DryRunScenario,
  FlowDefinition,
  PhaseDefinition,
  PhaseStatusFile,
  RunOptions,
  RunState,
  SupervisorDecision,
} from "../types";

const DryRunScenarioSchema = z.object({
  phases: z.array(
    z.object({
      phaseId: z.string().min(1),
      attempt: z.number().int().positive(),
      decision: z.enum(["approve", "rework", "escalate"]),
      note: z.string().optional(),
    })
  ),
});

interface RunConfig {
  flowId: string;
  cwd: string;
  terminalMode: string;
  dryRun: boolean;
  entryPoint?: string;
  inputs: Record<string, unknown>;
  maxReworks: number;
}

interface LoopDependencies {
  executor?: CommandExecutor;
  artifactTimeoutMs?: number;
}

interface EscalationContext {
  escalationId: string;
  requestPath: string;
  responsePath: string;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function isValidStatus(value: unknown): value is "DONE" | "NEEDS_REWORK" | "BLOCKED" {
  return value === "DONE" || value === "NEEDS_REWORK" || value === "BLOCKED";
}

async function readStatusFile(statusPath: string): Promise<PhaseStatusFile | undefined> {
  if (!(await fileExists(statusPath))) {
    return undefined;
  }

  try {
    const raw = JSON.parse(await readFile(statusPath, "utf8")) as Record<string, unknown>;
    if (!raw || typeof raw !== "object") {
      return undefined;
    }

    if (!isValidStatus(raw.status)) {
      return undefined;
    }

    return {
      phaseId: typeof raw.phaseId === "string" ? raw.phaseId : "",
      status: raw.status,
      codexEvidenceRef:
        typeof raw.codexEvidenceRef === "string" ? raw.codexEvidenceRef : undefined,
      unresolvedFindings: Array.isArray(raw.unresolvedFindings)
        ? raw.unresolvedFindings
            .map((item) => {
              if (!item || typeof item !== "object") {
                return undefined;
              }

              const finding = item as Record<string, unknown>;
              return {
                id: typeof finding.id === "string" ? finding.id : undefined,
                title: typeof finding.title === "string" ? finding.title : undefined,
                disposition:
                  typeof finding.disposition === "string"
                    ? finding.disposition
                    : "missing",
              };
            })
            .filter(Boolean)
        : [],
      milestones: Array.isArray(raw.milestones)
        ? raw.milestones.filter((m) => typeof m === "string")
        : [],
      notes: typeof raw.notes === "string" ? raw.notes : "",
      escalationQuestions: Array.isArray(raw.escalationQuestions)
        ? raw.escalationQuestions.filter((q) => typeof q === "string")
        : [],
      requiresUserDecision:
        typeof raw.requiresUserDecision === "boolean"
          ? raw.requiresUserDecision
          : false,
      supervisorResolutionHint:
        typeof raw.supervisorResolutionHint === "string"
          ? raw.supervisorResolutionHint
          : undefined,
    };
  } catch {
    return undefined;
  }
}

async function waitForRequiredArtifacts(
  receiptPath: string,
  statusPath: string,
  timeoutMs: number,
  pollMs = 4000
): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const [hasReceipt, hasStatus] = await Promise.all([
      fileExists(receiptPath),
      fileExists(statusPath),
    ]);

    if (hasReceipt && hasStatus) {
      return true;
    }

    await Bun.sleep(pollMs);
  }

  return false;
}

function requiredInputPaths(options: RunOptions): string[] {
  const entries: string[] = [];

  if (options.inputs.epicPath) entries.push(`epic: ${options.inputs.epicPath}`);
  if (options.inputs.techDesignPath) {
    entries.push(`tech-design: ${options.inputs.techDesignPath}`);
  }
  if (options.inputs.storyPath) entries.push(`story: ${options.inputs.storyPath}`);
  if (options.inputs.requirementsPath) {
    entries.push(`requirements: ${options.inputs.requirementsPath}`);
  }
  if (options.inputs.stories && options.inputs.stories.length > 0) {
    entries.push(`stories: ${options.inputs.stories.join(", ")}`);
  }

  return entries;
}

function createEscalationId(phaseId: string, attempt: number): string {
  const stamp = nowIso().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${stamp}-${phaseId}-attempt-${attempt}`;
}

async function resolveUserResponseText(options: RunOptions): Promise<string | undefined> {
  if (options.userResponseText && options.userResponseFile) {
    throw new Error("Provide either --user-response or --user-response-file, not both.");
  }

  if (options.userResponseText) {
    return options.userResponseText.trim();
  }

  if (options.userResponseFile) {
    return (await readFile(resolve(options.userResponseFile), "utf8")).trim();
  }

  return undefined;
}

function escalationPaths(escalationsDir: string, escalationId: string): EscalationContext {
  return {
    escalationId,
    requestPath: resolve(escalationsDir, `${escalationId}-request.md`),
    responsePath: resolve(escalationsDir, `${escalationId}-response.md`),
  };
}

async function openEscalation(params: {
  runState: RunState;
  phase: PhaseDefinition;
  attempt: number;
  summary: string;
  detail: string[];
  layout: ReturnType<typeof getRunLayout>;
  executor: CommandExecutor;
}): Promise<void> {
  const escalationId = createEscalationId(params.phase.id, params.attempt);
  const paths = escalationPaths(params.layout.escalationsDir, escalationId);
  const resumeCommand = `bun run orchestrate:resume -- --run-id ${params.runState.runId} --user-response \"<answer>\"`;

  const requestBody = [
    `# Escalation Request`,
    ``,
    `- run_id: ${params.runState.runId}`,
    `- flow: ${params.runState.flowId}`,
    `- phase: ${params.phase.id}`,
    `- attempt: ${params.attempt}`,
    `- created_at: ${nowIso()}`,
    ``,
    `## Summary`,
    params.summary,
    ``,
    `## Details`,
    ...params.detail,
    ``,
    `## Resume`,
    `Run after deciding:`,
    `\`${resumeCommand}\``,
  ].join("\n");

  await writeText(paths.requestPath, `${requestBody}\n`);
  setWaitingForUser(params.runState, escalationId);

  await appendLog(
    params.layout.escalationLogPath,
    [
      `### ${nowIso()} — escalation opened`,
      `escalation_id: ${escalationId}`,
      `phase: ${params.phase.id}`,
      `attempt: ${params.attempt}`,
      `summary: ${params.summary}`,
      `request_path: ${paths.requestPath}`,
    ].join("\n")
  );

  const sms = await sendEscalationSms(
    {
      runId: params.runState.runId,
      phaseId: params.phase.id,
      attempt: params.attempt,
      summary: params.summary,
      resumeCommand,
    },
    params.executor
  );

  await appendLog(
    params.layout.escalationLogPath,
    [
      `### ${nowIso()} — escalation notification`,
      `sms_sent: ${sms.sent ? "yes" : "no"}`,
      `sms_reason: ${sms.reason}`,
      sms.sid ? `sms_sid: ${sms.sid}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  );

  console.error("========================================");
  console.error("ESCALATION REQUIRED");
  console.error(`run_id=${params.runState.runId}`);
  console.error(`phase=${params.phase.id} attempt=${params.attempt}`);
  console.error(`request=${paths.requestPath}`);
  console.error(`resume=${resumeCommand}`);
  console.error("========================================");
}

async function resolvePendingEscalationOnResume(params: {
  runState: RunState;
  layout: ReturnType<typeof getRunLayout>;
  options: RunOptions;
}): Promise<void> {
  if (params.runState.status !== "waiting_user") {
    return;
  }

  const response = await resolveUserResponseText(params.options);
  if (!response) {
    throw new Error(
      `Run ${params.runState.runId} is waiting_user. Resume requires --user-response or --user-response-file.`
    );
  }

  const escalationId = params.runState.pendingEscalationId;
  if (!escalationId) {
    throw new Error(
      `Run ${params.runState.runId} is waiting_user but pendingEscalationId is missing.`
    );
  }

  const paths = escalationPaths(params.layout.escalationsDir, escalationId);
  const responseBody = [
    `# Escalation Response`,
    ``,
    `- escalation_id: ${escalationId}`,
    `- responded_at: ${nowIso()}`,
    ``,
    response,
  ].join("\n");

  await writeText(paths.responsePath, `${responseBody}\n`);
  clearWaitingForUser(params.runState);
  setRunStatus(params.runState, "running");

  await appendLog(
    params.layout.escalationLogPath,
    [
      `### ${nowIso()} — escalation resolved`,
      `escalation_id: ${escalationId}`,
      `response_path: ${paths.responsePath}`,
    ].join("\n")
  );
}

async function renderPhasePrompt(
  phase: PhaseDefinition,
  runState: RunState,
  attempt: number,
  paths: ReturnType<typeof getPhaseAttemptPaths>,
  options: RunOptions,
  flow: FlowDefinition
): Promise<string> {
  const templatePath = resolve(import.meta.dir, "../..", phase.promptTemplatePath);
  const template = await readFile(templatePath, "utf8");

  const replacements: Record<string, string> = {
    "{{RUN_ID}}": runState.runId,
    "{{FLOW_ID}}": runState.flowId,
    "{{PHASE_ID}}": phase.id,
    "{{PHASE_TITLE}}": phase.title,
    "{{ATTEMPT}}": String(attempt),
    "{{CWD}}": runState.cwd,
    "{{RECEIPT_PATH}}": paths.receiptPath,
    "{{STATUS_PATH}}": paths.statusPath,
    "{{STDOUT_PATH}}": paths.stdoutPath,
    "{{STDERR_PATH}}": paths.stderrPath,
    "{{REQUIRED_MILESTONES}}": phase.requiredMilestones.join(", "),
    "{{INPUT_ARTIFACTS}}": requiredInputPaths(options).join("\n") || "none",
    "{{FLOW_PHASES}}": flow.phases.map((item) => item.id).join(" -> "),
  };

  let rendered = template;
  for (const [token, value] of Object.entries(replacements)) {
    rendered = rendered.split(token).join(value);
  }

  const inlinedSkillBundle = await buildInlinedSkillBundle(
    runState.flowId,
    phase.id
  );

  return [
    rendered.trimEnd(),
    "",
    "---",
    "",
    "## Inlined Skill Content",
    "",
    inlinedSkillBundle,
    "",
    "---",
    "",
    "## Escalation Routing Contract",
    "",
    "If the phase executor encounters a contradiction, question, or blocker:",
    "1. Record it explicitly in receipt/status artifacts.",
    "2. Raise it to Codex supervisor at phase boundary.",
    "3. Codex supervisor resolves directly when possible; otherwise escalate to user.",
  ].join("\n");
}

async function writePhaseCallScript(
  scriptPath: string,
  commandBody: string
): Promise<void> {
  const script = `#!/bin/zsh\n${commandBody}\n`;
  await writeText(scriptPath, script);
  await chmod(scriptPath, 0o755);
}

async function executeLivePhase(params: {
  effectiveTerminal: EffectiveTerminal;
  runState: RunState;
  phase: PhaseDefinition;
  attempt: number;
  paths: ReturnType<typeof getPhaseAttemptPaths>;
  executor: CommandExecutor;
  artifactTimeoutMs: number;
  processRefinementLogPath: string;
}): Promise<void> {
  const { effectiveTerminal, runState, phase, attempt, paths, executor } = params;

  if (effectiveTerminal.useTmux) {
    const sessionName = `${runState.runId}-${phase.id}-${attempt}`
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 64);

    try {
      const notes = await launchWithTmux(
        {
          sessionName,
          cwd: runState.cwd,
          callScriptPath: paths.callScriptPath,
          attachInITerm2: true,
          remoteControlBestEffort: true,
        },
        executor
      );

      if (notes.length > 0) {
        await appendLog(
          params.processRefinementLogPath,
          [`### ${nowIso()} — tmux launch notes`, ...notes].join("\n")
        );
      }

      const exited = await waitForTmuxSessionExit(
        sessionName,
        runState.cwd,
        executor,
        params.artifactTimeoutMs
      );

      if (!exited) {
        throw new Error(`tmux session '${sessionName}' did not exit before timeout.`);
      }
    } catch (error) {
      await appendLog(
        params.processRefinementLogPath,
        [
          `### ${nowIso()} — tmux fallback`,
          `tmux+iTerm2 path failed; falling back to non-tmux execution.`,
          `Reason: ${error instanceof Error ? error.message : String(error)}`,
        ].join("\n")
      );

      await launchWithoutTmux("none", paths.callScriptPath, runState.cwd, executor);
    }
  } else {
    await launchWithoutTmux(
      effectiveTerminal.effective,
      paths.callScriptPath,
      runState.cwd,
      executor
    );
  }

  const artifactsReady = await waitForRequiredArtifacts(
    paths.receiptPath,
    paths.statusPath,
    params.artifactTimeoutMs
  );

  if (!artifactsReady) {
    throw new Error(
      `Required phase artifacts not ready before timeout: ${basename(paths.receiptPath)}, ${basename(paths.statusPath)}`
    );
  }
}

async function loadDryRunScenario(path: string | undefined): Promise<DryRunScenario> {
  if (!path) {
    throw new Error("--dry-run requires --dry-run-scenario <path>");
  }

  const parsed = JSON.parse(await readFile(resolve(path), "utf8"));
  return DryRunScenarioSchema.parse(parsed);
}

function findScenarioDecision(
  scenario: DryRunScenario,
  phaseId: string,
  attempt: number
): { decision: Decision; note?: string } {
  const match = scenario.phases.find(
    (entry) => entry.phaseId === phaseId && entry.attempt === attempt
  );

  if (!match) {
    return {
      decision: "approve",
      note: "No explicit dry-run scenario entry found; defaulted to approve.",
    };
  }

  return { decision: match.decision, note: match.note };
}

async function simulateDryRunArtifacts(params: {
  phase: PhaseDefinition;
  paths: ReturnType<typeof getPhaseAttemptPaths>;
  attempt: number;
  decision: Decision;
  note?: string;
}): Promise<void> {
  const done = params.decision === "approve";
  const blocked = params.decision === "escalate";

  const status: PhaseStatusFile = {
    phaseId: params.phase.id,
    status: done ? "DONE" : blocked ? "BLOCKED" : "NEEDS_REWORK",
    codexEvidenceRef: done ? `dry-run-evidence-${params.phase.id}-${params.attempt}` : undefined,
    unresolvedFindings: done
      ? [{ id: "dryrun-1", title: "Residual audit item", disposition: "accepted-risk" }]
      : [{ id: "dryrun-blocker", title: "Dry-run blocker", disposition: "defer" }],
    milestones: done ? params.phase.requiredMilestones : params.phase.requiredMilestones.slice(0, -1),
    notes: params.note || `Dry-run simulated ${params.decision} outcome.`,
  };

  const receipt = [
    `# Dry Run Receipt — ${params.phase.id} attempt ${params.attempt}`,
    `Decision simulation: ${params.decision}`,
    `Codex evidence reference: ${status.codexEvidenceRef || "missing"}`,
    `Top findings: ${status.unresolvedFindings?.map((item) => item.title).join(", ") || "none"}`,
    `Gate summary: simulated`,
    `Open risks: ${done ? "none" : "dry-run unresolved risk"}`,
  ].join("\n\n");

  await Promise.all([
    writeText(params.paths.statusPath, `${JSON.stringify(status, null, 2)}\n`),
    writeText(params.paths.receiptPath, `${receipt}\n`),
    writeText(
      params.paths.stdoutPath,
      `Dry-run: no phase executor process launched for ${params.phase.id} attempt ${params.attempt}.\n`
    ),
    writeText(params.paths.stderrPath, ""),
  ]);
}

async function maybeCommitPhase(params: {
  runState: RunState;
  phase: PhaseDefinition;
  paths: ReturnType<typeof getPhaseAttemptPaths>;
  dryRun: boolean;
  supervisorLogPath: string;
  executor: CommandExecutor;
}): Promise<{ escalated: boolean }> {
  if (!params.phase.commitMessageTemplate) {
    return { escalated: false };
  }

  const commitMessage = params.phase.commitMessageTemplate;

  if (params.dryRun) {
    await appendLog(
      params.supervisorLogPath,
      [
        `### ${nowIso()} — Dry-run commit intent`,
        `Would run supervisor commit with message: ${commitMessage}`,
      ].join("\n")
    );

    return { escalated: false };
  }

  const commitResult = await runPhaseCommit(
    {
      cwd: params.runState.cwd,
      commitMessage,
      commitPromptPath: params.paths.commitPromptPath,
      commitOutPath: params.paths.commitOutPath,
      commitStdoutPath: params.paths.commitStdoutPath,
      commitStderrPath: params.paths.commitStderrPath,
      supervisorLogPath: params.supervisorLogPath,
    },
    params.executor
  );

  return { escalated: commitResult.status === "failed" };
}

export async function runOrchestration(
  options: RunOptions,
  deps: LoopDependencies = {}
): Promise<RunState> {
  const executor = deps.executor ?? new BunCommandExecutor();
  const artifactTimeoutMs = deps.artifactTimeoutMs ?? 45 * 60 * 1000;

  const runId = options.runId || createRunId(options.flowId);
  const layout = await ensureRunLayout(runId);

  const configPath = resolve(layout.stateDir, "run-config.json");

  let runState: RunState;
  let phaseLedger: PhaseLedger;
  let flow: FlowDefinition;

  if (options.resume) {
    runState = await loadRunState(layout.runStatePath);
    phaseLedger = await loadPhaseLedger(layout.phaseLedgerPath);
    flow = getFlowDefinition(runState.flowId);
    await resolvePendingEscalationOnResume({ runState, layout, options });
    await saveRunState(layout.runStatePath, runState);
  } else {
    runState = createInitialRunState({
      runId,
      flowId: options.flowId,
      cwd: options.cwd,
      dryRun: options.dryRun,
    });

    phaseLedger = createEmptyPhaseLedger();
    flow = getFlowDefinition(options.flowId);

    const runConfig: RunConfig = {
      flowId: options.flowId,
      cwd: options.cwd,
      terminalMode: options.terminalMode,
      dryRun: options.dryRun,
      entryPoint: options.entryPoint,
      inputs: options.inputs,
      maxReworks: options.maxReworks,
    };

    if (options.entryPoint) {
      const phaseIndex = flow.phases.findIndex(
        (phase) => phase.id === options.entryPoint
      );
      if (phaseIndex < 0) {
        throw new Error(
          `Invalid entry point '${options.entryPoint}' for flow '${options.flowId}'.`
        );
      }
      runState.currentPhaseIndex = phaseIndex;
    }

    await writeText(configPath, `${JSON.stringify(runConfig, null, 2)}\n`);
    await appendLog(
      layout.decisionLogPath,
      [`# Decision Log`, `Run ${runId} started at ${nowIso()}`, `Flow: ${options.flowId}`].join(
        "\n"
      )
    );
    await appendLog(
      layout.processRefinementLogPath,
      [`# Process Refinement Log`, `Run ${runId} started at ${nowIso()}`].join("\n")
    );
    await appendLog(
      layout.supervisorLogPath,
      [`# Supervisor Log`, `Run ${runId} started at ${nowIso()}`].join("\n")
    );
    await saveRunState(layout.runStatePath, runState);
    await savePhaseLedger(layout.phaseLedgerPath, phaseLedger);
  }

  const effectiveTerminal = await detectTerminalMode(options.terminalMode, executor);
  await appendLog(
    layout.processRefinementLogPath,
    [
      `### ${nowIso()} — terminal mode`,
      `requested: ${options.terminalMode}`,
      `effective: ${effectiveTerminal.effective}`,
      `tmux enabled: ${effectiveTerminal.useTmux ? "yes" : "no"}`,
    ].join("\n")
  );

  const dryRunScenario = options.dryRun
    ? await loadDryRunScenario(options.dryRunScenarioPath)
    : undefined;

  while (
    runState.currentPhaseIndex < flow.phases.length &&
    runState.status === "running"
  ) {
    const phase = flow.phases[runState.currentPhaseIndex];
    const attempt = incrementAttempt(runState, phase.id);
    const phaseAttemptKey = `${phase.id}#${attempt}`;
    beginPhaseAttemptToken(runState, phaseAttemptKey);

    const paths = getPhaseAttemptPaths(layout.phaseDir, phase.id, attempt);
    await ensurePhaseAttemptDir(paths.phaseAttemptDir);

    const prompt = await renderPhasePrompt(
      phase,
      runState,
      attempt,
      paths,
      options,
      flow
    );
    await writeText(paths.promptPath, `${prompt}\n`);

    const phaseCommandBody = buildClaudePhaseCommand({
      cwd: runState.cwd,
      promptPath: paths.promptPath,
      stdoutPath: paths.stdoutPath,
      stderrPath: paths.stderrPath,
    });
    await writePhaseCallScript(paths.callScriptPath, phaseCommandBody);

    let phaseStatus: PhaseStatusFile | undefined;
    let decision: SupervisorDecision;

    if (options.dryRun) {
      const scenarioDecision = findScenarioDecision(dryRunScenario!, phase.id, attempt);
      await simulateDryRunArtifacts({
        phase,
        paths,
        attempt,
        decision: scenarioDecision.decision,
        note: scenarioDecision.note,
      });

      phaseStatus = await readStatusFile(paths.statusPath);
      const gateReport = evaluateGates({
        phase,
        statusFile: phaseStatus,
        hasReceipt: true,
        hasStatusFile: true,
      });

      decision = {
        decision: scenarioDecision.decision,
        rationale: scenarioDecision.note || "Dry-run scenario decision.",
        useExceptionToken: false,
        note: scenarioDecision.note,
      };

      decision = normalizeDecisionAgainstGates(decision, gateReport);
      if (phaseStatus?.requiresUserDecision && decision.decision !== "escalate") {
        decision = {
          decision: "escalate",
          rationale:
            "Phase status marked requiresUserDecision=true; explicit human decision is required.",
          useExceptionToken: false,
          note: phaseStatus.supervisorResolutionHint,
        };
      }

      await appendLog(
        layout.supervisorLogPath,
        [
          `### ${nowIso()} — Dry-run supervisor decision (${phase.id} attempt ${attempt})`,
          `Decision: ${decision.decision}`,
          `Rationale: ${decision.rationale}`,
        ].join("\n")
      );

      const statusValue = phaseStatus?.status || "NEEDS_REWORK";
      appendPhaseAttempt(phaseLedger, phase.id, {
        attempt,
        decision: decision.decision,
        status: statusValue,
        hardBlockers: gateReport.hardBlockers,
        softWarnings: gateReport.softWarnings,
        note: scenarioDecision.note,
        timestamp: nowIso(),
      });

      await appendLog(
        layout.decisionLogPath,
        [
          `### ${nowIso()} — ${phase.id} attempt ${attempt}`,
          `Decision: ${decision.decision}`,
          `Status: ${statusValue}`,
          `Hard blockers: ${gateReport.hardBlockers.length}`,
          `Soft warnings: ${gateReport.softWarnings.length}`,
          scenarioDecision.note ? `Scenario note: ${scenarioDecision.note}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      );

      if (decision.decision === "approve") {
        const commitResult = await maybeCommitPhase({
          runState,
          phase,
          paths,
          dryRun: true,
          supervisorLogPath: layout.supervisorLogPath,
          executor,
        });

        if (commitResult.escalated) {
          await openEscalation({
            runState,
            phase,
            attempt,
            summary: "Supervisor commit step failed after approval.",
            detail: [commitResult.escalated ? "commit_result=failed" : "commit_result=unknown"],
            layout,
            executor,
          });
        } else {
          runState.currentPhaseIndex += 1;
          clearExceptionToken(runState);
        }
      } else if (decision.decision === "rework") {
        const maxAttempts = options.maxReworks + 1;
        if (attempt >= maxAttempts) {
          await openEscalation({
            runState,
            phase,
            attempt,
            summary: `Phase '${phase.id}' exceeded max attempts (${maxAttempts}).`,
            detail: [
              "Supervisor exhausted automatic rework limit.",
              "Human direction required to continue.",
            ],
            layout,
            executor,
          });
          await appendLog(
            layout.processRefinementLogPath,
            [
              `### ${nowIso()} — escalation`,
              `Phase '${phase.id}' exceeded max attempts (${maxAttempts}).`,
            ].join("\n")
          );
        }
      } else {
        await openEscalation({
          runState,
          phase,
          attempt,
          summary: "Supervisor escalated phase decision.",
          detail: [decision.rationale],
          layout,
          executor,
        });
      }

      await saveRunState(layout.runStatePath, runState);
      await savePhaseLedger(layout.phaseLedgerPath, phaseLedger);
      continue;
    }

    try {
      await executeLivePhase({
        effectiveTerminal,
        runState,
        phase,
        attempt,
        paths,
        executor,
        artifactTimeoutMs,
        processRefinementLogPath: layout.processRefinementLogPath,
      });
    } catch (error) {
      await appendLog(
        layout.processRefinementLogPath,
        [
          `### ${nowIso()} — phase execution failure`,
          `Phase: ${phase.id}`,
          `Attempt: ${attempt}`,
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        ].join("\n")
      );
    }

    phaseStatus = await readStatusFile(paths.statusPath);
    const hasReceipt = await fileExists(paths.receiptPath);
    const hasStatusFile = await fileExists(paths.statusPath);
    const gateReport = evaluateGates({
      phase,
      statusFile: phaseStatus,
      hasReceipt,
      hasStatusFile,
    });

    let receiptText = "";
    if (hasReceipt) {
      receiptText = await readFile(paths.receiptPath, "utf8");
    }

    try {
      decision = await decidePhase(
        {
          cwd: runState.cwd,
          phase,
          attempt,
          gateReport,
          phaseStatus,
          receiptText,
          supervisorPromptPath: paths.supervisorPromptPath,
          supervisorOutPath: paths.supervisorOutPath,
          supervisorStdoutPath: paths.supervisorStdoutPath,
          supervisorStderrPath: paths.supervisorStderrPath,
          supervisorLogPath: layout.supervisorLogPath,
        },
        executor
      );
    } catch (error) {
      decision = {
        decision: "escalate",
        rationale: `Supervisor execution failed: ${error instanceof Error ? error.message : String(error)}`,
        useExceptionToken: false,
      };
    }

    decision = normalizeDecisionAgainstGates(decision, gateReport);
    if (phaseStatus?.requiresUserDecision && decision.decision !== "escalate") {
      decision = {
        decision: "escalate",
        rationale:
          "Phase status marked requiresUserDecision=true; explicit human decision is required.",
        useExceptionToken: false,
        note: phaseStatus.supervisorResolutionHint,
      };
    }

    let usedExceptionToken = false;
    if (decision.useExceptionToken) {
      usedExceptionToken = consumeExceptionToken(runState);
      if (!usedExceptionToken) {
        decision = {
          decision: "escalate",
          rationale:
            "Supervisor requested exception token but token was unavailable for this phase attempt.",
          useExceptionToken: false,
        };
      }
    }

    if (
      decision.decision === "approve" &&
      gateReport.hardBlockers.length > 0 &&
      !usedExceptionToken
    ) {
      decision = {
        decision: "rework",
        rationale:
          "Cannot approve with unresolved hard blockers unless exception token is consumed.",
        useExceptionToken: false,
      };
    }

    const statusValue = phaseStatus?.status || "NEEDS_REWORK";
    appendPhaseAttempt(phaseLedger, phase.id, {
      attempt,
      decision: decision.decision,
      status: statusValue,
      hardBlockers: gateReport.hardBlockers,
      softWarnings: gateReport.softWarnings,
      note: decision.note,
      usedExceptionToken,
      timestamp: nowIso(),
    });

    await appendLog(
      layout.decisionLogPath,
      [
        `### ${nowIso()} — ${phase.id} attempt ${attempt}`,
        `Decision: ${decision.decision}`,
        `Status: ${statusValue}`,
        `Rationale: ${decision.rationale}`,
        `Exception token used: ${usedExceptionToken ? "yes" : "no"}`,
        gateReport.hardBlockers.length > 0
          ? `Hard blockers:\n${gateReport.hardBlockers.map((item) => `- ${item}`).join("\n")}`
          : "Hard blockers: none",
        gateReport.softWarnings.length > 0
          ? `Soft warnings:\n${gateReport.softWarnings.map((item) => `- ${item}`).join("\n")}`
          : "Soft warnings: none",
      ].join("\n")
    );

    if (decision.decision === "approve") {
      const commitResult = await maybeCommitPhase({
        runState,
        phase,
        paths,
        dryRun: false,
        supervisorLogPath: layout.supervisorLogPath,
        executor,
      });

      if (commitResult.escalated) {
        await openEscalation({
          runState,
          phase,
          attempt,
          summary: "Supervisor commit step failed after approval.",
          detail: ["Commit stage failed and needs user decision."],
          layout,
          executor,
        });
      } else {
        runState.currentPhaseIndex += 1;
        clearExceptionToken(runState);
      }
    } else if (decision.decision === "rework") {
      const maxAttempts = options.maxReworks + 1;
      if (attempt >= maxAttempts) {
        await openEscalation({
          runState,
          phase,
          attempt,
          summary: `Phase '${phase.id}' exceeded max attempts (${maxAttempts}).`,
          detail: [
            "Supervisor exhausted automatic rework limit.",
            "Human direction required to continue.",
          ],
          layout,
          executor,
        });
        await appendLog(
          layout.processRefinementLogPath,
          [
            `### ${nowIso()} — escalation`,
            `Phase '${phase.id}' exceeded max attempts (${maxAttempts}).`,
          ].join("\n")
        );
      }
    } else {
      await openEscalation({
        runState,
        phase,
        attempt,
        summary: "Supervisor escalated phase decision.",
        detail: [decision.rationale],
        layout,
        executor,
      });
    }

    await saveRunState(layout.runStatePath, runState);
    await savePhaseLedger(layout.phaseLedgerPath, phaseLedger);
  }

  if (runState.status === "running") {
    setRunStatus(runState, "completed");
    await appendLog(
      layout.decisionLogPath,
      `### ${nowIso()} — run completed\nFlow '${runState.flowId}' completed all phases.`
    );
    await saveRunState(layout.runStatePath, runState);
  }

  return runState;
}

export async function loadResumeOptions(runId: string): Promise<RunOptions> {
  const layout = getRunLayout(runId);
  const runState = await loadRunState(layout.runStatePath);
  const configRaw = JSON.parse(await readFile(resolve(layout.stateDir, "run-config.json"), "utf8")) as RunConfig;

  return {
    flowId: runState.flowId,
    cwd: runState.cwd,
    runId,
    dryRun: runState.dryRun,
    dryRunScenarioPath: undefined,
    terminalMode: configRaw.terminalMode as RunOptions["terminalMode"],
    inputs: (configRaw.inputs || {}) as RunOptions["inputs"],
    entryPoint: configRaw.entryPoint,
    resume: true,
    maxReworks: Number(configRaw.maxReworks) || 2,
    userResponseText: undefined,
    userResponseFile: undefined,
  };
}

export function summarizeRunResult(runState: RunState): string {
  return [
    `run_id=${runState.runId}`,
    `flow=${runState.flowId}`,
    `status=${runState.status}`,
    `current_phase_index=${runState.currentPhaseIndex}`,
  ].join(" ");
}

export async function writeScenarioTemplate(path: string): Promise<void> {
  const template = {
    phases: [
      {
        phaseId: "impl-prep",
        attempt: 1,
        decision: "rework",
        note: "Example scenario entry",
      },
      {
        phaseId: "impl-prep",
        attempt: 2,
        decision: "approve",
      },
    ],
  };

  await writeText(path, `${JSON.stringify(template, null, 2)}\n`);
}

export function buildPhaseCommandPreview(paths: ReturnType<typeof getPhaseAttemptPaths>): string {
  return `zsh ${quote(paths.callScriptPath)}`;
}
