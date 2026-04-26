import { mkdir, readdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

import { writeTextFile } from "./fs-utils";

async function nextArtifactPathForGroup(
  specPackRoot: string,
  group: string,
  fileName: string
): Promise<string> {
  const [path] = await nextArtifactPathsForGroup(specPackRoot, group, [fileName]);
  return path;
}

async function nextArtifactPathsForGroup(
  specPackRoot: string,
  group: string,
  fileNames: string[]
): Promise<string[]> {
  const artifactDir = join(resolve(specPackRoot), "artifacts", group);
  await mkdir(artifactDir, { recursive: true });

  const existingMaxIndex = await findMaxArtifactIndex(artifactDir);
  return fileNames.map((fileName, index) => {
    const nextIndex = String(existingMaxIndex + index + 1).padStart(3, "0");
    return join(artifactDir, `${nextIndex}-${fileName}.json`);
  });
}

async function findMaxArtifactIndex(artifactDir: string): Promise<number> {
  let maxIndex = 0;

  const scanDir = async (directoryPath: string) => {
    try {
      const entries = await readdir(directoryPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          continue;
        }

        const match = entry.name.match(/^(\d{3})-/);
        if (!match?.[1]) {
          continue;
        }

        const value = Number.parseInt(match[1], 10);
        if (Number.isFinite(value)) {
          maxIndex = Math.max(maxIndex, value);
        }
      }
    } catch {
      // Missing subdirs are fine; treat them as empty.
    }
  };

  await scanDir(artifactDir);
  await scanDir(join(artifactDir, "progress"));
  await scanDir(join(artifactDir, "streams"));

  return maxIndex;
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

export async function nextGroupedArtifactPaths(
  specPackRoot: string,
  group: string,
  fileNames: string[]
): Promise<string[]> {
  return nextArtifactPathsForGroup(specPackRoot, group, fileNames);
}

export async function writeJsonArtifact(
  path: string,
  payload: unknown
): Promise<void> {
  await writeTextFile(path, `${JSON.stringify(payload)}\n`);
}

export function buildStreamOutputPaths(
  artifactPath: string,
  suffix?: string
): {
  stdoutPath: string;
  stderrPath: string;
} {
  const artifactDir = dirname(artifactPath);
  const streamDir = join(artifactDir, "streams");
  const artifactBaseName = basename(artifactPath, ".json");
  const streamBaseName = suffix
    ? `${artifactBaseName}.${suffix}`
    : artifactBaseName;

  return {
    stdoutPath: join(streamDir, `${streamBaseName}.stdout.log`),
    stderrPath: join(streamDir, `${streamBaseName}.stderr.log`),
  };
}

export function buildRuntimeProgressPaths(artifactPath: string): {
  statusPath: string;
  progressPath: string;
} {
  const artifactDir = dirname(artifactPath);
  const progressDir = join(artifactDir, "progress");
  const artifactBaseName = basename(artifactPath, ".json");

  return {
    statusPath: join(progressDir, `${artifactBaseName}.status.json`),
    progressPath: join(progressDir, `${artifactBaseName}.progress.jsonl`),
  };
}
