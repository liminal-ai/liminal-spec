import { basename } from "node:path";

import { pathExists, readTextFile } from "./fs-utils";
import {
  getEmbeddedPromptAssets,
  type BasePromptId,
  type SnippetId,
} from "./prompt-assets";

const MAX_PUBLIC_INSERT_BYTES = 64 * 1024;

export class PromptInsertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptInsertError";
  }
}

interface SharedPromptInput {
  storyId?: string;
  storyTitle?: string;
  storyPath?: string;
  epicPath?: string;
  techDesignPath?: string;
  techDesignCompanionPaths?: string[];
  testPlanPath?: string;
  verifierReportPaths?: string[];
  gateCommands: {
    story?: string;
    epic?: string;
  };
}

export interface StoryImplementorPromptInput extends SharedPromptInput {
  role: "story_implementor";
  storyId: string;
  storyTitle: string;
  storyPath: string;
  implementationPromptInsertPath?: string;
  followupRequest?: string;
  selfReviewPass?: number;
}

export interface StoryVerifierPromptInput extends SharedPromptInput {
  role: "story_verifier";
  storyId: string;
  storyTitle: string;
  storyPath: string;
  verifierMode: "initial" | "followup";
  verifierPromptInsertPath?: string;
  verifierSessionId?: string;
  priorOpenFindingsJson?: string;
  followupResponse?: string;
  orchestratorContext?: string;
}

export interface QuickFixPromptInput extends SharedPromptInput {
  role: "quick_fixer";
  followupRequest: string;
  affectedScope?: string;
}

export interface EpicVerifierPromptInput extends SharedPromptInput {
  role: "epic_verifier";
  reviewerLabel?: string;
}

export interface EpicSynthesizerPromptInput extends SharedPromptInput {
  role: "epic_synthesizer";
}

export type PromptAssemblyInput =
  | StoryImplementorPromptInput
  | StoryVerifierPromptInput
  | QuickFixPromptInput
  | EpicVerifierPromptInput
  | EpicSynthesizerPromptInput;

export interface PromptAssemblyResult {
  prompt: string;
  basePromptId: BasePromptId;
  snippetIds: SnippetId[];
  publicInsertIds: string[];
}

function basePromptIdForRole(role: PromptAssemblyInput["role"]): BasePromptId {
  switch (role) {
    case "story_implementor":
      return "story-implementor";
    case "story_verifier":
      return "story-verifier";
    case "quick_fixer":
      return "quick-fixer";
    case "epic_verifier":
      return "epic-verifier";
    case "epic_synthesizer":
      return "epic-synthesizer";
  }
}

function snippetIdsForInput(input: PromptAssemblyInput): SnippetId[] {
  switch (input.role) {
    case "story_implementor": {
      const snippetIds: SnippetId[] = [
        "reading-journey",
        "gate-instructions",
        "report-contract",
      ];
      if (typeof input.selfReviewPass === "number" && input.selfReviewPass >= 1) {
        snippetIds.push(selfReviewSnippetId(input.selfReviewPass));
      }
      return snippetIds;
    }
    case "story_verifier":
      return [
        "reading-journey",
        "gate-instructions",
        "report-contract",
        "mock-audit",
      ];
    case "quick_fixer":
      return [];
    case "epic_verifier":
      return [
        "reading-journey",
        "gate-instructions",
        "report-contract",
        "mock-audit",
      ];
    case "epic_synthesizer":
      return ["reading-journey", "gate-instructions", "report-contract"];
  }
}

function selfReviewSnippetId(pass: number): SnippetId {
  if (pass <= 1) {
    return "self-review-pass-1";
  }
  if (pass === 2) {
    return "self-review-pass-2";
  }
  return "self-review-pass-3";
}

function buildReadingJourney(input: PromptAssemblyInput): string {
  if (input.role === "quick_fixer") {
    return "";
  }

  const commonLines: string[] = [];
  if (input.storyPath) {
    commonLines.push(`- Story: ${input.storyPath}`);
  }
  if (
    input.epicPath &&
    input.role !== "story_implementor" &&
    input.role !== "story_verifier"
  ) {
    commonLines.push(`- Epic: ${input.epicPath}`);
  }
  if (input.techDesignPath) {
    commonLines.push(`- Tech Design Index: ${input.techDesignPath}`);
  }
  const companionLines = (input.techDesignCompanionPaths ?? []).map(
    (path) => `  - ${path}`
  );
  if (companionLines.length > 0) {
    commonLines.push(`- Tech Design Companions:\n${companionLines.join("\n")}`);
  }
  if (input.testPlanPath) {
    commonLines.push(`- Test Plan: ${input.testPlanPath}`);
  }
  const reportLines = (input.verifierReportPaths ?? []).map(
    (path) => `  - ${path}`
  );
  if (reportLines.length > 0) {
    commonLines.push(`- Verifier Reports:\n${reportLines.join("\n")}`);
  }
  const common = commonLines.join("\n");

  if (input.role === "story_implementor") {
    return [
      "Read the current story first.",
      common,
      "Then read the full tech-design set before implementation starts.",
      "Read each file in 500-line chunks if large.",
      "Reflect after each chunk before you move on.",
    ].join("\n");
  }

  if (input.role === "story_verifier") {
    if (input.verifierMode === "followup") {
      return [
        "You are continuing the retained story verifier session for this story.",
        common,
        "Focus on convergence against the prior open findings before broadening scope.",
        "Use the prior open findings, the implementor response, and directly touched surfaces to decide what remains open, what is resolved, and whether new regressions were introduced.",
        "Do not perform a broad full-story re-review by default.",
        "Read each file in 500-line chunks if large.",
        "Reflect after each chunk before you move on.",
      ].join("\n");
    }

    return [
      "Read the current story and the full tech-design set before you judge the implementation.",
      common,
      "As you read, extract AC and TC evidence.",
      "Then verify against code, tests, and artifacts before filing findings.",
      "Read each file in 500-line chunks if large.",
      "Reflect after each chunk before you move on.",
    ].join("\n");
  }

  if (input.role === "epic_verifier") {
    return [
      "Read the epic-level artifacts and the whole codebase before you judge the implementation set.",
      common,
      "Check cross-story consistency, architecture alignment, and production-path mock or shim usage before you conclude the outcome.",
    ].join("\n");
  }

  if (input.role === "epic_synthesizer") {
    return [
      "Read the epic-level artifacts and the verifier reports before you conclude closeout readiness.",
      common,
      "Independently verify the reported issues against the current evidence instead of merging them blindly.",
    ].join("\n");
  }

  return [
    "Read the epic-level artifacts before you judge the whole implementation set.",
    common,
  ].join("\n");
}

function resultContractName(input: PromptAssemblyInput): string {
  switch (input.role) {
    case "story_implementor":
      return "StoryImplementorProviderPayload";
    case "story_verifier":
      return "StoryVerifierProviderPayload";
    case "quick_fixer":
      return "QuickFixResult";
    case "epic_verifier":
      return "EpicVerifierProviderPayload";
    case "epic_synthesizer":
      return "EpicSynthesisProviderPayload";
  }
}

function resultContractSchema(input: PromptAssemblyInput): string {
  switch (input.role) {
    case "story_implementor":
      return [
        "```json",
        "{",
        '  "outcome": "ready-for-verification" | "needs-followup-fix" | "needs-human-ruling" | "blocked",',
        '  "planSummary": "string",',
        '  "changedFiles": [',
        '    { "path": "string", "reason": "string" }',
        "  ],",
        '  "tests": {',
        '    "added": ["string"],',
        '    "modified": ["string"],',
        '    "removed": ["string"],',
        '    "totalAfterStory": 123,',
        '    "deltaFromPriorBaseline": 4',
        "  },",
        '  "gatesRun": [',
        '    { "command": "string", "result": "pass" | "fail" | "not-run" }',
        "  ],",
        '  "selfReview": {',
        '    "findingsFixed": ["string"],',
        '    "findingsSurfaced": ["string"]',
        "  },",
        '  "openQuestions": ["string"],',
        '  "specDeviations": ["string"],',
        '  "recommendedNextStep": "string"',
        "}",
        "```",
        "Rules:",
        "- Return only this JSON object with no prose, no markdown fences outside the object example, and no surrounding explanation.",
        "- Do not add extra top-level keys.",
        "- `changedFiles` items must be objects with `path` and `reason`, not plain strings.",
        "- Do not include `status`, `story`, `summary`, `verification`, `notes`, `sessionId`, or `continuation`; the CLI adds identity fields itself.",
      ].join("\n");
    case "story_verifier":
      return [
        "```json",
        "{",
        '  "artifactsRead": ["string"],',
        '  "reviewScopeSummary": "string",',
        '  "priorFindingStatuses": [',
        "    {",
        '      "id": "string",',
        '      "status": "resolved" | "still-open" | "needs-human-ruling",',
        '      "rationale": "string"',
        "    }",
        "  ],",
        '  "newFindings": [',
        "    {",
        '      "id": "string",',
        '      "severity": "critical" | "major" | "minor" | "observation",',
        '      "title": "string",',
        '      "evidence": "string",',
        '      "affectedFiles": ["string"],',
        '      "requirementIds": ["string"],',
        '      "recommendedFixScope": "same-session-implementor" | "quick-fix" | "fresh-fix-path" | "human-ruling",',
        '      "blocking": true',
        "    }",
        "  ],",
        '  "openFindings": [/* same finding shape */],',
        '  "requirementCoverage": {',
        '    "verified": ["string"],',
        '    "unverified": ["string"]',
        "  },",
        '  "gatesRun": [',
        '    { "command": "string", "result": "pass" | "fail" | "not-run" }',
        "  ],",
        '  "mockOrShimAuditFindings": ["string"],',
        '  "recommendedNextStep": "pass" | "revise" | "block",',
        '  "recommendedFixScope": "same-session-implementor" | "quick-fix" | "fresh-fix-path" | "human-ruling",',
        '  "openQuestions": ["string"],',
        '  "additionalObservations": ["string"]',
        "}",
        "```",
        "Rules:",
        "- Return only this JSON object with no extra top-level keys.",
        "- Do not include `resultId`, `role`, `provider`, `model`, `sessionId`, `continuation`, `mode`, or `story`; the CLI adds identity fields itself.",
        "- In initial mode, `priorFindingStatuses` must be empty and all surfaced findings must appear in both `newFindings` and `openFindings`.",
        "- In follow-up mode, preserve finding ids for carried findings and add new findings only for newly introduced regressions or directly touched-surface issues.",
      ].join("\n");
    case "epic_verifier":
      return [
        "```json",
        "{",
        '  "outcome": "pass" | "revise" | "block",',
        '  "crossStoryFindings": ["string"],',
        '  "architectureFindings": ["string"],',
        '  "epicCoverageAssessment": ["string"],',
        '  "mockOrShimAuditFindings": ["string"],',
        '  "blockingFindings": [',
        "    {",
        '      "id": "string",',
        '      "severity": "critical" | "major" | "minor" | "observation",',
        '      "title": "string",',
        '      "evidence": "string",',
        '      "affectedFiles": ["string"],',
        '      "requirementIds": ["string"],',
        '      "recommendedFixScope": "same-session-implementor" | "quick-fix" | "fresh-fix-path" | "human-ruling",',
        '      "blocking": true',
        "    }",
        "  ],",
        '  "nonBlockingFindings": [/* same finding shape */],',
        '  "unresolvedItems": ["string"],',
        '  "gateResult": "pass" | "fail" | "not-run"',
        "}",
        "```",
        "Rules:",
        "- Return only this JSON object with no extra top-level keys.",
        "- Do not include `resultId`, `provider`, `model`, or `reviewerLabel`; the CLI adds identity fields itself.",
      ].join("\n");
    case "epic_synthesizer":
      return [
        "```json",
        "{",
        '  "outcome": "ready-for-closeout" | "needs-fixes" | "needs-more-verification" | "blocked",',
        '  "confirmedIssues": ["string"],',
        '  "disputedOrUnconfirmedIssues": ["string"],',
        '  "readinessAssessment": "string",',
        '  "recommendedNextStep": "string"',
        "}",
        "```",
        "Rules:",
        "- Return only this JSON object with no extra top-level keys.",
        "- Do not include `resultId`; the CLI adds identity fields itself.",
      ].join("\n");
    case "quick_fixer":
      return "";
  }
}

function routingGuidance(input: PromptAssemblyInput): string {
  switch (input.role) {
    case "story_verifier":
      return input.verifierMode === "followup"
        ? "Preserve stable finding ids, resolve prior blockers when the implementor evidence closes them, and raise needs-human-ruling instead of silently downgrading scope disputes."
        : "Preserve the outcome, requirement coverage, and recommended fix scope for the orchestrator.";
    case "quick_fixer":
      return "Report whether the bounded fix is ready for verification or needs more routing.";
    case "epic_synthesizer":
      return "Keep confirmed issues separate from disputed or unconfirmed issues.";
    default:
      return "";
  }
}

function runtimeValues(input: PromptAssemblyInput): Record<string, string> {
  const values: Record<string, string> = {
    STORY_ID: input.storyId ?? "",
    STORY_TITLE: input.storyTitle ?? "",
    STORY_PATH: input.storyPath ?? "",
    EPIC_PATH: input.epicPath ?? "",
    TECH_DESIGN_PATH: input.techDesignPath ?? "",
    TEST_PLAN_PATH: input.testPlanPath ?? "",
    STORY_GATE_COMMAND: input.gateCommands.story ?? "not provided",
    EPIC_GATE_COMMAND: input.gateCommands.epic ?? "not provided",
    RESULT_CONTRACT_NAME: resultContractName(input),
    RESULT_CONTRACT_SCHEMA: resultContractSchema(input),
    ROUTING_GUIDANCE: routingGuidance(input),
    READING_JOURNEY: buildReadingJourney(input),
    VERIFIER_LABEL:
      input.role === "epic_verifier"
          ? (input.reviewerLabel ?? "")
          : "",
    VERIFIER_MODE:
      input.role === "story_verifier" ? input.verifierMode : "",
    VERIFIER_SESSION_ID:
      input.role === "story_verifier" ? input.verifierSessionId ?? "" : "",
    PRIOR_OPEN_FINDINGS:
      input.role === "story_verifier" ? input.priorOpenFindingsJson ?? "" : "",
    FOLLOWUP_RESPONSE:
      input.role === "story_verifier" ? input.followupResponse ?? "" : "",
    ORCHESTRATOR_CONTEXT:
      input.role === "story_verifier" ? input.orchestratorContext ?? "" : "",
    FOLLOWUP_REQUEST:
      input.role === "quick_fixer"
        ? input.followupRequest
        : input.role === "story_implementor"
          ? input.followupRequest ?? ""
          : "",
    AFFECTED_SCOPE:
      input.role === "quick_fixer" ? input.affectedScope ?? "" : "",
  };

  if (input.role === "story_implementor" && input.selfReviewPass) {
    values.RESULT_CONTRACT_NAME = resultContractName(input);
  }
  return values;
}

function interpolateTemplate(
  template: string,
  values: Record<string, string>
): string {
  return template.replaceAll(/{{([A-Z_]+)}}/g, (_, key: string) => {
    return values[key] ?? "";
  });
}

async function loadPublicInsert(
  path: string | undefined
): Promise<{ assetId?: string; content?: string }> {
  if (!path || !(await pathExists(path))) {
    return {};
  }

  const file = Bun.file(path);
  if (file.size > MAX_PUBLIC_INSERT_BYTES) {
    throw new PromptInsertError(
      `Public prompt insert exceeds ${MAX_PUBLIC_INSERT_BYTES} bytes: ${path}`
    );
  }

  try {
    return {
      assetId: basename(path),
      content: await readTextFile(path),
    };
  } catch (error) {
    throw new PromptInsertError(
      `Public prompt insert could not be read: ${path}${
        error instanceof Error ? ` (${error.message})` : ""
      }`
    );
  }
}

function publicInsertPathForInput(input: PromptAssemblyInput): string | undefined {
  // Keep the size/readability guard structural so any future role-specific insert
  // path still passes through the same validation boundary.
  if (
    "implementationPromptInsertPath" in input &&
    typeof input.implementationPromptInsertPath === "string"
  ) {
    return input.implementationPromptInsertPath;
  }

  if (
    "verifierPromptInsertPath" in input &&
    typeof input.verifierPromptInsertPath === "string"
  ) {
    return input.verifierPromptInsertPath;
  }

  return undefined;
}

function selfReviewSection(input: PromptAssemblyInput): string {
  if (input.role !== "story_implementor" || !input.selfReviewPass) {
    return "";
  }

  return `Self-review pass ${input.selfReviewPass}`;
}

function followupSection(input: PromptAssemblyInput): string {
  if (input.role !== "story_implementor" || !input.followupRequest) {
    return "";
  }

  return `## Follow-up Request\n${input.followupRequest.trim()}`;
}

export async function assemblePrompt(
  input: PromptAssemblyInput
): Promise<PromptAssemblyResult> {
  const assets = getEmbeddedPromptAssets();
  const basePromptId = basePromptIdForRole(input.role);
  const snippetIds = snippetIdsForInput(input);
  const values = runtimeValues(input);
  const publicInsert = await loadPublicInsert(publicInsertPathForInput(input));

  const sections = [
    interpolateTemplate(assets.base[basePromptId], values),
    ...snippetIds.map((snippetId) =>
      interpolateTemplate(assets.snippets[snippetId], values)
    ),
    selfReviewSection(input),
    followupSection(input),
    publicInsert.content ? publicInsert.content.trimEnd() : "",
  ].filter((section) => section.length > 0);

  return {
    prompt: `${sections.join("\n\n")}\n`,
    basePromptId,
    snippetIds,
    publicInsertIds: publicInsert.assetId ? [publicInsert.assetId] : [],
  };
}
