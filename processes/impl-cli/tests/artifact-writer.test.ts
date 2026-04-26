import { join } from "node:path";

import { expect, test } from "bun:test";

import {
  buildRuntimeProgressPaths,
  buildStreamOutputPaths,
  nextGroupedArtifactPath,
  writeJsonArtifact,
} from "../core/artifact-writer";
import { createTempDir, writeTextFile } from "./test-helpers";

test("artifact numbering skips orphaned progress and stream slots from aborted operations", async () => {
  const specPackRoot = await createTempDir("artifact-writer-orphaned-slots");
  const firstArtifactPath = await nextGroupedArtifactPath(
    specPackRoot,
    "story-02",
    "verify"
  );
  expect(firstArtifactPath).toContain("/artifacts/story-02/001-verify.json");

  const firstProgressPaths = buildRuntimeProgressPaths(firstArtifactPath);
  const firstStreamPaths = buildStreamOutputPaths(firstArtifactPath);
  await writeTextFile(firstProgressPaths.statusPath, "{}\n");
  await writeTextFile(firstProgressPaths.progressPath, "{}\n");
  await writeTextFile(firstStreamPaths.stdoutPath, "partial stdout\n");
  await writeTextFile(firstStreamPaths.stderrPath, "partial stderr\n");

  const secondArtifactPath = await nextGroupedArtifactPath(
    specPackRoot,
    "story-02",
    "verify"
  );
  expect(secondArtifactPath).toContain("/artifacts/story-02/002-verify.json");
});

test("artifact numbering advances from completed json envelopes as before", async () => {
  const specPackRoot = await createTempDir("artifact-writer-completed-json");
  const firstArtifactPath = await nextGroupedArtifactPath(
    specPackRoot,
    "quick-fix",
    "quick-fix"
  );
  await writeJsonArtifact(firstArtifactPath, { ok: true });

  const nextArtifactPath = await nextGroupedArtifactPath(
    specPackRoot,
    "quick-fix",
    "quick-fix"
  );
  expect(nextArtifactPath).toContain("/artifacts/quick-fix/002-quick-fix.json");
});
