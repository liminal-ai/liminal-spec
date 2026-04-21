import { resolve } from "node:path";

import { defineCommand } from "citty";
import { z } from "zod";

import { nextArtifactPath, writeJsonArtifact } from "../core/artifact-writer";
import { classifyCommandError } from "../core/command-errors";
import { readTextFile } from "../core/fs-utils";
import { runQuickFix } from "../core/quick-fix";
import {
  cliResultEnvelopeSchema,
  createResultEnvelope,
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

const REQUEST_CONTENT_LIMIT_BYTES = 128 * 1024;

function renderHumanSummary(envelope: OutputEnvelope) {
  if (
    typeof envelope.result !== "object" ||
    envelope.result === null ||
    !("provider" in envelope.result)
  ) {
    return `quick-fix: ${envelope.outcome}`;
  }

  const result = envelope.result as {
    provider: string;
  };
  return [
    `quick-fix: ${envelope.outcome}`,
    `provider: ${result.provider}`,
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

async function resolveRequest(args: {
  "request-file"?: string;
  "request-text"?: string;
}): Promise<string> {
  const requestSources = [
    typeof args["request-file"] === "string" ? "file" : null,
    typeof args["request-text"] === "string" ? "text" : null,
  ].filter(Boolean);

  if (requestSources.length !== 1) {
    throw new Error("Provide exactly one of --request-file or --request-text.");
  }

  if (args["request-text"]) {
    const request = args["request-text"].trim();
    if (request.length === 0) {
      throw new Error("--request-text cannot be empty.");
    }
    if (Buffer.byteLength(request, "utf8") > REQUEST_CONTENT_LIMIT_BYTES) {
      throw new Error(
        `--request-text exceeds the 128 KiB limit (${REQUEST_CONTENT_LIMIT_BYTES} bytes).`
      );
    }
    return request;
  }

  const request = (await readTextFile(resolve(args["request-file"]!))).trim();
  if (request.length === 0) {
    throw new Error("--request-file cannot point to an empty task description.");
  }
  if (Buffer.byteLength(request, "utf8") > REQUEST_CONTENT_LIMIT_BYTES) {
    throw new Error(
      `--request-file exceeds the 128 KiB limit (${REQUEST_CONTENT_LIMIT_BYTES} bytes).`
    );
  }

  return request;
}

function hasFlag(rawArgs: string[], flag: string): boolean {
  return rawArgs.some((arg) => arg === flag || arg.startsWith(`${flag}=`));
}

function assertNoLegacyStoryAwareFlags(rawArgs: string[]) {
  if (
    hasFlag(rawArgs, "--story-id") ||
    hasFlag(rawArgs, "--story-title") ||
    hasFlag(rawArgs, "--story-path") ||
    hasFlag(rawArgs, "--scope-file")
  ) {
    throw new Error(
      "quick-fix does not accept story-aware flags such as --story-id, --story-title, --story-path, or --scope-file."
    );
  }
}

export default defineCommand({
  meta: {
    name: "quick-fix",
    description: "Run a bounded quick-fix with a free-form task description.",
  },
  args: {
    "spec-pack-root": {
      type: "string",
      description: "Absolute or relative path to the spec-pack root",
      required: true,
    },
    "request-file": {
      type: "string",
      description: "Path to a file containing the free-form quick-fix task",
    },
    "request-text": {
      type: "string",
      description: "Inline free-form quick-fix task description",
    },
    "working-directory": {
      type: "string",
      description: "Working directory for the quick-fix provider invocation",
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
    const artifactPath = await nextArtifactPath(args["spec-pack-root"], "quick-fix");

    try {
      assertNoLegacyStoryAwareFlags(rawArgs);
      const request = await resolveRequest(args);
      const outcome = await runQuickFix({
        specPackRoot: args["spec-pack-root"],
        request,
        workingDirectory: args["working-directory"],
        configPath: args.config,
        env: process.env,
      });
      const envelope = cliResultEnvelopeSchema(z.unknown()).parse(
        createResultEnvelope({
          command: "quick-fix",
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
      const message = error instanceof Error ? error.message : String(error);
      const configClassification = classifyCommandError(error);
      const code =
        message.includes("--request-") ||
        message.includes("Provide exactly one") ||
        message.includes("does not accept story-aware flags")
          ? "INVALID_INVOCATION"
          : configClassification.code;
      const outcome = code === "INVALID_RUN_CONFIG" ? "blocked" : "error";
      const envelope: OutputEnvelope = createResultEnvelope({
        command: "quick-fix",
        outcome,
        errors: [
          {
            code,
            message,
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
