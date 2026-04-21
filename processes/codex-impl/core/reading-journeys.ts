import type { PrimitiveSlug } from "./state";

export interface ReadingJourneyItem {
  order: number;
  label: string;
  path: string;
  purpose: string;
  required: boolean;
}

export interface ReadingJourneyPlan {
  primitiveSlug: PrimitiveSlug;
  roleLens: string;
  observationInstruction: string;
  items: ReadingJourneyItem[];
  extraChecks: string[];
}

export interface ReadingJourneyContext {
  repoRoot: string;
  specPackRoot: string;
  storyId?: string;
  storyTitle?: string;
  storyPath?: string;
  epicPath?: string;
  techDesignPath?: string;
  techDesignCompanionPaths?: string[];
  testPlanPath?: string;
  storyGate?: string;
  featureGate?: string;
  verificationBundlePath?: string;
  fixBatchPath?: string;
  primaryReviewPath?: string;
  secondaryReviewPath?: string;
  priorReceiptPaths?: string[];
  cleanupReceiptPath?: string;
  boundaryInventorySummary?: string;
  storyBaseCommit?: string;
  cumulativeTestBaselineBefore?: number;
  expectedCumulativeTestBaselineAfter?: number;
  diffSummary?: string;
  implementationPromptPath?: string;
}

interface JourneyTemplate {
  roleLens: string;
  observationInstruction: string;
  items: Array<{
    label: string;
    key:
      | "techDesignPath"
      | "techDesignCompanionPaths"
      | "epicPath"
      | "testPlanPath"
      | "storyPath"
      | "implementationPromptPath"
      | "verificationBundlePath"
      | "primaryReviewPath"
      | "secondaryReviewPath"
      | "fixBatchPath"
      | "priorReceiptPaths"
      | "cleanupReceiptPath";
    purpose: string;
    required?: boolean;
  }>;
  extraChecks: string[];
}

const JOURNEY_TEMPLATES: Record<PrimitiveSlug, JourneyTemplate> = {
  "codex54-xhigh-story-implement": {
    roleLens:
      "implement the smallest correct story slice with explicit AC/TC awareness",
    observationInstruction:
      "After each artifact, note what matters for this story, what constraints it creates, and what can go wrong.",
    items: [
      {
        label: "Tech Design Index",
        key: "techDesignPath",
        purpose: "Architectural decisions, cross-cutting patterns, and module boundaries.",
      },
      {
        label: "Tech Design Companions",
        key: "techDesignCompanionPaths",
        purpose: "Domain-specific implementation constraints and interfaces.",
        required: false,
      },
      {
        label: "Epic",
        key: "epicPath",
        purpose: "Feature scope, upstream/downstream dependencies, and story context.",
        required: false,
      },
      {
        label: "Test Plan",
        key: "testPlanPath",
        purpose: "TC-to-test mapping, mock strategy, and expected coverage.",
      },
      {
        label: "Story",
        key: "storyPath",
        purpose: "Current implementation scope and exact AC/TC wording.",
      },
      {
        label: "Story-Specific Implementation Prompt",
        key: "implementationPromptPath",
        purpose: "Optional story-specific context or gotchas.",
        required: false,
      },
      {
        label: "Prior Receipts",
        key: "priorReceiptPaths",
        purpose: "Carry forward verified patterns and cumulative context from earlier stories.",
        required: false,
      },
    ],
    extraChecks: [
      "List ACs/TCs targeted.",
      "Map TCs to tests from the test plan.",
      "Identify likely failure modes before editing.",
      "Note the current and expected cumulative test baseline.",
    ],
  },
  "codex54-xhigh-story-verify-primary": {
    roleLens: "architecture alignment, correctness, and test diff audit",
    observationInstruction:
      "After each artifact, focus on what the implementation must get right architecturally and what evidence would prove drift.",
    items: [
      { label: "Tech Design Index", key: "techDesignPath", purpose: "Whole-story architecture." },
      {
        label: "Tech Design Companions",
        key: "techDesignCompanionPaths",
        purpose: "Detailed interfaces and domain-specific constraints.",
        required: false,
      },
      { label: "Epic", key: "epicPath", purpose: "Feature scope and original requirements.", required: false },
      { label: "Test Plan", key: "testPlanPath", purpose: "Expected TC/test mapping and non-TC decided tests." },
      { label: "Story", key: "storyPath", purpose: "Current AC/TC slice and story-level scope." },
      {
        label: "Verification Bundle",
        key: "verificationBundlePath",
        purpose: "Implementer claim set, diff summary, baselines, and evidence refs.",
      },
    ],
    extraChecks: [
      "Diff changed test files against the story base commit.",
      "Categorize changes as legitimate coverage, correction, assertion weakening, scope shift, or unexplained.",
      "Run the full story gate.",
    ],
  },
  "gpt53-codex-high-story-verify-secondary": {
    roleLens: "AC/TC compliance, completeness, and mock audit",
    observationInstruction:
      "After each artifact, focus on requirement coverage and whether any checks are thin or missing.",
    items: [
      { label: "Tech Design Index", key: "techDesignPath", purpose: "Module responsibilities and AC mapping." },
      {
        label: "Tech Design Companions",
        key: "techDesignCompanionPaths",
        purpose: "Detailed contracts and constraints.",
        required: false,
      },
      { label: "Epic", key: "epicPath", purpose: "Exact AC/TC wording.", required: false },
      { label: "Test Plan", key: "testPlanPath", purpose: "Expected test coverage and mock strategy." },
      { label: "Story", key: "storyPath", purpose: "Story-specific ACs, TCs, and deviations." },
      {
        label: "Verification Bundle",
        key: "verificationBundlePath",
        purpose: "Implementer claim set, diff summary, baselines, and evidence refs.",
      },
    ],
    extraChecks: [
      "Build an AC/TC coverage view before verdicting.",
      "Check mock usage against the test plan.",
      "Run the full story gate.",
    ],
  },
  "codex54-xhigh-story-synthesize": {
    roleLens:
      "separate overlaps, unique real findings, disagreement points, and decide the next transition",
    observationInstruction:
      "After each artifact, note what is independently corroborated, what is unique, and what still needs adjudication.",
    items: [
      { label: "Story", key: "storyPath", purpose: "Local scope and exact requirement slice." },
      {
        label: "Verification Bundle",
        key: "verificationBundlePath",
        purpose: "Implementer claim set and changed-file summary.",
      },
      {
        label: "Primary Review",
        key: "primaryReviewPath",
        purpose: "Architecture/correctness findings.",
      },
      {
        label: "Secondary Review",
        key: "secondaryReviewPath",
        purpose: "AC/TC compliance and completeness findings.",
      },
      {
        label: "Prior Fix Batch",
        key: "fixBatchPath",
        purpose: "Existing bounded fix scope, if this is a re-synthesis round.",
        required: false,
      },
    ],
    extraChecks: [
      "Separate high-confidence overlaps from unique findings.",
      "Identify meaningful disagreements and the smallest resolving check.",
      "Choose PASS, REVISE, or BLOCK.",
    ],
  },
  "codex54-xhigh-story-fix-batch": {
    roleLens: "apply only the bounded approved fixes and rerun the gate",
    observationInstruction:
      "After each artifact, focus on the exact bounded fix scope and what must not expand.",
    items: [
      { label: "Tech Design Index", key: "techDesignPath", purpose: "Preserve the intended architecture." },
      {
        label: "Tech Design Companions",
        key: "techDesignCompanionPaths",
        purpose: "Honor domain-specific contracts.",
        required: false,
      },
      { label: "Epic", key: "epicPath", purpose: "Avoid scope drift.", required: false },
      { label: "Test Plan", key: "testPlanPath", purpose: "Preserve expected coverage and non-TC tests." },
      { label: "Story", key: "storyPath", purpose: "Local scope boundary." },
      {
        label: "Verification Bundle",
        key: "verificationBundlePath",
        purpose: "Current code/evidence snapshot.",
      },
      {
        label: "Primary Review",
        key: "primaryReviewPath",
        purpose: "Primary validated findings.",
        required: false,
      },
      {
        label: "Secondary Review",
        key: "secondaryReviewPath",
        purpose: "Secondary validated findings.",
        required: false,
      },
      {
        label: "Fix Batch",
        key: "fixBatchPath",
        purpose: "Exact approved changes to make.",
      },
    ],
    extraChecks: [
      "Do not expand scope.",
      "Re-run the story gate after fixes.",
      "Report remaining risks explicitly.",
    ],
  },
  "codex54-xhigh-feature-verify-primary": {
    roleLens: "cross-story integration, architecture drift, and real runtime/store truth",
    observationInstruction:
      "After each artifact, focus on what story-level review could not prove and what needs to be checked end-to-end.",
    items: [
      { label: "Tech Design Index", key: "techDesignPath", purpose: "Whole-feature architecture." },
      {
        label: "Tech Design Companions",
        key: "techDesignCompanionPaths",
        purpose: "Detailed contracts and design seams.",
        required: false,
      },
      { label: "Epic", key: "epicPath", purpose: "Full feature requirements.", required: false },
      { label: "Test Plan", key: "testPlanPath", purpose: "Expected full coverage and non-TC tests." },
      { label: "Story Receipts", key: "priorReceiptPaths", purpose: "How story-level work accumulated.", required: false },
      {
        label: "Cleanup Receipt",
        key: "cleanupReceiptPath",
        purpose: "Any pre-feature verification cleanup batch.",
        required: false,
      },
    ],
    extraChecks: [
      "Evaluate cross-story integration gaps.",
      "Check boundary inventory honesty.",
      "Run the full feature gate.",
    ],
  },
  "gpt53-codex-high-feature-verify-secondary": {
    roleLens: "AC/TC completeness, test quality, and gaps between stories",
    observationInstruction:
      "After each artifact, focus on what requirements might have fallen between stories or be weakly covered.",
    items: [
      { label: "Tech Design Index", key: "techDesignPath", purpose: "Feature structure and mapping." },
      {
        label: "Tech Design Companions",
        key: "techDesignCompanionPaths",
        purpose: "Detailed contracts and constraints.",
        required: false,
      },
      { label: "Epic", key: "epicPath", purpose: "Every AC and TC across the feature.", required: false },
      { label: "Test Plan", key: "testPlanPath", purpose: "Expected full-story and non-TC coverage." },
      { label: "Story Receipts", key: "priorReceiptPaths", purpose: "Story-by-story accumulated evidence.", required: false },
      {
        label: "Cleanup Receipt",
        key: "cleanupReceiptPath",
        purpose: "Any pre-feature verification cleanup batch.",
        required: false,
      },
    ],
    extraChecks: [
      "Build an AC/TC completeness view across stories.",
      "Check test quality and mock usage across the full feature.",
      "Run the full feature gate.",
    ],
  },
  "codex54-xhigh-feature-synthesize": {
    roleLens: "ship-readiness decision with categorized fix list",
    observationInstruction:
      "After each artifact, focus on what is ship-blocking, what is corrective, and what can be explicitly accepted.",
    items: [
      {
        label: "Feature Verification Bundle",
        key: "verificationBundlePath",
        purpose: "Feature-wide evidence and scope summary.",
      },
      {
        label: "Primary Feature Review",
        key: "primaryReviewPath",
        purpose: "Architecture/integration findings.",
      },
      {
        label: "Secondary Feature Review",
        key: "secondaryReviewPath",
        purpose: "Coverage/completeness findings.",
      },
      {
        label: "Cleanup Receipt",
        key: "cleanupReceiptPath",
        purpose: "Prior cleanup/fix context, if present.",
        required: false,
      },
    ],
    extraChecks: [
      "Separate must-fix, should-fix, and trivial items.",
      "Call out any remaining human-judgment decisions explicitly.",
      "Choose PASS, REVISE, or BLOCK.",
    ],
  },
};

export function buildReadingJourneyPlan(
  primitiveSlug: PrimitiveSlug,
  context: ReadingJourneyContext
): ReadingJourneyPlan {
  const template = JOURNEY_TEMPLATES[primitiveSlug];
  const items: ReadingJourneyItem[] = [];
  let order = 1;

  for (const item of template.items) {
    const resolvedPaths = resolveContextPaths(item.key, context);
    if (resolvedPaths.length === 0) {
      if (item.required !== false) {
        continue;
      }
      continue;
    }

    for (const path of resolvedPaths) {
      items.push({
        order,
        label: item.label,
        path,
        purpose: item.purpose,
        required: item.required !== false,
      });
      order += 1;
    }
  }

  const extraChecks = [...template.extraChecks];

  if (context.storyBaseCommit) {
    extraChecks.push(`Story base commit: ${context.storyBaseCommit}`);
  }
  if (typeof context.cumulativeTestBaselineBefore === "number") {
    extraChecks.push(
      `Cumulative test baseline before story: ${context.cumulativeTestBaselineBefore}`
    );
  }
  if (typeof context.expectedCumulativeTestBaselineAfter === "number") {
    extraChecks.push(
      `Expected cumulative test baseline after story: ${context.expectedCumulativeTestBaselineAfter}`
    );
  }
  if (context.storyGate) {
    extraChecks.push(`Story gate: ${context.storyGate}`);
  }
  if (context.featureGate) {
    extraChecks.push(`Feature gate: ${context.featureGate}`);
  }
  if (context.boundaryInventorySummary) {
    extraChecks.push(`Boundary inventory snapshot: ${context.boundaryInventorySummary}`);
  }

  return {
    primitiveSlug,
    roleLens: template.roleLens,
    observationInstruction: template.observationInstruction,
    items,
    extraChecks,
  };
}

export function renderReadingJourney(plan: ReadingJourneyPlan): string {
  const lines = [
    `# Reading Journey — ${plan.primitiveSlug}`,
    "",
    `- role lens: ${plan.roleLens}`,
    `- observation instruction: ${plan.observationInstruction}`,
    "",
    "## Ordered Artifacts",
    "",
  ];

  if (plan.items.length === 0) {
    lines.push("- none");
  } else {
    for (const item of plan.items) {
      lines.push(`${item.order}. **${item.label}**`);
      lines.push(`   - path: \`${item.path}\``);
      lines.push(`   - purpose: ${item.purpose}`);
      lines.push(`   - required: ${item.required ? "yes" : "no"}`);
    }
  }

  lines.push("");
  lines.push("## Extra Checks");
  lines.push("");
  if (plan.extraChecks.length === 0) {
    lines.push("- none");
  } else {
    for (const check of plan.extraChecks) {
      lines.push(`- ${check}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function resolveContextPaths(
  key: JourneyTemplate["items"][number]["key"],
  context: ReadingJourneyContext
): string[] {
  switch (key) {
    case "techDesignPath":
      return context.techDesignPath ? [context.techDesignPath] : [];
    case "techDesignCompanionPaths":
      return context.techDesignCompanionPaths ?? [];
    case "epicPath":
      return context.epicPath ? [context.epicPath] : [];
    case "testPlanPath":
      return context.testPlanPath ? [context.testPlanPath] : [];
    case "storyPath":
      return context.storyPath ? [context.storyPath] : [];
    case "implementationPromptPath":
      return context.implementationPromptPath ? [context.implementationPromptPath] : [];
    case "verificationBundlePath":
      return context.verificationBundlePath ? [context.verificationBundlePath] : [];
    case "primaryReviewPath":
      return context.primaryReviewPath ? [context.primaryReviewPath] : [];
    case "secondaryReviewPath":
      return context.secondaryReviewPath ? [context.secondaryReviewPath] : [];
    case "fixBatchPath":
      return context.fixBatchPath ? [context.fixBatchPath] : [];
    case "priorReceiptPaths":
      return context.priorReceiptPaths ?? [];
    case "cleanupReceiptPath":
      return context.cleanupReceiptPath ? [context.cleanupReceiptPath] : [];
  }
}
