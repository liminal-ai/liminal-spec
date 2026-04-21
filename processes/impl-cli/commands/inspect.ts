import { defineCommand } from "citty";

import { nextArtifactPath, writeJsonArtifact } from "../core/artifact-writer";
import { ensureTeamImplLog } from "../core/log-template";
import {
  cliResultEnvelopeSchema,
  createResultEnvelope,
  exitCodeForStatus,
  type CliArtifactRef,
  type CliError,
  type CliStatus,
  inspectResultSchema,
  type InspectResult,
} from "../core/result-contracts";
import { inspectSpecPack } from "../core/spec-pack";

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
    !("techDesignShape" in envelope.result)
  ) {
    return `inspect: ${envelope.outcome}`;
  }

  const result = envelope.result as InspectResult;
  const lines = [
    `inspect: ${envelope.outcome}`,
    `tech design: ${result.techDesignShape}`,
    `stories: ${result.stories.length}`,
    `impl insert: ${result.inserts.customStoryImplPromptInsert}`,
    `verifier insert: ${result.inserts.customStoryVerifierPromptInsert}`,
  ];

  if (result.blockers.length > 0) {
    lines.push(...result.blockers.map((blocker) => `blocker: ${blocker}`));
  }

  return lines.join("\n");
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

function inspectErrors(result: InspectResult): CliError[] {
  if (result.status !== "blocked") {
    return [];
  }

  if (
    result.blockers.some((blocker) =>
      blocker.startsWith("Unreadable prompt insert:")
    )
  ) {
    return [
      {
        code: "PROMPT_INSERT_INVALID",
        message: "Prompt insert inspection failed",
      },
    ];
  }

  return [
    {
      code: "INVALID_SPEC_PACK",
      message: "Spec-pack inspection failed",
    },
  ];
}

export default defineCommand({
  meta: {
    name: "inspect",
    description: "Resolve the spec-pack layout, tech-design shape, and public insert files.",
  },
  args: {
    "spec-pack-root": {
      type: "string",
      description: "Absolute or relative path to the spec-pack root",
      required: true,
    },
    json: {
      type: "boolean",
      description: "Emit the structured JSON envelope on stdout",
    },
  },
  async run({ args }) {
    const startedAt = new Date().toISOString();

    try {
      const inspectResult = await inspectSpecPack(args["spec-pack-root"]);
      if (inspectResult.status === "ready") {
        await ensureTeamImplLog({
          specPackRoot: inspectResult.specPackRoot,
          storyIds: inspectResult.stories.map((story) => story.id),
        });
      }
      const artifactPath = await nextArtifactPath(
        inspectResult.specPackRoot,
        "inspect"
      );
      const envelope = cliResultEnvelopeSchema(inspectResultSchema).parse(
        createResultEnvelope({
          command: "inspect",
          outcome: inspectResult.status,
          result: inspectResult,
          errors: inspectErrors(inspectResult),
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
        command: "inspect",
        outcome: "error",
        errors: [
          {
            code: "UNEXPECTED_ERROR",
            message: error instanceof Error ? error.message : String(error),
          },
        ],
        startedAt,
        finishedAt: new Date().toISOString(),
      });

      emitOutput({
        envelope,
        json: Boolean(args.json),
      });
      process.exitCode = exitCodeForStatus(envelope.status, envelope.outcome);
    }
  },
});
