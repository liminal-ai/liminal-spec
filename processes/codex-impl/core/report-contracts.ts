import type { PrimitiveSlug } from "./state";

const REPORT_HEADINGS: Record<PrimitiveSlug, string[]> = {
  "codex54-xhigh-story-implement": [
    "PLAN",
    "CHANGES",
    "TESTS",
    "GATE_RESULT",
    "RESIDUAL_RISKS",
    "SPEC_DEVIATIONS",
    "OPEN_QUESTIONS",
  ],
  "codex54-xhigh-story-verify-primary": [
    "VERDICT",
    "CORRECTNESS_FINDINGS",
    "ARCHITECTURE_FINDINGS",
    "TEST_DIFF_AUDIT",
    "TEST_QUALITY_FINDINGS",
    "BLOCKING_FINDINGS",
    "NONBLOCKING_WARNINGS",
    "UNRESOLVED",
    "GATE_RESULT",
    "WHAT_ELSE_NOT_REPORTED",
  ],
  "gpt53-codex-high-story-verify-secondary": [
    "VERDICT",
    "AC_TC_COVERAGE",
    "TEST_DIFF_AUDIT",
    "TEST_QUALITY_FINDINGS",
    "MOCK_AUDIT_FINDINGS",
    "COMPLETENESS_GAPS",
    "BLOCKING_FINDINGS",
    "NONBLOCKING_WARNINGS",
    "UNRESOLVED",
    "GATE_RESULT",
    "WHAT_ELSE_NOT_REPORTED",
  ],
  "codex54-xhigh-story-synthesize": [
    "DECISION",
    "OVERLAPS",
    "UNIQUE_FINDINGS",
    "DISAGREEMENTS",
    "DISPOSITIONS",
    "NEXT_ACTION",
    "OPEN_RISKS",
  ],
  "codex54-xhigh-story-fix-batch": [
    "FIX_SCOPE",
    "CHANGES",
    "TESTS",
    "GATE_RESULT",
    "RESIDUAL_RISKS",
  ],
  "codex54-xhigh-feature-verify-primary": [
    "VERDICT",
    "CROSS_STORY_FINDINGS",
    "ARCHITECTURE_FINDINGS",
    "BOUNDARY_INVENTORY_STATUS",
    "COVERAGE_ASSESSMENT",
    "BLOCKING_FINDINGS",
    "NONBLOCKING_WARNINGS",
    "UNRESOLVED",
    "GATE_RESULT",
    "WHAT_ELSE_NOT_REPORTED",
  ],
  "gpt53-codex-high-feature-verify-secondary": [
    "VERDICT",
    "AC_TC_MATRIX",
    "COMPLETENESS_GAPS",
    "TEST_QUALITY_FINDINGS",
    "MOCK_AUDIT_FINDINGS",
    "BLOCKING_FINDINGS",
    "NONBLOCKING_WARNINGS",
    "UNRESOLVED",
    "GATE_RESULT",
    "WHAT_ELSE_NOT_REPORTED",
  ],
  "codex54-xhigh-feature-synthesize": [
    "DECISION",
    "OVERLAPS",
    "UNIQUE_FINDINGS",
    "DISAGREEMENTS",
    "DISPOSITIONS",
    "NEXT_ACTION",
    "OPEN_RISKS",
  ],
};

export function requiredReportHeadings(primitiveSlug: PrimitiveSlug): string[] {
  return REPORT_HEADINGS[primitiveSlug];
}

export function buildReportContractInstructions(
  primitiveSlug: PrimitiveSlug
): string {
  const headings = requiredReportHeadings(primitiveSlug);
  return [
    "## Report Contract",
    "",
    "Your final JSON must include a `reportMarkdown` field whose markdown contains these headings in order:",
    "",
    ...headings.map((heading) => `- ${heading}`),
    "",
    "Use `## <HEADING>` for each section.",
  ].join("\n");
}

export function validateReportMarkdown(
  primitiveSlug: PrimitiveSlug,
  markdown: string
): string[] {
  const errors: string[] = [];
  const normalized = markdown.trim();
  if (!normalized) {
    errors.push("report.md is empty.");
    return errors;
  }

  for (const heading of requiredReportHeadings(primitiveSlug)) {
    const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m");
    if (!pattern.test(normalized)) {
      errors.push(`Missing required report heading '${heading}'.`);
    }
  }

  return errors;
}

export function renderPlaceholderReport(
  primitiveSlug: PrimitiveSlug,
  title: string,
  notes: string
): string {
  const lines = [`# ${title}`, ""];
  for (const heading of requiredReportHeadings(primitiveSlug)) {
    lines.push(`## ${heading}`);
    lines.push("");
    lines.push(notes || "(none)");
    lines.push("");
  }
  return lines.join("\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
