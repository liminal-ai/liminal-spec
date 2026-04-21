# Liminal Spec — Skill Pack (v1.2.0)

A set of skills for spec-driven software development with AI coding assistants. Liminal Spec guides agents through a structured pipeline: define what you're building (PRD), settle the technical world (Tech Architecture), specify the requirements in detail (Epic), design the implementation (Tech Design), and publish implementable stories. Each phase produces an artifact the next phase reads cold — no shared conversation history, no accumulated assumptions. The traceability chain (requirement → test condition → test → code) means when tests go green, the implementation matches the spec.

## Skills

| Skill | Purpose |
|-------|---------|
| **ls-prd** | Produce compressed proto-epics across 3-8 features with scenario-driven acceptance criteria. |
| **ls-arch** | Produce a research-grounded Technical Architecture document. Settles foundational decisions across epics. |
| **ls-epic** | Write a complete, traceable Epic — User Profile, Flows, ACs, TCs, Data Contracts, Story Breakdown. |
| **ls-tech-design** | Transform an Epic into an implementable Tech Design with architecture, interfaces, and test mapping. |
| **ls-publish-epic** | Publish an Epic as individual story files with full AC/TC detail and technical notes. |
| **ls-current-docs** | Reconstruct the current functional baseline, technical baseline, and code-reading map from implemented code, tests, runtime surfaces, and historical specs. Bundles focused functional, technical, and code-map companion guides in the installed skill pack. |
| **ls-team-spec** | Orchestrate the full spec pipeline with agent teams and external CLI verification. |
| **ls-team-impl** | Orchestrate implementation with agent teams and Codex/Copilot CLI. |
| **ls-team-impl-cc** | Orchestrate implementation with Claude Code agent teams. Sonnet implements, Opus and Sonnet verify. |
| **ls-claude-impl** | Orchestrate implementation in Claude Code with a durable run log, progressive-disclosure docs, and a bundled bounded-operation CLI. |

## Installation

### Skill Pack

This zip extracts a `skills/` directory. Unzip directly into the root your agent expects:

```bash
# Claude Code
unzip liminal-spec-skill-pack.zip -d ~/.claude/

# Or for .agents-based setups
unzip liminal-spec-skill-pack.zip -d ~/.agents/
```

Or cherry-pick individual skill directories — each is self-contained.

### Markdown Pack

Each `.md` file is a self-contained skill. Paste directly into Claude, ChatGPT, Codex, or any AI assistant that accepts instructions.

## Changelog

### v1.2.0 (2026-04-15)

- **`ls-current-docs` formalized** — continuity/current-docs skill is now published under its final public name and tightened around scoped currentness: producing surface, entrypoint, platform dependence, and ownership seam must be made explicit when documenting current behavior.

### v1.1.1 (2026-04-05)

- **Requirements intake discipline** added — structured Socratic clarification protocol for ls-prd and ls-epic when requirements arrive as vague input. Questioning stance (intent-first, pressure-test every answer, depth over breadth), four-step pressure ladder, brownfield evidence-backed confirmation, and explicit readiness gates (intent articulable in user's words, non-goals explicit, decision boundaries clear). Adapted from the open-source `deep-interview` skill.
- **ls-epic** gets an On Load section — handles standalone cold start (no PRD) and upstream artifact paths.

### v1.1.0 (2026-03-29)

- **Dimensional reasoning check** added — higher-order reasoning prompts at key structural decisions (top-tier surfaces, module boundaries, feature boundaries, story partitions) across ls-prd, ls-arch, ls-epic, ls-tech-design. Prompts the model to enumerate competing considerations, identify tensions, and weight which should win before committing. Heaviest in ls-arch, lightest in ls-epic.
- **lss-story and lss-tech removed** — simple pipeline skills removed pending regeneration from updated principles.
- Skill count: 10 → 8.

### v1.0.2 (2026-03-28)

- **ls-arch** added — Technical architecture as standalone skill, extracted from ls-prd. Own writing register, research-grounded decisions, human-first architecture with top-tier surfaces.
- **ls-prd** rewritten — scenario-driven feature sections, numbered AC ranges, confidence chain + writing style refs. Tech arch section removed (now ls-arch).
- **ls-tech-design** updated — optional tech arch intake, top-tier surface inheritance, deviation handling, upstream document evolution.
- **docs/skill-chain.md** added — internal developer guide to the skill chain.

### v1.0.1 (2026-03-26)

- **ls-team-impl-cc** added — Claude Code agent team orchestration with evidence-bound verification (replaces ls-subagent-impl)
- **ls-subagent-impl** removed

### v1.0.0 (2026-03-24)

Skill pack distribution. Rebuilt orchestration. New upstream pipeline.

**New skills:**
- **ls-prd** — PRD + optional Technical Architecture (replaces ls-research)

**Rebuilt skills:**
- **ls-team-spec** — complete rebuild as procedural learning architect with contextual pedagogy, three-phase handoff, prompt map, core spec tagging
- **ls-team-impl** — replaced with external CLI orchestration (Codex/Copilot), skill reload, materialized handoff templates, boundary inventory

**Refined skills:**
- **ls-tech-design** — multi-doc standard (2 or 4 docs), deviation table, dependency grounding via web research, actor-reading-stage-directions cleanup
- **ls-publish-epic** — individual story files, optional business epic, coverage artifact, technical enrichment notes

**Cross-cutting:**
- Stack-neutral data contracts (documentation tables, not language-specific syntax)
- Epic size and scope check checkpoint

**Distribution:**
- Skill pack replaces plugin system — install by copying skill directories
- Markdown pack unchanged — paste-into-chat standalone files

### Previous versions

See [CHANGELOG.md](https://github.com/liminal-ai/liminal-spec/blob/main/CHANGELOG.md) for full version history.

## Links

- [GitHub](https://github.com/liminal-ai/liminal-spec)
- [Releases](https://github.com/liminal-ai/liminal-spec/releases)

## License

MIT
