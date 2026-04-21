import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { GatePolicy } from "./state";

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function discoverVerificationGates(
  repoRoot: string
): Promise<GatePolicy> {
  const packageJsonPath = join(repoRoot, "package.json");
  let packageJson: Record<string, unknown>;

  try {
    packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    throw new Error(
      `Could not read package.json from target repo root '${repoRoot}'.`
    );
  }

  const scripts =
    typeof packageJson.scripts === "object" && packageJson.scripts
      ? (packageJson.scripts as Record<string, string>)
      : {};

  if (!scripts.verify) {
    throw new Error(
      "Target repo does not expose a verify script; gate discovery is ambiguous."
    );
  }

  const packageManager = inferPackageManager(
    typeof packageJson.packageManager === "string"
      ? packageJson.packageManager
      : undefined
  );

  const runScript = (scriptName: string): string => {
    if (packageManager === "pnpm") {
      return `corepack pnpm run ${scriptName}`;
    }
    if (packageManager === "bun") {
      return `bun run ${scriptName}`;
    }
    return `npm run ${scriptName}`;
  };

  return {
    packageManager,
    storyAcceptanceGate: runScript("verify"),
    featureAcceptanceGate: scripts["verify-all"]
      ? runScript("verify-all")
      : runScript("verify"),
  };
}

function inferPackageManager(
  packageManagerField?: string
): GatePolicy["packageManager"] {
  const normalized = packageManagerField?.toLowerCase() ?? "";

  if (normalized.startsWith("pnpm@")) {
    return "pnpm";
  }
  if (normalized.startsWith("bun@")) {
    return "bun";
  }
  return "npm";
}

export async function runShellCommand(
  cwd: string,
  command: string
): Promise<CommandResult> {
  const proc = Bun.spawn(["zsh", "-lc", command], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { exitCode, stdout, stderr };
}
