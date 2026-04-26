import { defineCommand } from "citty";

import {
  buildRuntimeProgressPaths,
  buildStreamOutputPaths,
  nextGroupedArtifactPath,
  writeJsonArtifact,
} from "../core/artifact-writer";
import { classifyCommandError } from "../core/command-errors";
import { readTextFile } from "../core/fs-utils";
import {
  cliResultEnvelopeSchema,
  createResultEnvelope,
  exitCodeForStatus,
  storyVerifierResultSchema,
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
    !("story" in envelope.result)
  ) {
    return `story-verify: ${envelope.outcome}`;
  }

  const result = envelope.result as {
    story: {
      id: string;
    };
    sessionId: string;
    mode: string;
  };
  return [
    `story-verify: ${envelope.outcome}`,
    `story: ${result.story.id}`,
    `mode: ${result.mode}`,
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
    name: "story-verify",
    description: "Start or continue the retained story verifier session for one story.",
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
    provider: {
      type: "string",
      description: "Provider name from the retained verifier continuation handle",
    },
    "session-id": {
      type: "string",
      description: "Explicit session id from the retained verifier continuation handle",
    },
    "response-file": {
      type: "string",
      description: "Path to a file containing the full implementor response for verifier follow-up",
    },
    "response-text": {
      type: "string",
      description: "Inline implementor response text for verifier follow-up",
    },
    "orchestrator-context-file": {
      type: "string",
      description: "Path to optional orchestrator framing for the verifier",
    },
    "orchestrator-context-text": {
      type: "string",
      description: "Inline optional orchestrator framing for the verifier",
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
      "verify"
    );

    try {
      const isFollowupMode =
        typeof args.provider === "string" || typeof args["session-id"] === "string";
      const hasResponseFile = typeof args["response-file"] === "string";
      const hasResponseText = typeof args["response-text"] === "string";
      const hasOrchestratorContextFile =
        typeof args["orchestrator-context-file"] === "string";
      const hasOrchestratorContextText =
        typeof args["orchestrator-context-text"] === "string";

      if (!isFollowupMode && (hasResponseFile || hasResponseText)) {
        const envelope: OutputEnvelope = createResultEnvelope({
          command: "story-verify",
          outcome: "error",
          errors: [
            {
              code: "INVALID_INVOCATION",
              message:
                "Initial story-verify mode does not accept --response-file or --response-text.",
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

      if (isFollowupMode) {
        if (typeof args.provider !== "string" || typeof args["session-id"] !== "string") {
          const envelope: OutputEnvelope = createResultEnvelope({
            command: "story-verify",
            outcome: "error",
            errors: [
              {
                code: "INVALID_INVOCATION",
                message:
                  "Follow-up story-verify mode requires both --provider and --session-id.",
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

        if ((hasResponseFile ? 1 : 0) + (hasResponseText ? 1 : 0) !== 1) {
          const envelope: OutputEnvelope = createResultEnvelope({
            command: "story-verify",
            outcome: "error",
            errors: [
              {
                code: "INVALID_INVOCATION",
                message:
                  "Follow-up story-verify mode requires exactly one of --response-file or --response-text.",
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
      }

      if (
        (hasOrchestratorContextFile ? 1 : 0) + (hasOrchestratorContextText ? 1 : 0) >
        1
      ) {
        const envelope: OutputEnvelope = createResultEnvelope({
          command: "story-verify",
          outcome: "error",
          errors: [
            {
              code: "INVALID_INVOCATION",
              message:
                "Provide at most one of --orchestrator-context-file or --orchestrator-context-text.",
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

      const response = isFollowupMode
        ? hasResponseFile
          ? await readTextFile(args["response-file"] as string)
          : (args["response-text"] as string)
        : undefined;
      const orchestratorContext = hasOrchestratorContextFile
        ? await readTextFile(args["orchestrator-context-file"] as string)
        : typeof args["orchestrator-context-text"] === "string"
          ? args["orchestrator-context-text"]
          : undefined;

      const outcome = await runStoryVerify({
        specPackRoot: args["spec-pack-root"],
        storyId: args["story-id"],
        provider: args.provider,
        sessionId: args["session-id"],
        response,
        orchestratorContext,
        configPath: args.config,
        env: process.env,
        artifactPath,
        streamOutputPaths: buildStreamOutputPaths(artifactPath),
        runtimeProgressPaths: buildRuntimeProgressPaths(artifactPath),
      });
      const envelope = cliResultEnvelopeSchema(
        storyVerifierResultSchema
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
      const classification = classifyCommandError(error, "block");
      const envelope: OutputEnvelope = createResultEnvelope({
        command: "story-verify",
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
