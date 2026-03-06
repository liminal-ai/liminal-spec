# Liminal Spec

## What This Is

A spec-driven development methodology packaged as a **Claude Code plugin**. The plugin contains 8 self-contained skills (4 for the full pipeline, 2 for the simple pipeline, 2 for team orchestration), a router command, and a senior-engineer agent.

This is NOT a library or npm package. The build output is markdown files organized into a Claude Code plugin structure. There are three distribution channels:

**Plugin** (`dist/plugin/`) -- For Claude Code users (developers, senior engineers). They install via marketplace and get slash commands (`/liminal-spec`, `/ls-epic`, etc.). The plugin bundles skills + agents + commands + marketplace metadata per the [Claude Code plugin spec](https://code.claude.com/docs/en/plugins).

**Marketplace install source** (`plugins/liminal-spec/`) -- Committed, installable plugin layout used by `claude plugin install ...@liminal-plugins`. This directory is generated from `dist/plugin/` by the build.

**Standalone** (`dist/standalone/`) -- For non-Claude-Code users (BA, PO) and custom/local skill workflows. Output includes per-phase markdown files (`*-skill.md`) plus two release packs: `liminal-spec-skill-pack.zip` (installable skill directories) and `liminal-spec-markdown-pack.zip` (paste-into-chat markdown bundle).

Both outputs are composed from the same source files. The build handles the packaging differences.

### Plugin Structure (what gets installed)

```
.claude-plugin/
  plugin.json              -- Plugin metadata (name, version, author)
  marketplace.json         -- Marketplace catalog for `claude plugin marketplace add`
skills/
  ls-research/SKILL.md     -- /ls-research (Phase 1: Product Research, optional)
  ls-epic/SKILL.md         -- /ls-epic (Phase 2: Epic)
  ls-tech-design/SKILL.md  -- /ls-tech-design (Phase 3: Tech Design)
  ls-publish-epic/SKILL.md -- /ls-publish-epic (Phase 4: Publish Epic)
  lss-story/SKILL.md       -- /lss-story (Simple Pipeline: Functional Story)
  lss-tech/SKILL.md        -- /lss-tech (Simple Pipeline: Technical Design + Enrichment)
  ls-team-impl/SKILL.md    -- /ls-team-impl (Team Orchestration: Implementation)
  ls-team-spec/SKILL.md    -- /ls-team-spec (Team Orchestration: Spec Pipeline)
commands/
  liminal-spec.md          -- /liminal-spec (router: presents phase menu, invokes skill)
agents/
  senior-engineer.md       -- Senior engineer agent for TDD implementation
```

Each skill SKILL.md has YAML frontmatter (`name` + `description`) and is self-contained -- all shared concepts (confidence chain, writing style, etc.) are inlined by the build. No progressive disclosure, no reference file loading needed.

## Project

Source-based skill with build composition. Edit in `src/`, never in `dist/`.

### Structure

```
src/
  phases/          -- Phase-specific content (one per skill: research, epic, tech-design, publish-epic, story-simple, story-simple-tech, team-impl, team-spec)
  shared/          -- Cross-cutting concepts inlined into multiple skills by the build
  templates/       -- Artifact templates (tech design, epic)
  examples/        -- Verification prompt templates
  commands/        -- Plugin command (/liminal-spec router)
  agents/          -- Plugin agents (senior-engineer)
scripts/
  build.ts         -- Compose src/ into dist/
  validate.ts      -- Validate dist/ output
manifest.json      -- Maps which shared files each phase skill needs
docs/              -- Reference material not yet in the build pipeline
dist/              -- Build output (gitignored)
  plugin/          -- Claude Code plugin (skills/ + agents/ + commands/ + marketplace)
  standalone/      -- Paste-ready MDs + skill-pack and markdown-pack zips
plugins/           -- Committed marketplace-installable plugin directories (liminal-spec full suite + individual skill plugins)
```

### Commands

```bash
bun run build       # Compose source into dist/
bun run validate    # Validate dist/ output
bun run check       # Build + validate
bun test            # Run integration tests
bun run verify      # Build + validate + tests
```

### How the Build Works

`manifest.json` declares which shared files each phase skill needs. `scripts/build.ts` reads the manifest, concatenates phase content + shared content in declared order, wraps with SKILL.md YAML frontmatter, and outputs to `dist/plugin/skills/<name>/SKILL.md`. It also strips frontmatter and outputs per-phase markdown files (`dist/standalone/*-skill.md`) plus pack zips (`liminal-spec-skill-pack.zip`, `liminal-spec-markdown-pack.zip`) for release distribution.

The build also copies agents, commands, generates plugin.json + marketplace.json in `dist/plugin/.claude-plugin/`, then syncs a committed marketplace install source at `plugins/liminal-spec/`.

### What Gets Built

**Command** (router -- not a skill):

| Command | Source | Purpose |
|---------|--------|---------|
| `/liminal-spec` | `src/commands/liminal-spec.md` | Presents phase menu, invokes the appropriate skill |

**Skills** (8 self-contained skills — 4 full pipeline, 2 simple pipeline, 2 team orchestration):

| Skill | Phase | Primary source | Shared dependencies |
|-------|-------|----------------|---------------------|
| `/ls-research` | 1 | `src/phases/research.md` | context-isolation, state-management, terminology |
| `/ls-epic` | 2 | `src/phases/epic.md` | confidence-chain, context-isolation, writing-style-epic |
| `/ls-tech-design` | 3 | `src/phases/tech-design.md` | confidence-chain, verification-model, writing-style, testing |
| `/ls-publish-epic` | 4 | `src/phases/publish-epic.md` | confidence-chain, writing-style-epic |
| `/ls-team-impl` | Team | `src/phases/team-impl.md` | confidence-chain, verification-model |
| `/ls-team-spec` | Team | `src/phases/team-spec.md` | confidence-chain, verification-model |
| `/lss-story` | S1 | `src/phases/story-simple.md` | confidence-chain, writing-style-epic |
| `/lss-tech` | S2 | `src/phases/story-simple-tech.md` | confidence-chain, verification-model, writing-style, testing |

**Agent:**

| Agent | Source | Purpose |
|-------|--------|---------|
| senior-engineer | `src/agents/senior-engineer.md` | TDD implementation with quality gates |

## How to Update Content

### Editing a phase

1. Edit the source file in `src/phases/<name>.md`
2. `bun run check` to rebuild and validate
3. `claude --plugin-dir ./dist/plugin` to test locally
4. Commit and push

### Editing a shared concept

Shared files affect multiple skills. Before editing, check which skills depend on it:

```bash
# Example: which skills use the writing-style shared file?
grep "writing-style" manifest.json
```

After editing, rebuild and review the affected skill outputs to make sure the inlined content reads correctly in each context. The same shared section may appear after different phase content in each skill -- verify it flows naturally in all of them.

### Adding a new shared file

1. Create the file in `src/shared/<name>.md`
2. Add it to the relevant skill(s) in `manifest.json` under the `shared` array
3. `bun run check` to rebuild and validate

### Adding content to a phase that's already inline in the source

Some content (like the epic template) is already embedded in the phase file rather than composed from a separate source. The `templates` and `examples` entries in `manifest.json` are for content that lives in separate files and gets appended. If the content is already in the phase file, don't also add it to the manifest -- that causes duplication.

### Testing locally

```bash
claude --plugin-dir ./dist/plugin
```

This loads the plugin from the build output. Test the router (`/liminal-spec`) and individual skills (`/ls-epic`, etc.).

## PR Checklist

Before opening or updating a PR:

1. Source-only edits: no manual changes in `dist/`.
2. Local gate passes: `bun run verify`.
3. Generated marketplace source is synced:
   - run `bun run build`
   - verify: `git diff --exit-code -- plugins/ .claude-plugin/marketplace.json`
4. For content/methodology edits:
   - spot-check affected `dist/plugin/skills/*/SKILL.md` for composition coherence
   - spot-check affected `dist/standalone/*-skill.md` for standalone usability
   - confirm standalone packs exist (`dist/standalone/liminal-spec-skill-pack.zip`, `dist/standalone/liminal-spec-markdown-pack.zip`) and no legacy `*.skill` files are emitted
5. If intended as release prep, keep version fields synchronized (see Release Process below).

### About `docs/`

The `docs/` directory holds long-form reference material that may or may not be composed into builds. `product-research.md` is reference context; active Phase 1 skill content lives in `src/phases/research.md`.

### Adding a new skill

1. Create the phase source file: `src/phases/<name>.md`
2. Add the skill entry to `manifest.json` with name, description, phases, and shared dependencies
3. Update the router command (`src/commands/liminal-spec.md`) to include the new phase in the table and routing logic
4. Update the version assertion in `scripts/__tests__/build.test.ts` if needed
5. `bun run check` to verify the build picks it up
6. Test locally with `claude --plugin-dir ./dist/plugin`

## Release Process

1. Push to main (directly or via PR merge).
2. When ready to release, update version in all four places:
   - `version.txt`
   - `manifest.json`
   - `package.json`
   - `.claude-plugin/marketplace.json`
3. Update the changelog: change "Unreleased" header to `vX.Y.Z (YYYY-MM-DD)`.
4. Run `bun run verify` (builds, validates, runs tests, syncs `plugins/liminal-spec/`).
5. Commit the version bump + changelog, then tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`
6. Tag triggers release workflow -> builds, validates, tests, packages plugin + skill-pack + markdown-pack zips, creates GitHub Release with artifacts

The tag is the explicit "ship it" signal. Code can accumulate on main across multiple pushes without releasing.

## Development Principles

This project IS the liminal-spec methodology. These principles govern how you work on it:

**Progressive depth, not flat lists.** Prose establishes branches (context, why it matters). Bullets hang leaves (specifics). A section of equal-weight bullets with no framing paragraph is a sign something is wrong. Earn complexity -- don't front-load it.

**Upstream gets more scrutiny.** Phase 2 content is the most critical -- errors cascade through every downstream phase. Phase 5 content is more localized. Weight your care accordingly when editing.

**Prescribe the what, not the how.** The skill should say "verify test immutability at Green exit" not "run `git diff --name-only HEAD~1 | grep test`". Projects vary. Methodology guidance stays at the principle level; implementation details belong in project-specific prompts.

**Confidence chain: AC -> TC -> Test -> Implementation.** Every piece of guidance should trace back to why it exists. If you can't articulate what failure mode a section prevents, it probably doesn't belong.

**Context isolation is structural, not aspirational.** The build composes self-contained skills precisely so consumers don't need progressive disclosure. Source files can reference each other freely. Output files must stand alone.

**Don't add without approval.** New sections, new shared concepts, new checklist items -- propose them, don't add them. The owner curates what's in the methodology.

**No content duplication in source.** Shared concepts live in `src/shared/` and get inlined by the build. If the same concept appears in two phase files, extract it to shared.

**Templates and examples are source artifacts.** They get composed into skills or bundled alongside them. Edit in `src/templates/` and `src/examples/`.

## Coherence Checks Before Release

Before tagging a release, verify content coherence:

1. `bun run verify` passes (build + validate + test)
2. Review each `dist/plugin/skills/*/SKILL.md` -- does the inlined shared content flow naturally after the phase content?
3. For significant content changes: run a cross-model comparison (e.g. Codex at high reasoning) against previous release output to catch unintended drift
4. Spot-check a `dist/standalone/*.md` file -- is it usable when pasted into a chat with no other context?
