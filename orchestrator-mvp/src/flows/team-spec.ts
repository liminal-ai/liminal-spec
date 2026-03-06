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
      id: "publish-epic",
      title: "Publish Epic",
      promptTemplatePath: "prompts/team-spec/publish-epic.md",
      requiredMilestones: ["stories-published", "coverage-gate-passed"],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "docs: publish epic phase approved",
    },
    {
      id: "final-verification",
      title: "Final Verification",
      promptTemplatePath: "prompts/team-spec/final-verification.md",
      requiredMilestones: [
        "cross-artifact-check-passed",
      ],
      requiresCodexEvidenceRef: true,
      commitMessageTemplate: "docs: final verification approved",
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
