import { defineCommand } from "citty";

import {
  buildRuntimeProgressPaths,
  buildStreamOutputPaths,
  nextGroupedArtifactPath,
  nextGroupedArtifactPaths,
  writeJsonArtifact,
} from "../core/artifact-writer";
import { classifyCommandError } from "../core/command-errors";
import {
  loadRunConfig,
  MAX_SELF_REVIEW_PASSES,
  MIN_SELF_REVIEW_PASSES,
} from "../core/config-schema";
import {
  cliResultEnvelopeSchema,
  createResultEnvelope,
  exitCodeForStatus,
  storySelfReviewResultSchema,
  type CliArtifactRef,
  type CliError,
  type CliStatus,
} from "../core/result-contracts";
import { runStorySelfReview } from "../core/story-implementor";

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
    return `story-self-review: ${envelope.outcome}`;
  }

  const result = envelope.result as {
    story: {
      id: string;
    };
    sessionId: string;
    passesCompleted: number;
    passesRequested: number;
  };
  return [
    `story-self-review: ${envelope.outcome}`,
    `story: ${result.story.id}`,
    `session: ${result.sessionId}`,
    `passes: ${result.passesCompleted}/${result.passesRequested}`,
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

function parsePasses(value: unknown): number | null {
  if (typeof value === "undefined") {
    return null;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return Number.NaN;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return Number.NaN;
  }

  return parsed;
}

export default defineCommand({
  meta: {
    name: "story-self-review",
    description: "Run same-session self-review passes against an explicit retained implementor session.",
  },
  args: {
    "spec-pack-root": {
      type: "string",
      description: "Absolute or relative path to the spec-pack root",
      required: true,
    },
    "story-id": {
      type: "string",
      description: "The story id whose retained session should self-review",
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
    passes: {
      type: "string",
      description: `Optional self-review pass override (${MIN_SELF_REVIEW_PASSES}-${MAX_SELF_REVIEW_PASSES})`,
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
    let artifactPath: string | undefined;

    try {
      const parsedPasses = parsePasses(args.passes);
      if (
        Number.isNaN(parsedPasses) ||
        (parsedPasses !== null &&
          (parsedPasses < MIN_SELF_REVIEW_PASSES ||
            parsedPasses > MAX_SELF_REVIEW_PASSES))
      ) {
        artifactPath = await nextGroupedArtifactPath(
          args["spec-pack-root"],
          args["story-id"],
          "self-review-batch"
        );
        const envelope: OutputEnvelope = createResultEnvelope({
          command: "story-self-review",
          outcome: "error",
          errors: [
            {
              code: "INVALID_INVOCATION",
              message: `--passes must be an integer between ${MIN_SELF_REVIEW_PASSES} and ${MAX_SELF_REVIEW_PASSES}.`,
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

      const resolvedPasses =
        parsedPasses ??
        (await loadRunConfig({
          specPackRoot: args["spec-pack-root"],
          configPath: args.config,
        })).self_review.passes;

      const allocatedPaths = await nextGroupedArtifactPaths(
        args["spec-pack-root"],
        args["story-id"],
        [
          ...Array.from({ length: resolvedPasses }, (_, index) => {
            return `self-review-pass-${index + 1}`;
          }),
          "self-review-batch",
        ]
      );
      artifactPath = allocatedPaths[allocatedPaths.length - 1] as string;
      const passArtifactPaths = allocatedPaths.slice(0, -1);

      const outcome = await runStorySelfReview({
        specPackRoot: args["spec-pack-root"],
        storyId: args["story-id"],
        provider: args.provider,
        sessionId: args["session-id"],
        passes: resolvedPasses,
        passArtifactPaths,
        configPath: args.config,
        env: process.env,
        artifactPath,
        streamOutputPaths: buildStreamOutputPaths(artifactPath),
        runtimeProgressPaths: buildRuntimeProgressPaths(artifactPath),
      });

      const passArtifacts =
        outcome.result?.passArtifacts ?? outcome.passArtifacts ?? [];
      const envelope = cliResultEnvelopeSchema(
        storySelfReviewResultSchema
      ).parse(
        createResultEnvelope({
          command: "story-self-review",
          outcome: outcome.outcome,
          result: outcome.result,
          errors: outcome.errors,
          warnings: outcome.warnings,
          artifacts: [
            ...passArtifacts.map(
              (artifact): CliArtifactRef => ({
                kind: "self-review-pass",
                path: artifact.path,
              })
            ),
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
      const finalArtifactPath =
        artifactPath ??
        (await nextGroupedArtifactPath(
          args["spec-pack-root"],
          args["story-id"],
          "self-review-batch"
        ));
      const envelope: OutputEnvelope = createResultEnvelope({
        command: "story-self-review",
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
            path: finalArtifactPath,
          },
        ],
        startedAt,
        finishedAt: new Date().toISOString(),
      });

      await writeJsonArtifact(finalArtifactPath, envelope);
      emitOutput({
        envelope,
        json: Boolean(args.json),
      });
      process.exitCode = exitCodeForStatus(envelope.status, envelope.outcome);
    }
  },
});
