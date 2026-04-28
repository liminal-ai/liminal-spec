import { relative, resolve } from "node:path";

import { loadConfig } from "c12";
import { z } from "zod";

import { writeTextFile } from "./fs-utils";

export const RUN_CONFIG_FILE_NAME = "impl-run.config.json";

export class ConfigLoadError extends Error {
  override cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "ConfigLoadError";
    this.cause = options?.cause;
  }
}

export const reasoningEffortSchema = z.enum([
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);
export const MIN_SELF_REVIEW_PASSES = 1;
export const MAX_SELF_REVIEW_PASSES = 5;
export const primaryHarnessSchema = z.literal("claude-code");
export const secondaryHarnessSchema = z.enum(["codex", "copilot", "none"]);

export const roleAssignmentSchema = z
  .object({
    secondary_harness: secondaryHarnessSchema,
    model: z.string().min(1),
    reasoning_effort: reasoningEffortSchema,
  })
  .strict();

export const epicVerifierAssignmentSchema = roleAssignmentSchema
  .extend({
    label: z.string().min(1),
  })
  .strict();

export const verificationGatesConfigSchema = z
  .object({
    story: z.string().min(1),
    epic: z.string().min(1),
  })
  .strict();

export const runTimeoutsSchema = z
  .object({
    provider_startup_timeout_ms: z.number().int().positive(),
    story_implementor_ms: z.number().int().positive(),
    story_implementor_silence_timeout_ms: z.number().int().positive(),
    story_verifier_ms: z.number().int().positive(),
    story_verifier_silence_timeout_ms: z.number().int().positive(),
    epic_cleanup_ms: z.number().int().positive(),
    epic_cleanup_silence_timeout_ms: z.number().int().positive(),
    epic_verifier_ms: z.number().int().positive(),
    epic_verifier_silence_timeout_ms: z.number().int().positive(),
    epic_synthesizer_ms: z.number().int().positive(),
    epic_synthesizer_silence_timeout_ms: z.number().int().positive(),
    quick_fixer_ms: z.number().int().positive(),
    quick_fixer_silence_timeout_ms: z.number().int().positive(),
    story_self_review_silence_timeout_ms: z.number().int().positive(),
  })
  .partial()
  .strict();

export const DEFAULT_RUN_TIMEOUTS = {
  provider_startup_timeout_ms: 300_000,
  story_implementor_ms: 7_200_000,
  story_implementor_silence_timeout_ms: 600_000,
  story_verifier_ms: 3_600_000,
  story_verifier_silence_timeout_ms: 360_000,
  epic_cleanup_ms: 3_600_000,
  epic_cleanup_silence_timeout_ms: 480_000,
  epic_verifier_ms: 3_600_000,
  epic_verifier_silence_timeout_ms: 600_000,
  epic_synthesizer_ms: 3_600_000,
  epic_synthesizer_silence_timeout_ms: 600_000,
  quick_fixer_ms: 1_800_000,
  quick_fixer_silence_timeout_ms: 300_000,
  story_self_review_silence_timeout_ms: 480_000,
} as const;

const EXPLICIT_CLAUDE_MAX_MODEL_PATTERN =
  /^claude-(?:opus|sonnet)-4-(?:6|7)(?:[a-z0-9.-]*)?(?:\[[^\]]+\])?$/i;

function validateRoleEffort(
  value: z.infer<typeof roleAssignmentSchema>,
  path: ReadonlyArray<string | number>,
  ctx: z.RefinementCtx
) {
  if (value.reasoning_effort !== "max") {
    return;
  }

  if (value.secondary_harness !== "none") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "reasoning_effort 'max' is valid only for Claude-backed roles using explicit Claude 4.7/4.6 model names",
      path: [...path, "reasoning_effort"],
    });
    return;
  }

  if (!EXPLICIT_CLAUDE_MAX_MODEL_PATTERN.test(value.model)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "reasoning_effort 'max' requires an explicit Claude 4.7/4.6 model name (for example claude-opus-4-7[1m] or claude-sonnet-4-6[1m])",
      path: [...path, "reasoning_effort"],
    });
  }
}

export const implRunConfigSchema = z
  .object({
    version: z.literal(1),
    primary_harness: primaryHarnessSchema,
    story_implementor: roleAssignmentSchema,
    quick_fixer: roleAssignmentSchema,
    story_verifier: roleAssignmentSchema,
    self_review: z
      .object({
        passes: z
          .number()
          .int()
          .min(MIN_SELF_REVIEW_PASSES)
          .max(MAX_SELF_REVIEW_PASSES),
      })
      .strict(),
    epic_verifiers: z.array(epicVerifierAssignmentSchema).min(1),
    epic_synthesizer: roleAssignmentSchema,
    verification_gates: verificationGatesConfigSchema.optional(),
    timeouts: runTimeoutsSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    validateRoleEffort(value.story_implementor, ["story_implementor"], ctx);
    validateRoleEffort(value.quick_fixer, ["quick_fixer"], ctx);
    validateRoleEffort(value.story_verifier, ["story_verifier"], ctx);
    validateRoleEffort(value.epic_synthesizer, ["epic_synthesizer"], ctx);

    const seenLabels = new Set<string>();
    for (const [index, verifier] of value.epic_verifiers.entries()) {
      if (seenLabels.has(verifier.label)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate epic verifier label",
          path: ["epic_verifiers", index, "label"],
        });
      }
      seenLabels.add(verifier.label);
      validateRoleEffort(verifier, ["epic_verifiers", index], ctx);
    }
  });

export type ReasoningEffort = z.infer<typeof reasoningEffortSchema>;
export type PrimaryHarness = z.infer<typeof primaryHarnessSchema>;
export type SecondaryHarness = z.infer<typeof secondaryHarnessSchema>;
export type RoleAssignment = z.infer<typeof roleAssignmentSchema>;
export type EpicVerifierAssignment = z.infer<typeof epicVerifierAssignmentSchema>;
export type VerificationGatesConfig = z.infer<typeof verificationGatesConfigSchema>;
export type RunTimeouts = z.infer<typeof runTimeoutsSchema>;
export type ImplRunConfig = z.infer<typeof implRunConfigSchema>;
export type ResolvedRunTimeouts = {
  [K in keyof typeof DEFAULT_RUN_TIMEOUTS]: number;
};

export function resolveRunConfigPath(
  specPackRoot: string,
  configPath?: string
): string {
  if (!configPath) {
    return resolve(specPackRoot, RUN_CONFIG_FILE_NAME);
  }

  return resolve(specPackRoot, configPath);
}

export function mergeVerificationGates(
  config: ImplRunConfig,
  verificationGates: {
    storyGate: string;
    epicGate: string;
  }
): ImplRunConfig {
  return {
    ...config,
    verification_gates: {
      story: verificationGates.storyGate,
      epic: verificationGates.epicGate,
    },
  };
}

export function resolveConfiguredVerificationGates(
  config: ImplRunConfig
):
  | {
      storyGate: string;
      epicGate: string;
      storyGateSource: string;
      epicGateSource: string;
    }
  | undefined {
  if (!config.verification_gates) {
    return undefined;
  }

  return {
    storyGate: config.verification_gates.story,
    epicGate: config.verification_gates.epic,
    storyGateSource: "impl-run.config.json verification_gates",
    epicGateSource: "impl-run.config.json verification_gates",
  };
}

export function resolveRunTimeouts(config: ImplRunConfig): ResolvedRunTimeouts {
  return {
    ...DEFAULT_RUN_TIMEOUTS,
    ...(config.timeouts ?? {}),
  };
}

function formatConfigLoadError(error: unknown, resolvedPath: string): string {
  if (error instanceof z.ZodError) {
    const issues = error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
        return `${path}: ${issue.message}`;
      })
      .join("; ");
    return `Run-config validation failed for ${resolvedPath}: ${issues}`;
  }

  if (error instanceof Error) {
    return `Run-config load failed for ${resolvedPath}: ${error.message}`;
  }

  return `Run-config load failed for ${resolvedPath}: ${String(error)}`;
}

export async function loadRunConfig(input: {
  specPackRoot: string;
  configPath?: string;
}): Promise<ImplRunConfig> {
  const resolvedPath = resolveRunConfigPath(input.specPackRoot, input.configPath);
  try {
    const { config } = await loadConfig({
      cwd: resolve(input.specPackRoot),
      configFile: relative(resolve(input.specPackRoot), resolvedPath),
      configFileRequired: true,
      rcFile: false,
      globalRc: false,
      packageJson: false,
      dotenv: false,
      extend: false,
    });

    return implRunConfigSchema.parse(config);
  } catch (error) {
    throw new ConfigLoadError(formatConfigLoadError(error, resolvedPath), {
      cause: error,
    });
  }
}

export async function writeRunConfig(input: {
  specPackRoot: string;
  configPath?: string;
  config: ImplRunConfig;
}): Promise<string> {
  const resolvedPath = resolveRunConfigPath(input.specPackRoot, input.configPath);
  await writeTextFile(
    resolvedPath,
    `${JSON.stringify(input.config, null, 2)}\n`
  );
  return resolvedPath;
}
