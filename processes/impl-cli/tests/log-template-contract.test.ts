import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { ensureTeamImplLog } from "../core/log-template";
import { createTempDir, writeTextFile } from "./test-helpers";

function parseStoryImplementorHandle(content: string) {
  const match = content.match(
    /## Current Continuation Handles\n- Story Implementor:\n  - Story: (?<story>[^\n]+)\n  - Provider: (?<provider>[^\n]+)\n  - Session ID: (?<sessionId>[^\n]+)\n  - Result Artifact: (?<artifact>[^\n]+)/
  );

  expect(match?.groups).toBeDefined();

  return {
    story: match?.groups?.story,
    provider: match?.groups?.provider,
    sessionId: match?.groups?.sessionId,
    artifact: match?.groups?.artifact,
  };
}

function parseStoryVerifierHandle(content: string) {
  const match = content.match(
    /- Story Verifier:\n  - Story: (?<story>[^\n]+)\n  - Provider: (?<provider>[^\n]+)\n  - Session ID: (?<sessionId>[^\n]+)\n  - Result Artifact: (?<artifact>[^\n]+)/
  );

  expect(match?.groups).toBeDefined();

  return {
    story: match?.groups?.story,
    provider: match?.groups?.provider,
    sessionId: match?.groups?.sessionId,
    artifact: match?.groups?.artifact,
  };
}

describe("team-impl log template", () => {
  test("TC-1.3a initializes a new log with the required recovery headings", async () => {
    const specPackRoot = await createTempDir("log-init");

    const result = await ensureTeamImplLog({
      specPackRoot,
      storyIds: ["00-foundation", "01-next"],
    });

    expect(result.created).toBe(true);
    expect(result.path).toBe(join(specPackRoot, "team-impl-log.md"));

    const content = await Bun.file(result.path).text();
    expect(content).toContain("# Team Implementation Log");
    expect(content).toContain("## Run Overview");
    expect(content).toContain("- State: SETUP");
    expect(content).toContain("## Run Configuration");
    expect(content).toContain("## Verification Gates");
    expect(content).toContain("## Story Sequence");
    expect(content).toContain("- 00-foundation");
    expect(content).toContain("- 01-next");
    expect(content).toContain("## Story Receipts");
    expect(content).toContain("## Cumulative Baselines");
    expect(content).toContain("## Cleanup / Epic Verification");
    expect(content).toContain("## Open Risks / Accepted Risks");
  });

  test("TC-1.3b preserves an existing log for resume instead of overwriting it", async () => {
    const specPackRoot = await createTempDir("log-resume");
    const existingPath = join(specPackRoot, "team-impl-log.md");
    await writeTextFile(existingPath, "# Existing Log\n\nresume marker\n");

    const result = await ensureTeamImplLog({
      specPackRoot,
      storyIds: ["00-foundation"],
    });

    expect(result.created).toBe(false);
    expect(await Bun.file(existingPath).text()).toBe(
      "# Existing Log\n\nresume marker\n"
    );
  });

  test("TC-6.1a keeps the receipt template aligned with the required acceptance evidence fields", async () => {
    const specPackRoot = await createTempDir("log-receipt");

    const result = await ensureTeamImplLog({
      specPackRoot,
      storyIds: ["06-story-acceptance-and-progression"],
    });

    expect(result.content).toContain("## Story Receipts");
    expect(result.content).toContain("### story-06");
    expect(result.content).toContain("- Title: Story Acceptance and Progression");
    expect(result.content).toContain("- Implementor Evidence Ref: pending");
    expect(result.content).toContain("- Verifier Evidence Refs:");
    expect(result.content).toContain("  - pending");
    expect(result.content).toContain("- Gate Command: pending");
    expect(result.content).toContain("- Gate Result: pending (pass | fail)");
    expect(result.content).toContain("- Dispositions:");
    expect(result.content).toContain(
      "  - FINDING-ID: fixed | accepted-risk | defer"
    );
    expect(result.content).toContain("- Baseline Before Story: pending");
    expect(result.content).toContain("- Baseline After Story: pending");
    expect(result.content).toContain("- Open Risks:");
    expect(result.content).toContain("  - pending");
  });

  test("TC-6.3a keeps continuation handles in a labeled, recoverable shape for disk-only resume", async () => {
    const specPackRoot = await createTempDir("log-recovery");

    const result = await ensureTeamImplLog({
      specPackRoot,
      storyIds: ["07-resume-and-recovery"],
    });

    expect(result.content).toContain("- Current Story: not-started");
    expect(result.content).toContain("- Current Phase: inspect");
    expect(result.content).toContain("- Last Completed Checkpoint: none");
    expect(parseStoryImplementorHandle(result.content)).toEqual({
      story: "none",
      provider: "none",
      sessionId: "none",
      artifact: "none",
    });
    expect(parseStoryVerifierHandle(result.content)).toEqual({
      story: "none",
      provider: "none",
      sessionId: "none",
      artifact: "none",
    });
  });

  test("distinguishes an explicit none sentinel from a filled continuation handle block", () => {
    const filledBlock = [
      "## Current Continuation Handles",
      "- Story Implementor:",
      "  - Story: story-07",
      "  - Provider: codex",
      "  - Session ID: codex-session-701",
      "  - Result Artifact: artifacts/story-07/001-implementor.json",
    ].join("\n");

    expect(parseStoryImplementorHandle(filledBlock)).toEqual({
      story: "story-07",
      provider: "codex",
      sessionId: "codex-session-701",
      artifact: "artifacts/story-07/001-implementor.json",
    });
  });
});
