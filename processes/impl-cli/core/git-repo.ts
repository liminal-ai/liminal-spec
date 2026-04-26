import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function resolveGitRepoRoot(
  cwd: string
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
    });
    const repoRoot = stdout.trim();
    return repoRoot.length > 0 ? repoRoot : null;
  } catch {
    return null;
  }
}

export async function resolveProviderCwd(specPackRoot: string): Promise<string> {
  return (await resolveGitRepoRoot(specPackRoot)) ?? resolve(specPackRoot);
}
