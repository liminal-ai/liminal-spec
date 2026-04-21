import { defineCommand } from "citty";
import { ZodError } from "zod";

import { nextArtifactPath, writeJsonArtifact } from "../core/artifact-writer";
import { loadRunConfig } from "../core/config-schema";
import { resolveVerificationGates } from "../core/gate-discovery";
import { inspectPromptAssets } from "../core/prompt-assets";
import { resolveProviderMatrix } from "../core/provider-checks";
import {
  cliResultEnvelopeSchema,
  createResultEnvelope,
  exitCodeForStatus,
  preflightResultSchema,
  type CliArtifactRef,
  type CliError,
  type CliStatus,
  type PreflightResult,
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
    !("providerMatrix" in envelope.result)
  ) {
    return `preflight: ${envelope.outcome}`;
  }

  const result = envelope.result as PreflightResult;
  const lines = [
    `preflight: ${envelope.outcome}`,
    `primary: ${result.providerMatrix.primary.available ? "ready" : "blocked"}`,
    `secondary: ${result.providerMatrix.secondary.length}`,
  ];

  if (result.verificationGates) {
    lines.push(`story gate: ${result.verificationGates.storyGate}`);
    lines.push(`epic gate: ${result.verificationGates.epicGate}`);
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

function unavailableProviderErrors(
  providerMatrix: PreflightResult["providerMatrix"]
): CliError[] {
  const errors: CliError[] = [];

  if (!providerMatrix.primary.available) {
    errors.push({
      code: "PROVIDER_UNAVAILABLE",
      message: "Primary harness is unavailable",
      detail: providerMatrix.primary.notes.join("; "),
    });
  }

  for (const provider of providerMatrix.secondary) {
    if (!provider.available) {
      errors.push({
        code: "PROVIDER_UNAVAILABLE",
        message: `Requested secondary harness is unavailable: ${provider.harness}`,
        detail: provider.notes.join("; "),
      });
    }
  }

  return errors;
}

export default defineCommand({
  meta: {
    name: "preflight",
    description:
      "Validate run config, verification gates, and provider availability.",
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
    "story-gate": {
      type: "string",
      description: "Explicit story verification gate command",
    },
    "epic-gate": {
      type: "string",
      description: "Explicit epic verification gate command",
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
      const artifactPath = await nextArtifactPath(
        inspectResult.specPackRoot,
        "preflight"
      );

      if (inspectResult.status !== "ready") {
        const envelope: OutputEnvelope = createResultEnvelope({
          command: "preflight",
          outcome: inspectResult.status,
          errors: [
            {
              code: "INVALID_SPEC_PACK",
              message:
                inspectResult.status === "blocked"
                  ? "Spec-pack inspection failed"
                  : "Spec-pack inspection requires a user decision",
              detail:
                inspectResult.blockers.join("; ") || inspectResult.notes.join("; "),
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

      const validatedConfig = await loadRunConfig({
        specPackRoot: inspectResult.specPackRoot,
        configPath: args.config,
      });
      const providerMatrix = await resolveProviderMatrix({
        specPackRoot: inspectResult.specPackRoot,
        config: validatedConfig,
        env: process.env,
      });
      const gateResolution = await resolveVerificationGates({
        specPackRoot: inspectResult.specPackRoot,
        explicitStoryGate: args["story-gate"],
        explicitEpicGate: args["epic-gate"],
      });
      const promptAssets = inspectPromptAssets();
      const notes = [...inspectResult.notes];

      if (
        [
          validatedConfig.story_implementor,
          validatedConfig.quick_fixer,
          validatedConfig.story_verifier_1,
          validatedConfig.story_verifier_2,
          ...validatedConfig.epic_verifiers,
          validatedConfig.epic_synthesizer,
        ].every((assignment) => assignment.secondary_harness === "none")
      ) {
        notes.push(
          "GPT-capable secondary harnesses are unavailable for this run; the orchestrator should record the Claude-only degraded mode."
        );
      }

      const providerErrors = unavailableProviderErrors(providerMatrix);
      const blockers: string[] = [];
      const errors: CliError[] = [];
      let outcome: "ready" | "needs-user-decision" | "blocked" = "ready";

      if (providerErrors.length > 0) {
        outcome = "blocked";
        errors.push(...providerErrors);
        blockers.push(...providerErrors.map((error) => error.message));
      } else if (!promptAssets.basePromptsReady || !promptAssets.snippetsReady) {
        outcome = "blocked";
        errors.push({
          code: "PROMPT_ASSET_MISSING",
          message: "Embedded prompt assets are incomplete",
          detail: promptAssets.notes.join("; "),
        });
        blockers.push("Embedded prompt assets are incomplete");
      } else if (gateResolution.status === "needs-user-decision") {
        outcome = "needs-user-decision";
        errors.push(...gateResolution.errors);
        notes.push(...gateResolution.notes);
      }

      const preflightResult: PreflightResult = {
        status: outcome,
        validatedConfig,
        providerMatrix,
        verificationGates: gateResolution.verificationGates,
        configValidationNotes: [],
        promptAssets,
        blockers,
        notes,
      };
      const envelope = cliResultEnvelopeSchema(preflightResultSchema).parse(
        createResultEnvelope({
          command: "preflight",
          outcome,
          result: preflightResult,
          errors,
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
      if (
        error instanceof ZodError ||
        (error instanceof Error &&
          (error.message.includes("Cannot parse") ||
            error.message.includes("Required config") ||
            error.message.includes("JSON")))
      ) {
        const envelope: OutputEnvelope = createResultEnvelope({
          command: "preflight",
          outcome: "blocked",
          errors: [
            {
              code: "INVALID_RUN_CONFIG",
              message: "Run-config validation failed",
              detail: error instanceof Error ? error.message : String(error),
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
        return;
      }

      const envelope: OutputEnvelope = createResultEnvelope({
        command: "preflight",
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
