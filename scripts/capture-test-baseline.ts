import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

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

async function collectTestBaseline(): Promise<BaselineEntry[]> {
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
  const force = process.argv.includes("--force");
  const baselineFile = Bun.file(BASELINE_PATH);

  if (!force && (await baselineFile.exists())) {
    console.log(`Test baseline already exists at ${BASELINE_PATH}`);
    return;
  }

  const baseline = collectTestBaseline();
  await mkdir(dirname(BASELINE_PATH), { recursive: true });
  await Bun.write(
    BASELINE_PATH,
    `${JSON.stringify(await baseline, null, 2)}\n`
  );
  console.log(`Captured test baseline at ${BASELINE_PATH}`);
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
