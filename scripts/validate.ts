/**
 * Validate script for liminal-spec plugin.
 *
 * Checks dist/ output for structural correctness:
 *   - Plugin metadata files exist with required fields
 *   - Skill files have valid YAML frontmatter
 *   - Agent files exist and have frontmatter with name
 *   - Standalone files exist and lack frontmatter
 *   - manifest.json conforms to Zod schema
 *
 * Optional environment variables:
 *   DIST_DIR                    -- output root directory to validate (default: dist)
 *   VALIDATE_MARKETPLACE_SOURCE -- set to "0" to skip marketplace source checks
 */

import { stat } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { z } from "zod";
import { Glob } from "bun";

// ---------------------------------------------------------------------------
// Lightweight frontmatter parser (replaces gray-matter — no dependencies)
// ---------------------------------------------------------------------------

interface ParsedFrontmatter {
  data: Record<string, unknown>;
  content: string;
}

function parseFrontmatter(raw: string): ParsedFrontmatter {
  if (!raw.startsWith("---\n")) {
    return { data: {}, content: raw };
  }
  const endIndex = raw.indexOf("\n---", 3);
  if (endIndex === -1) {
    return { data: {}, content: raw };
  }
  const yamlBlock = raw.slice(4, endIndex);
  const content = raw.slice(endIndex + 4).trimStart();
  // Simple YAML key-value parsing (handles string and pipe multiline values)
  const data: Record<string, unknown> = {};
  const lines = yamlBlock.split("\n");
  let currentKey = "";
  let currentValue = "";
  let inMultiline = false;

  for (const line of lines) {
    if (inMultiline) {
      if (line.startsWith("  ") || line === "") {
        currentValue += (currentValue ? "\n" : "") + line.replace(/^  /, "");
      } else {
        data[currentKey] = currentValue.trim();
        inMultiline = false;
        // fall through to process this line as a new key
      }
    }
    if (!inMultiline) {
      const match = line.match(/^(\w[\w-]*):\s*(.*)/);
      if (match) {
        currentKey = match[1];
        const val = match[2];
        if (val === "|" || val === ">") {
          inMultiline = true;
          currentValue = "";
        } else {
          data[currentKey] = val;
        }
      }
    }
  }
  if (inMultiline && currentKey) {
    data[currentKey] = currentValue.trim();
  }
  return { data, content };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dir, "..");
const DIST_DIR = process.env.DIST_DIR?.trim() || "dist";
const DIST = isAbsolute(DIST_DIR) ? DIST_DIR : join(ROOT, DIST_DIR);
const DIST_PLUGIN = join(DIST, "plugin");
const DIST_INDIVIDUAL = join(DIST, "individual");
const DIST_STANDALONE = join(DIST, "standalone");
const SKILL_PACK_ZIP = "liminal-spec-skill-pack.zip";
const MARKDOWN_PACK_ZIP = "liminal-spec-markdown-pack.zip";
const MARKETPLACE_MANIFEST = join(ROOT, ".claude-plugin", "marketplace.json");
const EXPECTED_MARKETPLACE_SOURCE = "./plugins/liminal-spec";
const VALIDATE_MARKETPLACE_SOURCE =
  process.env.VALIDATE_MARKETPLACE_SOURCE !== "0";

// ---------------------------------------------------------------------------
// Zod schema for manifest.json
// ---------------------------------------------------------------------------

const SemverSchema = z.string().regex(
  /^\d+\.\d+\.\d+(-[\w.]+)?$/,
  "version must be valid semver (e.g. 1.0.0, 2.0.0-beta.1)"
);

const SkillSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  phases: z.array(z.string().min(1)).min(1),
  shared: z.array(z.string().min(1)),
  templates: z.array(z.string().min(1)).optional(),
  examples: z.array(z.string().min(1)).optional(),
});

const IndividualPluginSchema = z.object({
  description: z.string().min(1),
  agents: z.array(z.string().min(1)).optional(),
});

const ManifestSchema = z.object({
  version: SemverSchema,
  skills: z.record(z.string(), SkillSchema),
  agents: z.array(z.string().min(1)),
  command: z.string().min(1),
  individualPlugins: z.record(z.string(), IndividualPluginSchema).optional(),
});

// ---------------------------------------------------------------------------
// Validation state
// ---------------------------------------------------------------------------

interface ValidationResult {
  skillsValid: number;
  agentsValid: number;
  standaloneValid: number;
  standalonePacksValid: number;
  individualPluginsValid: number;
  errors: string[];
}

const result: ValidationResult = {
  skillsValid: 0,
  agentsValid: 0,
  standaloneValid: 0,
  standalonePacksValid: 0,
  individualPluginsValid: 0,
  errors: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fileExists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function readFile(path: string): Promise<string> {
  return Bun.file(path).text();
}

function hasFrontmatter(content: string): boolean {
  return content.startsWith("---\n");
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

async function validatePluginJson(): Promise<void> {
  const path = join(DIST_PLUGIN, ".claude-plugin", "plugin.json");
  if (!(await fileExists(path))) {
    result.errors.push("Missing: plugin.json");
    return;
  }
  const data = await Bun.file(path).json();
  if (!data.name || typeof data.name !== "string") {
    result.errors.push("plugin.json: missing or invalid 'name' field");
  }
  if (!data.version || typeof data.version !== "string") {
    result.errors.push("plugin.json: missing or invalid 'version' field");
  }
  console.log(`  plugin.json: valid (v${data.version})`);
}

async function validateMarketplaceJson(): Promise<void> {
  const path = join(DIST_PLUGIN, ".claude-plugin", "marketplace.json");
  if (!(await fileExists(path))) {
    result.errors.push("Missing: marketplace.json");
    return;
  }
  const data = await Bun.file(path).json();
  if (!data.name || typeof data.name !== "string") {
    result.errors.push("marketplace.json: missing or invalid 'name' field");
  }
  if (!data.owner || typeof data.owner.name !== "string") {
    result.errors.push("marketplace.json: missing or invalid 'owner' field");
  }
  if (!Array.isArray(data.plugins) || data.plugins.length === 0) {
    result.errors.push("marketplace.json: missing or empty 'plugins' array");
  }
  console.log("  marketplace.json: valid");
}

async function validateSkills(): Promise<void> {
  const glob = new Glob("skills/*/SKILL.md");
  const paths: string[] = [];

  for await (const match of glob.scan({ cwd: DIST_PLUGIN, absolute: true })) {
    paths.push(match);
  }

  if (paths.length === 0) {
    result.errors.push("No skill files found in dist/plugin/skills/");
    return;
  }

  for (const skillPath of paths.sort()) {
    const content = await readFile(skillPath);
    const skillName = skillPath.split("/").at(-2) ?? "unknown";

    if (!hasFrontmatter(content)) {
      result.errors.push(`Skill '${skillName}': missing YAML frontmatter`);
      continue;
    }

    const parsed = parseFrontmatter(content);

    if (!parsed.data.name || typeof parsed.data.name !== "string") {
      result.errors.push(`Skill '${skillName}': frontmatter missing 'name'`);
    }
    if (
      !parsed.data.description ||
      typeof parsed.data.description !== "string"
    ) {
      result.errors.push(
        `Skill '${skillName}': frontmatter missing 'description'`
      );
    }

    const bodyContent = parsed.content.trim();
    if (bodyContent.length === 0) {
      result.errors.push(
        `Skill '${skillName}': no content after frontmatter`
      );
    }

    const lineCount = content.split("\n").length;
    console.log(`  skill: ${skillName} (${lineCount} lines)`);
    result.skillsValid++;
  }
}

async function validateAgents(): Promise<void> {
  const glob = new Glob("agents/*.md");

  for await (const match of glob.scan({ cwd: DIST_PLUGIN, absolute: true })) {
    const content = await readFile(match);
    const agentName = match.split("/").pop()?.replace(".md", "") ?? "unknown";

    if (content.trim().length === 0) {
      result.errors.push(`Agent '${agentName}': file is empty`);
      continue;
    }

    if (!hasFrontmatter(content)) {
      result.errors.push(`Agent '${agentName}': missing YAML frontmatter`);
      continue;
    }

    const parsed = parseFrontmatter(content);
    if (!parsed.data.name || typeof parsed.data.name !== "string") {
      result.errors.push(`Agent '${agentName}': frontmatter missing 'name'`);
    }

    console.log(`  agent: ${agentName}`);
    result.agentsValid++;
  }
}

async function validateStandalone(): Promise<void> {
  // Validate -skill.md files
  const mdGlob = new Glob("*-skill.md");

  for await (const match of mdGlob.scan({
    cwd: DIST_STANDALONE,
    absolute: true,
  })) {
    const content = await readFile(match);
    const fileName = match.split("/").pop() ?? "unknown";

    if (content.trim().length === 0) {
      result.errors.push(`Standalone '${fileName}': file is empty`);
      continue;
    }

    if (hasFrontmatter(content)) {
      result.errors.push(
        `Standalone '${fileName}': should NOT have YAML frontmatter (build should strip it)`
      );
      continue;
    }

    console.log(`  standalone: ${fileName}`);
    result.standaloneValid++;
  }

  // Validate standalone zip packs
  const packFiles = [SKILL_PACK_ZIP, MARKDOWN_PACK_ZIP];
  for (const fileName of packFiles) {
    const fullPath = join(DIST_STANDALONE, fileName);
    if (!(await fileExists(fullPath))) {
      result.errors.push(`Missing standalone pack: ${fileName}`);
      continue;
    }

    const file = Bun.file(fullPath);
    if (file.size === 0) {
      result.errors.push(`Standalone pack '${fileName}' is empty`);
      continue;
    }

    console.log(`  standalone pack: ${fileName} (${file.size} bytes)`);
    result.standalonePacksValid++;
  }

  // Legacy artifact guard: .skill files should not be emitted.
  const legacySkillGlob = new Glob("*.skill");
  const legacySkillFiles: string[] = [];
  for await (const match of legacySkillGlob.scan({
    cwd: DIST_STANDALONE,
    absolute: true,
  })) {
    legacySkillFiles.push(match.split("/").pop() ?? "unknown");
  }
  if (legacySkillFiles.length > 0) {
    result.errors.push(
      `Legacy .skill artifacts detected: ${legacySkillFiles.join(", ")}`
    );
  }
}

async function validateManifest(): Promise<void> {
  const manifestPath = join(ROOT, "manifest.json");
  if (!(await fileExists(manifestPath))) {
    result.errors.push("manifest.json not found at project root");
    return;
  }

  const data = await Bun.file(manifestPath).json();
  const parsed = ManifestSchema.safeParse(data);

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      result.errors.push(
        `manifest.json: ${issue.path.join(".")} - ${issue.message}`
      );
    }
    return;
  }
  console.log(`  manifest.json: valid (v${parsed.data.version})`);
}

async function validateMarketplaceSourceLayout(): Promise<void> {
  if (!(await fileExists(MARKETPLACE_MANIFEST))) {
    result.errors.push("Marketplace manifest missing: .claude-plugin/marketplace.json");
    return;
  }

  const data = await Bun.file(MARKETPLACE_MANIFEST).json();
  if (!Array.isArray(data.plugins) || data.plugins.length === 0) {
    result.errors.push(
      "Marketplace manifest must include at least one plugin in '.plugins'"
    );
    return;
  }

  // Validate each plugin entry in the marketplace manifest
  for (const plugin of data.plugins) {
    if (typeof plugin !== "object" || plugin === null) continue;
    const entry = plugin as Record<string, unknown>;
    const name = String(entry.name ?? "unknown");
    const source = String(entry.source ?? "");

    const sourcePath = join(ROOT, source.replace(/^\.\//, ""));
    if (!(await pathExists(sourcePath))) {
      result.errors.push(
        `Marketplace plugin '${name}': source path does not exist (${source})`
      );
      continue;
    }

    if (!(await isDirectory(sourcePath))) {
      result.errors.push(
        `Marketplace plugin '${name}': source path is not a directory (${source})`
      );
      continue;
    }

    const pluginJsonPath = join(sourcePath, ".claude-plugin", "plugin.json");
    if (!(await fileExists(pluginJsonPath))) {
      result.errors.push(
        `Marketplace plugin '${name}': missing .claude-plugin/plugin.json`
      );
      continue;
    }

    const pluginJson = await Bun.file(pluginJsonPath).json();
    if (pluginJson.name !== name) {
      result.errors.push(
        `Marketplace plugin '${name}': plugin.json name mismatch (found '${String(pluginJson.name)}')`
      );
    }

    if (
      typeof entry.version === "string" &&
      typeof pluginJson.version === "string" &&
      entry.version !== pluginJson.version
    ) {
      result.errors.push(
        `Marketplace plugin '${name}': version mismatch (marketplace=${entry.version} plugin.json=${pluginJson.version})`
      );
    }

    const extensionDirs = ["skills", "commands", "agents", "hooks", "mcp-servers"];
    let hasExtensionDir = false;
    for (const dir of extensionDirs) {
      if (await isDirectory(join(sourcePath, dir))) {
        hasExtensionDir = true;
        break;
      }
    }
    if (!hasExtensionDir) {
      result.errors.push(
        `Marketplace plugin '${name}': no extension directory (skills/commands/agents/hooks/mcp-servers)`
      );
      continue;
    }

    console.log(`  marketplace source: valid (${source})`);
  }
}

async function validateIndividualPlugins(): Promise<void> {
  const manifestPath = join(ROOT, "manifest.json");
  if (!(await fileExists(manifestPath))) return;

  const manifest = await Bun.file(manifestPath).json();
  const individualPlugins = manifest.individualPlugins;

  if (!individualPlugins || Object.keys(individualPlugins).length === 0) {
    console.log("  no individual plugins declared");
    return;
  }

  for (const [skillKey, entry] of Object.entries(individualPlugins)) {
    const typedEntry = entry as { description: string; agents?: string[] };
    const pluginDir = join(DIST_INDIVIDUAL, skillKey);

    // Check plugin.json
    const pluginJsonPath = join(pluginDir, ".claude-plugin", "plugin.json");
    if (!(await fileExists(pluginJsonPath))) {
      result.errors.push(`Individual plugin '${skillKey}': missing plugin.json`);
      continue;
    }

    const pluginJson = await Bun.file(pluginJsonPath).json();
    if (pluginJson.name !== skillKey) {
      result.errors.push(
        `Individual plugin '${skillKey}': plugin.json name mismatch (found '${String(pluginJson.name)}')`
      );
    }

    // Check SKILL.md
    const skillMdPath = join(pluginDir, "skills", skillKey, "SKILL.md");
    if (!(await fileExists(skillMdPath))) {
      result.errors.push(`Individual plugin '${skillKey}': missing SKILL.md`);
      continue;
    }

    const skillContent = await readFile(skillMdPath);
    if (!hasFrontmatter(skillContent)) {
      result.errors.push(
        `Individual plugin '${skillKey}': SKILL.md missing frontmatter`
      );
    }

    // Check bundled agents if declared
    if (typedEntry.agents) {
      for (const agent of typedEntry.agents) {
        const agentPath = join(pluginDir, "agents", `${agent}.md`);
        if (!(await fileExists(agentPath))) {
          result.errors.push(
            `Individual plugin '${skillKey}': missing agent '${agent}'`
          );
        }
      }
    }

    // No commands in individual plugins
    const commandsDir = join(pluginDir, "commands");
    if (await isDirectory(commandsDir)) {
      result.errors.push(
        `Individual plugin '${skillKey}': should not include commands/ (router belongs to full suite)`
      );
    }

    console.log(`  individual plugin: ${skillKey}`);
    result.individualPluginsValid++;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function validate(): Promise<void> {
  console.log(`Validating output at: ${DIST}\n`);

  console.log("Metadata:");
  await validatePluginJson();
  await validateMarketplaceJson();

  console.log("\nSkills:");
  await validateSkills();

  console.log("\nAgents:");
  await validateAgents();

  console.log("\nStandalone:");
  await validateStandalone();

  console.log("\nManifest:");
  await validateManifest();

  console.log("\nIndividual Plugins:");
  await validateIndividualPlugins();

  if (VALIDATE_MARKETPLACE_SOURCE) {
    console.log("\nMarketplace Source:");
    await validateMarketplaceSourceLayout();
  } else {
    console.log("\nMarketplace Source:");
    console.log("  skipped (VALIDATE_MARKETPLACE_SOURCE=0)");
  }

  // Summary
  console.log("\n---");
  if (result.errors.length > 0) {
    console.error(`\nValidation FAILED with ${result.errors.length} error(s):`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `\nValidation passed: ${result.skillsValid} skills, ${result.agentsValid} agents, ${result.standaloneValid} standalone files, ${result.standalonePacksValid} standalone packs, ${result.individualPluginsValid} individual plugins`
  );
}

validate().catch((err: unknown) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
