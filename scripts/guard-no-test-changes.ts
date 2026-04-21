import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";

import { Glob } from "bun";

const ROOT = resolve(import.meta.dir, "..");
const BASELINE_PATH = join(
  ROOT,
  ".test-tmp",
  "green-verify",
  "test-file-baseline.json"
);

interface BaselineEntry {
  path: string;
  sha256: string;
}

async function collectCurrentEntries(): Promise<BaselineEntry[]> {
  const glob = new Glob("**/*.test.ts");
  const entries: BaselineEntry[] = [];

  for await (const match of glob.scan({
    cwd: ROOT,
    absolute: true,
    onlyFiles: true,
  })) {
    if (
      match.includes("/node_modules/") ||
      match.includes("/dist/") ||
      match.includes("/.test-tmp/")
    ) {
      continue;
    }

    const content = await Bun.file(match).text();
    entries.push({
      path: relative(ROOT, match),
      sha256: createHash("sha256").update(content).digest("hex"),
    });
  }

  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

async function main() {
  const baselineFile = Bun.file(BASELINE_PATH);
  if (!(await baselineFile.exists())) {
    console.error(
      `Missing test baseline at ${BASELINE_PATH}. Run bun run capture:test-baseline after the red phase.`
    );
    process.exit(1);
  }

  const baseline = (await baselineFile.json()) as BaselineEntry[];
  const current = await collectCurrentEntries();
  const baselineMap = new Map(baseline.map((entry) => [entry.path, entry.sha256]));
  const currentMap = new Map(current.map((entry) => [entry.path, entry.sha256]));
  const changedPaths = new Set<string>();

  for (const [path, sha256] of currentMap) {
    if (baselineMap.get(path) !== sha256) {
      changedPaths.add(path);
    }
  }

  for (const path of baselineMap.keys()) {
    if (!currentMap.has(path)) {
      changedPaths.add(path);
    }
  }

  if (changedPaths.size > 0) {
    console.error("Test files changed after the captured red-phase baseline:");
    for (const path of [...changedPaths].sort((left, right) =>
      left.localeCompare(right)
    )) {
      console.error(`- ${path}`);
    }
    process.exit(1);
  }

  console.log("No test file changes detected since the captured baseline.");
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
