import { defineCommand } from "citty";

import {
  buildRuntimeProgressPaths,
  buildStreamOutputPaths,
  nextGroupedArtifactPath,
  writeJsonArtifact,
} from "../core/artifact-writer";
import { classifyCommandError } from "../core/command-errors";
import { runEpicVerify } from "../core/epic-verifier";
import {
  cliResultEnvelopeSchema,
  createResultEnvelope,
  epicVerifierBatchResultSchema,
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
    !("verifierResults" in envelope.result)
  ) {
    return `epic-verify: ${envelope.outcome}`;
  }

  const result = envelope.result as {
    verifierResults: unknown[];
  };
  return [
    `epic-verify: ${envelope.outcome}`,
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
    name: "epic-verify",
    description: "Launch a fresh epic-level verifier batch.",
  },
  args: {
    "spec-pack-root": {
      type: "string",
      description: "Absolute or relative path to the spec-pack root",
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
      "epic",
      "epic-verifier-batch"
    );

    try {
      const outcome = await runEpicVerify({
        specPackRoot: args["spec-pack-root"],
        configPath: args.config,
        env: process.env,
        artifactPath,
        streamOutputPaths: buildStreamOutputPaths(artifactPath),
        runtimeProgressPaths: buildRuntimeProgressPaths(artifactPath),
      });
      const envelope = cliResultEnvelopeSchema(
        epicVerifierBatchResultSchema
      ).parse(
        createResultEnvelope({
          command: "epic-verify",
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
        command: "epic-verify",
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
