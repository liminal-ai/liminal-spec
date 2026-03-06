# Liminal Spec

A spec-driven development methodology for agentic coding. Designed for AI coding assistants (Claude Code, Codex, Cursor, Copilot) building features with detailed requirements, complex integrations, or focused changes that need precision.

Liminal Spec runs a phased pipeline where each phase produces an artifact the next phase reads cold -- no shared conversation history, no accumulated assumptions. The traceability chain (requirement -> test condition -> test -> code) means when tests go green, you have high confidence the implementation matches the spec.

## Compatibility

**Claude Code plugin** (recommended): Full integration with slash commands, router, and agent. Requires Claude Code.

**Standalone markdown**: Paste into any AI assistant -- Claude Enterprise Chat, ChatGPT, Cursor, Codex, or any tool that accepts system-level instructions. Each skill is self-contained with no external dependencies.

## When to Use

**Full pipeline** -- multi-story features, complex integrations, team coordination:
- New features with multiple components or integration points
- Complex business logic where requirements need precision
- Multi-agent builds where context isolation matters

**Simple pipeline** -- story-sized work, focused changes, same rigor:
- Single capability additions or contained feature changes
- Work scoped to 1-2 flows and ~5-15 acceptance criteria
- Changes where full epic/tech-design overhead isn't justified

Not for: quick bug fixes, single-file changes, spikes, or emergency patches.

## Quick Start

```
# Full pipeline (multi-story feature)
/ls-epic          → describe what you're building       → get a detailed epic
/ls-tech-design   → design from the spec                → get a tech design
/ls-publish-epic  → publish for handoff                 → get business epic + stories

# Simple pipeline (story-sized change)
/lss-story        → describe a focused change           → get a functional story
/lss-tech         → design + enrich inline              → get a complete story

# Team orchestration (agent teams in tmux)
/ls-team-spec     → orchestrate full spec pipeline      → complete artifacts via agent teams
/ls-team-impl     → orchestrate team implementation     → verified code via agent teams
```

Or use `/liminal-spec` to open the router -- describe what you're building and it routes you to the right skill.

## Pipelines

### Full Pipeline

For multi-story features. Each phase is a separate agent with a separate context window.

| Phase | Skill | In | Out |
|-------|-------|-----|------|
| 1. Product Research (optional) | `/ls-research` | Vision/idea | PRD |
| 2. Epic | `/ls-epic` | PRD or requirements | Detailed Epic |
| 3. Tech Design | `/ls-tech-design` | Detailed Epic | Tech Design |
| 4. Publish Epic | `/ls-publish-epic` | Detailed Epic | Business Epic + Stories |

Most work starts at Phase 2 -- if you know what you're building, start there.

### Team Orchestration

For orchestrating spec creation or implementation with agent teams in tmux.

| Phase | Skill | In | Out |
|-------|-------|-----|------|
| Team Spec | `/ls-team-spec` | Requirements / PRD | Published artifacts (via agent teams) |
| Team Implementation | `/ls-team-impl` | Stories + Tech Design | Verified code (via agent teams) |

### Simple Pipeline

For story-sized work. Two phases, same quality bar.

| Phase | Skill | In | Out |
|-------|-------|-----|------|
| S1. Simple Story | `/lss-story` | Requirements | Functional Story |
| S2. Simple Tech | `/lss-tech` | Functional Story + Codebase | Complete Story |

Use when scope is 1-2 flows and ~5-15 ACs. If scope grows beyond that, escalate to the full pipeline.

## Key Ideas

**Why this works.** Ad hoc prompting loses requirements in conversation history, lets implementation drift from intent, and produces tests that verify what was built rather than what was specified. Liminal Spec prevents this by locking requirements (ACs/TCs) before design, locking design before implementation, and making every test trace back to a specific requirement. When tests go green, they prove the implementation matches the spec -- not just that the code runs.

**Context isolation.** "Agents" means fresh context with artifact handoff -- not roleplay personas. Each phase gets a clean context window. The artifact (document) is the complete handoff. This prevents context rot, negotiation baggage, and the "lost in the middle" problem that degrades long conversations.

**Confidence chain.** Every line of code traces back: AC (requirement) -> TC (test condition) -> Test -> Implementation. If you can't write a TC, the AC is too vague. If you can't write a test, the TC is too vague.

**Upstream scrutiny.** The feature spec gets the most review because errors there cascade through every downstream phase. Fix problems at the spec level -- they're cheapest to fix there and most expensive to fix in code.

**Multi-model validation.** Different models catch different things. Artifacts are validated by their downstream consumer and by a different model for diverse perspective.

**Publish for handoff.** The detailed epic is the engineering source of truth. The published business epic gives POs a clear view of what's being built. The story file gives developers self-contained units of work with full AC/TC detail and relevant contracts. Each audience gets the artifact shaped for their needs.

## Installation

### Add the Marketplace

All plugins (full suite and individual) are distributed through a single marketplace:

```bash
claude plugin marketplace add liminal-ai/liminal-spec
```

### Install

```bash
# Full suite -- all 8 skills, router, senior-engineer agent
claude plugin install liminal-spec@liminal-plugins

# Or install individual skills à la carte
claude plugin install ls-epic@liminal-plugins            # Full: Feature specifications
claude plugin install ls-tech-design@liminal-plugins     # Full: Technical designs
claude plugin install ls-publish-epic@liminal-plugins    # Full: Publish epic as business epic + stories
claude plugin install lss-story@liminal-plugins          # Simple: Functional story
claude plugin install lss-tech@liminal-plugins           # Simple: Technical design + enrichment
```

### Update

When a new version is released, update all installed plugins from the marketplace:

```bash
claude plugin marketplace update liminal-plugins
```

Or enable auto-update via the `/plugin` manager (Marketplaces tab) to pull new versions automatically at startup.

### What You Get

**Full suite** (`liminal-spec`) includes:

| Command | What it does |
|---------|-------------|
| `/liminal-spec` | Router -- presents the pipeline menu, routes to the right skill |
| `/ls-research` | Phase 1 (optional) -- product research and PRD drafting |
| `/ls-epic` | Phase 2 -- write a detailed Feature Specification |
| `/ls-tech-design` | Phase 3 -- create a Tech Design from a Feature Spec |
| `/ls-publish-epic` | Phase 4 -- publish epic as business epic + developer stories |
| `/lss-story` | Simple S1 -- write a functional story with epic-quality rigor |
| `/lss-tech` | Simple S2 -- inline technical design + enrichment for a story |
| `/ls-team-spec` | Team -- orchestrate full spec pipeline with agent teams in tmux |
| `/ls-team-impl` | Team -- orchestrate agent team implementation in tmux |

Plus a **senior-engineer agent** (rigorous TypeScript development with quality gates and TDD as the default approach) and the `/liminal-spec` router that guides you to the right skill.

**Individual plugins** each contain a single self-contained skill -- the same composed content as the full suite, just packaged separately for à la carte installation.

### Team Role Setup

For teams dividing the pipeline across roles:

```bash
# Product Owner / Business Analyst
claude plugin install ls-epic@liminal-plugins

# Tech Lead
claude plugin install ls-tech-design@liminal-plugins
claude plugin install lss-tech@liminal-plugins           # For story-sized tech enrichment

# BA / SM (publish epic for handoff)
claude plugin install ls-publish-epic@liminal-plugins

# Solo developer (simple pipeline for focused work)
claude plugin install lss-story@liminal-plugins
claude plugin install lss-tech@liminal-plugins
```

### Other Distribution Formats

| Format | Audience | How to get it | Contents |
|--------|----------|---------------|----------|
| Skill Pack | Manual skill installation | Download from [Releases](https://github.com/liminal-ai/liminal-spec/releases) | One skill directory per phase |
| Markdown Pack | BA, PO, PM, Claude Enterprise | Download from [Releases](https://github.com/liminal-ai/liminal-spec/releases) | One self-contained markdown per phase |

### Skill Pack

Download `liminal-spec-skill-pack-vX.Y.Z.zip` from Releases. Contains one directory per phase (`01-product-research/`, `02-epic/`, `03-technical-design/`, `04-publish-epic/`, `06-team-implementation/`, `07-team-spec/`, `simple-01-story/`, `simple-02-technical-design/`), each with a `SKILL.md`. Copy the phases you need into your project's `.claude/skills/` directory.

The plugin includes the router command and senior-engineer agent that the skill pack doesn't. Use the plugin if your environment supports it.

### Markdown Pack

Download `liminal-spec-markdown-pack-vX.Y.Z.zip` from [Releases](https://github.com/liminal-ai/liminal-spec/releases). Each file is self-contained -- paste directly into Claude Enterprise Chat or any AI assistant.

| File | For | Use when |
|------|-----|----------|
| `01-product-research-skill.md` | PO, PM, BA | Exploring direction and drafting a PRD |
| `02-epic-skill.md` | BA, PO | Writing feature specifications |
| `03-technical-design-skill.md` | Senior Dev, Tech Lead | Creating tech designs from a spec |
| `04-publish-epic-skill.md` | BA, SM | Publishing epic as business epic + developer stories |
| `06-team-implementation-skill.md` | Team Lead / Orchestrator | Orchestrating agent team implementation |
| `07-team-spec-skill.md` | Team Lead / Orchestrator | Orchestrating full spec pipeline with agent teams |
| `simple-01-story-skill.md` | BA, PO, Solo Dev | Writing a single story with epic-quality rigor |
| `simple-02-technical-design-skill.md` | Tech Lead, Solo Dev | Inline technical design + enrichment for a story |

## How It Works

### Spec Phases (Full or Simple Pipeline)

Each spec phase produces an artifact that the next phase reads cold. The author validates their own work, then a downstream consumer validates it from their perspective (can the Tech Lead design from this spec? can the PO accept from the business epic? can the developer implement from the story?). Different models provide diverse perspectives during validation.

### Implementation

Developers receive stories from the story file and the tech design as a separate reference. Each story contains full AC/TC detail, relevant data contracts, and Jira section markers for direct copy-paste into project management tooling. The tech design provides the architectural context that ties everything together.

## Development

### From source

```bash
git clone https://github.com/liminal-ai/liminal-spec.git
cd liminal-spec
bun install
bun run build
claude --plugin-dir ./dist/plugin
```

```bash
bun install
bun run build       # Compose source into dist/
bun run validate    # Validate output
bun test            # Run tests
bun run verify      # Build + validate + test
bun run check       # Build + validate
```

`bun run verify` is the primary local quality gate before commit/push.

Edit content in `src/`, never in `dist/`. The build composes phase content with shared references per the manifest and outputs a full suite plugin (`dist/plugin/`), individual skill plugins (`dist/individual/`), and standalone files with pack zips (`dist/standalone/`). See [CLAUDE.md](CLAUDE.md) for detailed development guidance.

## Versioning and Release Tracking

Liminal Spec uses one release version across plugin + marketplace + artifacts (not per-skill versioning).

Tracked version fields:
- `version.txt`
- `manifest.json`
- `package.json`
- `.claude-plugin/marketplace.json` (all entries in `plugins[]`)

Release flow:
1. Bump version in all tracked fields.
2. Add a new changelog entry at the top with the version and date.
3. Run `bun run verify`.
4. Commit, tag `vX.Y.Z`, and push to trigger release artifact publishing.

## Project Structure

```
src/
  phases/          -- Phase-specific content (one per skill, 8 total)
  shared/          -- Cross-cutting concepts used by multiple phases
  templates/       -- Artifact templates
  examples/        -- Verification prompt templates
  commands/        -- /liminal-spec router command
  agents/          -- senior-engineer agent
scripts/
  build.ts         -- Compose src/ into dist/
  validate.ts      -- Validate build output
manifest.json      -- Maps skills, shared files, and individual plugin config
docs/              -- Long-form reference material and supporting notes
plugins/
  liminal-spec/    -- Full suite marketplace source
  ls-epic/         -- Individual plugin marketplace source
  ls-tech-design/  -- Individual plugin marketplace source
  ls-publish-epic/ -- Individual plugin marketplace source
  lss-story/       -- Individual plugin marketplace source
  lss-tech/        -- Individual plugin marketplace source
```

## Links

- [Releases](https://github.com/liminal-ai/liminal-spec/releases)
- [Changelog](CHANGELOG.md)
- [Development Guide](CLAUDE.md)

## License

MIT
