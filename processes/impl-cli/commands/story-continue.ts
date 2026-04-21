import { defineCommand } from "citty";
import { ZodError } from "zod";

import { nextGroupedArtifactPath, writeJsonArtifact } from "../core/artifact-writer";
import { readTextFile } from "../core/fs-utils";
import {
  cliResultEnvelopeSchema,
  createResultEnvelope,
  exitCodeForStatus,
  implementorResultSchema,
  type CliArtifactRef,
  type CliError,
  type CliStatus,
} from "../core/result-contracts";
import { runStoryContinue } from "../core/story-implementor";

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
    return `story-continue: ${envelope.outcome}`;
  }

  const result = envelope.result as {
    story: {
      id: string;
    };
    sessionId: string;
  };
  return [
    `story-continue: ${envelope.outcome}`,
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
    name: "story-continue",
    description: "Continue an explicit retained story implementor session.",
  },
  args: {
    "spec-pack-root": {
      type: "string",
      description: "Absolute or relative path to the spec-pack root",
      required: true,
    },
    "story-id": {
      type: "string",
      description: "The story id to continue",
      required: true,
    },
    provider: {
      type: "string",
      description: "Provider name from the continuation handle",
      required: true,
    },
    "session-id": {
      type: "string",
      description: "Explicit session id from the continuation handle",
      required: true,
    },
    config: {
      type: "string",
      description: "Explicit run-config file relative to the spec-pack root",
    },
    "followup-file": {
      type: "string",
      description: "Path to a follow-up prompt file",
    },
    "followup-text": {
      type: "string",
      description: "Inline follow-up request text",
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
      "continue"
    );

    try {
      if (
        (!args["followup-file"] && !args["followup-text"]) ||
        (args["followup-file"] && args["followup-text"])
      ) {
        const envelope: OutputEnvelope = createResultEnvelope({
          command: "story-continue",
          outcome: "error",
          errors: [
            {
              code: "INVALID_INVOCATION",
              message:
                "Provide exactly one of --followup-file or --followup-text.",
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
        return;
      }

      const followupRequest = args["followup-file"]
        ? await readTextFile(args["followup-file"])
        : (args["followup-text"] as string);
      const outcome = await runStoryContinue({
        specPackRoot: args["spec-pack-root"],
        storyId: args["story-id"],
        provider: args.provider,
        sessionId: args["session-id"],
        followupRequest,
        configPath: args.config,
        env: process.env,
      });
      const envelope = cliResultEnvelopeSchema(implementorResultSchema).parse(
        createResultEnvelope({
          command: "story-continue",
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
        command: "story-continue",
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
