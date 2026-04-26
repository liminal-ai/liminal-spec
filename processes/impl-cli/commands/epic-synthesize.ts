import { defineCommand } from "citty";

import {
  buildRuntimeProgressPaths,
  buildStreamOutputPaths,
  nextGroupedArtifactPath,
  writeJsonArtifact,
} from "../core/artifact-writer";
import { classifyCommandError } from "../core/command-errors";
import { runEpicSynthesize } from "../core/epic-synthesizer";
import {
  cliResultEnvelopeSchema,
  createResultEnvelope,
  epicSynthesisResultSchema,
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

function collectRepeatedFlag(rawArgs: string[], flag: string): string[] {
  const values: string[] = [];

  for (let index = 0; index < rawArgs.length; index += 1) {
    const value = rawArgs[index];
    if (value === flag) {
      const nextValue = rawArgs[index + 1];
      if (nextValue && !nextValue.startsWith("--")) {
        values.push(nextValue);
      }
      continue;
    }

    if (value.startsWith(`${flag}=`)) {
      values.push(value.slice(flag.length + 1));
    }
  }

  return values;
}

function renderHumanSummary(envelope: OutputEnvelope) {
  if (
    typeof envelope.result !== "object" ||
    envelope.result === null ||
    !("confirmedIssues" in envelope.result)
  ) {
    return `epic-synthesize: ${envelope.outcome}`;
  }

  const result = envelope.result as {
    confirmedIssues: string[];
    disputedOrUnconfirmedIssues: string[];
  };
  return [
    `epic-synthesize: ${envelope.outcome}`,
    `confirmed: ${result.confirmedIssues.length}`,
    `disputed: ${result.disputedOrUnconfirmedIssues.length}`,
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
    name: "epic-synthesize",
    description: "Independently verify and synthesize epic verifier findings.",
  },
  args: {
    "spec-pack-root": {
      type: "string",
      description: "Absolute or relative path to the spec-pack root",
      required: true,
    },
    "verifier-report": {
      type: "string",
      description:
        "Path to an epic verifier report artifact. Repeat the flag to pass multiple reports.",
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
  async run({ args, rawArgs }) {
    const startedAt = new Date().toISOString();
    const artifactPath = await nextGroupedArtifactPath(
      args["spec-pack-root"],
      "epic",
      "epic-synthesis"
    );

    try {
      const verifierReportPaths = collectRepeatedFlag(rawArgs, "--verifier-report");
      if (verifierReportPaths.length === 0) {
        const envelope: OutputEnvelope = createResultEnvelope({
          command: "epic-synthesize",
          outcome: "error",
          errors: [
            {
              code: "INVALID_INVOCATION",
              message: "Provide at least one --verifier-report path.",
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

      const outcome = await runEpicSynthesize({
        specPackRoot: args["spec-pack-root"],
        verifierReportPaths,
        configPath: args.config,
        env: process.env,
        artifactPath,
        streamOutputPaths: buildStreamOutputPaths(artifactPath),
        runtimeProgressPaths: buildRuntimeProgressPaths(artifactPath),
      });
      const envelope = cliResultEnvelopeSchema(
        epicSynthesisResultSchema
      ).parse(
        createResultEnvelope({
          command: "epic-synthesize",
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
        command: "epic-synthesize",
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
