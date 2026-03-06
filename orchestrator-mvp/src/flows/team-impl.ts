import type { FlowDefinition } from "../types";

export const TEAM_IMPL_FLOW: FlowDefinition = {
  id: "team-impl",
  phases: [
    {
      id: "impl-prep",
      title: "Implementation Preparation",
      promptTemplatePath: "prompts/team-impl/impl-prep.md",
      requiredMilestones: ["gate-discovery-complete", "stories-sequenced"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "chore(orchestrator): approve impl prep",
    },
    {
      id: "story-cycle",
      title: "Story Cycle",
      promptTemplatePath: "prompts/team-impl/story-cycle.md",
      requiredMilestones: ["story-implemented", "story-verified"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "feat: story-cycle approved",
    },
    {
      id: "epic-post-verify",
      title: "Epic Post Verification",
      promptTemplatePath: "prompts/team-impl/epic-post-verify.md",
      requiredMilestones: ["meta-review-complete", "fixes-verified"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "feat: epic post verification approved",
    },
    {
      id: "handoff-close",
      title: "Handoff and Close",
      promptTemplatePath: "prompts/team-impl/handoff-close.md",
      requiredMilestones: ["handoff-complete"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "chore: orchestrator handoff close",
    },
  ],
};
