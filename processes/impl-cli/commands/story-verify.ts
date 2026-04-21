import { defineCommand } from "citty";
import { ZodError } from "zod";

import { nextGroupedArtifactPath, writeJsonArtifact } from "../core/artifact-writer";
import {
  cliResultEnvelopeSchema,
  createResultEnvelope,
  exitCodeForStatus,
  storyVerifierBatchResultSchema,
  type CliArtifactRef,
  type CliError,
  type CliStatus,
} from "../core/result-contracts";
import { runStoryVerify } from "../core/story-verifier";

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
    !("story" in envelope.result) ||
    !("verifierResults" in envelope.result)
  ) {
    return `story-verify: ${envelope.outcome}`;
  }

  const result = envelope.result as {
    story: {
      id: string;
    };
    verifierResults: unknown[];
  };
  return [
    `story-verify: ${envelope.outcome}`,
    `story: ${result.story.id}`,
    `verifiers: ${result.verifierResults.length}`,
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
    name: "story-verify",
    description: "Launch a fresh verifier batch for one story.",
  },
  args: {
    "spec-pack-root": {
      type: "string",
      description: "Absolute or relative path to the spec-pack root",
      required: true,
    },
    "story-id": {
      type: "string",
      description: "The story id to verify",
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
      args["story-id"],
      "verify-batch"
    );

    try {
      const outcome = await runStoryVerify({
        specPackRoot: args["spec-pack-root"],
        storyId: args["story-id"],
        configPath: args.config,
        env: process.env,
      });
      const envelope = cliResultEnvelopeSchema(
        storyVerifierBatchResultSchema
      ).parse(
        createResultEnvelope({
          command: "story-verify",
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
        command: "story-verify",
        outcome:
          error instanceof ZodError ||
          (error instanceof Error &&
            error.message.toLowerCase().includes("config"))
            ? "block"
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
