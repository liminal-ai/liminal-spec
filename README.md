# Liminal Spec

A spec-driven development methodology for AI-assisted coding. Designed for features with detailed requirements, complex integrations, or multi-agent coordination.

Liminal Spec runs a phased pipeline where each phase produces an artifact the next phase reads cold — no shared conversation history, no accumulated assumptions. The traceability chain (requirement → test condition → test → code) means when tests go green, you have high confidence the implementation matches the spec.

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
| 4. Story Sharding | Spec + Design | Stories + Prompt Packs |
| 5. Execution | Prompts | Verified code |

Most work starts at Phase 2 - if you know what you're building, start there.

Within Phase 5, each story follows: **Skeleton → TDD Red → TDD Green → Gorilla Test → Verify**.

## Key Ideas

**Context isolation.** "Agents" means fresh context with artifact handoff — not roleplay personas. Each phase gets a clean context window. The artifact (document) is the complete handoff.

**Confidence chain.** Every line of code traces back: AC (requirement) → TC (test condition) → Test → Implementation.

**Upstream scrutiny.** The feature spec gets the most review because errors there cascade through every downstream phase.

**Multi-model validation.** Different models catch different things. Artifacts are validated by their downstream consumer and by a different model for diverse perspective.

**Prompt contract.** In Phase 4/5, prompt packs are context-rich task packets with explicit references to required artifacts (story, epic, tech design). Execution assumes agents read both the prompt and the referenced artifacts.

## Installation

### As a Claude Code Plugin (recommended)

```bash
# Add the marketplace
claude plugin marketplace add liminal-ai/liminal-spec

# Install the plugin
claude plugin install liminal-spec@liminal-plugins
```

This gives you:

| Command | What it does |
|---------|-------------|
| `/liminal-spec` | Router — presents the phase menu, routes to the right skill |
| `/ls-research` | Phase 1 (optional) — product research and PRD drafting |
| `/ls-epic` | Phase 2 — write a Feature Specification |
| `/ls-tech-design` | Phase 3 — create a Tech Design from a Feature Spec |
| `/ls-story` | Phase 4 — shard into stories and generate prompt packs |
| `/ls-impl` | Phase 5 — execute stories with TDD and verification |

`ls-` command prefixes are intentional: they make slash-command autocomplete clearer and avoid collisions with generic command names like `/epic` or `/story`.

The plugin also includes a **senior-engineer agent** for TDD implementation — rigorous TypeScript development with quality gates (format, lint, typecheck, test).

Start with `/liminal-spec` and it will guide you to the right phase.

### Distribution Formats

| Format | Audience | Install | Contents |
|--------|----------|---------|----------|
| Plugin | Engineers, Tech Leads | `claude plugin install liminal-spec@liminal-plugins` | Router, phase skills, senior-engineer agent |
| Skill Pack | Per-phase skill installation | Download from [Releases](https://github.com/liminal-ai/liminal-spec/releases) | One skill directory per phase |
| Markdown Pack | BA, PO, PM, Claude Enterprise | Download from [Releases](https://github.com/liminal-ai/liminal-spec/releases) | One self-contained markdown per phase |

### Skill Pack

Download `liminal-spec-skill-pack-vX.Y.Z.zip` from Releases. Contains one directory per phase (`product-research/`, `epic/`, `technical-design/`, `story-sharding/`, `implementation/`), each with a `SKILL.md`. Copy the phases you need into your project's `.claude/skills/` directory.

The plugin includes the router command and senior-engineer agent that the skill pack doesn't. Use the plugin if your environment supports it.

### Markdown Pack

Download `liminal-spec-markdown-pack-vX.Y.Z.zip` from [Releases](https://github.com/liminal-ai/liminal-spec/releases). Each file is self-contained — paste directly into Claude Enterprise Chat or any AI assistant.

| File | For | Use when |
|------|-----|----------|
| `product-research-skill.md` | PO, PM, BA | Exploring direction and drafting a PRD |
| `epic-skill.md` | BA, PO | Writing feature specifications |
| `technical-design-skill.md` | Senior Dev, Tech Lead | Creating tech designs from a spec |
| `story-sharding-skill.md` | Tech Lead, Engineers | Breaking features into stories and prompts |
| `implementation-skill.md` | Engineers | Executing stories with TDD |

## Execution SOP (Story Phases)

For story execution (`/ls-story` + `/ls-impl`), the standard flow is:
1. Run `skeleton-red` prompt.
2. Run required post-Red self-review follow-up prompt (same implementation session).
3. Run `tdd-green` prompt.
4. Run required post-Green self-review follow-up prompt (same implementation session).
5. Run Gorilla testing (human) and then dual verification.

Self-review checkpoints are part of standard orchestration, not optional extras.

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

Edit content in `src/`, never in `dist/`. The build composes phase content with shared references per the manifest and outputs a Claude Code plugin (`dist/plugin/`) and standalone files with pack zips (`dist/standalone/`). See [CLAUDE.md](CLAUDE.md) for detailed development guidance.

## Versioning and Release Tracking

Liminal Spec uses one release version across plugin + marketplace + artifacts (not per-skill versioning).

Tracked version fields:
- `version.txt`
- `manifest.json`
- `package.json`
- `.claude-plugin/marketplace.json` (`plugins[0].version`)

Release flow:
1. Bump version in all tracked fields.
2. Update the changelog header from "Unreleased" to the version and date.
3. Run `bun run verify`.
4. Commit, tag `vX.Y.Z`, and push to trigger release artifact publishing.

## Project Structure

```
src/
  phases/          — Phase-specific content (one per skill)
  shared/          — Cross-cutting concepts used by multiple phases
  templates/       — Artifact templates
  examples/        — Verification prompt templates
  commands/        — /liminal-spec router command
  agents/          — senior-engineer agent
scripts/
  build.ts         — Compose src/ into dist/
  validate.ts      — Validate build output
manifest.json      — Maps which shared files each phase skill needs
docs/              — Long-form reference material and supporting notes
plugins/           — Committed marketplace-installable plugin directories
```

## Links

- [Releases](https://github.com/liminal-ai/liminal-spec/releases)
- [Changelog](CHANGELOG.md)
- [Development Guide](CLAUDE.md)

## License

MIT
