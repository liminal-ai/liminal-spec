import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";

import { readTextFile } from "./fs-utils";

interface StoryRecord {
  id: string;
  title: string;
  path: string;
  order: number;
}

interface StoryOrderResolution {
  status: "ready" | "needs-user-decision";
  stories: StoryRecord[];
  notes: string[];
}

function extractStoryTitle(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

function numericPrefix(fileName: string): number | null {
  const match = fileName.match(/^(\d+)-/);
  return match ? Number(match[1]) : null;
}

export async function resolveStoryOrder(
  storiesDir: string
): Promise<StoryOrderResolution> {
  const entries = await readdir(storiesDir, { withFileTypes: true });
  const fileNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);
  const numericFileNames = fileNames.filter(
    (fileName) => numericPrefix(fileName) !== null
  );
  const nonNumericFileNames = fileNames.filter(
    (fileName) => numericPrefix(fileName) === null
  );

  const notes: string[] = [];
  const orderedCandidates =
    numericFileNames.length > 0 ? numericFileNames : fileNames;

  if (numericFileNames.length > 0 && nonNumericFileNames.length > 0) {
    notes.push(
      `Ignored non-story markdown files in stories/: ${nonNumericFileNames
        .sort((left, right) => left.localeCompare(right))
        .join(", ")}`
    );
  }

  const orderedFileNames =
    numericFileNames.length === 0
      ? [...orderedCandidates].sort((left, right) => left.localeCompare(right))
      : [...orderedCandidates].sort((left, right) => {
          const leftPrefix = numericPrefix(left) ?? Number.MAX_SAFE_INTEGER;
          const rightPrefix = numericPrefix(right) ?? Number.MAX_SAFE_INTEGER;
          if (leftPrefix !== rightPrefix) {
            return leftPrefix - rightPrefix;
          }
          return left.localeCompare(right);
        });

  if (numericFileNames.length === 0 && orderedCandidates.length > 0) {
    notes.push(
      "Story filenames do not use numeric prefixes; lexical ordering was applied."
    );
  }

  const stories: StoryRecord[] = [];
  for (const [index, fileName] of orderedFileNames.entries()) {
    const path = join(storiesDir, fileName);
    const content = await readTextFile(path);
    stories.push({
      id: basename(fileName, ".md"),
      title: extractStoryTitle(content, basename(fileName, ".md")),
      path,
      order: index + 1,
    });
  }

  return {
    status: "ready",
    stories,
    notes,
  };
}
