import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runOrchestration } from "../src/core/loop";
import { RUNS_ROOT } from "../src/core/state";
import type { CommandExecutor, ShellExecutionResult } from "../src/types";

const cleanupRunIds: string[] = [];

const MILESTONES: Record<string, string[]> = {
  "impl-prep": ["gate-discovery-complete", "stories-sequenced"],
  "story-cycle": ["story-implemented", "story-verified"],
  "epic-post-verify": ["meta-review-complete", "fixes-verified"],
  "handoff-close": ["handoff-complete"],
};

class LiveMockExecutor implements CommandExecutor {
  constructor(private readonly createArtifacts: boolean) {}

  async run(command: string): Promise<ShellExecutionResult> {
    if (command.startsWith("zsh '") && this.createArtifacts) {
      const match = command.match(/zsh '([^']+)'/);
      if (match) {
        const callScriptPath = match[1];
        const attemptDir = dirname(callScriptPath);
        const parts = attemptDir.split("/");
        const phaseId = parts[parts.length - 2];

        await mkdir(attemptDir, { recursive: true });
        await writeFile(
          resolve(attemptDir, "receipt.md"),
          `# Receipt\n\nphase=${phaseId}\n`,
          "utf8"
        );
        await writeFile(
          resolve(attemptDir, "status.json"),
          `${JSON.stringify(
            {
              phaseId,
              status: "DONE",
              codexEvidenceRef: `mock-evidence-${phaseId}`,
              unresolvedFindings: [
                { id: "mock", title: "mock finding", disposition: "accepted-risk" },
              ],
              milestones: MILESTONES[phaseId] || [],
              notes: "mock status",
            },
            null,
            2
          )}\n`,
          "utf8"
        );
      }

      return { exitCode: 0, stdout: "", stderr: "" };
    }

    if (command.includes("codex exec") && command.includes("supervisor-decision.schema.json")) {
      const outPath = this.extractOutputPath(command);
      if (outPath) {
        await writeFile(
          outPath,
          `${JSON.stringify(
            {
              decision: "approve",
              rationale: "mock supervisor approve",
              useExceptionToken: false,
            },
            null,
            2
          )}\n`,
          "utf8"
        );
      }
      return { exitCode: 0, stdout: "", stderr: "" };
    }

    if (command.includes("codex exec") && command.includes("supervisor-commit.schema.json")) {
      const outPath = this.extractOutputPath(command);
      if (outPath) {
        await writeFile(
          outPath,
          `${JSON.stringify(
            {
              status: "committed",
              summary: "mock commit",
            },
            null,
            2
          )}\n`,
          "utf8"
        );
      }
      return { exitCode: 0, stdout: "", stderr: "" };
    }

    return { exitCode: 1, stdout: "", stderr: "unsupported mock command" };
  }

  private extractOutputPath(command: string): string | null {
    const match = command.match(/-o '([^']+)'/);
    return match ? match[1] : null;
  }
}

afterEach(async () => {
  while (cleanupRunIds.length > 0) {
    const runId = cleanupRunIds.pop()!;
    await rm(resolve(RUNS_ROOT, runId), { recursive: true, force: true });
  }
});

describe("live mode with mocked command execution", () => {
  test("completes when artifacts and approvals are returned", async () => {
    const runId = `test-live-ok-${Date.now()}`;
    cleanupRunIds.push(runId);

    const runState = await runOrchestration(
      {
        flowId: "team-impl",
        cwd: process.cwd(),
        runId,
        dryRun: false,
        terminalMode: "none",
        inputs: {
          stories: ["/tmp/story.md"],
        },
        resume: false,
        maxReworks: 2,
      },
      {
        executor: new LiveMockExecutor(true),
        artifactTimeoutMs: 200,
      }
    );

    expect(runState.status).toBe("completed");
  });

  test("escalates when required artifacts never appear", async () => {
    const runId = `test-live-escalate-${Date.now()}`;
    cleanupRunIds.push(runId);

    const runState = await runOrchestration(
      {
        flowId: "team-impl",
        cwd: process.cwd(),
        runId,
        dryRun: false,
        terminalMode: "none",
        inputs: {
          stories: ["/tmp/story.md"],
        },
        resume: false,
        maxReworks: 0,
      },
      {
        executor: new LiveMockExecutor(false),
        artifactTimeoutMs: 20,
      }
    );

    expect(runState.status).toBe("waiting_user");
  });
});
