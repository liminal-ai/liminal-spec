# Liminal Spec — Markdown Pack (v1.2.0)

Paste-into-chat skills for spec-driven software development. Each file is a self-contained skill — paste directly into Claude, ChatGPT, Codex, or any AI assistant that accepts instructions. No installation required.

Liminal Spec guides agents through a structured pipeline: define what you're building (PRD), settle the technical world (Tech Architecture), specify the requirements in detail (Epic), design the implementation (Tech Design), and publish implementable stories. The traceability chain (requirement → test condition → test → code) means when tests go green, the implementation matches the spec.

## Files

| File | Skill | Purpose |
|------|-------|---------|
| `00-prd-skill.md` | ls-prd | Produce compressed proto-epics with scenario-driven acceptance criteria |
| `01-technical-architecture-skill.md` | ls-arch | Research-grounded Technical Architecture document |
| `02-epic-skill.md` | ls-epic | Write a complete, traceable Epic — ACs, TCs, Data Contracts, Story Breakdown |
| `03-technical-design-skill.md` | ls-tech-design | Transform an Epic into an implementable Tech Design |
| `04-publish-epic-skill.md` | ls-publish-epic | Publish an Epic as individual story files with technical notes |
| `05-current-docs-skill.md` | ls-current-docs | Reconstruct the current functional baseline, technical baseline, and code-reading map for onboarding onto implemented systems (installed skill pack preferred for bundled companion guides) |
| `06c-codex-implementation-skill.md` | ls-codex-impl | Codex-native implementation orchestration with Codex workers and Sonnet verification |
| `06-team-implementation-skill.md` | ls-team-impl | Orchestrate implementation with agent teams and Codex/Copilot CLI |
| `06cc-team-implementation-claude-code-skill.md` | ls-team-impl-cc | Orchestrate implementation with Claude Code agent teams |
| `07-team-spec-skill.md` | ls-team-spec | Orchestrate the full spec pipeline with agent teams |

## Usage

Pick the file for the phase you need. Paste the entire contents into your AI assistant's system instructions or conversation. Each file is self-contained — no dependencies on other files.

## Changelog

### v1.2.0 (2026-04-15)

**Added:** `ls-codex-impl` — Codex-native implementation orchestration with Codex workers and dual fresh Codex/Sonnet verification.  
**Changed:** `ls-current-docs` — continuity/current-docs skill finalized under its public name and tightened around scoped currentness (producing surface, entrypoint, platform dependence, and ownership seam).

### v1.1.1 (2026-04-05)

**Added:** Requirements intake discipline — structured Socratic clarification for ls-prd and ls-epic when requirements arrive as vague input. Questioning stance, pressure ladder, readiness gates.
**Changed:** ls-epic gets an On Load section for standalone cold start.

### v1.1.0 (2026-03-29)

**Added:** Dimensional reasoning check — higher-order reasoning prompts at key structural decisions across ls-prd, ls-arch, ls-epic, ls-tech-design.
**Removed:** lss-story and lss-tech (simple pipeline removed pending regeneration)

### v1.0.2 (2026-03-28)

**Added:** ls-arch (tech architecture as standalone skill, extracted from ls-prd)
**Changed:** ls-prd (scenario-driven rewrite, tech arch removed), ls-tech-design (optional tech arch intake, top-tier surfaces)

### v1.0.1 (2026-03-26)

**Added:** ls-team-impl-cc (replaces ls-subagent-impl)
**Removed:** ls-subagent-impl

### v1.0.0 (2026-03-24)

Skill pack distribution. Rebuilt orchestration. New upstream pipeline.

**New:** ls-prd (replaces ls-research), ls-subagent-impl
**Rebuilt:** ls-team-spec (procedural learning architect), ls-team-impl (CLI orchestration)
**Refined:** ls-tech-design (multi-doc standard, deviation table), ls-publish-epic (individual story files)
**Removed:** ls-research

See [CHANGELOG.md](https://github.com/liminal-ai/liminal-spec/blob/main/CHANGELOG.md) for full version history.

## Links

- [GitHub](https://github.com/liminal-ai/liminal-spec)
- [Releases](https://github.com/liminal-ai/liminal-spec/releases)

## License

MIT
