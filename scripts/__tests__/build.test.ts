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
const TEST_MARKETPLACE_REL = `${TEST_ROOT_REL}/marketplace`;
const TEST_ROOT = join(ROOT, TEST_ROOT_REL);
const DIST = join(ROOT, TEST_DIST_REL);
const DIST_PLUGIN = join(DIST, "plugin");
const DIST_INDIVIDUAL = join(DIST, "individual");
const DIST_STANDALONE = join(DIST, "standalone");
const MARKETPLACE_PLUGIN = join(ROOT, TEST_MARKETPLACE_REL);

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
      MARKETPLACE_DIR: TEST_MARKETPLACE_REL,
      SYNC_MARKETPLACE: "1",
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
    expect(buildOutput).toContain("skill: ls-research");
    expect(buildOutput).toContain("skill: ls-epic");
    expect(buildOutput).toContain("skill: ls-tech-design");
    expect(buildOutput).toContain("skill: ls-story");
    expect(buildOutput).toContain("skill: ls-story-tech");
    expect(buildOutput).toContain("skill: ls-impl");
  });

  test("prints agent and command in summary", () => {
    expect(buildOutput).toContain("agent: senior-engineer");
    expect(buildOutput).toContain("command: liminal-spec");
  });

  test("prints individual plugin summary", () => {
    expect(buildOutput).toContain("individual plugin: ls-epic");
    expect(buildOutput).toContain("individual plugin: ls-tech-design");
    expect(buildOutput).toContain("individual plugin: ls-story");
    expect(buildOutput).toContain("individual plugin: ls-story-tech");
  });
});

// -------------------------------------------------------------------------
// Plugin output structure
// -------------------------------------------------------------------------

describe("plugin output", () => {
  const expectedSkills = [
    "ls-research",
    "ls-epic",
    "ls-tech-design",
    "ls-story",
    "ls-story-tech",
    "ls-impl",
  ];

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
    expect(data.version).toBe(expectedVersion);
  });

  test("creates marketplace.json with full suite and individual plugins", async () => {
    const data = await Bun.file(
      join(DIST_PLUGIN, ".claude-plugin", "marketplace.json")
    ).json();
    expect(data.name).toBe("liminal-plugins");
    expect(data.owner.name).toBe("liminal-ai");
    const names = data.plugins.map((p: { name: string }) => p.name);
    expect(names).toContain("liminal-spec");
    expect(names).toContain("ls-epic");
    expect(names).toContain("ls-tech-design");
    expect(names).toContain("ls-story");
    expect(names).toContain("ls-story-tech");
    expect(names.length).toBe(5);
  });
});

// -------------------------------------------------------------------------
// Marketplace install source
// -------------------------------------------------------------------------

describe("marketplace install source", () => {
  test("creates marketplace source plugin.json", async () => {
    const exists = await Bun.file(
      join(MARKETPLACE_PLUGIN, ".claude-plugin", "plugin.json")
    ).exists();
    expect(exists).toBe(true);
  });

  test("includes skill + command + agent directories", async () => {
    const expectedPaths = [
      join(MARKETPLACE_PLUGIN, "skills", "ls-research", "SKILL.md"),
      join(MARKETPLACE_PLUGIN, "skills", "ls-epic", "SKILL.md"),
      join(MARKETPLACE_PLUGIN, "skills", "ls-tech-design", "SKILL.md"),
      join(MARKETPLACE_PLUGIN, "skills", "ls-story", "SKILL.md"),
      join(MARKETPLACE_PLUGIN, "skills", "ls-story-tech", "SKILL.md"),
      join(MARKETPLACE_PLUGIN, "skills", "ls-impl", "SKILL.md"),
      join(MARKETPLACE_PLUGIN, "commands", "liminal-spec.md"),
      join(MARKETPLACE_PLUGIN, "agents", "senior-engineer.md"),
    ];

    for (const path of expectedPaths) {
      expect(await Bun.file(path).exists()).toBe(true);
    }
  });

  test("does not include marketplace.json in marketplace plugin source", async () => {
    const exists = await Bun.file(
      join(MARKETPLACE_PLUGIN, ".claude-plugin", "marketplace.json")
    ).exists();
    expect(exists).toBe(false);
  });
});

// -------------------------------------------------------------------------
// Skill content verification
// -------------------------------------------------------------------------

describe("skill content", () => {
  const expectedSkills = [
    "ls-research",
    "ls-epic",
    "ls-tech-design",
    "ls-story",
    "ls-story-tech",
    "ls-impl",
  ];

  test("epic has correct frontmatter", async () => {
    const content = await Bun.file(
      join(DIST_PLUGIN, "skills", "ls-epic", "SKILL.md")
    ).text();
    expect(content).toContain("name: ls-epic");
    expect(content).toContain("description:");
  });

  test("epic contains phase content", async () => {
    const content = await Bun.file(
      join(DIST_PLUGIN, "skills", "ls-epic", "SKILL.md")
    ).text();
    expect(content).toContain("# Epic");
    expect(content).toContain("Acceptance Criteria");
  });

  test("epic contains inlined shared content", async () => {
    const content = await Bun.file(
      join(DIST_PLUGIN, "skills", "ls-epic", "SKILL.md")
    ).text();
    expect(content).toContain("Confidence Chain");
    expect(content).toContain("Context Isolation");
    expect(content).toContain("Plain Description");
  });

  test("tech-design contains testing reference", async () => {
    const content = await Bun.file(
      join(DIST_PLUGIN, "skills", "ls-tech-design", "SKILL.md")
    ).text();
    expect(content).toContain("Service Mocks");
    expect(content).toContain("Mock Strategy");
  });

  test("impl contains plan-before-you-build content", async () => {
    const content = await Bun.file(
      join(DIST_PLUGIN, "skills", "ls-impl", "SKILL.md")
    ).text();
    expect(content).toContain("Plan Before You Build");
    expect(content).toContain("NotImplementedError");
  });

  test("story does not contain removed prompt-pack content", async () => {
    const content = await Bun.file(
      join(DIST_PLUGIN, "skills", "ls-story", "SKILL.md")
    ).text();
    expect(content).not.toContain("Prompt Pack");
    expect(content).not.toContain("Orchestrator");
  });

  test("story-tech contains contract requirements", async () => {
    const content = await Bun.file(
      join(DIST_PLUGIN, "skills", "ls-story-tech", "SKILL.md")
    ).text();
    expect(content).toContain("Story Contract Requirements");
    expect(content).toContain("Consumer Gate");
    expect(content).toContain("TC to Test Mapping");
    expect(content).toContain("Spec Deviation");
  });

  test("generated skills do not include legacy inlining phrase", async () => {
    for (const skill of expectedSkills) {
      const content = await Bun.file(
        join(DIST_PLUGIN, "skills", skill, "SKILL.md")
      ).text();
      expect(content).not.toContain("All context inlined.");
    }
  });

  test("generated skills do not classify required references as human-only traceability", async () => {
    for (const skill of expectedSkills) {
      const content = await Bun.file(
        join(DIST_PLUGIN, "skills", skill, "SKILL.md")
      ).text();
      expect(content).not.toContain("These are for human traceability.");
    }
  });
});

// -------------------------------------------------------------------------
// Standalone output
// -------------------------------------------------------------------------

describe("standalone output", () => {
  const expectedMdFiles = [
    "01-product-research-skill.md",
    "02-epic-skill.md",
    "03-technical-design-skill.md",
    "04-story-sharding-skill.md",
    "04b-story-technical-enrichment-skill.md",
    "05-implementation-skill.md",
  ];

  const expectedStandalonePacks = [
    "liminal-spec-skill-pack.zip",
    "liminal-spec-markdown-pack.zip",
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

  for (const file of expectedStandalonePacks) {
    test(`creates ${file}`, async () => {
      const exists = await Bun.file(join(DIST_STANDALONE, file)).exists();
      expect(exists).toBe(true);
    });
  }

  test("standalone packs are non-empty zips", async () => {
    for (const file of expectedStandalonePacks) {
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
// Individual plugin output
// -------------------------------------------------------------------------

describe("individual plugins", () => {
  const expectedIndividual = [
    "ls-epic",
    "ls-tech-design",
    "ls-story",
    "ls-story-tech",
  ];

  for (const name of expectedIndividual) {
    test(`creates ${name} plugin with SKILL.md and plugin.json`, async () => {
      const pluginJson = join(
        DIST_INDIVIDUAL,
        name,
        ".claude-plugin",
        "plugin.json"
      );
      const skillMd = join(DIST_INDIVIDUAL, name, "skills", name, "SKILL.md");
      expect(await Bun.file(pluginJson).exists()).toBe(true);
      expect(await Bun.file(skillMd).exists()).toBe(true);
    });
  }

  test("individual plugin.json has correct name and version", async () => {
    for (const name of expectedIndividual) {
      const data = await Bun.file(
        join(DIST_INDIVIDUAL, name, ".claude-plugin", "plugin.json")
      ).json();
      expect(data.name).toBe(name);
      expect(data.version).toBe(expectedVersion);
    }
  });

  test("individual SKILL.md matches full suite SKILL.md", async () => {
    for (const name of expectedIndividual) {
      const individual = await Bun.file(
        join(DIST_INDIVIDUAL, name, "skills", name, "SKILL.md")
      ).text();
      const fullSuite = await Bun.file(
        join(DIST_PLUGIN, "skills", name, "SKILL.md")
      ).text();
      expect(individual).toBe(fullSuite);
    }
  });

  test("individual plugins do not include commands/", async () => {
    for (const name of expectedIndividual) {
      const commandsDir = join(DIST_INDIVIDUAL, name, "commands");
      let exists = false;
      try {
        const stat = await Bun.file(
          join(commandsDir, "liminal-spec.md")
        ).exists();
        exists = stat;
      } catch {
        exists = false;
      }
      expect(exists).toBe(false);
    }
  });

  test("individual plugins do not include agents/ (none declared)", async () => {
    for (const name of expectedIndividual) {
      const agentsDir = join(DIST_INDIVIDUAL, name, "agents");
      let exists = false;
      try {
        const stat = await Bun.file(
          join(agentsDir, "senior-engineer.md")
        ).exists();
        exists = stat;
      } catch {
        exists = false;
      }
      expect(exists).toBe(false);
    }
  });
});

// -------------------------------------------------------------------------
// Source files are untouched
// -------------------------------------------------------------------------

describe("source file safety", () => {
  test("src/ files still exist after build", async () => {
    const criticalFiles = [
      "src/phases/research.md",
      "src/phases/epic.md",
      "src/phases/tech-design.md",
      "src/phases/story.md",
      "src/phases/story-tech.md",
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
