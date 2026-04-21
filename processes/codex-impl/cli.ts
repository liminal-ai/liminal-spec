import { resolve } from "node:path";
import { startProcess, resumeProcess, readProcessSummary } from "./core/loop";

interface ParsedArgs {
  command?: string;
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[2];
  const flags: Record<string, string | boolean> = {};

  let index = 3;
  while (index < argv.length) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      index += 1;
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      index += 1;
      continue;
    }

    flags[key] = next;
    index += 2;
  }

  return { command, flags };
}

function stringFlag(
  flags: Record<string, string | boolean>,
  key: string
): string | undefined {
  return typeof flags[key] === "string" ? String(flags[key]) : undefined;
}

async function main(): Promise<void> {
  const parsed = parseArgs(Bun.argv);
  const specPackRoot = stringFlag(parsed.flags, "spec-pack-root");

  if (!parsed.command || !specPackRoot) {
    throw new Error(
      "Usage: bun run codex-impl:process -- <start|resume|status|dry-run> --spec-pack-root <path> [--scenario <json>]"
    );
  }

  if (parsed.command === "start") {
    const state = await startProcess({ specPackRoot: resolve(specPackRoot) });
    console.log(await readProcessSummary(resolve(specPackRoot)));
    if (state.status === "WAITING_USER") {
      process.exitCode = 2;
    }
    return;
  }

  if (parsed.command === "resume") {
    const state = await resumeProcess({ specPackRoot: resolve(specPackRoot) });
    console.log(await readProcessSummary(resolve(specPackRoot)));
    if (state.status === "WAITING_USER") {
      process.exitCode = 2;
    }
    return;
  }

  if (parsed.command === "status") {
    console.log(await readProcessSummary(resolve(specPackRoot)));
    return;
  }

  if (parsed.command === "dry-run") {
    const scenario = stringFlag(parsed.flags, "scenario");
    if (!scenario) {
      throw new Error("dry-run requires --scenario <json>");
    }
    const state = await startProcess({
      specPackRoot: resolve(specPackRoot),
      dryRun: true,
      scenarioPath: resolve(scenario),
    });
    console.log(await readProcessSummary(resolve(specPackRoot)));
    if (state.status === "WAITING_USER") {
      process.exitCode = 2;
    }
    return;
  }

  throw new Error(
    "Unknown command. Use one of: start | resume | status | dry-run"
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
