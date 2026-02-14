/**
 * Build script for liminal-spec plugin.
 *
 * Reads manifest.json, composes markdown source files into self-contained
 * skill output files, and generates plugin metadata.
 *
 * Output structure:
 *   dist/plugin/skills/{name}/SKILL.md   -- YAML frontmatter + composed content
 *   dist/plugin/agents/{name}.md         -- Agent definitions
 *   dist/plugin/commands/{command}.md     -- Command definitions
 *   dist/plugin/.claude-plugin/plugin.json
 *   dist/plugin/.claude-plugin/marketplace.json
 *   dist/standalone/liminal-{name}.md    -- Frontmatter-stripped skills
 */

import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillEntry {
  name: string;
  description: string;
  phases: string[];
  shared: string[];
  templates?: string[];
  examples?: string[];
}

interface Manifest {
  version: string;
  skills: Record<string, SkillEntry>;
  agents: string[];
  command: string;
}

interface BuildSummary {
  skills: { name: string; lines: number }[];
  agents: string[];
  command: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dir, "..");
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");
const DIST_PLUGIN = join(DIST, "plugin");
const DIST_STANDALONE = join(DIST, "standalone");
const SKILL_STAGING = join(DIST_STANDALONE, ".skill-staging");

/** Maps internal skill keys to descriptive filenames for standalone release artifacts. */
const STANDALONE_NAMES: Record<string, string> = {
  epic: "feature-specification",
  "tech-design": "technical-design",
  story: "story-sharding",
  impl: "implementation",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readSourceFile(relativePath: string): Promise<string> {
  const fullPath = join(SRC, relativePath);
  const file = Bun.file(fullPath);
  const exists = await file.exists();
  if (!exists) {
    console.error(`ERROR: Source file not found: ${fullPath}`);
    process.exit(1);
  }
  return file.text();
}

/**
 * Extract the first top-level heading from markdown content.
 * Falls back to the filename-derived title if no heading is found.
 */
function extractTitle(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

/**
 * Build YAML frontmatter block for a skill.
 */
function buildFrontmatter(name: string, description: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---`;
}

/**
 * Strip YAML frontmatter from composed content for standalone output.
 */
function stripFrontmatter(content: string): string {
  const fmRegex = /^---\n[\s\S]*?\n---\n*/;
  return content.replace(fmRegex, "").trimStart();
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

async function composeSkill(skill: SkillEntry): Promise<string> {
  const parts: string[] = [];

  // 1. YAML frontmatter
  parts.push(buildFrontmatter(skill.name, skill.description));
  parts.push("");

  // 2. Phase content
  for (const phase of skill.phases) {
    const content = await readSourceFile(`phases/${phase}.md`);
    parts.push(content.trimEnd());
  }

  // 3. Shared content
  for (const shared of skill.shared) {
    const content = await readSourceFile(`shared/${shared}.md`);
    const title = extractTitle(content, shared);
    parts.push("");
    parts.push("---");
    parts.push("");
    parts.push(`## Reference: ${title}`);
    parts.push("");
    parts.push(content.trimEnd());
  }

  // 4. Templates (optional)
  if (skill.templates && skill.templates.length > 0) {
    for (const template of skill.templates) {
      const content = await readSourceFile(`templates/${template}.md`);
      parts.push("");
      parts.push("---");
      parts.push("");
      parts.push("## Template");
      parts.push("");
      parts.push(content.trimEnd());
    }
  }

  // 5. Examples (optional)
  if (skill.examples && skill.examples.length > 0) {
    for (const example of skill.examples) {
      const content = await readSourceFile(`examples/${example}.md`);
      parts.push("");
      parts.push("---");
      parts.push("");
      parts.push("## Verification Prompt");
      parts.push("");
      parts.push(content.trimEnd());
    }
  }

  // Final newline
  parts.push("");
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Plugin metadata generation
// ---------------------------------------------------------------------------

function generatePluginJson(version: string): string {
  const plugin = {
    name: "liminal-spec",
    version,
    description: "Spec-driven development methodology for agentic coding",
    author: {
      name: "liminal-ai",
    },
    repository: "https://github.com/liminal-ai/liminal-spec",
    license: "MIT",
  };
  return JSON.stringify(plugin, null, 2) + "\n";
}

function generateMarketplaceJson(version: string): string {
  const marketplace = {
    name: "liminal-plugins",
    owner: { name: "liminal-ai" },
    plugins: [
      {
        name: "liminal-spec",
        source: "./",
        description: "Spec-driven development methodology for agentic coding",
        version,
      },
    ],
  };
  return JSON.stringify(marketplace, null, 2) + "\n";
}

// ---------------------------------------------------------------------------
// Main build
// ---------------------------------------------------------------------------

async function build(): Promise<void> {
  // Read manifest
  const manifestPath = join(ROOT, "manifest.json");
  const manifestFile = Bun.file(manifestPath);
  if (!(await manifestFile.exists())) {
    console.error("ERROR: manifest.json not found at project root");
    process.exit(1);
  }
  const manifest: Manifest = await manifestFile.json();

  const summary: BuildSummary = {
    skills: [],
    agents: [],
    command: manifest.command,
  };

  // Create output directories
  await mkdir(join(DIST_PLUGIN, ".claude-plugin"), { recursive: true });
  await mkdir(DIST_STANDALONE, { recursive: true });

  // ----- Skills -----
  for (const [key, skill] of Object.entries(manifest.skills)) {
    const composed = await composeSkill(skill);
    const lineCount = composed.split("\n").length;

    // Plugin output
    const skillDir = join(DIST_PLUGIN, "skills", key);
    await mkdir(skillDir, { recursive: true });
    await Bun.write(join(skillDir, "SKILL.md"), composed);

    // Standalone .md output (no frontmatter, for paste-into-chat)
    const standalone = stripFrontmatter(composed);
    const standaloneName = STANDALONE_NAMES[key] ?? key;
    const mdFileName = `${standaloneName}-skill.md`;
    await Bun.write(join(DIST_STANDALONE, mdFileName), standalone);

    // .skill package (zipped directory with SKILL.md + frontmatter)
    const skillPkgDir = join(SKILL_STAGING, standaloneName);
    await mkdir(skillPkgDir, { recursive: true });
    const skillMd =
      buildFrontmatter(standaloneName, skill.description) + "\n\n" + standalone;
    await Bun.write(join(skillPkgDir, "SKILL.md"), skillMd);

    const skillPath = join(DIST_STANDALONE, `${standaloneName}.skill`);
    const zipProc = Bun.spawn(
      ["zip", "-r", skillPath, standaloneName],
      { cwd: SKILL_STAGING, stdout: "pipe", stderr: "pipe" }
    );
    await zipProc.exited;

    summary.skills.push({ name: key, lines: lineCount });
    console.log(`  skill: ${key} (${lineCount} lines)`);
  }

  // Clean up staging directory
  await rm(SKILL_STAGING, { recursive: true, force: true });

  // ----- Agents -----
  for (const agent of manifest.agents) {
    const content = await readSourceFile(`agents/${agent}.md`);
    const agentDir = join(DIST_PLUGIN, "agents");
    await mkdir(agentDir, { recursive: true });
    await Bun.write(join(agentDir, `${agent}.md`), content);
    summary.agents.push(agent);
    console.log(`  agent: ${agent}`);
  }

  // ----- Commands -----
  const commandContent = await readSourceFile(
    `commands/${manifest.command}.md`
  );
  const commandDir = join(DIST_PLUGIN, "commands");
  await mkdir(commandDir, { recursive: true });
  await Bun.write(join(commandDir, `${manifest.command}.md`), commandContent);
  console.log(`  command: ${manifest.command}`);

  // ----- Plugin metadata -----
  await Bun.write(
    join(DIST_PLUGIN, ".claude-plugin", "plugin.json"),
    generatePluginJson(manifest.version)
  );
  await Bun.write(
    join(DIST_PLUGIN, ".claude-plugin", "marketplace.json"),
    generateMarketplaceJson(manifest.version)
  );
  console.log("  metadata: plugin.json, marketplace.json");

  // ----- Summary -----
  console.log("\nBuild complete:");
  console.log(
    `  ${summary.skills.length} skills composed (${summary.skills.map((s) => `${s.name}: ${s.lines} lines`).join(", ")})`
  );
  console.log(`  ${summary.agents.length} agents copied`);
  console.log(`  1 command copied (${summary.command})`);
}

build().catch((err: unknown) => {
  console.error("Build failed:", err);
  process.exit(1);
});
