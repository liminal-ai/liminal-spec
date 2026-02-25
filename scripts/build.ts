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
 *   dist/standalone/{name}-skill.md      -- Frontmatter-stripped single skill markdown
 *   dist/standalone/liminal-spec-skill-pack.zip
 *   dist/standalone/liminal-spec-markdown-pack.zip
 *   dist/individual/{name}/**            -- Individual skill plugins
 *   plugins/liminal-spec/**              -- Marketplace-installable full suite
 *   plugins/{name}/**                    -- Marketplace-installable individual plugins
 *
 * Optional environment variables:
 *   DIST_DIR           -- output root directory (default: dist)
 *   MARKETPLACE_DIR    -- marketplace plugin output dir (default: plugins/liminal-spec)
 *   SYNC_MARKETPLACE   -- set to "0" to skip marketplace sync
 */

import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

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

interface IndividualPluginEntry {
  description: string;
  agents?: string[];
}

interface Manifest {
  version: string;
  skills: Record<string, SkillEntry>;
  agents: string[];
  command: string;
  individualPlugins?: Record<string, IndividualPluginEntry>;
}

interface BuildSummary {
  skills: { name: string; lines: number }[];
  agents: string[];
  command: string;
  individualPlugins: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dir, "..");
const SRC = join(ROOT, "src");
const DIST_DIR = process.env.DIST_DIR?.trim() || "dist";
const DIST = isAbsolute(DIST_DIR) ? DIST_DIR : join(ROOT, DIST_DIR);
const DIST_PLUGIN = join(DIST, "plugin");
const DIST_INDIVIDUAL = join(DIST, "individual");
const DIST_STANDALONE = join(DIST, "standalone");
const SKILL_PACK_DIR_NAME = "liminal-spec-skill-pack";
const MARKDOWN_PACK_DIR_NAME = "liminal-spec-markdown-pack";
const SKILL_PACK_DIR = join(DIST_STANDALONE, SKILL_PACK_DIR_NAME);
const MARKDOWN_PACK_DIR = join(DIST_STANDALONE, MARKDOWN_PACK_DIR_NAME);
const SKILL_PACK_ZIP = join(DIST_STANDALONE, `${SKILL_PACK_DIR_NAME}.zip`);
const MARKDOWN_PACK_ZIP = join(
  DIST_STANDALONE,
  `${MARKDOWN_PACK_DIR_NAME}.zip`
);
const MARKETPLACE_DIR =
  process.env.MARKETPLACE_DIR?.trim() || "plugins/liminal-spec";
const MARKETPLACE_PLUGIN_DIR = isAbsolute(MARKETPLACE_DIR)
  ? MARKETPLACE_DIR
  : join(ROOT, MARKETPLACE_DIR);
const SYNC_MARKETPLACE = process.env.SYNC_MARKETPLACE !== "0";

/** Maps internal skill keys to descriptive filenames for standalone release artifacts. */
const STANDALONE_NAMES: Record<string, string> = {
  "ls-research": "01-product-research",
  "ls-epic": "02-epic",
  "ls-tech-design": "03-technical-design",
  "ls-story": "04-story-sharding",
  "ls-story-tech": "04b-story-technical-enrichment",
  "ls-impl": "05-implementation",
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

async function zipDirectory(
  archiveName: string,
  directoryName: string,
  cwd: string
): Promise<void> {
  const proc = Bun.spawn(["zip", "-r", archiveName, directoryName], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(
      `zip failed for ${archiveName} (exit ${exitCode}): ${stderr.trim()}`
    );
  }
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

function generatePluginJson(
  name: string,
  version: string,
  description: string
): string {
  const plugin = {
    name,
    version,
    description,
    author: { name: "liminal-ai" },
    repository: "https://github.com/liminal-ai/liminal-spec",
    license: "MIT",
  };
  return JSON.stringify(plugin, null, 2) + "\n";
}

function generateMarketplaceJson(
  version: string,
  sourcePrefix: string,
  individualPlugins?: Record<string, IndividualPluginEntry>
): string {
  const plugins: Array<Record<string, string>> = [
    {
      name: "liminal-spec",
      source: `${sourcePrefix}liminal-spec`,
      description:
        "Spec-driven development methodology for agentic coding — full suite",
      version,
    },
  ];

  if (individualPlugins) {
    for (const [key, entry] of Object.entries(individualPlugins)) {
      plugins.push({
        name: key,
        source: `${sourcePrefix}${key}`,
        description: entry.description,
        version,
      });
    }
  }

  const marketplace = {
    name: "liminal-plugins",
    description:
      "Liminal AI plugin marketplace for spec-driven development workflows",
    metadata: {
      description:
        "Liminal AI plugin marketplace for spec-driven development workflows",
    },
    owner: { name: "liminal-ai" },
    plugins,
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
    individualPlugins: [],
  };

  // Create output directories
  await mkdir(join(DIST_PLUGIN, ".claude-plugin"), { recursive: true });
  await mkdir(DIST_STANDALONE, { recursive: true });
  await mkdir(SKILL_PACK_DIR, { recursive: true });
  await mkdir(MARKDOWN_PACK_DIR, { recursive: true });

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
    await Bun.write(join(MARKDOWN_PACK_DIR, mdFileName), standalone);

    // Skill-pack content (directory with SKILL.md + frontmatter per skill)
    const skillPkgDir = join(SKILL_PACK_DIR, standaloneName);
    await mkdir(skillPkgDir, { recursive: true });
    const skillMd =
      buildFrontmatter(standaloneName, skill.description) + "\n\n" + standalone;
    await Bun.write(join(skillPkgDir, "SKILL.md"), skillMd);

    summary.skills.push({ name: key, lines: lineCount });
    console.log(`  skill: ${key} (${lineCount} lines)`);
  }

  // Create standalone packs
  await zipDirectory(`${SKILL_PACK_DIR_NAME}.zip`, SKILL_PACK_DIR_NAME, DIST_STANDALONE);
  await zipDirectory(
    `${MARKDOWN_PACK_DIR_NAME}.zip`,
    MARKDOWN_PACK_DIR_NAME,
    DIST_STANDALONE
  );
  console.log(`  standalone pack: ${SKILL_PACK_ZIP}`);
  console.log(`  markdown pack: ${MARKDOWN_PACK_ZIP}`);

  // Clean up pack staging directories
  await rm(SKILL_PACK_DIR, { recursive: true, force: true });
  await rm(MARKDOWN_PACK_DIR, { recursive: true, force: true });

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
    generatePluginJson(
      "liminal-spec",
      manifest.version,
      "Spec-driven development methodology for agentic coding"
    )
  );
  await Bun.write(
    join(DIST_PLUGIN, ".claude-plugin", "marketplace.json"),
    generateMarketplaceJson(manifest.version, "./", manifest.individualPlugins)
  );
  console.log("  metadata: plugin.json, marketplace.json");

  // ----- Individual skill plugins -----
  const individualPlugins = manifest.individualPlugins ?? {};

  for (const [skillKey, entry] of Object.entries(individualPlugins)) {
    if (!manifest.skills[skillKey]) {
      console.error(
        `ERROR: individualPlugins references unknown skill '${skillKey}'`
      );
      process.exit(1);
    }

    const pluginDir = join(DIST_INDIVIDUAL, skillKey);
    const metaDir = join(pluginDir, ".claude-plugin");
    await mkdir(metaDir, { recursive: true });

    // Copy already-composed SKILL.md from full suite output
    const skillDestDir = join(pluginDir, "skills", skillKey);
    await mkdir(skillDestDir, { recursive: true });
    await cp(
      join(DIST_PLUGIN, "skills", skillKey, "SKILL.md"),
      join(skillDestDir, "SKILL.md")
    );

    // Copy bundled agents if specified
    if (entry.agents) {
      for (const agent of entry.agents) {
        const agentDir = join(pluginDir, "agents");
        await mkdir(agentDir, { recursive: true });
        await cp(
          join(DIST_PLUGIN, "agents", `${agent}.md`),
          join(agentDir, `${agent}.md`)
        );
      }
    }

    // Generate plugin.json
    await Bun.write(
      join(metaDir, "plugin.json"),
      generatePluginJson(skillKey, manifest.version, entry.description)
    );

    summary.individualPlugins.push(skillKey);
    console.log(`  individual plugin: ${skillKey}`);
  }

  // ----- Marketplace install source -----
  // Keep committed plugin directories so marketplace installs resolve to
  // ready-to-install plugin layouts. This can be disabled in isolated tests.
  if (SYNC_MARKETPLACE) {
    // Full suite
    await rm(MARKETPLACE_PLUGIN_DIR, { recursive: true, force: true });
    await mkdir(dirname(MARKETPLACE_PLUGIN_DIR), { recursive: true });
    await cp(DIST_PLUGIN, MARKETPLACE_PLUGIN_DIR, { recursive: true });
    await rm(
      join(MARKETPLACE_PLUGIN_DIR, ".claude-plugin", "marketplace.json"),
      { force: true }
    );
    console.log(`  marketplace source: ${MARKETPLACE_PLUGIN_DIR}`);

    // Individual plugins
    for (const skillKey of Object.keys(individualPlugins)) {
      const srcDir = join(DIST_INDIVIDUAL, skillKey);
      const destDir = join(ROOT, "plugins", skillKey);
      await rm(destDir, { recursive: true, force: true });
      await cp(srcDir, destDir, { recursive: true });
      console.log(`  marketplace source: ${destDir}`);
    }
  } else {
    console.log("  marketplace source: skipped (SYNC_MARKETPLACE=0)");
  }

  // ----- Root marketplace.json -----
  // The root .claude-plugin/marketplace.json is the catalog users add via
  // `claude plugin marketplace add`. Source paths are relative to repo root.
  const rootMarketplaceDir = join(ROOT, ".claude-plugin");
  await mkdir(rootMarketplaceDir, { recursive: true });
  await Bun.write(
    join(rootMarketplaceDir, "marketplace.json"),
    generateMarketplaceJson(
      manifest.version,
      "./plugins/",
      manifest.individualPlugins
    )
  );
  console.log("  root marketplace.json updated");

  // ----- Summary -----
  console.log("\nBuild complete:");
  console.log(
    `  ${summary.skills.length} skills composed (${summary.skills.map((s) => `${s.name}: ${s.lines} lines`).join(", ")})`
  );
  console.log(`  ${summary.agents.length} agents copied`);
  console.log(`  1 command copied (${summary.command})`);
  if (summary.individualPlugins.length > 0) {
    console.log(
      `  ${summary.individualPlugins.length} individual plugins (${summary.individualPlugins.join(", ")})`
    );
  }
  if (SYNC_MARKETPLACE) {
    console.log(
      `  ${1 + summary.individualPlugins.length} marketplace sources synced`
    );
  } else {
    console.log("  marketplace sync skipped");
  }
}

build().catch((err: unknown) => {
  console.error("Build failed:", err);
  process.exit(1);
});
