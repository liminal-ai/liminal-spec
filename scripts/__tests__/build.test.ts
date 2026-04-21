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
const TEST_ROOT_REL = ".test-tmp/build-script";
const TEST_DIST_REL = `${TEST_ROOT_REL}/dist`;
const TEST_ROOT = join(ROOT, TEST_ROOT_REL);
const DIST = join(ROOT, TEST_DIST_REL);
const DIST_SKILLS = join(DIST, "skills");
const DIST_STANDALONE = join(DIST, "standalone");

// Run the build once before all tests
let buildExitCode = -1;
let buildOutput = "";
let expectedVersion = "";

beforeAll(async () => {
  await rm(TEST_ROOT, { recursive: true, force: true });

  const manifest = (await Bun.file(join(ROOT, "manifest.json")).json()) as {
    version: string;
  };
  expectedVersion = manifest.version;

  const proc = Bun.spawn(["bun", "run", "scripts/build.ts"], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      DIST_DIR: TEST_DIST_REL,
    },
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  buildOutput = stdout + stderr;
  buildExitCode = await proc.exited;
}, 30_000);

afterAll(async () => {
  await rm(TEST_ROOT, { recursive: true, force: true });
});

// -------------------------------------------------------------------------
// Build basics
// -------------------------------------------------------------------------

describe("build script", () => {
  test("exits with code 0", () => {
    expect(buildExitCode).toBe(0);
  });

  test("prints build summary with all skills", () => {
    expect(buildOutput).toContain("skill: ls-prd");
    expect(buildOutput).toContain("skill: ls-arch");
    expect(buildOutput).toContain("skill: ls-epic");
    expect(buildOutput).toContain("skill: ls-tech-design");
    expect(buildOutput).toContain("skill: ls-publish-epic");
    expect(buildOutput).toContain("skill: ls-current-docs");
    expect(buildOutput).toContain("skill: ls-team-impl");
    expect(buildOutput).toContain("skill: ls-team-impl-cc");
    expect(buildOutput).toContain("skill: ls-team-spec");
  });

  test("does not emit removed skills", () => {
    expect(buildOutput).not.toContain("skill: ls-research");
    expect(buildOutput).not.toContain("skill: ls-team-impl-c\n");
    expect(buildOutput).not.toContain("skill: ls-team-impl-c ");
    expect(buildOutput).not.toContain("skill: ls-subagent-impl-cc");
    expect(buildOutput).not.toContain("skill: ls-subagent-impl");
    expect(buildOutput).not.toContain("skill: lss-story");
    expect(buildOutput).not.toContain("skill: lss-tech");
  });
});

// -------------------------------------------------------------------------
// Skill output structure
// -------------------------------------------------------------------------

describe("skill output", () => {
  const expectedSkills = [
    "ls-prd",
    "ls-arch",
    "ls-epic",
    "ls-tech-design",
    "ls-publish-epic",
    "ls-current-docs",
    "ls-team-impl",
    "ls-team-impl-cc",
    "ls-team-spec",
  ];

  for (const skill of expectedSkills) {
    test(`creates skills/${skill}/SKILL.md`, async () => {
      const exists = await Bun.file(
        join(DIST_SKILLS, skill, "SKILL.md")
      ).exists();
      expect(exists).toBe(true);
    });
  }

  test("does not emit removed skills", async () => {
    for (const removed of ["ls-research", "ls-team-impl-c", "ls-subagent-impl-cc", "ls-subagent-impl", "ls-story", "ls-story-tech", "ls-impl", "lss-story", "lss-tech"]) {
      const exists = await Bun.file(
        join(DIST_SKILLS, removed, "SKILL.md")
      ).exists();
      expect(exists).toBe(false);
    }
  });

  test("does not emit plugin metadata", async () => {
    const pluginJson = await Bun.file(
      join(DIST, "plugin", ".claude-plugin", "plugin.json")
    ).exists();
    expect(pluginJson).toBe(false);
  });

  test("bundles current-state companion references for installed-skill use", async () => {
    const functionalRef = await Bun.file(
      join(DIST_SKILLS, "ls-current-docs", "references", "current-state-functional.md")
    ).exists();
    const technicalRef = await Bun.file(
      join(DIST_SKILLS, "ls-current-docs", "references", "current-state-technical.md")
    ).exists();
    const codeMapRef = await Bun.file(
      join(DIST_SKILLS, "ls-current-docs", "references", "current-state-code-map.md")
    ).exists();

    expect(functionalRef).toBe(true);
    expect(technicalRef).toBe(true);
    expect(codeMapRef).toBe(true);
  });

});

// -------------------------------------------------------------------------
// Skill content verification
// -------------------------------------------------------------------------

describe("skill content", () => {
  test("epic has correct frontmatter and content", async () => {
    const content = await Bun.file(
      join(DIST_SKILLS, "ls-epic", "SKILL.md")
    ).text();
    expect(content).toContain("name: ls-epic");
    expect(content).toContain("description:");
    expect(content).toContain("# Epic");
    expect(content).toContain("Acceptance Criteria");
    expect(content).toContain("Confidence Chain");
  });

  test("tech-design contains testing reference", async () => {
    const content = await Bun.file(
      join(DIST_SKILLS, "ls-tech-design", "SKILL.md")
    ).text();
    expect(content).toContain("Service Mocks");
    expect(content).toContain("Mock Strategy");
  });

  test("publish-epic contains core content", async () => {
    const content = await Bun.file(
      join(DIST_SKILLS, "ls-publish-epic", "SKILL.md")
    ).text();
    expect(content).toContain("# Publish Epic");
    expect(content).toContain("Build Individual Story Files");
    expect(content).toContain("Coverage Gate");
  });

  test("current-docs contains baseline reconstruction content", async () => {
    const content = await Bun.file(
      join(DIST_SKILLS, "ls-current-docs", "SKILL.md")
    ).text();
    expect(content).toContain("# Current State Baseline");
    expect(content).toContain("Evidence Hierarchy");
    expect(content).toContain("Config Selection Rule");
    expect(content).toContain("Produced vs Supported vs Planned");
    expect(content).toContain("Overstatement Review Pass");
    expect(content).toContain("references/current-state-functional.md");
    expect(content).toContain("references/current-state-technical.md");
    expect(content).toContain("references/current-state-code-map.md");
    expect(content).toContain("current-state-code-map.md");
    expect(content).toContain("Subagent Pattern");
  });

  test("team-impl contains CLI orchestration content", async () => {
    const content = await Bun.file(
      join(DIST_SKILLS, "ls-team-impl", "SKILL.md")
    ).text();
    expect(content).toContain("Orchestrator");
    expect(content).toContain("Skill Reload Requirement");
    expect(content).toContain("External Model Failure Protocol");
    expect(content).toContain("team-impl-log.md");
  });

  test("team-impl contains epic verification protocol", async () => {
    const content = await Bun.file(
      join(DIST_SKILLS, "ls-team-impl", "SKILL.md")
    ).text();
    expect(content).toContain("Phase 1: Four Parallel Reviews");
    expect(content).toContain("Phase 2: Meta-Reports");
    expect(content).toContain("Phase 3: Orchestrator Synthesis");
  });

  test("team-impl-cc contains Claude Code orchestration content", async () => {
    const content = await Bun.file(
      join(DIST_SKILLS, "ls-team-impl-cc", "SKILL.md")
    ).text();
    expect(content).toContain("Orchestrator");
    expect(content).toContain("Skill Reload Requirement");
    expect(content).toContain("Prompt Map");
    expect(content).toContain("Red-Stop / Green-Resume");
    expect(content).toContain("Dual Verification Default");
    expect(content).toContain("team-impl-cc-log.md");
  });

  test("prd contains PRD content", async () => {
    const content = await Bun.file(
      join(DIST_SKILLS, "ls-prd", "SKILL.md")
    ).text();
    expect(content).toContain("Product Requirements Document");
    expect(content).toContain("Altitude");
    expect(content).toContain("Confidence Chain");
  });

  test("arch contains technical architecture content", async () => {
    const content = await Bun.file(
      join(DIST_SKILLS, "ls-arch", "SKILL.md")
    ).text();
    expect(content).toContain("Technical Architecture");
    expect(content).toContain("Architecture Thesis");
    expect(content).toContain("Research Grounding");
    expect(content).toContain("Core Stack");
    expect(content).toContain("System Shape");
  });

  test("dimensional reasoning shared reference is composed into relevant skills", async () => {
    const skillsWithDimensionalReasoning = [
      "ls-prd",
      "ls-arch",
      "ls-epic",
      "ls-tech-design",
      "ls-current-docs",
    ];
    const skillsWithout = [
      "ls-publish-epic",
      "ls-team-impl",
      "ls-team-impl-cc",
      "ls-team-spec",
    ];

    for (const skill of skillsWithDimensionalReasoning) {
      const content = await Bun.file(
        join(DIST_SKILLS, skill, "SKILL.md")
      ).text();
      expect(content).toContain("Dimensional Reasoning Check");
      expect(content).toContain("single-axis reasoning");
    }

    for (const skill of skillsWithout) {
      const content = await Bun.file(
        join(DIST_SKILLS, skill, "SKILL.md")
      ).text();
      expect(content).not.toContain("Dimensional Reasoning Check");
    }
  });

  test("team-spec contains rebuilt orchestration content", async () => {
    const content = await Bun.file(
      join(DIST_SKILLS, "ls-team-spec", "SKILL.md")
    ).text();
    expect(content).toContain("procedural learning architect");
    expect(content).toContain("Three-Phase Handoff");
    expect(content).toContain("Contextual Pedagogy");
    expect(content).toContain("Prompt Map");
    expect(content).toContain("team-spec-log.md");
  });

  test("generated skills do not include legacy phrases", async () => {
    const expectedSkills = [
      "ls-prd", "ls-arch", "ls-epic", "ls-tech-design", "ls-publish-epic",
      "ls-current-docs",
      "ls-team-impl", "ls-team-impl-cc", "ls-team-spec",
    ];
    for (const skill of expectedSkills) {
      const content = await Bun.file(
        join(DIST_SKILLS, skill, "SKILL.md")
      ).text();
      expect(content).not.toContain("All context inlined.");
      expect(content).not.toContain("These are for human traceability.");
    }
  });
});

// -------------------------------------------------------------------------
// Standalone output
// -------------------------------------------------------------------------

describe("standalone output", () => {
  const expectedMdFiles = [
    "00-prd-skill.md",
    "01-technical-architecture-skill.md",
    "02-epic-skill.md",
    "03-technical-design-skill.md",
    "04-publish-epic-skill.md",
    "05-current-docs-skill.md",
    "06-team-implementation-skill.md",
    "06cc-team-implementation-claude-code-skill.md",
    "07-team-spec-skill.md",
  ];

  for (const file of expectedMdFiles) {
    test(`creates ${file}`, async () => {
      const exists = await Bun.file(join(DIST_STANDALONE, file)).exists();
      expect(exists).toBe(true);
    });
  }

  test("standalone md files do not have YAML frontmatter", async () => {
    for (const file of expectedMdFiles) {
      const content = await Bun.file(join(DIST_STANDALONE, file)).text();
      expect(content.startsWith("---")).toBe(false);
    }
  });

  test("standalone md files have content", async () => {
    for (const file of expectedMdFiles) {
      const content = await Bun.file(join(DIST_STANDALONE, file)).text();
      expect(content.trim().length).toBeGreaterThan(100);
    }
  });

  test("creates skill pack zip", async () => {
    const exists = await Bun.file(
      join(DIST_STANDALONE, "liminal-spec-skill-pack.zip")
    ).exists();
    expect(exists).toBe(true);
  });

  test("creates markdown pack zip", async () => {
    const exists = await Bun.file(
      join(DIST_STANDALONE, "liminal-spec-markdown-pack.zip")
    ).exists();
    expect(exists).toBe(true);
  });

  test("packs are non-empty", async () => {
    for (const file of [
      "liminal-spec-skill-pack.zip",
      "liminal-spec-markdown-pack.zip",
    ]) {
      const bunFile = Bun.file(join(DIST_STANDALONE, file));
      expect(bunFile.size).toBeGreaterThan(0);
    }
  });

  test("does not emit legacy .skill artifacts", async () => {
    const glob = new Bun.Glob("*.skill");
    const legacy: string[] = [];
    for await (const match of glob.scan({
      cwd: DIST_STANDALONE,
      absolute: false,
    })) {
      legacy.push(match);
    }
    expect(legacy).toEqual([]);
  });
});

// -------------------------------------------------------------------------
// Source files are untouched
// -------------------------------------------------------------------------

describe("source file safety", () => {
  test("src/ files still exist after build", async () => {
    const criticalFiles = [
      "src/phases/prd.md",
      "src/phases/arch.md",
      "src/phases/epic.md",
      "src/phases/tech-design.md",
      "src/phases/publish-epic.md",
      "src/phases/current-state.md",
      "src/references/current-state-functional.md",
      "src/references/current-state-technical.md",
      "src/references/current-state-code-map.md",
      "src/phases/team-impl.md",
      "src/phases/team-impl-cc.md",
      "src/phases/team-spec.md",
      "src/shared/confidence-chain.md",
      "src/shared/dimensional-reasoning.md",
      "src/shared/writing-style.md",
    ];

    for (const file of criticalFiles) {
      const exists = await Bun.file(join(ROOT, file)).exists();
      expect(exists).toBe(true);
    }
  });
});
