import { defineCommand } from "citty";

import {
  buildRuntimeProgressPaths,
  buildStreamOutputPaths,
  nextGroupedArtifactPath,
  writeJsonArtifact,
} from "../core/artifact-writer";
import { classifyCommandError } from "../core/command-errors";
import {
  cliResultEnvelopeSchema,
  createResultEnvelope,
  exitCodeForStatus,
  implementorResultSchema,
  type CliArtifactRef,
  type CliError,
  type CliStatus,
} from "../core/result-contracts";
import { runStoryImplement } from "../core/story-implementor";

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
    !("story" in envelope.result)
  ) {
    return `story-implement: ${envelope.outcome}`;
  }

  const result = envelope.result as {
    story: {
      id: string;
    };
    sessionId: string;
  };
  return [
    `story-implement: ${envelope.outcome}`,
    `story: ${result.story.id}`,
    `session: ${result.sessionId}`,
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
    name: "story-implement",
    description: "Launch the retained story implementor for the initial story pass.",
  },
  args: {
    "spec-pack-root": {
      type: "string",
      description: "Absolute or relative path to the spec-pack root",
      required: true,
    },
    "story-id": {
      type: "string",
      description: "The story id to implement",
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
      "implementor"
    );

    try {
      const outcome = await runStoryImplement({
        specPackRoot: args["spec-pack-root"],
        storyId: args["story-id"],
        configPath: args.config,
        env: process.env,
        artifactPath,
        streamOutputPaths: buildStreamOutputPaths(artifactPath),
        runtimeProgressPaths: buildRuntimeProgressPaths(artifactPath),
      });
      const envelope = cliResultEnvelopeSchema(implementorResultSchema).parse(
        createResultEnvelope({
          command: "story-implement",
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
      const classification = classifyCommandError(error);
      const envelope: OutputEnvelope = createResultEnvelope({
        command: "story-implement",
        outcome: classification.outcome,
        errors: [
          {
            code: classification.code,
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
