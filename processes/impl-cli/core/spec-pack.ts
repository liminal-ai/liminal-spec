import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { pathExists, pathReadable } from "./fs-utils";
import { resolveGitRepoRoot } from "./git-repo";
import { inspectResultSchema, type InspectResult } from "./result-contracts";
import { resolveStoryOrder } from "./story-order";

async function pathIsDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

function resolveTechDesignArtifacts(entries: string[]): {
  techDesignShape: "two-file" | "four-file";
  companionPaths: string[];
  blockers: string[];
} {
  const companionFiles = entries
    .filter(
      (entry) =>
        /^tech-design-.+\.md$/.test(entry) && entry !== "tech-design.md"
    )
    .sort((left, right) => left.localeCompare(right));

  if (companionFiles.length === 0) {
    return {
      techDesignShape: "two-file",
      companionPaths: [],
      blockers: [],
    };
  }

  if (companionFiles.length === 2) {
    return {
      techDesignShape: "four-file",
      companionPaths: companionFiles,
      blockers: [],
    };
  }

  return {
    techDesignShape: "two-file",
    companionPaths: [],
    blockers: [
      "Invalid tech-design companion layout: expected exactly two additional tech-design-*.md companion files for the four-file configuration",
    ],
  };
}

export async function inspectSpecPack(specPackRoot: string): Promise<InspectResult> {
  const resolvedRoot = resolve(specPackRoot);
  const epicPath = join(resolvedRoot, "epic.md");
  const techDesignPath = join(resolvedRoot, "tech-design.md");
  const testPlanPath = join(resolvedRoot, "test-plan.md");
  const storiesDir = join(resolvedRoot, "stories");
  const storiesFile = join(resolvedRoot, "stories.md");
  const blockers: string[] = [];
  const notes: string[] = [];

  const repoRoot = await resolveGitRepoRoot(resolvedRoot);
  if (!repoRoot) {
    blockers.push(`Spec-pack root is not inside a git repo: ${resolvedRoot}`);
  }

  if (!(await pathExists(epicPath))) {
    blockers.push("Missing required artifact: epic.md");
  }

  if (!(await pathExists(techDesignPath))) {
    blockers.push("Missing required artifact: tech-design.md");
  }

  if (!(await pathExists(testPlanPath))) {
    blockers.push("Missing required artifact: test-plan.md");
  }

  const storiesDirExists = await pathIsDirectory(storiesDir);
  if (!storiesDirExists && (await pathExists(storiesFile))) {
    blockers.push("Expected stories/ directory but found stories.md");
  } else if (!storiesDirExists) {
    blockers.push("Missing required artifact: stories/");
  }

  const rootEntries = await readdir(resolvedRoot);
  const techDesignArtifacts = resolveTechDesignArtifacts(rootEntries);
  blockers.push(...techDesignArtifacts.blockers);

  const storyOrder = storiesDirExists
    ? await resolveStoryOrder(storiesDir)
    : { status: "ready" as const, stories: [], notes: [] };
  notes.push(...storyOrder.notes);
  const implInsertPath = join(
    resolvedRoot,
    "custom-story-impl-prompt-insert.md"
  );
  const verifierInsertPath = join(
    resolvedRoot,
    "custom-story-verifier-prompt-insert.md"
  );
  const implInsertExists = await pathExists(implInsertPath);
  const verifierInsertExists = await pathExists(verifierInsertPath);

  if (implInsertExists && !(await pathReadable(implInsertPath))) {
    blockers.push(
      "Unreadable prompt insert: custom-story-impl-prompt-insert.md"
    );
  }

  if (verifierInsertExists && !(await pathReadable(verifierInsertPath))) {
    blockers.push(
      "Unreadable prompt insert: custom-story-verifier-prompt-insert.md"
    );
  }

  const status =
    blockers.length > 0
      ? "blocked"
      : storyOrder.status === "needs-user-decision"
        ? "needs-user-decision"
        : "ready";

  const result: InspectResult = {
    status,
    specPackRoot: resolvedRoot,
    techDesignShape: techDesignArtifacts.techDesignShape,
    artifacts: {
      epicPath,
      techDesignPath,
      techDesignCompanionPaths: techDesignArtifacts.companionPaths.map((file) =>
        join(resolvedRoot, file)
      ),
      testPlanPath,
      storiesDir,
    },
    stories: storyOrder.stories,
    inserts: {
      customStoryImplPromptInsert: implInsertExists ? "present" : "absent",
      customStoryVerifierPromptInsert: verifierInsertExists
        ? "present"
        : "absent",
    },
    blockers,
    notes,
  };

  return inspectResultSchema.parse(result);
}
