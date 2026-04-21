import { relative, resolve } from "node:path";

import { loadConfig } from "c12";
import { z } from "zod";

export const RUN_CONFIG_FILE_NAME = "impl-run.config.json";

export const reasoningEffortSchema = z.enum(["low", "medium", "high", "xhigh"]);
export const primaryHarnessSchema = z.literal("claude-code");
export const secondaryHarnessSchema = z.enum(["codex", "copilot", "none"]);

export const roleAssignmentSchema = z.object({
  secondary_harness: secondaryHarnessSchema,
  model: z.string().min(1),
  reasoning_effort: reasoningEffortSchema,
});

export const epicVerifierAssignmentSchema = roleAssignmentSchema.extend({
  label: z.string().min(1),
});

export const implRunConfigSchema = z
  .object({
    version: z.literal(1),
    primary_harness: primaryHarnessSchema,
    story_implementor: roleAssignmentSchema,
    quick_fixer: roleAssignmentSchema,
    story_verifier_1: roleAssignmentSchema,
    story_verifier_2: roleAssignmentSchema,
    self_review: z.object({
      passes: z.number().int().min(1).max(5),
    }),
    epic_verifiers: z.array(epicVerifierAssignmentSchema).min(1),
    epic_synthesizer: roleAssignmentSchema,
  })
  .superRefine((value, ctx) => {
    if (value.story_implementor.secondary_harness === "copilot") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "story_implementor.secondary_harness cannot be copilot in v1",
        path: ["story_implementor", "secondary_harness"],
      });
    }

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
    }
  });

export type ReasoningEffort = z.infer<typeof reasoningEffortSchema>;
export type PrimaryHarness = z.infer<typeof primaryHarnessSchema>;
export type SecondaryHarness = z.infer<typeof secondaryHarnessSchema>;
export type RoleAssignment = z.infer<typeof roleAssignmentSchema>;
export type EpicVerifierAssignment = z.infer<typeof epicVerifierAssignmentSchema>;
export type ImplRunConfig = z.infer<typeof implRunConfigSchema>;

export function resolveRunConfigPath(
  specPackRoot: string,
  configPath?: string
): string {
  if (!configPath) {
    return resolve(specPackRoot, RUN_CONFIG_FILE_NAME);
  }

  return resolve(specPackRoot, configPath);
}

export async function loadRunConfig(input: {
  specPackRoot: string;
  configPath?: string;
}): Promise<ImplRunConfig> {
  const resolvedPath = resolveRunConfigPath(input.specPackRoot, input.configPath);
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
}
