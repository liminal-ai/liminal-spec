import { mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { writeTextFile } from "./fs-utils";

async function nextArtifactPathForGroup(
  specPackRoot: string,
  group: string,
  fileName: string
): Promise<string> {
  const artifactDir = join(resolve(specPackRoot), "artifacts", group);
  await mkdir(artifactDir, { recursive: true });

  const entries = await readdir(artifactDir, { withFileTypes: true });
  const existingCount = entries.filter(
    (entry) =>
      entry.isFile() && /^\d{3}-.+\.json$/.test(entry.name)
  ).length;
  const nextIndex = String(existingCount + 1).padStart(3, "0");

  return join(artifactDir, `${nextIndex}-${fileName}.json`);
}

export async function nextArtifactPath(
  specPackRoot: string,
  command: string
): Promise<string> {
  return nextArtifactPathForGroup(specPackRoot, command, command);
}

export async function nextGroupedArtifactPath(
  specPackRoot: string,
  group: string,
  fileName: string
): Promise<string> {
  return nextArtifactPathForGroup(specPackRoot, group, fileName);
}

export async function writeJsonArtifact(
  path: string,
  payload: unknown
): Promise<void> {
  await writeTextFile(path, `${JSON.stringify(payload)}\n`);
}
