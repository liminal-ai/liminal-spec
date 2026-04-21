import { defineCommand } from "citty";
import { ZodError } from "zod";

import { nextGroupedArtifactPath, writeJsonArtifact } from "../core/artifact-writer";
import { runEpicCleanup } from "../core/epic-cleanup";
import {
  cliResultEnvelopeSchema,
  createResultEnvelope,
  epicCleanupResultSchema,
  exitCodeForStatus,
  type CliArtifactRef,
  type CliError,
  type CliStatus,
} from "../core/result-contracts";

interface OutputEnvelope {
  command: string;
  version: 1;
  status: CliStatus;
  outcome: string;
  result?: unknown;
  errors: CliError[];
  warnings: string[];
  artifacts: CliArtifactRef[];
  startedAt: string;
  finishedAt: string;
}

function renderHumanSummary(envelope: OutputEnvelope) {
  if (
    typeof envelope.result !== "object" ||
    envelope.result === null ||
    !("cleanupBatchPath" in envelope.result)
  ) {
    return `epic-cleanup: ${envelope.outcome}`;
  }

  const result = envelope.result as {
    cleanupBatchPath: string;
    filesChanged: string[];
  };
  return [
    `epic-cleanup: ${envelope.outcome}`,
    `cleanup-batch: ${result.cleanupBatchPath}`,
    `files-changed: ${result.filesChanged.length}`,
  ].join("\n");
}

function emitOutput(params: {
  envelope: OutputEnvelope;
  json: boolean;
}) {
  if (params.json) {
    console.log(JSON.stringify(params.envelope));
    return;
  }

  console.log(renderHumanSummary(params.envelope));
}

export default defineCommand({
  meta: {
    name: "epic-cleanup",
    description: "Apply one cleanup-only pass from a curated epic cleanup batch.",
  },
  args: {
    "spec-pack-root": {
      type: "string",
      description: "Absolute or relative path to the spec-pack root",
      required: true,
    },
    "cleanup-batch": {
      type: "string",
      description: "Path to the curated cleanup batch artifact",
      required: true,
    },
    config: {
      type: "string",
      description: "Explicit run-config file relative to the spec-pack root",
    },
    json: {
      type: "boolean",
      description: "Emit the structured JSON envelope on stdout",
    },
  },
  async run({ args }) {
    const startedAt = new Date().toISOString();
    const artifactPath = await nextGroupedArtifactPath(
      args["spec-pack-root"],
      "cleanup",
      "cleanup-result"
    );

    try {
      const outcome = await runEpicCleanup({
        specPackRoot: args["spec-pack-root"],
        cleanupBatchPath: args["cleanup-batch"],
        configPath: args.config,
        env: process.env,
      });
      const envelope = cliResultEnvelopeSchema(epicCleanupResultSchema).parse(
        createResultEnvelope({
          command: "epic-cleanup",
          outcome: outcome.outcome,
          result: outcome.result,
          errors: outcome.errors,
          warnings: outcome.warnings,
          artifacts: [
            {
              kind: "result-envelope",
              path: artifactPath,
            },
          ],
          startedAt,
          finishedAt: new Date().toISOString(),
        })
      );

      await writeJsonArtifact(artifactPath, envelope);
      emitOutput({
        envelope,
        json: Boolean(args.json),
      });
      process.exitCode = exitCodeForStatus(envelope.status, envelope.outcome);
    } catch (error) {
      const envelope: OutputEnvelope = createResultEnvelope({
        command: "epic-cleanup",
        outcome:
          error instanceof ZodError ||
          (error instanceof Error &&
            error.message.toLowerCase().includes("config"))
            ? "blocked"
            : "error",
        errors: [
          {
            code:
              error instanceof ZodError ||
              (error instanceof Error &&
                error.message.toLowerCase().includes("config"))
                ? "INVALID_RUN_CONFIG"
                : "UNEXPECTED_ERROR",
            message: error instanceof Error ? error.message : String(error),
          },
        ],
        artifacts: [
          {
            kind: "result-envelope",
            path: artifactPath,
          },
        ],
        startedAt,
        finishedAt: new Date().toISOString(),
      });

      await writeJsonArtifact(artifactPath, envelope);
      emitOutput({
        envelope,
        json: Boolean(args.json),
      });
      process.exitCode = exitCodeForStatus(envelope.status, envelope.outcome);
    }
  },
});
