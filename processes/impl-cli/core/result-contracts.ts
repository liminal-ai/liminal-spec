import { z } from "zod";

import { implRunConfigSchema } from "./config-schema";

export const cliErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  detail: z.string().min(1).optional(),
});

export const cliArtifactRefSchema = z.object({
  kind: z.string().min(1),
  path: z.string().min(1),
});

export const cliStatusSchema = z.enum([
  "ok",
  "needs-user-decision",
  "blocked",
  "error",
]);

export const inspectOutcomeSchema = z.enum([
  "ready",
  "needs-user-decision",
  "blocked",
]);

export const inspectResultSchema = z.object({
  status: inspectOutcomeSchema,
  specPackRoot: z.string().min(1),
  techDesignShape: z.enum(["two-file", "four-file"]),
  artifacts: z.object({
    epicPath: z.string().min(1),
    techDesignPath: z.string().min(1),
    techDesignCompanionPaths: z.array(z.string().min(1)),
    testPlanPath: z.string().min(1),
    storiesDir: z.string().min(1),
  }),
  stories: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      path: z.string().min(1),
      order: z.number().int().positive(),
    })
  ),
  inserts: z.object({
    customStoryImplPromptInsert: z.enum(["present", "absent"]),
    customStoryVerifierPromptInsert: z.enum(["present", "absent"]),
  }),
  blockers: z.array(z.string()),
  notes: z.array(z.string()),
});

export const harnessAvailabilitySchema = z.object({
  harness: z.enum(["claude-code", "codex", "copilot", "none"]),
  available: z.boolean(),
  version: z.string().min(1).optional(),
  authStatus: z.enum(["authenticated", "unknown", "missing"]).optional(),
  notes: z.array(z.string()),
});

export const providerMatrixSchema = z.object({
  primary: harnessAvailabilitySchema,
  secondary: z.array(harnessAvailabilitySchema),
});

export const verificationGatesSchema = z.object({
  storyGate: z.string().min(1),
  epicGate: z.string().min(1),
  storyGateSource: z.string().min(1),
  epicGateSource: z.string().min(1),
});

export const preflightResultSchema = z.object({
  status: inspectOutcomeSchema,
  validatedConfig: implRunConfigSchema,
  providerMatrix: providerMatrixSchema,
  verificationGates: verificationGatesSchema.optional(),
  configValidationNotes: z.array(z.string()),
  promptAssets: z.object({
    basePromptsReady: z.boolean(),
    snippetsReady: z.boolean(),
    notes: z.array(z.string()),
  }),
  blockers: z.array(z.string()),
  notes: z.array(z.string()),
});

export const implementationOutcomeSchema = z.enum([
  "ready-for-verification",
  "needs-followup-fix",
  "needs-human-ruling",
  "blocked",
]);

export const verifierBatchOutcomeSchema = z.enum([
  "pass",
  "revise",
  "block",
]);

export const epicCleanupOutcomeSchema = z.enum([
  "cleaned",
  "needs-more-cleanup",
  "blocked",
]);

export const epicSynthesisOutcomeSchema = z.enum([
  "ready-for-closeout",
  "needs-fixes",
  "needs-more-verification",
  "blocked",
]);

export const findingSeveritySchema = z.enum([
  "critical",
  "major",
  "minor",
  "observation",
]);

export const recommendedFixScopeSchema = z.enum([
  "same-session-implementor",
  "quick-fix",
  "fresh-fix-path",
  "human-ruling",
]);

export const providerIdSchema = z.enum(["claude-code", "codex", "copilot"]);

const storyIdentitySchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
  })
  .strict();

const changedFileSchema = z
  .object({
    path: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

const testSummarySchema = z
  .object({
    added: z.array(z.string().min(1)),
    modified: z.array(z.string().min(1)),
    removed: z.array(z.string().min(1)),
    totalAfterStory: z.number().int().optional(),
    deltaFromPriorBaseline: z.number().int().optional(),
  })
  .strict();

const gateRunSchema = z
  .object({
    command: z.string().min(1),
    result: z.enum(["pass", "fail", "not-run"]),
  })
  .strict();

const selfReviewSchema = z
  .object({
    passesRun: z.number().int().min(0),
    findingsFixed: z.array(z.string()),
    findingsSurfaced: z.array(z.string()),
  })
  .strict();

const requirementCoverageSchema = z
  .object({
    verified: z.array(z.string()),
    unverified: z.array(z.string()),
  })
  .strict();

export const continuationHandleSchema = z
  .object({
    provider: providerIdSchema,
    sessionId: z.string().min(1),
    storyId: z.string().min(1),
  })
  .strict();

export const implementorResultSchema = z
  .object({
    resultId: z.string().min(1),
    provider: providerIdSchema,
    model: z.string().min(1),
    role: z.literal("story_implementor"),
    sessionId: z.string().min(1),
    continuation: continuationHandleSchema,
    outcome: implementationOutcomeSchema,
    story: storyIdentitySchema,
    planSummary: z.string().min(1),
    changedFiles: z.array(changedFileSchema),
    tests: testSummarySchema,
    gatesRun: z.array(gateRunSchema),
    selfReview: selfReviewSchema,
    openQuestions: z.array(z.string()),
    specDeviations: z.array(z.string()),
    recommendedNextStep: z.string().min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.sessionId !== value.continuation.sessionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Implementor sessionId must match continuation.sessionId",
        path: ["continuation", "sessionId"],
      });
    }

    if (value.story.id !== value.continuation.storyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Implementor story.id must match continuation.storyId",
        path: ["continuation", "storyId"],
      });
    }

    if (value.provider !== value.continuation.provider) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Implementor provider must match continuation.provider",
        path: ["continuation", "provider"],
      });
    }
  });

export const verifierFindingSchema = z
  .object({
    id: z.string().min(1),
    severity: findingSeveritySchema,
    title: z.string().min(1),
    evidence: z.string().min(1),
    affectedFiles: z.array(z.string().min(1)),
    requirementIds: z.array(z.string().min(1)),
    recommendedFixScope: recommendedFixScopeSchema,
    blocking: z.boolean(),
  })
  .strict();

export const storyVerifierResultSchema = z
  .object({
    resultId: z.string().min(1),
    verifierLabel: z.string().min(1),
    provider: providerIdSchema,
    model: z.string().min(1),
    story: storyIdentitySchema,
    artifactsRead: z.array(z.string().min(1)).min(1),
    reviewScopeSummary: z.string().min(1),
    findings: z.array(verifierFindingSchema),
    requirementCoverage: requirementCoverageSchema,
    gatesRun: z.array(gateRunSchema),
    mockOrShimAuditFindings: z.array(z.string()),
    recommendedNextStep: verifierBatchOutcomeSchema,
    recommendedFixScope: recommendedFixScopeSchema,
    openQuestions: z.array(z.string()),
    additionalObservations: z.array(z.string()),
  })
  .strict();

export const epicCleanupResultSchema = z
  .object({
    resultId: z.string().min(1),
    outcome: epicCleanupOutcomeSchema,
    cleanupBatchPath: z.string().min(1),
    filesChanged: z.array(z.string().min(1)),
    changeSummary: z.string().min(1),
    gatesRun: z.array(gateRunSchema),
    unresolvedConcerns: z.array(z.string()),
    recommendedNextStep: z.string().min(1),
  })
  .strict();

export const epicVerifierResultSchema = z
  .object({
    resultId: z.string().min(1),
    outcome: verifierBatchOutcomeSchema,
    provider: providerIdSchema,
    model: z.string().min(1),
    reviewerLabel: z.string().min(1),
    crossStoryFindings: z.array(z.string()),
    architectureFindings: z.array(z.string()),
    epicCoverageAssessment: z.array(z.string()),
    mockOrShimAuditFindings: z.array(z.string()),
    blockingFindings: z.array(verifierFindingSchema),
    nonBlockingFindings: z.array(verifierFindingSchema),
    unresolvedItems: z.array(z.string()),
    gateResult: z.enum(["pass", "fail", "not-run"]),
  })
  .strict();

export function aggregateVerifierBatchOutcome(
  results: Array<{
    recommendedNextStep: z.infer<typeof verifierBatchOutcomeSchema>;
  }>
): z.infer<typeof verifierBatchOutcomeSchema> {
  if (results.some((result) => result.recommendedNextStep === "block")) {
    return "block";
  }

  if (results.some((result) => result.recommendedNextStep === "revise")) {
    return "revise";
  }

  return "pass";
}

export const storyVerifierBatchResultSchema = z
  .object({
    outcome: verifierBatchOutcomeSchema,
    story: storyIdentitySchema,
    verifierResults: z.array(storyVerifierResultSchema).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    const expectedOutcome = aggregateVerifierBatchOutcome(value.verifierResults);
    if (value.outcome !== expectedOutcome && value.outcome !== "block") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Verifier batch outcome '${value.outcome}' does not match aggregated verifier recommendations '${expectedOutcome}' unless the batch is blocked by verifier execution failure`,
        path: ["outcome"],
      });
    }
  });

export function aggregateEpicVerifierBatchOutcome(
  results: Array<{
    outcome: z.infer<typeof verifierBatchOutcomeSchema>;
  }>
): z.infer<typeof verifierBatchOutcomeSchema> {
  if (results.some((result) => result.outcome === "block")) {
    return "block";
  }

  if (results.some((result) => result.outcome === "revise")) {
    return "revise";
  }

  return "pass";
}

export const epicVerifierBatchResultSchema = z
  .object({
    outcome: verifierBatchOutcomeSchema,
    verifierResults: z.array(epicVerifierResultSchema).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    const expectedOutcome = aggregateEpicVerifierBatchOutcome(
      value.verifierResults
    );
    if (value.outcome !== expectedOutcome && value.outcome !== "block") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Epic verifier batch outcome '${value.outcome}' does not match aggregated verifier outcomes '${expectedOutcome}' unless the batch is blocked by verifier execution failure`,
        path: ["outcome"],
      });
    }
  });

export const epicSynthesisResultSchema = z.object({
  resultId: z.string().min(1),
  outcome: epicSynthesisOutcomeSchema,
  confirmedIssues: z.array(z.string()),
  disputedOrUnconfirmedIssues: z.array(z.string()),
  readinessAssessment: z.string().min(1),
  recommendedNextStep: z.string().min(1),
}).strict();

export type CliError = z.infer<typeof cliErrorSchema>;
export type CliArtifactRef = z.infer<typeof cliArtifactRefSchema>;
export type CliStatus = z.infer<typeof cliStatusSchema>;
export type InspectOutcome = z.infer<typeof inspectOutcomeSchema>;
export type InspectResult = z.infer<typeof inspectResultSchema>;
export type HarnessAvailability = z.infer<typeof harnessAvailabilitySchema>;
export type ProviderMatrix = z.infer<typeof providerMatrixSchema>;
export type VerificationGates = z.infer<typeof verificationGatesSchema>;
export type PreflightResult = z.infer<typeof preflightResultSchema>;
export type VerifierBatchOutcome = z.infer<typeof verifierBatchOutcomeSchema>;
export type EpicCleanupOutcome = z.infer<typeof epicCleanupOutcomeSchema>;
export type EpicSynthesisOutcome = z.infer<typeof epicSynthesisOutcomeSchema>;
export type FindingSeverity = z.infer<typeof findingSeveritySchema>;
export type RecommendedFixScope = z.infer<typeof recommendedFixScopeSchema>;
export type ProviderId = z.infer<typeof providerIdSchema>;
export type ContinuationHandle = z.infer<typeof continuationHandleSchema>;
export type ImplementorResult = z.infer<typeof implementorResultSchema>;
export type VerifierFinding = z.infer<typeof verifierFindingSchema>;
export type EpicCleanupResult = z.infer<typeof epicCleanupResultSchema>;
export type EpicVerifierResult = z.infer<typeof epicVerifierResultSchema>;
export type StoryVerifierResult = z.infer<typeof storyVerifierResultSchema>;
export type StoryVerifierBatchResult = z.infer<
  typeof storyVerifierBatchResultSchema
>;
export type EpicVerifierBatchResult = z.infer<
  typeof epicVerifierBatchResultSchema
>;
export type EpicSynthesisResult = z.infer<typeof epicSynthesisResultSchema>;

function statusForOutcome(outcome: string): CliStatus {
  switch (outcome) {
    case "ready":
    case "ready-for-verification":
    case "needs-followup-fix":
    case "pass":
    case "revise":
    case "cleaned":
    case "needs-more-cleanup":
    case "ready-for-closeout":
    case "needs-fixes":
    case "needs-more-routing":
    case "needs-more-verification":
      return "ok";
    case "block":
      return "blocked";
    case "needs-user-decision":
    case "needs-human-ruling":
      return "needs-user-decision";
    case "blocked":
      return "blocked";
    default:
      return "error";
  }
}

const zeroExitOutcomes = new Set([
  "ready",
  "ready-for-verification",
  "pass",
  "cleaned",
  "ready-for-closeout",
]);

export function exitCodeForStatus(status: CliStatus, outcome?: string): number {
  switch (status) {
    case "ok":
      return outcome && !zeroExitOutcomes.has(outcome) ? 2 : 0;
    case "needs-user-decision":
      return 2;
    case "blocked":
      return 3;
    case "error":
    default:
      return 1;
  }
}

export function cliResultEnvelopeSchema<T extends z.ZodTypeAny>(resultSchema: T) {
  return z
    .object({
      command: z.string().min(1),
      version: z.literal(1),
      status: cliStatusSchema,
      outcome: z.string().min(1),
      result: resultSchema.optional(),
      errors: z.array(cliErrorSchema),
      warnings: z.array(z.string()),
      artifacts: z.array(cliArtifactRefSchema),
      startedAt: z.string().min(1),
      finishedAt: z.string().min(1),
    })
    .superRefine((value, ctx) => {
      const expectedStatus = statusForOutcome(value.outcome);
      if (expectedStatus !== value.status) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Envelope status '${value.status}' does not match outcome '${value.outcome}'`,
          path: ["status"],
        });
      }

      if (
        value.result &&
        typeof value.result === "object" &&
        "outcome" in value.result &&
        typeof value.result.outcome === "string" &&
        value.result.outcome !== value.outcome
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Envelope outcome '${value.outcome}' does not match result outcome '${value.result.outcome}'`,
          path: ["outcome"],
        });
      }
    });
}

export function createResultEnvelope<T>(input: {
  command: string;
  outcome: string;
  result?: T;
  errors?: CliError[];
  warnings?: string[];
  artifacts?: CliArtifactRef[];
  startedAt: string;
  finishedAt: string;
}) {
  return {
    command: input.command,
    version: 1 as const,
    status: statusForOutcome(input.outcome),
    outcome: input.outcome,
    result: input.result,
    errors: input.errors ?? [],
    warnings: input.warnings ?? [],
    artifacts: input.artifacts ?? [],
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
  };
}
