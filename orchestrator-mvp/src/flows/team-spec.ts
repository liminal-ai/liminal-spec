import type { FlowDefinition } from "../types";

export const TEAM_SPEC_FLOW: FlowDefinition = {
  id: "team-spec",
  phases: [
    {
      id: "research-entry",
      title: "Research and Entry Assessment",
      promptTemplatePath: "prompts/team-spec/research-entry.md",
      requiredMilestones: ["artifact-inventory-complete", "epic-readiness-assessed"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "chore(orchestrator): approve research entry",
    },
    {
      id: "spec-prep",
      title: "Specification Preparation",
      promptTemplatePath: "prompts/team-spec/spec-prep.md",
      requiredMilestones: ["entry-point-confirmed", "gate-discovery-complete"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "chore(orchestrator): approve spec prep",
    },
    {
      id: "epic",
      title: "Epic",
      promptTemplatePath: "prompts/team-spec/epic.md",
      requiredMilestones: ["epic-drafted", "epic-verified", "user-signoff-epic"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "docs: epic phase approved",
    },
    {
      id: "tech-design",
      title: "Tech Design",
      promptTemplatePath: "prompts/team-spec/tech-design.md",
      requiredMilestones: [
        "tech-design-drafted",
        "tech-design-verified",
        "user-signoff-tech-design",
      ],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "docs: tech design phase approved",
    },
    {
      id: "story-sharding",
      title: "Story Sharding",
      promptTemplatePath: "prompts/team-spec/story-sharding.md",
      requiredMilestones: ["stories-sharded", "coverage-gate-passed"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "docs: story sharding phase approved",
    },
    {
      id: "story-tech-enrichment",
      title: "Story Technical Enrichment",
      promptTemplatePath: "prompts/team-spec/story-tech-enrichment.md",
      requiredMilestones: ["stories-enriched", "coherence-check-passed"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "docs: story enrichment phase approved",
    },
    {
      id: "final-story-verification",
      title: "Final Story Verification",
      promptTemplatePath: "prompts/team-spec/final-story-verification.md",
      requiredMilestones: [
        "per-story-verification-complete",
        "cross-story-check-passed",
      ],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "docs: final story verification approved",
    },
    {
      id: "handoff-close",
      title: "Handoff and Close",
      promptTemplatePath: "prompts/team-spec/handoff-close.md",
      requiredMilestones: ["handoff-complete"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "chore: spec orchestration handoff close",
    },
  ],
};
