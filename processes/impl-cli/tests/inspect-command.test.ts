import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { TEAM_IMPL_LOG_FILE_NAME } from "../core/log-template";
import {
  createSpecPack,
  parseJsonOutput,
  runSourceCli,
  writeTextFile,
} from "./test-helpers";

describe("inspect command", () => {
  test("TC-1.1a / TC-1.2a accepts and records a valid two-file tech-design layout", async () => {
    const specPackRoot = await createSpecPack("inspect-two-file");
    const run = await runSourceCli([
      "inspect",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ]);

    expect(run.exitCode).toBe(0);
    expect(run.stderr).toBe("");

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.command).toBe("inspect");
    expect(envelope.status).toBe("ok");
    expect(envelope.outcome).toBe("ready");
    expect(envelope.result.techDesignShape).toBe("two-file");
    expect(envelope.result.artifacts.techDesignCompanionPaths).toEqual([]);
  });

  test("creates team-impl-log.md when inspect marks the spec pack ready and no log exists", async () => {
    const specPackRoot = await createSpecPack("inspect-log-create");
    const logPath = join(specPackRoot, TEAM_IMPL_LOG_FILE_NAME);

    expect(await Bun.file(logPath).exists()).toBe(false);

    const run = await runSourceCli([
      "inspect",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ]);

    expect(run.exitCode).toBe(0);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.outcome).toBe("ready");
    expect(await Bun.file(logPath).exists()).toBe(true);

    const logContent = await Bun.file(logPath).text();
    expect(logContent).toContain("# Team Implementation Log");
    expect(logContent).toContain("- Current Phase: inspect");
    expect(logContent).toContain("- 00-foundation");
    expect(logContent).toContain("- 01-next");
  });

  test("preserves an existing team-impl-log.md when inspect marks the spec pack ready", async () => {
    const specPackRoot = await createSpecPack("inspect-log-preserve");
    const logPath = join(specPackRoot, TEAM_IMPL_LOG_FILE_NAME);
    const existingLog = "# Existing Log\n\nresume marker\n";
    await writeTextFile(logPath, existingLog);

    const run = await runSourceCli([
      "inspect",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ]);

    expect(run.exitCode).toBe(0);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.outcome).toBe("ready");
    expect(await Bun.file(logPath).text()).toBe(existingLog);
  });

  test("TC-1.1b / TC-1.2b accepts and records a valid four-file tech-design layout", async () => {
    const specPackRoot = await createSpecPack("inspect-four-file", {
      companionMode: "four-file",
    });
    const run = await runSourceCli([
      "inspect",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ]);

    expect(run.exitCode).toBe(0);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("ok");
    expect(envelope.outcome).toBe("ready");
    expect(envelope.result.techDesignShape).toBe("four-file");
    expect(envelope.result.artifacts.techDesignCompanionPaths).toEqual([
      `${specPackRoot}/tech-design-cli-runtime.md`,
      `${specPackRoot}/tech-design-skill-process.md`,
    ]);
  });

  test("TC-1.1c rejects stories.md in place of stories/", async () => {
    const specPackRoot = await createSpecPack("inspect-stories-md", {
      includeStoriesDir: false,
      includeStoriesFile: true,
    });
    const run = await runSourceCli([
      "inspect",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ]);

    expect(run.exitCode).toBe(3);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("blocked");
    expect(envelope.outcome).toBe("blocked");
    expect(envelope.errors[0].code).toBe("INVALID_SPEC_PACK");
    expect(envelope.result.blockers).toContain(
      "Expected stories/ directory but found stories.md"
    );
    expect(await Bun.file(join(specPackRoot, TEAM_IMPL_LOG_FILE_NAME)).exists()).toBe(
      false
    );
  });

  test("TC-1.1d identifies a missing required artifact explicitly", async () => {
    const specPackRoot = await createSpecPack("inspect-missing-artifact", {
      includeEpic: false,
    });
    const run = await runSourceCli([
      "inspect",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ]);

    expect(run.exitCode).toBe(3);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("blocked");
    expect(envelope.result.blockers).toContain("Missing required artifact: epic.md");
  });

  test("TC-1.4a records both public prompt inserts when present", async () => {
    const specPackRoot = await createSpecPack("inspect-with-inserts", {
      includeImplInsert: true,
      includeVerifierInsert: true,
    });
    const run = await runSourceCli([
      "inspect",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ]);

    expect(run.exitCode).toBe(0);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.result.inserts.customStoryImplPromptInsert).toBe("present");
    expect(envelope.result.inserts.customStoryVerifierPromptInsert).toBe("present");
  });

  test("TC-1.4b continues normally when public prompt inserts are absent", async () => {
    const specPackRoot = await createSpecPack("inspect-without-inserts");
    const run = await runSourceCli([
      "inspect",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ]);

    expect(run.exitCode).toBe(0);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("ok");
    expect(envelope.result.inserts.customStoryImplPromptInsert).toBe("absent");
    expect(envelope.result.inserts.customStoryVerifierPromptInsert).toBe("absent");
  });

  test("blocks invalid tech-design companion layouts instead of accepting them silently", async () => {
    const specPackRoot = await createSpecPack("inspect-invalid-companions");
    await writeTextFile(
      `${specPackRoot}/tech-design-notes.md`,
      "# Invalid Companion\n"
    );

    const run = await runSourceCli([
      "inspect",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ]);

    expect(run.exitCode).toBe(3);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("blocked");
    expect(envelope.result.blockers).toContain(
      "Invalid tech-design companion layout: expected tech-design-cli-runtime.md and tech-design-skill-process.md for the four-file configuration"
    );
  });
});
