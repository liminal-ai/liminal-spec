import { join, resolve } from "node:path";

import { pathExists, readTextFile, writeTextFile } from "./fs-utils";

export const TEAM_IMPL_LOG_FILE_NAME = "team-impl-log.md";

export interface EnsureTeamImplLogInput {
  specPackRoot: string;
  storyIds: string[];
}

export interface EnsureTeamImplLogResult {
  created: boolean;
  path: string;
  content: string;
}

function toReceiptStoryId(storyId: string): string {
  const numericPrefix = storyId.match(/^(\d+)/)?.[1];
  if (numericPrefix) {
    return `story-${numericPrefix.padStart(2, "0")}`;
  }

  return storyId.startsWith("story-") ? storyId : `story-${storyId}`;
}

function toReceiptTitle(storyId: string): string {
  const titleSource = storyId.replace(/^\d+-/, "");
  const words = titleSource
    .split("-")
    .filter(Boolean)
    .map((word) => word.toLowerCase());

  return words
    .map((word, index) => {
      if (index > 0 && ["a", "an", "and", "for", "in", "of", "on", "the", "to", "with"].includes(word)) {
        return word;
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function renderStoryReceiptTemplate(storyIds: string[]): string {
  if (storyIds.length === 0) {
    return "- none yet";
  }

  const templateStoryId = storyIds[storyIds.length - 1];

  return [
    `### ${toReceiptStoryId(templateStoryId)}`,
    `- Title: ${toReceiptTitle(templateStoryId)}`,
    "- Implementor Evidence Ref: pending",
    "- Verifier Evidence Refs:",
    "  - pending-primary",
    "  - pending-secondary",
    "- Gate Command: pending",
    "- Gate Result: pending (pass | fail)",
    "- Dispositions:",
    "  - FINDING-ID: fixed | accepted-risk | defer",
    "- Baseline Before Story: pending",
    "- Baseline After Story: pending",
    "- Open Risks:",
    "  - pending",
    "- User Acceptance: pending",
  ].join("\n");
}

export function renderTeamImplLogTemplate(input: EnsureTeamImplLogInput): string {
  const specPackRoot = resolve(input.specPackRoot);
  const storyLines =
    input.storyIds.length === 0
      ? "- none yet"
      : input.storyIds.map((storyId) => `- ${storyId}`).join("\n");

  return [
    "# Team Implementation Log",
    "",
    "## Run Overview",
    "- State: SETUP",
    `- Spec Pack Root: ${specPackRoot}`,
    "- Current Story: not-started",
    "- Current Phase: inspect",
    "- Last Completed Checkpoint: none",
    "",
    "## Run Configuration",
    "- Primary Harness: claude-code",
    "- Story Implementor: pending",
    "- Quick Fixer: pending",
    "- Story Verifier 1: pending",
    "- Story Verifier 2: pending",
    "- Self Review Passes: pending",
    "- Degraded Diversity: pending",
    "",
    "## Verification Gates",
    "- Story Gate: pending",
    "- Epic Gate: pending",
    "- Gate Discovery Source: pending",
    "",
    "## Story Sequence",
    storyLines,
    "",
    "## Current Continuation Handles",
    "- Story Implementor:",
    "  - Story: none",
    "  - Provider: none",
    "  - Session ID: none",
    "  - Result Artifact: none",
    "",
    "## Story Receipts",
    renderStoryReceiptTemplate(input.storyIds),
    "",
    "## Cumulative Baselines",
    "- Baseline Before Current Story: pending",
    "- Expected After Current Story: pending",
    "- Latest Actual Total: pending",
    "",
    "## Cleanup / Epic Verification",
    "- Cleanup Artifact: pending",
    "- Cleanup Status: not-started",
    "- Epic Verification Status: not-started",
    "",
    "## Open Risks / Accepted Risks",
    "- none",
    "",
  ].join("\n");
}

export async function ensureTeamImplLog(
  input: EnsureTeamImplLogInput
): Promise<EnsureTeamImplLogResult> {
  const path = join(resolve(input.specPackRoot), TEAM_IMPL_LOG_FILE_NAME);

  if (await pathExists(path)) {
    return {
      created: false,
      path,
      content: await readTextFile(path),
    };
  }

  const content = renderTeamImplLogTemplate(input);
  await writeTextFile(path, content);

  return {
    created: true,
    path,
    content,
  };
}
