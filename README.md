# Liminal Spec

A skill pack for spec-driven software development with AI coding assistants. Liminal Spec provides a set of skills that guide agents through a structured pipeline: define what you're building (PRD), settle the technical world (Tech Architecture), specify the requirements in detail (Epic), design the implementation (Tech Design), and publish implementable stories. Each phase produces an artifact the next phase reads cold — no shared conversation history, no accumulated assumptions. The traceability chain (requirement → test condition → test → code) means when tests go green, the implementation matches the spec.

## Skills

| Skill | Purpose |
|-------|---------|
| **ls-prd** | Produce compressed proto-epics across 3-8 features with scenario-driven acceptance criteria. The upstream product artifact that seeds the full pipeline. |
| **ls-arch** | Produce a research-grounded Technical Architecture document. Settles foundational technical decisions that downstream tech designs inherit. |
| **ls-epic** | Write a complete, traceable Epic — User Profile, Flows, Acceptance Criteria, Test Conditions, Data Contracts, and Story Breakdown. |
| **ls-tech-design** | Transform an Epic into an implementable Tech Design with architecture, interfaces, test mapping, and work breakdown. Inherits from tech arch when available. |
| **ls-publish-epic** | Publish an Epic as individual story files with full AC/TC detail, technical notes, and Jira markers. Optionally produce a PO-friendly business epic. |
| **ls-team-spec** | Orchestrate the full spec pipeline with agent teams and external CLI verification. Manages drafters and verifiers from orientation through published stories. |
| **ls-team-impl** | Orchestrate story-by-story implementation with agent teams and an external CLI model (Codex or Copilot). |
| **ls-team-impl-cc** | Orchestrate implementation with Claude Code agent teams. Sonnet implements with TDD, Opus and Sonnet verify with evidence-bound review. No external CLI required. |
| **lss-story** | Write a single functional story with epic-quality rigor. For focused changes that don't warrant the full pipeline. |
| **lss-tech** | Inline technical design and enrichment for a single story. Codebase analysis, architecture, interfaces, and test mapping embedded directly in the story. |

## When to Use

**Full pipeline** — multi-story features, complex integrations, team coordination:
- New features with multiple components or integration points
- Complex business logic where requirements need precision
- Multi-agent builds where context isolation matters

**Simple pipeline** — story-sized work, focused changes, same rigor:
- Single capability additions or contained feature changes
- Work scoped to 1-2 flows and ~5-15 acceptance criteria

**Not for:** quick bug fixes, single-file changes, spikes, or emergency patches.

## Installation

### Skill Pack (recommended)

Download `liminal-spec-skill-pack.zip` from [Releases](https://github.com/liminal-ai/liminal-spec/releases). The zip contains a `skills/` directory. Unzip directly into `~/.claude/` (or `~/.agents/`):

```bash
# Claude Code — skills land at ~/.claude/skills/ls-epic/ etc.
unzip liminal-spec-skill-pack.zip -d ~/.claude/

# Or for .agents-based setups
unzip liminal-spec-skill-pack.zip -d ~/.agents/
```

Each skill is a directory with a `SKILL.md` file. Install all of them or cherry-pick the ones you need.

### Markdown Pack

Download `liminal-spec-markdown-pack.zip` from [Releases](https://github.com/liminal-ai/liminal-spec/releases). Each file is self-contained — paste directly into Claude, ChatGPT, Codex, or any AI assistant that accepts instructions.

## Pipelines

### Full Pipeline

For multi-story features. Each phase is a separate agent with a separate context window.

| Phase | Skill | Input | Output |
|-------|-------|-------|--------|
| 0a. PRD (optional) | `ls-prd` | Vision, requirements | PRD (compressed proto-epics) |
| 0b. Tech Arch (optional) | `ls-arch` | PRD or technical context | Technical Architecture |
| 1. Epic | `ls-epic` | PRD or requirements | Detailed Epic |
| 2. Tech Design | `ls-tech-design` | Epic + optional Tech Arch | Tech Design (2 or 4 docs) |
| 3. Publish | `ls-publish-epic` | Epic + Tech Design | Story files + coverage artifact |

### Simple Pipeline

For story-sized work. Two phases, same quality bar.

| Phase | Skill | Input | Output |
|-------|-------|-------|--------|
| S1. Story | `lss-story` | Requirements | Functional Story |
| S2. Tech | `lss-tech` | Story + Codebase | Complete Story |

### Team Orchestration

For orchestrating the pipeline or implementation with agent teams.

| Skill | Input | Output |
|-------|-------|--------|
| `ls-team-spec` | Requirements / PRD | Published story files via agent teams with external verification |
| `ls-team-impl` | Stories + Tech Design | Verified code via agent teams with Codex/Copilot |
| `ls-team-impl-cc` | Stories + Tech Design + Test Plan | Verified code via Claude Code agent teams |

## Key Ideas

**Confidence chain.** Every line of code traces back: AC (requirement) → TC (test condition) → Test → Implementation. If you can't write a TC, the AC is too vague. If you can't write a test, the TC is too vague.

**Context isolation.** Each phase gets a clean context window. The artifact is the complete handoff. This prevents context rot and the "lost in the middle" problem that degrades long conversations.

**Upstream scrutiny.** The epic gets the most review because errors cascade through every downstream phase. Fix problems at the spec level — cheapest to fix there, most expensive in code.

## Development

```bash
git clone https://github.com/liminal-ai/liminal-spec.git
cd liminal-spec
bun install
bun run verify    # Build + validate + test
```

Edit content in `src/`, never in `dist/`. The build composes phase content with shared references per the manifest.

```bash
bun run build       # Compose source into dist/
bun run validate    # Validate output
bun test            # Run tests
bun run verify      # Build + validate + test (primary gate)
```

### Project Structure

```
src/
  phases/          -- Phase-specific content (one per skill)
  shared/          -- Cross-cutting concepts used by multiple skills
  templates/       -- Artifact templates (tech design)
  examples/        -- Verification prompt templates
scripts/
  build.ts         -- Compose src/ into dist/
  validate.ts      -- Validate build output
manifest.json      -- Maps skills to source files and shared dependencies
dist/              -- Build output (gitignored)
  skills/          -- Installable skill directories
  standalone/      -- Markdown files + pack zips
```

## Links

- [Releases](https://github.com/liminal-ai/liminal-spec/releases)
- [Changelog](CHANGELOG.md)
- [Development Guide](CLAUDE.md)

## License

MIT
