import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { FlowId } from "../types";

const REPO_ROOT = resolve(import.meta.dir, "../../..");

function stripFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n?/m, "").trim();
}

const PHASE_SKILL_MAP: Record<FlowId, Record<string, string[]>> = {
  "team-impl": {
    "impl-prep": ["ls-team-impl"],
    "story-cycle": ["ls-team-impl"],
    "epic-post-verify": ["ls-team-impl"],
    "handoff-close": ["ls-team-impl"],
  },
  "team-spec": {
    "research-entry": ["ls-team-spec", "ls-prd"],
    "spec-prep": ["ls-team-spec", "ls-prd", "ls-epic"],
    epic: ["ls-team-spec", "ls-epic"],
    "tech-design": ["ls-team-spec", "ls-tech-design", "ls-epic"],
    "publish-epic": ["ls-team-spec", "ls-publish-epic", "ls-epic"],
    "final-verification": ["ls-team-spec", "ls-publish-epic"],
    "handoff-close": ["ls-team-spec"],
  },
  "single-story": {
    "single-spec": ["lss-story"],
    "single-tech": ["lss-tech"],
    "single-impl": ["lss-tech"],
    "single-final-verify": ["lss-tech"],
  },
};

const SKILL_FILE_CACHE = new Map<string, string>();

async function loadSkillContent(skillId: string): Promise<string> {
  const cached = SKILL_FILE_CACHE.get(skillId);
  if (cached) {
    return cached;
  }

  const distPath = resolve(
    REPO_ROOT,
    "dist/skills",
    skillId,
    "SKILL.md"
  );

  try {
    const raw = await readFile(distPath, "utf8");
    const cleaned = stripFrontmatter(raw);
    SKILL_FILE_CACHE.set(skillId, cleaned);
    return cleaned;
  } catch {
    throw new Error(`Skill '${skillId}' not found at ${distPath}. Run 'bun run build' first.`);
  }
}

export async function buildInlinedSkillBundle(
  flowId: FlowId,
  phaseId: string
): Promise<string> {
  const skillIds = PHASE_SKILL_MAP[flowId]?.[phaseId] ?? [];
  if (skillIds.length === 0) {
    return "No inlined skills mapped for this phase.";
  }

  const sections: string[] = [];
  for (const skillId of skillIds) {
    const content = await loadSkillContent(skillId);
    sections.push(`### Skill: ${skillId}\n\n${content}`);
  }

  return sections.join("\n\n---\n\n");
}
