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
  verifierLabel: string;
  verifierPromptInsertPath?: string;
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
  if (input.epicPath) {
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
      return "ImplementorResult";
    case "story_verifier":
      return "StoryVerifierResult";
    case "quick_fixer":
      return "QuickFixResult";
    case "epic_verifier":
      return "EpicVerifierResult";
    case "epic_synthesizer":
      return "EpicSynthesisResult";
  }
}

function routingGuidance(input: PromptAssemblyInput): string {
  switch (input.role) {
    case "story_verifier":
      return "Preserve the outcome, requirement coverage, and recommended fix scope for the orchestrator.";
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
    ROUTING_GUIDANCE: routingGuidance(input),
    READING_JOURNEY: buildReadingJourney(input),
    VERIFIER_LABEL:
      input.role === "story_verifier"
        ? input.verifierLabel
        : input.role === "epic_verifier"
          ? (input.reviewerLabel ?? "")
          : "",
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
  const publicInsert =
    input.role === "story_implementor"
      ? await loadPublicInsert(input.implementationPromptInsertPath)
      : input.role === "story_verifier"
        ? await loadPublicInsert(input.verifierPromptInsertPath)
        : {};

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
