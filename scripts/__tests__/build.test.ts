/**
 * Integration tests for the liminal-spec build script.
 *
 * Runs the real build against real source files, then verifies the output.
 * No fixture files, no swaps, no cleanup of source content.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const DIST = join(ROOT, "dist");
const DIST_PLUGIN = join(DIST, "plugin");
const DIST_STANDALONE = join(DIST, "standalone");

// Run the build once before all tests
let buildExitCode = -1;
let buildOutput = "";

beforeAll(async () => {
  await rm(DIST, { recursive: true, force: true });

  const proc = Bun.spawn(["bun", "run", "scripts/build.ts"], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  buildOutput = stdout + stderr;
  buildExitCode = await proc.exited;
}, 30_000);

afterAll(async () => {
  await rm(DIST, { recursive: true, force: true });
});

// -------------------------------------------------------------------------
// Build basics
// -------------------------------------------------------------------------

describe("build script", () => {
  test("exits with code 0", () => {
    expect(buildExitCode).toBe(0);
  });

  test("prints build summary with all skills", () => {
    expect(buildOutput).toContain("skill: epic");
    expect(buildOutput).toContain("skill: tech-design");
    expect(buildOutput).toContain("skill: story");
    expect(buildOutput).toContain("skill: impl");
  });

  test("prints agent and command in summary", () => {
    expect(buildOutput).toContain("agent: senior-engineer");
    expect(buildOutput).toContain("command: liminal-spec");
  });
});

// -------------------------------------------------------------------------
// Plugin output structure
// -------------------------------------------------------------------------

describe("plugin output", () => {
  const expectedSkills = ["epic", "tech-design", "story", "impl"];

  for (const skill of expectedSkills) {
    test(`creates skills/${skill}/SKILL.md`, async () => {
      const exists = await Bun.file(
        join(DIST_PLUGIN, "skills", skill, "SKILL.md")
      ).exists();
      expect(exists).toBe(true);
    });
  }

  test("creates agents/senior-engineer.md", async () => {
    const exists = await Bun.file(
      join(DIST_PLUGIN, "agents", "senior-engineer.md")
    ).exists();
    expect(exists).toBe(true);
  });

  test("creates commands/liminal-spec.md", async () => {
    const exists = await Bun.file(
      join(DIST_PLUGIN, "commands", "liminal-spec.md")
    ).exists();
    expect(exists).toBe(true);
  });

  test("creates plugin.json with required fields", async () => {
    const data = await Bun.file(
      join(DIST_PLUGIN, ".claude-plugin", "plugin.json")
    ).json();
    expect(data.name).toBe("liminal-spec");
    expect(data.version).toBe("0.1.0");
  });

  test("creates marketplace.json with required fields", async () => {
    const data = await Bun.file(
      join(DIST_PLUGIN, ".claude-plugin", "marketplace.json")
    ).json();
    expect(data.name).toBe("liminal-plugins");
    expect(data.owner.name).toBe("liminal-ai");
    expect(data.plugins.length).toBeGreaterThan(0);
  });
});

// -------------------------------------------------------------------------
// Skill content verification
// -------------------------------------------------------------------------

describe("skill content", () => {
  test("epic has correct frontmatter", async () => {
    const content = await Bun.file(
      join(DIST_PLUGIN, "skills", "epic", "SKILL.md")
    ).text();
    expect(content).toContain("name: epic");
    expect(content).toContain("description:");
  });

  test("epic contains phase content from feature-specification", async () => {
    const content = await Bun.file(
      join(DIST_PLUGIN, "skills", "epic", "SKILL.md")
    ).text();
    // This string is from the first line of references/feature-specification.md
    expect(content).toContain("Feature Specification");
    expect(content).toContain("Acceptance Criteria");
  });

  test("epic contains inlined shared content", async () => {
    const content = await Bun.file(
      join(DIST_PLUGIN, "skills", "epic", "SKILL.md")
    ).text();
    expect(content).toContain("Confidence Chain");
    expect(content).toContain("Context Isolation");
    expect(content).toContain("Writing Style");
  });

  test("tech-design contains testing reference", async () => {
    const content = await Bun.file(
      join(DIST_PLUGIN, "skills", "tech-design", "SKILL.md")
    ).text();
    expect(content).toContain("Service Mocks");
    expect(content).toContain("Mock Strategy");
  });

  test("impl contains execution orchestration content", async () => {
    const content = await Bun.file(
      join(DIST_PLUGIN, "skills", "impl", "SKILL.md")
    ).text();
    expect(content).toContain("Dual-Validator Pattern");
    expect(content).toContain("The Execution Cycle");
  });
});

// -------------------------------------------------------------------------
// Standalone output
// -------------------------------------------------------------------------

describe("standalone output", () => {
  const expectedFiles = [
    "liminal-epic.md",
    "liminal-tech-design.md",
    "liminal-story.md",
    "liminal-impl.md",
  ];

  for (const file of expectedFiles) {
    test(`creates ${file}`, async () => {
      const exists = await Bun.file(join(DIST_STANDALONE, file)).exists();
      expect(exists).toBe(true);
    });
  }

  test("standalone files do not have YAML frontmatter", async () => {
    for (const file of expectedFiles) {
      const content = await Bun.file(join(DIST_STANDALONE, file)).text();
      expect(content.startsWith("---")).toBe(false);
    }
  });

  test("standalone files have content", async () => {
    for (const file of expectedFiles) {
      const content = await Bun.file(join(DIST_STANDALONE, file)).text();
      expect(content.trim().length).toBeGreaterThan(100);
    }
  });
});

// -------------------------------------------------------------------------
// Source files are untouched
// -------------------------------------------------------------------------

describe("source file safety", () => {
  test("src/ files still exist after build", async () => {
    const criticalFiles = [
      "src/phases/epic.md",
      "src/phases/tech-design.md",
      "src/phases/story.md",
      "src/phases/impl.md",
      "src/shared/confidence-chain.md",
      "src/shared/writing-style.md",
      "src/commands/liminal-spec.md",
      "src/agents/senior-engineer.md",
    ];

    for (const file of criticalFiles) {
      const exists = await Bun.file(join(ROOT, file)).exists();
      expect(exists).toBe(true);
    }
  });
});
