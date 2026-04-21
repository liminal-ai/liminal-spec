import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export async function countTestBaseline(repoRoot: string): Promise<number> {
  const files = await collectTestFiles(repoRoot);
  let total = 0;

  for (const file of files) {
    const content = await readFile(file, "utf8");
    const matches = content.match(/\b(?:test|it)\s*\(/g);
    total += matches?.length ?? 0;
  }

  return total;
}

async function collectTestFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  await walk(root, result);
  return result;
}

async function walk(dir: string, result: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
      continue;
    }

    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path, result);
      continue;
    }

    if (entry.isFile() && /\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) {
      result.push(path);
    }
  }
}
