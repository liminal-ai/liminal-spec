/**
 * Build script for liminal-spec skill pack.
 *
 * Reads manifest.json, composes markdown source files into self-contained
 * skill output files, and packages for distribution.
 *
 * Output structure:
 *   dist/skills/{name}/SKILL.md              -- YAML frontmatter + composed content
 *   dist/skills/{name}/references/*.md       -- Optional bundled companion guides
 *   dist/standalone/{name}-skill.md          -- Frontmatter-stripped single skill markdown
 *   dist/standalone/liminal-spec-skill-pack.zip
 *   dist/standalone/liminal-spec-markdown-pack.zip
 *
 * Optional environment variables:
 *   DIST_DIR -- output root directory (default: dist)
 */

import { chmod, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { syncImplCliAssets } from "./sync-impl-cli-assets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillEntry {
  name: string;
  description: string;
  phases: string[];
  shared: string[];
  references?: string[];
  bundledMarkdownFiles?: Array<{
    source: string;
    destination: string;
  }>;
  templates?: string[];
  examples?: string[];
  bundledArtifacts?: Array<{
    source: string;
    destination: string;
  }>;
}

interface Manifest {
  version: string;
  skills: Record<string, SkillEntry>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dir, "..");
const SRC = join(ROOT, "src");
const DIST_DIR = process.env.DIST_DIR?.trim() || "dist";
const DIST = isAbsolute(DIST_DIR) ? DIST_DIR : join(ROOT, DIST_DIR);
const DIST_SKILLS = join(DIST, "skills");
const DIST_STANDALONE = join(DIST, "standalone");
const SKILL_PACK_DIR_NAME = "skills";
const MARKDOWN_PACK_DIR_NAME = "liminal-spec-markdown-pack";
const SKILL_PACK_DIR = join(DIST_STANDALONE, SKILL_PACK_DIR_NAME);
const MARKDOWN_PACK_DIR = join(DIST_STANDALONE, MARKDOWN_PACK_DIR_NAME);
const SKILL_PACK_ZIP_NAME = "liminal-spec-skill-pack.zip";
const MARKDOWN_PACK_ZIP_NAME = `${MARKDOWN_PACK_DIR_NAME}.zip`;
const SKILL_PACK_ZIP = join(DIST_STANDALONE, SKILL_PACK_ZIP_NAME);
const MARKDOWN_PACK_ZIP = join(DIST_STANDALONE, MARKDOWN_PACK_ZIP_NAME);

/** Maps internal skill keys to descriptive filenames for standalone release artifacts. */
const STANDALONE_NAMES: Record<string, string> = {
  "ls-prd": "00-prd",
  "ls-arch": "01-technical-architecture",
  "ls-epic": "02-epic",
  "ls-tech-design": "03-technical-design",
  "ls-publish-epic": "04-publish-epic",
  "ls-current-docs": "05-current-docs",
  "ls-team-impl": "06-team-implementation",
  "ls-team-impl-cc": "06cc-team-implementation-claude-code",
  "ls-claude-impl": "08-claude-implementation-cli",
  "ls-team-spec": "07-team-spec",
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

async function copyBundledMarkdownFiles(
  dirName: string,
  fileIds: string[] | undefined,
  destinationRoot: string
): Promise<void> {
  if (!fileIds || fileIds.length === 0) {
    return;
  }

  const destinationDir = join(destinationRoot, dirName);
  await mkdir(destinationDir, { recursive: true });

  for (const fileId of fileIds) {
    const content = await readSourceFile(`${dirName}/${fileId}.md`);
    await Bun.write(join(destinationDir, `${fileId}.md`), content);
  }
}

async function copyBundledMarkdownAssets(
  assets: SkillEntry["bundledMarkdownFiles"],
  destinationRoot: string
): Promise<void> {
  if (!assets || assets.length === 0) {
    return;
  }

  for (const asset of assets) {
    const content = await readSourceFile(asset.source);
    const destinationPath = join(destinationRoot, asset.destination);
    await mkdir(dirname(destinationPath), { recursive: true });
    await Bun.write(destinationPath, content);
  }
}

function resolveArtifactSourcePath(source: string): string {
  if (source.startsWith("dist/")) {
    return join(DIST, source.slice("dist/".length));
  }

  return join(ROOT, source);
}

async function buildBundledArtifact(source: string): Promise<void> {
  const sourcePath = resolveArtifactSourcePath(source);

  switch (source) {
    case "dist/generated/ls-impl-cli.cjs": {
      await syncImplCliAssets();
      await mkdir(dirname(sourcePath), { recursive: true });
      const proc = Bun.spawn(
        [
          "bun",
          "build",
          join(ROOT, "processes/impl-cli/cli.ts"),
          "--target=node",
          "--format=cjs",
          "--outfile",
          sourcePath,
        ],
        {
          cwd: ROOT,
          stdout: "pipe",
          stderr: "pipe",
        }
      );
      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        throw new Error(
          `Failed to bundle ${source} (exit ${exitCode}): ${(stdout + stderr).trim()}`
        );
      }

      if (!(await Bun.file(sourcePath).exists())) {
        throw new Error(`Bundled artifact was not created at ${sourcePath}`);
      }

      const currentContents = await readFile(sourcePath, "utf8");
      const withShebang = currentContents.startsWith("#!/usr/bin/env node\n")
        ? currentContents
        : `#!/usr/bin/env node\n${currentContents}`;
      if (withShebang !== currentContents) {
        await writeFile(sourcePath, withShebang, "utf8");
      }
      await chmod(sourcePath, 0o755);

      console.log(`  bundled artifact: ${source}`);
      return;
    }
    default:
      throw new Error(`No build rule defined for bundled artifact: ${source}`);
  }
}

async function ensureBundledArtifacts(manifest: Manifest): Promise<void> {
  const sources = new Set<string>();

  for (const skill of Object.values(manifest.skills)) {
    for (const artifact of skill.bundledArtifacts ?? []) {
      sources.add(artifact.source);
    }
  }

  for (const source of sources) {
    await buildBundledArtifact(source);
  }
}

async function copyBundledArtifacts(
  artifacts: SkillEntry["bundledArtifacts"],
  destinationRoot: string
): Promise<void> {
  if (!artifacts || artifacts.length === 0) {
    return;
  }

  for (const artifact of artifacts) {
    const sourcePath = resolveArtifactSourcePath(artifact.source);
    const destinationPath = join(destinationRoot, artifact.destination);
    await mkdir(dirname(destinationPath), { recursive: true });
    await cp(sourcePath, destinationPath, { force: true });
    try {
      await chmod(destinationPath, 0o755);
    } catch {
      // Ignore chmod failures on platforms or filesystems that do not support it.
    }
  }
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

  const skillSummary: { name: string; lines: number }[] = [];

  // Create output directories
  await mkdir(DIST_SKILLS, { recursive: true });
  await mkdir(DIST_STANDALONE, { recursive: true });
  await mkdir(SKILL_PACK_DIR, { recursive: true });
  await mkdir(MARKDOWN_PACK_DIR, { recursive: true });
  await ensureBundledArtifacts(manifest);

  // ----- Skills -----
  for (const [key, skill] of Object.entries(manifest.skills)) {
    const composed = await composeSkill(skill);
    const lineCount = composed.split("\n").length;

    // Skill directory output (installable)
    const skillDir = join(DIST_SKILLS, key);
    await mkdir(skillDir, { recursive: true });
    await Bun.write(join(skillDir, "SKILL.md"), composed);
    await copyBundledMarkdownFiles("references", skill.references, skillDir);
    await copyBundledMarkdownAssets(skill.bundledMarkdownFiles, skillDir);
    await copyBundledArtifacts(skill.bundledArtifacts, skillDir);

    // Standalone .md output (no frontmatter, for paste-into-chat)
    const standalone = stripFrontmatter(composed);
    const standaloneName = STANDALONE_NAMES[key] ?? key;
    const mdFileName = `${standaloneName}-skill.md`;
    await Bun.write(join(DIST_STANDALONE, mdFileName), standalone + "\n");
    await Bun.write(join(MARKDOWN_PACK_DIR, mdFileName), standalone + "\n");

    // Skill-pack content (directory with SKILL.md per skill)
    const skillPkgDir = join(SKILL_PACK_DIR, key);
    await mkdir(skillPkgDir, { recursive: true });
    await Bun.write(join(skillPkgDir, "SKILL.md"), composed);
    await copyBundledMarkdownFiles("references", skill.references, skillPkgDir);
    await copyBundledMarkdownAssets(skill.bundledMarkdownFiles, skillPkgDir);
    await copyBundledArtifacts(skill.bundledArtifacts, skillPkgDir);

    skillSummary.push({ name: key, lines: lineCount });
    console.log(`  skill: ${key} (${lineCount} lines)`);
  }

  // Copy READMEs into pack staging directories
  const skillReadme = await Bun.file(join(SRC, "README-pack.md")).text();
  const markdownReadme = await Bun.file(join(SRC, "README-markdown-pack.md")).text();
  await Bun.write(join(SKILL_PACK_DIR, "liminal-spec-skillpack-readme.md"), skillReadme);
  await Bun.write(join(MARKDOWN_PACK_DIR, "README.md"), markdownReadme);

  // Create packs
  await zipDirectory(SKILL_PACK_ZIP_NAME, SKILL_PACK_DIR_NAME, DIST_STANDALONE);
  await zipDirectory(MARKDOWN_PACK_ZIP_NAME, MARKDOWN_PACK_DIR_NAME, DIST_STANDALONE);
  console.log(`  skill pack: ${SKILL_PACK_ZIP}`);
  console.log(`  markdown pack: ${MARKDOWN_PACK_ZIP}`);

  // Clean up pack staging directories
  await rm(SKILL_PACK_DIR, { recursive: true, force: true });
  await rm(MARKDOWN_PACK_DIR, { recursive: true, force: true });

  // ----- Summary -----
  console.log("\nBuild complete:");
  console.log(
    `  ${skillSummary.length} skills composed (${skillSummary.map((s) => `${s.name}: ${s.lines} lines`).join(", ")})`
  );
}

build().catch((err: unknown) => {
  console.error("Build failed:", err);
  process.exit(1);
});
