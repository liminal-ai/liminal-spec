import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { runCodexExec, type PrimitiveModelProfile } from "./codex-exec";
import { EMBEDDED_PROMPTS, EMBEDDED_SCHEMAS } from "./embedded-assets.generated";
import {
  buildReadingJourneyPlan,
  renderReadingJourney,
  type ReadingJourneyContext,
} from "./reading-journeys";
import {
  buildReportContractInstructions,
  renderPlaceholderReport,
} from "./report-contracts";
import {
  ensureAttemptLayout,
  featureVerificationFileName,
  getFeatureAttemptLayout,
  getVisibleFeatureVerificationDir,
  getVisibleStoryVerificationDir,
  getStoryAttemptLayout,
  storyVerificationFileName,
  type ProcessLayout,
  type PrimitiveAttemptLayout,
} from "./process-layout";
import {
  materializeAndPersistPrimitiveResult,
  materializeReceipt,
  parsePrimitiveStatusFile,
  parseSynthesisStatusFile,
  type ParsedPrimitiveStatus,
  type ParsedSynthesisResult,
} from "./synthesis";
import type {
  FeatureStep,
  PrimitiveSlug,
  PrimitiveStatusRecord,
  StoryStep,
} from "./state";

export interface PrimitiveDefinition {
  slug: PrimitiveSlug;
  profile: PrimitiveModelProfile;
  promptAssetName: keyof typeof EMBEDDED_PROMPTS;
  schemaAssetName: keyof typeof EMBEDDED_SCHEMAS;
}

export interface PrimitiveExecutionContext extends ReadingJourneyContext {
  processLayout: ProcessLayout;
  codexBin?: string;
  heartbeatMs?: number;
  pollIntervalMs?: number;
}

export interface PrimitiveExecutionResult {
  outcome: "success" | "stall" | "error";
  status?: ParsedPrimitiveStatus | ParsedSynthesisResult;
  attemptLayout: PrimitiveAttemptLayout;
  visibleArtifactPath?: string;
  durationMs?: number;
  exitCode?: number | null;
}

export const PRIMITIVE_DEFINITIONS: Record<PrimitiveSlug, PrimitiveDefinition> = {
  "codex54-xhigh-story-implement": {
    slug: "codex54-xhigh-story-implement",
    profile: { model: "gpt-5.4", reasoningEffort: "xhigh" },
    promptAssetName: "implement-story.md",
    schemaAssetName: "primitive-status.schema.json",
  },
  "codex54-xhigh-story-verify-primary": {
    slug: "codex54-xhigh-story-verify-primary",
    profile: { model: "gpt-5.4", reasoningEffort: "xhigh" },
    promptAssetName: "verify-story-primary.md",
    schemaAssetName: "primitive-status.schema.json",
  },
  "gpt53-codex-high-story-verify-secondary": {
    slug: "gpt53-codex-high-story-verify-secondary",
    profile: { model: "gpt-5.3-codex", reasoningEffort: "high" },
    promptAssetName: "verify-story-secondary.md",
    schemaAssetName: "primitive-status.schema.json",
  },
  "codex54-xhigh-story-synthesize": {
    slug: "codex54-xhigh-story-synthesize",
    profile: { model: "gpt-5.4", reasoningEffort: "xhigh" },
    promptAssetName: "synthesize-story.md",
    schemaAssetName: "synthesis-result.schema.json",
  },
  "codex54-xhigh-story-fix-batch": {
    slug: "codex54-xhigh-story-fix-batch",
    profile: { model: "gpt-5.4", reasoningEffort: "xhigh" },
    promptAssetName: "apply-fix-batch.md",
    schemaAssetName: "primitive-status.schema.json",
  },
  "codex54-xhigh-feature-verify-primary": {
    slug: "codex54-xhigh-feature-verify-primary",
    profile: { model: "gpt-5.4", reasoningEffort: "xhigh" },
    promptAssetName: "verify-feature-primary.md",
    schemaAssetName: "primitive-status.schema.json",
  },
  "gpt53-codex-high-feature-verify-secondary": {
    slug: "gpt53-codex-high-feature-verify-secondary",
    profile: { model: "gpt-5.3-codex", reasoningEffort: "high" },
    promptAssetName: "verify-feature-secondary.md",
    schemaAssetName: "primitive-status.schema.json",
  },
  "codex54-xhigh-feature-synthesize": {
    slug: "codex54-xhigh-feature-synthesize",
    profile: { model: "gpt-5.4", reasoningEffort: "xhigh" },
    promptAssetName: "synthesize-feature.md",
    schemaAssetName: "synthesis-result.schema.json",
  },
};

const DryRunEventSchema = z.object({
  target: z.string().min(1),
  step: z.string().min(1),
  transportOutcome: z.enum(["success", "stall", "error"]).default("success"),
  status: z.enum(["DONE", "NEEDS_REWORK", "BLOCKED"]).default("DONE"),
  milestones: z.array(z.string()).default([]),
  unresolvedFindings: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().optional(),
        disposition: z.enum(["fixed", "accepted-risk", "defer"]),
        severity: z.enum(["CRITICAL", "MAJOR", "MINOR", "INFO"]).optional(),
      })
    )
    .default([]),
  notes: z.string().default("Dry-run synthetic result."),
  requiresUserDecision: z.boolean().default(false),
  nextRecommendedAction: z.string().default("continue"),
  gateResultSummary: z.string().optional(),
  decision: z.enum(["PASS", "REVISE", "BLOCK"]).optional(),
  reportMarkdown: z.string().optional(),
});

export type DryRunEvent = z.infer<typeof DryRunEventSchema>;

export async function runStoryPrimitive(params: {
  layout: ProcessLayout;
  storyId: string;
  storyTitle: string;
  step: StoryStep;
  attempt: number;
  primitiveSlug: PrimitiveSlug;
  context: PrimitiveExecutionContext;
  dryRunEvent?: DryRunEvent;
}): Promise<PrimitiveExecutionResult> {
  const attemptLayout = getStoryAttemptLayout(
    params.layout,
    params.storyId,
    params.step,
    params.attempt
  );
  await ensureAttemptLayout(attemptLayout);

  return executePrimitive({
    attemptLayout,
    heading: `${params.storyId} ${params.step} attempt ${params.attempt}`,
    targetLabel: params.storyId,
    primitiveSlug: params.primitiveSlug,
    context: params.context,
    dryRunEvent: params.dryRunEvent,
    visibleArtifactPath:
      params.step === "story_verify_primary"
        ? join(
            getVisibleStoryVerificationDir(params.layout, params.storyId),
            storyVerificationFileName("primary-review", params.attempt)
          )
        : params.step === "story_verify_secondary"
          ? join(
              getVisibleStoryVerificationDir(params.layout, params.storyId),
              storyVerificationFileName("secondary-review", params.attempt)
            )
          : params.step === "story_synthesize"
            ? join(
                getVisibleStoryVerificationDir(params.layout, params.storyId),
                storyVerificationFileName("synthesis", params.attempt)
              )
            : undefined,
  });
}

export async function runFeaturePrimitive(params: {
  layout: ProcessLayout;
  step: FeatureStep;
  attempt: number;
  primitiveSlug: PrimitiveSlug;
  context: PrimitiveExecutionContext;
  dryRunEvent?: DryRunEvent;
}): Promise<PrimitiveExecutionResult> {
  const attemptLayout = getFeatureAttemptLayout(
    params.layout,
    params.step,
    params.attempt
  );
  await ensureAttemptLayout(attemptLayout);

  return executePrimitive({
    attemptLayout,
    heading: `feature ${params.step} attempt ${params.attempt}`,
    targetLabel: "feature",
    primitiveSlug: params.primitiveSlug,
    context: params.context,
    dryRunEvent: params.dryRunEvent,
    visibleArtifactPath:
      params.step === "feature_verify_primary"
        ? join(
            getVisibleFeatureVerificationDir(params.layout),
            featureVerificationFileName("primary-review", params.attempt)
          )
        : params.step === "feature_verify_secondary"
          ? join(
              getVisibleFeatureVerificationDir(params.layout),
              featureVerificationFileName("secondary-review", params.attempt)
            )
          : params.step === "feature_synthesize"
            ? join(
                getVisibleFeatureVerificationDir(params.layout),
                featureVerificationFileName("synthesis", params.attempt)
              )
            : undefined,
  });
}

async function executePrimitive(params: {
  attemptLayout: PrimitiveAttemptLayout;
  heading: string;
  targetLabel: string;
  primitiveSlug: PrimitiveSlug;
  context: PrimitiveExecutionContext;
  dryRunEvent?: DryRunEvent;
  visibleArtifactPath?: string;
}): Promise<PrimitiveExecutionResult> {
  const definition = PRIMITIVE_DEFINITIONS[params.primitiveSlug];
  const readingJourney = buildReadingJourneyPlan(definition.slug, params.context);
  await writeFile(
    params.attemptLayout.readingJourneyPath,
    renderReadingJourney(readingJourney),
    "utf8"
  );

  const prompt = await buildPrimitivePrompt(definition, params.context, readingJourney);
  await writeFile(params.attemptLayout.promptPath, `${prompt}\n`, "utf8");
  await writeFile(
    params.attemptLayout.modelSchemaPath,
    `${JSON.stringify(EMBEDDED_SCHEMAS[definition.schemaAssetName], null, 2)}\n`,
    "utf8"
  );
  await writeInvocation(params.attemptLayout.invocationPath, definition, params.context);

  if (params.dryRunEvent) {
    return materializeDryRunArtifacts({
      attemptLayout: params.attemptLayout,
      primitiveSlug: params.primitiveSlug,
      targetLabel: params.targetLabel,
      dryRunEvent: params.dryRunEvent,
      visibleArtifactPath: params.visibleArtifactPath,
      heading: params.heading,
    });
  }

  const execResult = await runCodexExec({
    cwd: params.context.repoRoot,
    codexBin: params.context.codexBin,
    promptPath: params.attemptLayout.promptPath,
    stdoutPath: params.attemptLayout.stdoutPath,
    stderrPath: params.attemptLayout.stderrPath,
    statusPath: params.attemptLayout.statusPath,
    schemaPath: params.attemptLayout.modelSchemaPath,
    primitiveSlug: definition.slug,
    profile: definition.profile,
    heartbeatMs: params.context.heartbeatMs,
    pollIntervalMs: params.context.pollIntervalMs,
  });

  if (execResult.outcome !== "success") {
    return {
      outcome: execResult.outcome,
      attemptLayout: params.attemptLayout,
      durationMs: execResult.durationMs,
      exitCode: execResult.exitCode,
      visibleArtifactPath: params.visibleArtifactPath,
    };
  }

  const status = await materializeAndPersistPrimitiveResult({
    rawStatusPath: params.attemptLayout.statusPath,
    reportPath: params.attemptLayout.reportPath,
    readingJourneyPath: params.attemptLayout.readingJourneyPath,
    allowSynthesisDecision: definition.slug.endsWith("synthesize"),
  });

  await materializeReceipt({
    path: params.attemptLayout.receiptPath,
    heading: params.heading,
    summary: status,
  });

  if (params.visibleArtifactPath) {
    await writeFile(
      params.visibleArtifactPath,
      await readFile(params.attemptLayout.reportPath, "utf8"),
      "utf8"
    );
  }

  return {
    outcome: "success",
    status,
    attemptLayout: params.attemptLayout,
    visibleArtifactPath: params.visibleArtifactPath,
    durationMs: execResult.durationMs,
    exitCode: execResult.exitCode,
  };
}

async function buildPrimitivePrompt(
  definition: PrimitiveDefinition,
  context: PrimitiveExecutionContext,
  readingJourney: ReturnType<typeof buildReadingJourneyPlan>
): Promise<string> {
  const template = EMBEDDED_PROMPTS[definition.promptAssetName];
  const sections: string[] = [
    template.trimEnd(),
    "",
    "## Runtime Context",
    "",
    `- repoRoot: ${context.repoRoot}`,
    `- specPackRoot: ${context.specPackRoot}`,
  ];

  if (context.storyId) {
    sections.push(`- storyId: ${context.storyId}`);
  }
  if (context.storyTitle) {
    sections.push(`- storyTitle: ${context.storyTitle}`);
  }
  if (context.storyGate) {
    sections.push(`- storyAcceptanceGate: ${context.storyGate}`);
  }
  if (context.featureGate) {
    sections.push(`- featureAcceptanceGate: ${context.featureGate}`);
  }
  if (context.boundaryInventorySummary) {
    sections.push(`- boundaryInventorySummary: ${context.boundaryInventorySummary}`);
  }

  sections.push("");
  sections.push(renderReadingJourney(readingJourney).trimEnd());
  sections.push("");
  sections.push(buildReportContractInstructions(definition.slug));
  sections.push("");
  sections.push("Return only schema-conforming JSON in your final message. Do not include markdown fences.");

  return sections.join("\n");
}

async function writeInvocation(
  path: string,
  definition: PrimitiveDefinition,
  context: PrimitiveExecutionContext
): Promise<void> {
  const invocation = {
    primitiveSlug: definition.slug,
    model: definition.profile.model,
    reasoningEffort: definition.profile.reasoningEffort,
    promptAssetName: definition.promptAssetName,
    schemaAssetName: definition.schemaAssetName,
    repoRoot: context.repoRoot,
    specPackRoot: context.specPackRoot,
    storyId: context.storyId,
    storyPath: context.storyPath,
    verificationBundlePath: context.verificationBundlePath,
    fixBatchPath: context.fixBatchPath,
    implementationPromptPath: context.implementationPromptPath,
    primaryReviewPath: context.primaryReviewPath,
    secondaryReviewPath: context.secondaryReviewPath,
  };

  await writeFile(path, `${JSON.stringify(invocation, null, 2)}\n`, "utf8");
}

async function materializeDryRunArtifacts(params: {
  attemptLayout: PrimitiveAttemptLayout;
  primitiveSlug: PrimitiveSlug;
  targetLabel: string;
  dryRunEvent: DryRunEvent;
  visibleArtifactPath?: string;
  heading: string;
}): Promise<PrimitiveExecutionResult> {
  const event = DryRunEventSchema.parse(params.dryRunEvent);
  await writeFile(
    params.attemptLayout.stdoutPath,
    JSON.stringify(
      {
        type: "turn.completed",
        primitiveSlug: params.primitiveSlug,
        target: params.targetLabel,
        dryRun: true,
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
  await writeFile(params.attemptLayout.stderrPath, "", "utf8");

  if (event.transportOutcome !== "success") {
    return {
      outcome: event.transportOutcome,
      attemptLayout: params.attemptLayout,
      visibleArtifactPath: params.visibleArtifactPath,
    };
  }

  const reportMarkdown =
    event.reportMarkdown ??
    renderPlaceholderReport(
      params.primitiveSlug,
      params.heading,
      event.notes || "Dry-run synthetic result."
    );

  const baseStatus: PrimitiveStatusRecord & {
    reportMarkdown: string;
    decision?: "PASS" | "REVISE" | "BLOCK";
  } = {
    processType: "codex-impl",
    primitiveSlug: params.primitiveSlug,
    storyId: params.targetLabel !== "feature" ? params.targetLabel : undefined,
    featureVerification: params.targetLabel === "feature",
    status: event.status,
    codexEvidenceRef: params.attemptLayout.stdoutPath,
    reportRef: params.attemptLayout.reportPath,
    readingJourneyRef: params.attemptLayout.readingJourneyPath,
    milestones: event.milestones,
    unresolvedFindings: event.unresolvedFindings,
    notes: event.notes,
    requiresUserDecision: event.requiresUserDecision,
    nextRecommendedAction: event.nextRecommendedAction,
    gateResultSummary: event.gateResultSummary,
    reportMarkdown,
  };

  const finalStatus =
    params.primitiveSlug.endsWith("synthesize")
      ? {
          ...baseStatus,
          decision:
            event.decision ??
            (event.status === "DONE"
              ? "PASS"
              : event.status === "NEEDS_REWORK"
                ? "REVISE"
                : "BLOCK"),
        }
      : baseStatus;

  await writeFile(
    params.attemptLayout.statusPath,
    `${JSON.stringify(finalStatus, null, 2)}\n`,
    "utf8"
  );

  const parsed = await materializeAndPersistPrimitiveResult({
    rawStatusPath: params.attemptLayout.statusPath,
    reportPath: params.attemptLayout.reportPath,
    readingJourneyPath: params.attemptLayout.readingJourneyPath,
    allowSynthesisDecision: params.primitiveSlug.endsWith("synthesize"),
  });

  await materializeReceipt({
    path: params.attemptLayout.receiptPath,
    heading: params.heading,
    summary: parsed,
  });

  if (params.visibleArtifactPath) {
    await writeFile(
      params.visibleArtifactPath,
      await readFile(params.attemptLayout.reportPath, "utf8"),
      "utf8"
    );
  }

  return {
    outcome: "success",
    status: parsed,
    attemptLayout: params.attemptLayout,
    visibleArtifactPath: params.visibleArtifactPath,
  };
}

export async function parseStatusByPrimitive(
  primitiveSlug: PrimitiveSlug,
  path: string
): Promise<ParsedPrimitiveStatus | ParsedSynthesisResult> {
  if (primitiveSlug.endsWith("synthesize")) {
    return parseSynthesisStatusFile(path);
  }
  return parsePrimitiveStatusFile(path);
}
