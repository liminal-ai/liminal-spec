/**
 * Validate script for liminal-spec skill pack.
 *
 * Checks dist/ output for structural correctness:
 *   - Skill files have valid YAML frontmatter
 *   - Bundled reference files exist when declared in manifest.json
 *   - Standalone files exist and lack frontmatter
 *   - Pack zips exist and are non-empty
 *   - manifest.json conforms to schema
 *
 * Optional environment variables:
 *   DIST_DIR -- output root directory to validate (default: dist)
 */

import { isAbsolute, join, resolve } from "node:path";
import { z } from "zod";
import { Glob } from "bun";

// ---------------------------------------------------------------------------
// Lightweight frontmatter parser
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
const DIST_SKILLS = join(DIST, "skills");
const DIST_STANDALONE = join(DIST, "standalone");
const SKILL_PACK_ZIP = "liminal-spec-skill-pack.zip";
const MARKDOWN_PACK_ZIP = "liminal-spec-markdown-pack.zip";

// ---------------------------------------------------------------------------
// Zod schema for manifest.json
// ---------------------------------------------------------------------------

const SemverSchema = z.string().regex(
  /^\d+\.\d+\.\d+(-[\w.]+)?$/,
  "version must be valid semver (e.g. 1.0.0)"
);

const SkillSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  phases: z.array(z.string().min(1)).min(1),
  shared: z.array(z.string().min(1)),
  references: z.array(z.string().min(1)).optional(),
  templates: z.array(z.string().min(1)).optional(),
  examples: z.array(z.string().min(1)).optional(),
  bundledArtifacts: z
    .array(
      z.object({
        source: z.string().min(1),
        destination: z.string().min(1),
      })
    )
    .optional(),
});

const ManifestSchema = z.object({
  version: SemverSchema,
  skills: z.record(z.string(), SkillSchema),
});

// ---------------------------------------------------------------------------
// Validation state
// ---------------------------------------------------------------------------

interface ValidationResult {
  skillsValid: number;
  standaloneValid: number;
  standalonePacksValid: number;
  errors: string[];
}

const result: ValidationResult = {
  skillsValid: 0,
  standaloneValid: 0,
  standalonePacksValid: 0,
  errors: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fileExists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
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

async function validateSkills(): Promise<void> {
  const glob = new Glob("*/SKILL.md");
  const paths: string[] = [];

  for await (const match of glob.scan({ cwd: DIST_SKILLS, absolute: true })) {
    paths.push(match);
  }

  if (paths.length === 0) {
    result.errors.push("No skill files found in dist/skills/");
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

async function validateStandalone(): Promise<void> {
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
        `Standalone '${fileName}': should NOT have YAML frontmatter`
      );
      continue;
    }

    console.log(`  standalone: ${fileName}`);
    result.standaloneValid++;
  }

  // Validate zip packs
  const packFiles = [SKILL_PACK_ZIP, MARKDOWN_PACK_ZIP];
  for (const fileName of packFiles) {
    const fullPath = join(DIST_STANDALONE, fileName);
    if (!(await fileExists(fullPath))) {
      result.errors.push(`Missing pack: ${fileName}`);
      continue;
    }

    const file = Bun.file(fullPath);
    if (file.size === 0) {
      result.errors.push(`Pack '${fileName}' is empty`);
      continue;
    }

    console.log(`  pack: ${fileName} (${file.size} bytes)`);
    result.standalonePacksValid++;
  }

  // Legacy artifact guard
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

async function validateBundledReferences(): Promise<void> {
  const manifestPath = join(ROOT, "manifest.json");
  const parsed = ManifestSchema.safeParse(await Bun.file(manifestPath).json());
  if (!parsed.success) {
    return;
  }

  for (const [skillId, skill] of Object.entries(parsed.data.skills)) {
    if (!skill.references || skill.references.length === 0) {
      continue;
    }

    for (const ref of skill.references) {
      const fullPath = join(DIST_SKILLS, skillId, "references", `${ref}.md`);
      if (!(await fileExists(fullPath))) {
        result.errors.push(
          `Skill '${skillId}': missing bundled reference references/${ref}.md`
        );
        continue;
      }

      const content = await readFile(fullPath);
      if (content.trim().length === 0) {
        result.errors.push(
          `Skill '${skillId}': bundled reference references/${ref}.md is empty`
        );
        continue;
      }

      console.log(`  reference: ${skillId}/references/${ref}.md`);
    }
  }
}

async function validateBundledArtifacts(): Promise<void> {
  const manifestPath = join(ROOT, "manifest.json");
  const parsed = ManifestSchema.safeParse(await Bun.file(manifestPath).json());
  if (!parsed.success) {
    return;
  }

  for (const [skillId, skill] of Object.entries(parsed.data.skills)) {
    for (const artifact of skill.bundledArtifacts ?? []) {
      const fullPath = join(DIST_SKILLS, skillId, artifact.destination);
      if (!(await fileExists(fullPath))) {
        result.errors.push(
          `Skill '${skillId}': missing bundled artifact ${artifact.destination}`
        );
        continue;
      }

      const file = Bun.file(fullPath);
      if (file.size === 0) {
        result.errors.push(
          `Skill '${skillId}': bundled artifact ${artifact.destination} is empty`
        );
        continue;
      }

      console.log(`  artifact: ${skillId}/${artifact.destination}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function validate(): Promise<void> {
  console.log(`Validating output at: ${DIST}\n`);

  console.log("Skills:");
  await validateSkills();

  console.log("\nStandalone:");
  await validateStandalone();

  console.log("\nManifest:");
  await validateManifest();

  console.log("\nBundled References:");
  await validateBundledReferences();

  console.log("\nBundled Artifacts:");
  await validateBundledArtifacts();

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
    `\nValidation passed: ${result.skillsValid} skills, ${result.standaloneValid} standalone files, ${result.standalonePacksValid} packs`
  );
}

validate().catch((err: unknown) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
