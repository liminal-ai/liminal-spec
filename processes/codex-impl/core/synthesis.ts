import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { validateReportMarkdown } from "./report-contracts";
import type { PrimitiveSlug, PrimitiveStatusRecord, UnresolvedFinding } from "./state";

const UnresolvedFindingSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  disposition: z.enum(["fixed", "accepted-risk", "defer"]),
  severity: z.enum(["CRITICAL", "MAJOR", "MINOR", "INFO"]).optional(),
});

const PrimitiveModelOutputSchema = z.object({
  processType: z.literal("codex-impl"),
  primitiveSlug: z.string().min(1),
  storyId: z.string().min(1).optional(),
  featureVerification: z.boolean().optional(),
  status: z.enum(["DONE", "NEEDS_REWORK", "BLOCKED"]),
  codexEvidenceRef: z.string().min(1),
  reportMarkdown: z.string().min(1),
  milestones: z.array(z.string()),
  unresolvedFindings: z.array(UnresolvedFindingSchema),
  notes: z.string(),
  requiresUserDecision: z.boolean(),
  nextRecommendedAction: z.string().min(1),
  gateResultSummary: z.string().optional(),
});

const SynthesisModelOutputSchema = PrimitiveModelOutputSchema.extend({
  decision: z.enum(["PASS", "REVISE", "BLOCK"]),
});

const PersistedPrimitiveStatusSchema = PrimitiveModelOutputSchema.omit({
  reportMarkdown: true,
}).extend({
  primitiveSlug: z.custom<PrimitiveSlug>(),
  reportRef: z.string().min(1),
  readingJourneyRef: z.string().min(1),
});

const PersistedSynthesisSchema = PersistedPrimitiveStatusSchema.extend({
  decision: z.enum(["PASS", "REVISE", "BLOCK"]),
});

export type ParsedPrimitiveStatus = PrimitiveStatusRecord;

export interface ParsedSynthesisResult extends PrimitiveStatusRecord {
  decision: "PASS" | "REVISE" | "BLOCK";
}

export type PrimitiveModelOutput = z.infer<typeof PrimitiveModelOutputSchema>;
export type SynthesisModelOutput = z.infer<typeof SynthesisModelOutputSchema>;

export async function loadPrimitiveModelOutput(
  path: string
): Promise<PrimitiveModelOutput> {
  const raw = JSON.parse(await readFile(path, "utf8"));
  return PrimitiveModelOutputSchema.parse(raw);
}

export async function loadSynthesisModelOutput(
  path: string
): Promise<SynthesisModelOutput> {
  const raw = JSON.parse(await readFile(path, "utf8"));
  return SynthesisModelOutputSchema.parse(raw);
}

export async function parsePrimitiveStatusFile(
  path: string
): Promise<ParsedPrimitiveStatus> {
  const raw = JSON.parse(await readFile(path, "utf8"));
  return PersistedPrimitiveStatusSchema.parse(raw);
}

export async function parseSynthesisStatusFile(
  path: string
): Promise<ParsedSynthesisResult> {
  const raw = JSON.parse(await readFile(path, "utf8"));
  return PersistedSynthesisSchema.parse(raw);
}

export async function materializeAndPersistPrimitiveResult(params: {
  rawStatusPath: string;
  reportPath: string;
  readingJourneyPath: string;
  allowSynthesisDecision?: boolean;
}): Promise<ParsedPrimitiveStatus | ParsedSynthesisResult> {
  const modelOutput = params.allowSynthesisDecision
    ? await loadSynthesisModelOutput(params.rawStatusPath)
    : await loadPrimitiveModelOutput(params.rawStatusPath);

  const reportErrors = validateReportMarkdown(
    modelOutput.primitiveSlug as PrimitiveSlug,
    modelOutput.reportMarkdown
  );

  if (reportErrors.length > 0) {
    const synthetic = createSyntheticBlockedStatus({
      primitiveSlug: modelOutput.primitiveSlug as PrimitiveSlug,
      storyId: modelOutput.storyId,
      featureVerification: modelOutput.featureVerification,
      codexEvidenceRef: modelOutput.codexEvidenceRef,
      readingJourneyRef: params.readingJourneyPath,
      reportRef: params.reportPath,
      notes: reportErrors.join(" "),
      gateResultSummary: modelOutput.gateResultSummary,
      decision:
        params.allowSynthesisDecision && "decision" in modelOutput
          ? "BLOCK"
          : undefined,
    });
    await writeFile(params.reportPath, modelOutput.reportMarkdown, "utf8");
    await writeFile(params.rawStatusPath, `${JSON.stringify(synthetic, null, 2)}\n`, "utf8");
    return synthetic;
  }

  await writeFile(params.reportPath, modelOutput.reportMarkdown, "utf8");

  const persistedBase = {
    processType: modelOutput.processType,
    primitiveSlug: modelOutput.primitiveSlug as PrimitiveSlug,
    storyId: modelOutput.storyId,
    featureVerification: modelOutput.featureVerification,
    status: modelOutput.status,
    codexEvidenceRef: modelOutput.codexEvidenceRef,
    reportRef: params.reportPath,
    readingJourneyRef: params.readingJourneyPath,
    milestones: modelOutput.milestones,
    unresolvedFindings: modelOutput.unresolvedFindings as UnresolvedFinding[],
    notes: modelOutput.notes,
    requiresUserDecision: modelOutput.requiresUserDecision,
    nextRecommendedAction: modelOutput.nextRecommendedAction,
    gateResultSummary: modelOutput.gateResultSummary,
  };

  const persisted = params.allowSynthesisDecision && "decision" in modelOutput
    ? {
        ...persistedBase,
        decision: modelOutput.decision,
      }
    : persistedBase;

  await writeFile(params.rawStatusPath, `${JSON.stringify(persisted, null, 2)}\n`, "utf8");

  return params.allowSynthesisDecision
    ? PersistedSynthesisSchema.parse(persisted)
    : PersistedPrimitiveStatusSchema.parse(persisted);
}

export async function materializeReceipt(params: {
  path: string;
  heading: string;
  summary: ParsedPrimitiveStatus | ParsedSynthesisResult;
}): Promise<void> {
  const content = [
    `# ${params.heading}`,
    "",
    `- primitive: \`${params.summary.primitiveSlug}\``,
    `- status: \`${params.summary.status}\``,
    "decision" in params.summary
      ? `- decision: \`${params.summary.decision}\``
      : "",
    params.summary.storyId ? `- storyId: \`${params.summary.storyId}\`` : "",
    params.summary.featureVerification ? "- target: `feature-verification`" : "",
    `- codexEvidenceRef: \`${params.summary.codexEvidenceRef}\``,
    `- reportRef: \`${params.summary.reportRef}\``,
    `- readingJourneyRef: \`${params.summary.readingJourneyRef}\``,
    params.summary.gateResultSummary
      ? `- gateResultSummary: ${params.summary.gateResultSummary}`
      : "",
    `- nextRecommendedAction: \`${params.summary.nextRecommendedAction}\``,
    `- requiresUserDecision: \`${params.summary.requiresUserDecision}\``,
    "",
    "## Milestones",
    "",
    ...(params.summary.milestones.length > 0
      ? params.summary.milestones.map((milestone) => `- ${milestone}`)
      : ["- none"]),
    "",
    "## Unresolved Findings",
    "",
    ...formatFindings(params.summary.unresolvedFindings),
    "",
    "## Notes",
    "",
    params.summary.notes || "(none)",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  await writeFile(params.path, content, "utf8");
}

function createSyntheticBlockedStatus(params: {
  primitiveSlug: PrimitiveSlug;
  storyId?: string;
  featureVerification?: boolean;
  codexEvidenceRef: string;
  reportRef: string;
  readingJourneyRef: string;
  notes: string;
  gateResultSummary?: string;
  decision?: "PASS" | "REVISE" | "BLOCK";
}): ParsedPrimitiveStatus | ParsedSynthesisResult {
  const base = {
    processType: "codex-impl" as const,
    primitiveSlug: params.primitiveSlug,
    storyId: params.storyId,
    featureVerification: params.featureVerification,
    status: "BLOCKED" as const,
    codexEvidenceRef: params.codexEvidenceRef,
    reportRef: params.reportRef,
    readingJourneyRef: params.readingJourneyRef,
    milestones: [] as string[],
    unresolvedFindings: [] as UnresolvedFinding[],
    notes: params.notes,
    requiresUserDecision: true,
    nextRecommendedAction: "human_decision_required",
    gateResultSummary: params.gateResultSummary,
  };

  if (params.decision) {
    return {
      ...base,
      decision: params.decision,
    };
  }

  return base;
}

function formatFindings(findings: UnresolvedFinding[]): string[] {
  if (findings.length === 0) {
    return ["- none"];
  }

  return findings.map((finding) => {
    const label = finding.title || finding.id || "finding";
    const severity = finding.severity ? ` (${finding.severity})` : "";
    return `- ${label}${severity} -> ${finding.disposition}`;
  });
}
