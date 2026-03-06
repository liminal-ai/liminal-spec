import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getFlowDefinition } from "../flows";
import { evaluateGates } from "./gates";
import {
  fileExists,
  getPhaseAttemptPaths,
  getRunLayout,
  loadPhaseLedger,
  loadRunState,
  readText,
  type PhaseLedger,
  writeText,
} from "./state";
import type {
  PhaseDefinition,
  PhaseStatusFile,
  PhaseAttemptRecord,
  RunState,
} from "../types";

interface RunConfigFile {
  flowId: string;
  cwd: string;
  terminalMode: string;
  dryRun: boolean;
  entryPoint?: string;
  inputs: Record<string, unknown>;
  maxReworks: number;
}

interface Block {
  heading: string;
  body: string;
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];

  let currentHeading = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    if (line.startsWith("### ")) {
      if (currentHeading) {
        blocks.push({ heading: currentHeading, body: currentBody.join("\n").trim() });
      }

      currentHeading = line.slice(4).trim();
      currentBody = [];
      continue;
    }

    if (currentHeading) {
      currentBody.push(line);
    }
  }

  if (currentHeading) {
    blocks.push({ heading: currentHeading, body: currentBody.join("\n").trim() });
  }

  return blocks;
}

function pickBlock(
  blocks: Block[],
  phaseId: string,
  attempt: number
): Block | undefined {
  const key = `${phaseId} attempt ${attempt}`;
  return blocks.find((block) => block.heading.includes(key));
}

function toBoolPass(value: boolean): string {
  return value ? "PASS" : "FAIL";
}

function truncate(content: string, maxLines: number): string {
  const lines = content.split(/\r?\n/);
  if (lines.length <= maxLines) {
    return content;
  }

  return `${lines.slice(0, maxLines).join("\n")}\n... (truncated ${lines.length - maxLines} lines)`;
}

function codeFence(language: string, content: string): string {
  return ["```" + language, content.trimEnd(), "```"].join("\n");
}

function link(label: string, path: string): string {
  return `[${label}](${path})`;
}

function stringifyInputArtifacts(inputs: Record<string, unknown>): string[] {
  const entries: string[] = [];

  const simpleKeys = [
    "epicPath",
    "techDesignPath",
    "storyPath",
    "requirementsPath",
  ] as const;

  for (const key of simpleKeys) {
    const value = inputs[key];
    if (typeof value === "string" && value.trim()) {
      entries.push(`- ${key}: ${value}`);
    }
  }

  const stories = inputs.stories;
  if (Array.isArray(stories) && stories.length > 0) {
    entries.push(`- stories: ${stories.join(", ")}`);
  }

  return entries;
}

function phaseOutcomeNarrative(attemptRecord: PhaseAttemptRecord): string {
  if (attemptRecord.decision === "approve") {
    return "Supervisor approved this phase attempt, allowing transition to the next phase.";
  }

  if (attemptRecord.decision === "rework") {
    return "Supervisor requested rework, so the same phase will run again on the next attempt.";
  }

  return "Supervisor escalated this attempt, pausing automation for human direction.";
}

function gateChecklist(
  phase: PhaseDefinition,
  statusFile: PhaseStatusFile | undefined,
  hasReceipt: boolean,
  hasStatus: boolean
): string[] {
  const milestones = new Set(statusFile?.milestones || []);
  const unresolved = statusFile?.unresolvedFindings || [];

  const list = [
    `- ${toBoolPass(hasReceipt)} receipt.md exists`,
    `- ${toBoolPass(hasStatus)} status.json exists`,
    `- ${toBoolPass(statusFile?.status === "DONE")} phase status is DONE`,
    `- ${toBoolPass(
      !phase.requiresCodexEvidenceRef || Boolean(statusFile?.codexEvidenceRef)
    )} codex evidence reference present`,
  ];

  for (const milestone of phase.requiredMilestones) {
    list.push(`- ${toBoolPass(milestones.has(milestone))} milestone '${milestone}'`);
  }

  const allDispositionsValid = unresolved.every((item) =>
    ["fixed", "accepted-risk", "defer"].includes(item.disposition)
  );

  list.push(
    `- ${toBoolPass(allDispositionsValid)} unresolved findings dispositions are valid`
  );

  if (statusFile?.requiresUserDecision) {
    list.push(`- FAIL explicit requiresUserDecision=true; human response required`);
  }

  return list;
}

async function readOptional(path: string): Promise<string> {
  if (!(await fileExists(path))) {
    return "";
  }

  return readText(path);
}

async function parseStatus(path: string): Promise<PhaseStatusFile | undefined> {
  if (!(await fileExists(path))) {
    return undefined;
  }

  try {
    return JSON.parse(await readText(path)) as PhaseStatusFile;
  } catch {
    return undefined;
  }
}

export async function writeRunNarrativeReport(params: {
  runId: string;
  outputPath?: string;
  maxPromptExcerptLines?: number;
}): Promise<string> {
  const maxPromptLines = params.maxPromptExcerptLines ?? 100;
  const layout = getRunLayout(params.runId);
  const runState = await loadRunState(layout.runStatePath);
  const phaseLedger = await loadPhaseLedger(layout.phaseLedgerPath);
  const flow = getFlowDefinition(runState.flowId);

  const config = JSON.parse(
    await readFile(resolve(layout.stateDir, "run-config.json"), "utf8")
  ) as RunConfigFile;

  const [decisionLog, supervisorLog, processLog, escalationLog] = await Promise.all([
    readOptional(layout.decisionLogPath),
    readOptional(layout.supervisorLogPath),
    readOptional(layout.processRefinementLogPath),
    readOptional(layout.escalationLogPath),
  ]);

  const decisionBlocks = parseBlocks(decisionLog);
  const supervisorBlocks = parseBlocks(supervisorLog);
  const processBlocks = parseBlocks(processLog);

  const parts: string[] = [];

  parts.push(`# Orchestration Narrative Report`);
  parts.push("");
  parts.push(`Run ID: \`${runState.runId}\``);
  parts.push(`Generated: ${new Date().toISOString()}`);
  parts.push("");

  parts.push(`## Executive Summary`);
  parts.push("");
  parts.push(`- Flow: \`${runState.flowId}\``);
  parts.push(`- Run type: ${config.dryRun ? "Dry run (simulated outcomes)" : "Live run"}`);
  parts.push(`- Status: \`${runState.status}\``);
  parts.push(`- Current phase index: ${runState.currentPhaseIndex}`);
  parts.push(`- Working directory: \`${runState.cwd}\``);
  parts.push(`- Terminal mode requested: \`${config.terminalMode}\``);
  parts.push(`- Entry point: \`${config.entryPoint || "default"}\``);
  parts.push("");

  if (config.dryRun) {
    parts.push(`### Dry-Run Fidelity Notes`);
    parts.push("");
    parts.push(
      "This run simulates phase decisions and process transitions from scenario data. It is accurate for orchestration control flow, artifact wiring, and gate sequencing. It does not execute real model/tool work inside phase executors."
    );
    parts.push("");
  }

  parts.push(`## Inputs and Starting Context`);
  parts.push("");
  const inputLines = stringifyInputArtifacts(config.inputs);
  parts.push(...(inputLines.length > 0 ? inputLines : ["- none provided"]));
  parts.push("");

  parts.push(`## Review Guide`);
  parts.push("");
  parts.push(
    "Read phase sections in order. Each attempt includes: what was asked, what command was prepared/executed, what outputs were produced, how gates were evaluated, and what decision moved the run forward."
  );
  parts.push("");

  parts.push(`## Phase-by-Phase Narrative`);
  parts.push("");

  for (const [phaseIndex, phase] of flow.phases.entries()) {
    const entry = phaseLedger[phase.id];
    parts.push(`### Phase ${phaseIndex + 1}: ${phase.id} (${phase.title})`);
    parts.push("");

    if (!entry || entry.attempts.length === 0) {
      parts.push("No attempts recorded for this phase.");
      parts.push("");
      continue;
    }

    for (const attemptRecord of entry.attempts) {
      const paths = getPhaseAttemptPaths(
        layout.phaseDir,
        phase.id,
        attemptRecord.attempt
      );

      const [promptContent, callContent, receiptContent, statusFile] = await Promise.all([
        readOptional(paths.promptPath),
        readOptional(paths.callScriptPath),
        readOptional(paths.receiptPath),
        parseStatus(paths.statusPath),
      ]);

      const hasReceipt = Boolean(receiptContent.trim());
      const hasStatus = Boolean(statusFile);
      const gateReport = evaluateGates({
        phase,
        statusFile,
        hasReceipt,
        hasStatusFile: hasStatus,
      });

      const decisionBlock = pickBlock(
        decisionBlocks,
        phase.id,
        attemptRecord.attempt
      );
      const supervisorBlock = pickBlock(
        supervisorBlocks,
        phase.id,
        attemptRecord.attempt
      );
      const processBlock = pickBlock(
        processBlocks,
        phase.id,
        attemptRecord.attempt
      );

      parts.push(`#### Attempt ${attemptRecord.attempt}`);
      parts.push("");
      parts.push(`- Timestamp: ${attemptRecord.timestamp}`);
      parts.push(`- Decision: \`${attemptRecord.decision}\``);
      parts.push(`- Status: \`${attemptRecord.status}\``);
      parts.push(`- Outcome narrative: ${phaseOutcomeNarrative(attemptRecord)}`);
      parts.push("");

      parts.push(`##### Gate Criteria Evaluation (ordered)`);
      parts.push("");
      parts.push(...gateChecklist(phase, statusFile, hasReceipt, hasStatus));
      parts.push("");

      parts.push(`##### Gate Result Summary`);
      parts.push("");
      parts.push(`- Hard blockers: ${gateReport.hardBlockers.length}`);
      for (const item of gateReport.hardBlockers) {
        parts.push(`  - ${item}`);
      }
      parts.push(`- Soft warnings: ${gateReport.softWarnings.length}`);
      for (const item of gateReport.softWarnings) {
        parts.push(`  - ${item}`);
      }
      parts.push("");

      parts.push(`##### What Was Passed Into This Attempt`);
      parts.push("");
      parts.push(`- Prompt file: ${link("prompt.md", paths.promptPath)}`);
      parts.push(`- Call script: ${link("call.sh", paths.callScriptPath)}`);
      parts.push(`- Receipt output: ${link("receipt.md", paths.receiptPath)}`);
      parts.push(`- Status output: ${link("status.json", paths.statusPath)}`);
      parts.push(`- Stdout log: ${link("stdout.log", paths.stdoutPath)}`);
      parts.push(`- Stderr log: ${link("stderr.log", paths.stderrPath)}`);
      parts.push("");

      parts.push(`<details><summary>Prompt excerpt (click to expand)</summary>`);
      parts.push("");
      parts.push(codeFence("md", truncate(promptContent || "(missing prompt)", maxPromptLines)));
      parts.push("");
      parts.push(`</details>`);
      parts.push("");

      parts.push(`<details><summary>Call script (click to expand)</summary>`);
      parts.push("");
      parts.push(codeFence("bash", callContent || "(missing call script)"));
      parts.push("");
      parts.push(`</details>`);
      parts.push("");

      parts.push(`<details><summary>Receipt excerpt (click to expand)</summary>`);
      parts.push("");
      parts.push(codeFence("md", truncate(receiptContent || "(missing receipt)", 80)));
      parts.push("");
      parts.push(`</details>`);
      parts.push("");

      parts.push(`<details><summary>Status JSON (click to expand)</summary>`);
      parts.push("");
      parts.push(
        codeFence(
          "json",
          statusFile ? JSON.stringify(statusFile, null, 2) : "(missing status.json)"
        )
      );
      parts.push("");
      parts.push(`</details>`);
      parts.push("");

      parts.push(`##### Decision and Feedback Trace`);
      parts.push("");
      if (decisionBlock) {
        parts.push(`- Decision log block:`);
        parts.push(codeFence("md", `### ${decisionBlock.heading}\n\n${decisionBlock.body}`));
      } else {
        parts.push(`- Decision log block: not found`);
      }

      if (supervisorBlock) {
        parts.push(`- Supervisor log block:`);
        parts.push(
          codeFence("md", `### ${supervisorBlock.heading}\n\n${supervisorBlock.body}`)
        );
      } else {
        parts.push(`- Supervisor log block: not found`);
      }

      if (processBlock) {
        parts.push(`- Process refinement block:`);
        parts.push(codeFence("md", `### ${processBlock.heading}\n\n${processBlock.body}`));
      }

      parts.push("");
    }
  }

  if (escalationLog.trim()) {
    parts.push(`## Escalation Narrative`);
    parts.push("");
    parts.push(`Escalation log: ${link("escalation-log.md", layout.escalationLogPath)}`);
    parts.push("");
    parts.push(codeFence("md", escalationLog));
    parts.push("");
  }

  parts.push(`## Drill-Down Index`);
  parts.push("");
  parts.push(`- Run state: ${link("run-state.json", layout.runStatePath)}`);
  parts.push(`- Phase ledger: ${link("phase-ledger.json", layout.phaseLedgerPath)}`);
  parts.push(`- Decision log: ${link("decision-log.md", layout.decisionLogPath)}`);
  parts.push(
    `- Process refinement log: ${link(
      "process-refinement-log.md",
      layout.processRefinementLogPath
    )}`
  );
  parts.push(`- Supervisor log: ${link("supervisor-log.md", layout.supervisorLogPath)}`);
  if (await fileExists(layout.escalationLogPath)) {
    parts.push(`- Escalation log: ${link("escalation-log.md", layout.escalationLogPath)}`);
  }
  parts.push("");

  const outputPath = params.outputPath
    ? resolve(params.outputPath)
    : resolve(layout.runRoot, "review", "orchestration-report.md");

  await writeText(outputPath, `${parts.join("\n").trim()}\n`);
  return outputPath;
}
