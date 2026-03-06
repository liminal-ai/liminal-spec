import { resolve } from "node:path";
import { loadResumeOptions, runOrchestration, summarizeRunResult } from "./core/loop";
import { writeRunNarrativeReport } from "./core/report";
import type { FlowId, RunOptions, TerminalMode } from "./types";

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
    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      flags[key] = true;
      index += 1;
      continue;
    }

    flags[key] = value;
    index += 2;
  }

  return { command, flags };
}

function toStringFlag(flags: Record<string, string | boolean>, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function toBoolFlag(flags: Record<string, string | boolean>, key: string): boolean {
  return flags[key] === true;
}

function parseStories(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseTerminalMode(value: string | undefined): TerminalMode {
  if (!value) {
    return "auto";
  }

  if (value === "auto" || value === "iterm2" || value === "ghostty" || value === "terminal" || value === "none") {
    return value;
  }

  throw new Error(
    `Invalid --terminal value '${value}'. Use one of: auto|iterm2|ghostty|terminal|none`
  );
}

function parseMaxReworks(value: string | undefined): number {
  if (!value) {
    return 2;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("--max-reworks must be a non-negative integer");
  }

  return parsed;
}

function resolveEntryPoint(flowId: FlowId, entryFlag?: string): string | undefined {
  const normalized = entryFlag?.trim().toLowerCase();

  if (flowId === "team-spec") {
    if (!normalized) {
      return "epic";
    }

    if (normalized === "epic") {
      return "epic";
    }

    if (normalized === "research" || normalized === "research-entry") {
      return "research-entry";
    }

    throw new Error(
      "team-spec --entry must be one of: epic | research"
    );
  }

  if (flowId === "single-story") {
    if (!normalized || normalized === "spec" || normalized === "single-spec") {
      return "single-spec";
    }

    if (normalized === "tech" || normalized === "single-tech") {
      return "single-tech";
    }

    if (normalized === "impl" || normalized === "single-impl") {
      return "single-impl";
    }

    if (
      normalized === "verify" ||
      normalized === "final-verify" ||
      normalized === "single-final-verify"
    ) {
      return "single-final-verify";
    }

    throw new Error(
      "single-story --entry must be one of: spec | tech | impl | verify"
    );
  }

  return undefined;
}

async function buildRunOptions(args: ParsedArgs): Promise<RunOptions> {
  const command = args.command;
  if (!command) {
    throw new Error(
      "Missing command. Use one of: team-impl | team-spec | single-story | resume | report"
    );
  }

  if (command === "report") {
    throw new Error("report is handled directly in main");
  }

  if (command === "resume") {
    const runId = toStringFlag(args.flags, "run-id");
    if (!runId) {
      throw new Error("resume requires --run-id <id>");
    }

    const resumeOptions = await loadResumeOptions(runId);
    resumeOptions.terminalMode = parseTerminalMode(
      toStringFlag(args.flags, "terminal") || resumeOptions.terminalMode
    );
    const resumeDryRunScenario = toStringFlag(args.flags, "dry-run-scenario");
    if (resumeOptions.dryRun) {
      if (!resumeDryRunScenario) {
        throw new Error(
          "Resuming a dry-run requires --dry-run-scenario <path>."
        );
      }
      resumeOptions.dryRunScenarioPath = resolve(resumeDryRunScenario);
    } else {
      resumeOptions.dryRunScenarioPath = undefined;
    }
    resumeOptions.userResponseText = toStringFlag(args.flags, "user-response");
    resumeOptions.userResponseFile = toStringFlag(args.flags, "user-response-file");
    return resumeOptions;
  }

  const flowId = command as FlowId;
  if (flowId !== "team-impl" && flowId !== "team-spec" && flowId !== "single-story") {
    throw new Error(
      `Invalid command '${command}'. Use one of: team-impl | team-spec | single-story | resume`
    );
  }

  const cwd = resolve(toStringFlag(args.flags, "cwd") || process.cwd());
  const entryPoint = resolveEntryPoint(flowId, toStringFlag(args.flags, "entry"));
  const dryRun = toBoolFlag(args.flags, "dry-run");
  const dryRunScenarioPath = toStringFlag(args.flags, "dry-run-scenario");
  if (dryRun && !dryRunScenarioPath) {
    throw new Error("--dry-run requires --dry-run-scenario <path>");
  }

  const options: RunOptions = {
    flowId,
    cwd,
    runId: toStringFlag(args.flags, "run-id"),
    dryRun,
    dryRunScenarioPath: dryRunScenarioPath ? resolve(dryRunScenarioPath) : undefined,
    terminalMode: parseTerminalMode(toStringFlag(args.flags, "terminal")),
    inputs: {
      epicPath: toStringFlag(args.flags, "epic"),
      techDesignPath: toStringFlag(args.flags, "tech-design"),
      storyPath: toStringFlag(args.flags, "story"),
      stories: parseStories(toStringFlag(args.flags, "stories")),
      requirementsPath: toStringFlag(args.flags, "requirements"),
    },
    entryPoint,
    resume: false,
    maxReworks: parseMaxReworks(toStringFlag(args.flags, "max-reworks")),
    userResponseText: undefined,
    userResponseFile: undefined,
  };

  if (flowId === "single-story") {
    if (
      options.entryPoint &&
      options.entryPoint !== "single-spec" &&
      !options.inputs.storyPath
    ) {
      throw new Error(
        "single-story entry 'tech|impl|verify' requires --story <path>."
      );
    }
  }

  if (flowId === "team-spec") {
    if (options.entryPoint === "research-entry" && !options.inputs.requirementsPath) {
      throw new Error(
        "team-spec --entry research requires --requirements <path>."
      );
    }
  }

  return options;
}

async function main(): Promise<void> {
  const parsed = parseArgs(Bun.argv);

  if (parsed.command === "report") {
    const runId = toStringFlag(parsed.flags, "run-id");
    if (!runId) {
      throw new Error("report requires --run-id <id>");
    }

    const outputPath = toStringFlag(parsed.flags, "output");
    const reportPath = await writeRunNarrativeReport({
      runId,
      outputPath,
    });
    console.log(`report_path=${reportPath}`);
    return;
  }

  const options = await buildRunOptions(parsed);
  const runState = await runOrchestration(options);
  console.log(summarizeRunResult(runState));

  if (runState.status === "waiting_user") {
    process.exitCode = 3;
  } else if (runState.status === "escalated" || runState.status === "failed") {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
