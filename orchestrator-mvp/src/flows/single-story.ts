import type { FlowDefinition } from "../types";

export const SINGLE_STORY_FLOW: FlowDefinition = {
  id: "single-story",
  phases: [
    {
      id: "single-spec",
      title: "Single Story Spec",
      promptTemplatePath: "prompts/single-story/single-spec.md",
      requiredMilestones: ["single-spec-complete", "single-spec-verified"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "docs: single story spec approved",
    },
    {
      id: "single-tech",
      title: "Single Story Tech",
      promptTemplatePath: "prompts/single-story/single-tech.md",
      requiredMilestones: ["single-tech-complete", "single-tech-verified"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "docs: single story tech approved",
    },
    {
      id: "single-impl",
      title: "Single Story Implementation",
      promptTemplatePath: "prompts/single-story/single-impl.md",
      requiredMilestones: ["single-impl-complete", "single-impl-verified"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "feat: single story implementation approved",
    },
    {
      id: "single-final-verify",
      title: "Single Story Final Verification",
      promptTemplatePath: "prompts/single-story/single-final-verify.md",
      requiredMilestones: ["single-final-verify-complete"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "chore: single story final verification approved",
    },
  ],
};
