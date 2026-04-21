import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

export interface StoryDefinition {
  id: string;
  index: number;
  path: string;
  fileName: string;
  title: string;
}

export interface ResolvedSpecPack {
  specPackRoot: string;
  repoRoot: string;
  epicPath: string;
  techDesignPath: string;
  techDesignCompanionPaths: string[];
  testPlanPath: string;
  storyDirectory: string;
  storyCoveragePath?: string;
  boundaryInventoryPath?: string;
  stories: StoryDefinition[];
}

export async function resolveSpecPack(
  specPackRoot: string
): Promise<ResolvedSpecPack> {
  const root = resolve(specPackRoot);
  const repoRoot = await findRepoRoot(root);

  const epicPath = join(root, "epic.md");
  const techDesignPath = join(root, "tech-design.md");
  const testPlanPath = join(root, "test-plan.md");
  const storyDirectory = join(root, "stories");
  const storyCoveragePath = join(storyDirectory, "coverage.md");
  const boundaryInventoryPath = join(root, "boundary-inventory.md");

  await assertFile(epicPath, "Missing epic.md");
  await assertFile(techDesignPath, "Missing tech-design.md");
  await assertFile(testPlanPath, "Missing test-plan.md");
  await assertDirectory(storyDirectory, "Missing stories/ directory");

  const storyFiles = (await readdir(storyDirectory, { withFileTypes: true }))
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".md") &&
        entry.name !== "coverage.md"
    )
    .map((entry) => entry.name)
    .sort();

  if (storyFiles.length === 0) {
    throw new Error("Spec pack has no story markdown files in stories/.");
  }

  const stories: StoryDefinition[] = [];
  for (let index = 0; index < storyFiles.length; index += 1) {
    const fileName = storyFiles[index];
    const path = join(storyDirectory, fileName);
    const title = await readStoryTitle(path);
    stories.push({
      id: basename(fileName, extname(fileName)),
      index,
      path,
      fileName,
      title,
    });
  }

  const techDesignCompanionPaths = (await readdir(root, { withFileTypes: true }))
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.startsWith("tech-design-") &&
        entry.name.endsWith(".md")
    )
    .map((entry) => join(root, entry.name))
    .sort();

  return {
    specPackRoot: root,
    repoRoot,
    epicPath,
    techDesignPath,
    techDesignCompanionPaths,
    testPlanPath,
    storyDirectory,
    storyCoveragePath: await pathExists(storyCoveragePath)
      ? storyCoveragePath
      : undefined,
    boundaryInventoryPath: await pathExists(boundaryInventoryPath)
      ? boundaryInventoryPath
      : undefined,
    stories,
  };
}

export async function findRepoRoot(startPath: string): Promise<string> {
  let current = resolve(startPath);

  while (true) {
    if (await pathExists(join(current, ".git"))) {
      return current;
    }

    const parent = resolve(current, "..");
    if (parent === current) {
      throw new Error(
        `Could not resolve a git repository root from spec pack path '${startPath}'.`
      );
    }
    current = parent;
  }
}

async function assertFile(path: string, message: string): Promise<void> {
  if (!(await pathExists(path))) {
    throw new Error(message);
  }
}

async function assertDirectory(path: string, message: string): Promise<void> {
  try {
    const entries = await readdir(path);
    void entries;
  } catch {
    throw new Error(message);
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readStoryTitle(path: string): Promise<string> {
  const content = await readFile(path, "utf8");
  const match = content.match(/^#\s+(.+)$/m) ?? content.match(/^##\s+(.+)$/m);
  return match?.[1]?.trim() || basename(path, extname(path));
}
