# Liminal Spec

A spec-driven development methodology for AI-assisted coding. Designed for features with detailed requirements, complex integrations, or multi-agent coordination.

Liminal Spec runs a phased pipeline where each phase produces an artifact the next phase reads cold -- no shared conversation history, no accumulated assumptions. The traceability chain (requirement -> test condition -> test -> code) means when tests go green, you have high confidence the implementation matches the spec.

## When to Use

- New features with multiple components or integration points
- Complex business logic where requirements need precision
- Multi-agent builds where context isolation matters

Not for: quick bug fixes, single-file changes, spikes, or emergency patches. Liminal Spec either runs full or not at all.

## Phases

| Phase | In | Out |
|-------|-----|------|
| 1. Product Research (optional) | Vision/idea | PRD |
| 2. Feature Specification | PRD or requirements | Feature Spec |
| 3. Tech Design | Feature Spec | Tech Design |
| 4. Story Sharding | Spec + Design | Functional Stories |
| 4b. Story Tech | Stories (functional) + Tech Design | Complete Stories |
| 5. Implementation | Complete Stories | Verified code |

Most work starts at Phase 2 - if you know what you're building, start there.

Within Phase 5, the recommended cycle is: **Skeleton -> TDD Red -> TDD Green -> Gorilla Test -> Verify**. The verification gate is the hard requirement; the TDD process is the engineer's judgment.

## Key Ideas

**Context isolation.** "Agents" means fresh context with artifact handoff -- not roleplay personas. Each phase gets a clean context window. The artifact (document) is the complete handoff.

**Confidence chain.** Every line of code traces back: AC (requirement) -> TC (test condition) -> Test -> Implementation.

**Upstream scrutiny.** The feature spec gets the most review because errors there cascade through every downstream phase.

**Multi-model validation.** Different models catch different things. Artifacts are validated by their downstream consumer and by a different model for diverse perspective.

**Story as implementation artifact.** Complete stories with functional sections (BA/SM) and technical sections (Tech Lead) are the sole handoff to engineers. No prompt packs, no orchestration scripts -- engineers implement from stories using TDD discipline and plan mode.

## Installation

### Add the Marketplace

All plugins (full suite and individual) are distributed through a single marketplace:

```bash
claude plugin marketplace add liminal-ai/liminal-spec
```

### Full Suite (recommended for most users)

```bash
claude plugin install liminal-spec@liminal-plugins
```

This gives you everything:

| Command | What it does |
|---------|-------------|
| `/liminal-spec` | Router -- presents the phase menu, routes to the right skill |
| `/ls-research` | Phase 1 (optional) -- product research and PRD drafting |
| `/ls-epic` | Phase 2 -- write a Feature Specification |
| `/ls-tech-design` | Phase 3 -- create a Tech Design from a Feature Spec |
| `/ls-story` | Phase 4 -- shard epic into functional stories |
| `/ls-story-tech` | Phase 4b -- add technical sections to functional stories |
| `/ls-impl` | Phase 5 -- implement from complete stories with TDD |

Plus a **senior-engineer agent** (rigorous TypeScript development with quality gates and TDD as the default approach) and the `/liminal-spec` router that guides you to the right phase.

### Individual Plugins (à la carte)

Install only the phases you need. Each individual plugin contains a single self-contained skill -- the same composed content as the full suite, just packaged separately.

```bash
# Install one phase
claude plugin install ls-epic@liminal-plugins

# Install multiple phases
claude plugin install ls-epic@liminal-plugins
claude plugin install ls-tech-design@liminal-plugins

# Or install a role-appropriate set
claude plugin install ls-story@liminal-plugins ls-story-tech@liminal-plugins
```

Available individual plugins:

| Plugin | Phase | Skill command | For |
|--------|-------|---------------|-----|
| `ls-epic` | 2 | `/ls-epic:ls-epic` | BA, PO -- feature specifications |
| `ls-tech-design` | 3 | `/ls-tech-design:ls-tech-design` | Tech Lead -- technical designs |
| `ls-story` | 4 | `/ls-story:ls-story` | BA, SM -- story sharding |
| `ls-story-tech` | 4b | `/ls-story-tech:ls-story-tech` | Tech Lead -- story technical enrichment |

Individual plugins do not include the router command, the senior-engineer agent, or the `/ls-research` and `/ls-impl` skills. Those are available in the full suite.

### Team Role Setup

For teams dividing the pipeline across roles:

```bash
# Product Owner / Business Analyst
claude plugin install ls-epic@liminal-plugins

# Tech Lead
claude plugin install ls-tech-design@liminal-plugins
claude plugin install ls-story-tech@liminal-plugins

# Scrum Master / BA (story sharding)
claude plugin install ls-story@liminal-plugins

# Engineer (use full suite for impl + agent + router)
claude plugin install liminal-spec@liminal-plugins
```

### Distribution Formats

| Format | Audience | How to get it | Contents |
|--------|----------|---------------|----------|
| Full suite plugin | Engineers, full team | `claude plugin install liminal-spec@liminal-plugins` | All 6 skills, router, senior-engineer agent |
| Individual plugins | Role-specific | `claude plugin install ls-epic@liminal-plugins` | Single skill per plugin |
| Skill Pack | Manual skill installation | Download from [Releases](https://github.com/liminal-ai/liminal-spec/releases) | One skill directory per phase |
| Markdown Pack | BA, PO, PM, Claude Enterprise | Download from [Releases](https://github.com/liminal-ai/liminal-spec/releases) | One self-contained markdown per phase |

### Skill Pack

Download `liminal-spec-skill-pack-vX.Y.Z.zip` from Releases. Contains one directory per phase (`01-product-research/`, `02-epic/`, `03-technical-design/`, `04-story-sharding/`, `04b-story-technical-enrichment/`, `05-implementation/`), each with a `SKILL.md`. Copy the phases you need into your project's `.claude/skills/` directory.

The plugin includes the router command and senior-engineer agent that the skill pack doesn't. Use the plugin if your environment supports it.

### Markdown Pack

Download `liminal-spec-markdown-pack-vX.Y.Z.zip` from [Releases](https://github.com/liminal-ai/liminal-spec/releases). Each file is self-contained -- paste directly into Claude Enterprise Chat or any AI assistant.

| File | For | Use when |
|------|-----|----------|
| `01-product-research-skill.md` | PO, PM, BA | Exploring direction and drafting a PRD |
| `02-epic-skill.md` | BA, PO | Writing feature specifications |
| `03-technical-design-skill.md` | Senior Dev, Tech Lead | Creating tech designs from a spec |
| `04-story-sharding-skill.md` | BA, SM | Breaking epics into functional stories |
| `04b-story-technical-enrichment-skill.md` | Tech Lead | Adding technical sections to stories |
| `05-implementation-skill.md` | Engineers | Implementing from complete stories with TDD |

## Execution SOP

Stories contain functional requirements (ACs, TCs, error paths) and technical implementation sections (architecture context, test mapping, technical DoD). Engineers implement from complete stories using TDD discipline:

1. Read the story (functional + technical sections).
2. Plan the implementation (use plan mode if available).
3. Execute the TDD cycle (recommended): Skeleton -> Red -> Green -> Self-Review -> Gorilla -> Verify.
4. Verify against the story's technical checklist and functional DoD.

The story is the sole implementation artifact. Epic and tech design are reference material available in the project repo.

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
2. Update the changelog header from "Unreleased" to the version and date.
3. Run `bun run verify`.
4. Commit, tag `vX.Y.Z`, and push to trigger release artifact publishing.

## Project Structure

```
src/
  phases/          -- Phase-specific content (one per skill)
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
  ls-story/        -- Individual plugin marketplace source
  ls-story-tech/   -- Individual plugin marketplace source
```

## Links

- [Releases](https://github.com/liminal-ai/liminal-spec/releases)
- [Changelog](CHANGELOG.md)
- [Development Guide](CLAUDE.md)

## License

MIT
