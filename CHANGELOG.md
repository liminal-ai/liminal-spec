# Changelog

## v0.4.1 (2026-02-23)

Story Sharding adds a dual-model verification gate and shim/fudge audit. Release artifacts consolidated from individual files to two versioned packs. README and changelog rewritten for clarity.

### Added

- **Pre-execution verification gate:** All stories and prompt packs go through a dual-model pass with fix cycles before execution begins.
- **Shim/fudge audit in verification:** Per-story verify now flags temporary shims, placeholder behavior, and internal-module mocking bypasses.

### Changed

- **Standalone packaging:** Build emits two packs instead of per-skill `.skill` zips:
  - `liminal-spec-skill-pack.zip` — installable skill directories
  - `liminal-spec-markdown-pack.zip` — paste-into-chat markdown files
  - Per-phase `*-skill.md` files still emitted alongside the packs
- **Release workflow:** Publishes versioned pack artifacts instead of individual `.skill` and markdown files.
- **Validation:** Enforces pack existence and rejects legacy `.skill` artifacts. Integration tests assert the same.
- README rewritten: distribution formats, skill-pack instructions, structural cleanup.
- Changelog restructured: v0.4.0 entry added, prior history rewritten as project evolution narrative.

### Removed

- Per-skill `.skill` artifacts from build output and release publishing.

### Migration

- Automation consuming `release/*.skill`: switch to `liminal-spec-skill-pack-vX.Y.Z.zip`.
- Claude Enterprise distribution: use `liminal-spec-markdown-pack-vX.Y.Z.zip`.
- Plugin installation unchanged.

---

## v0.4.0 (2026-02-19)

Story and implementation phase guidance aligned. Product Research restored as a first-class phase. AGENTS.md added as contributor reference.

### Added

- **Product Research phase:** `/ls-research` restored as a first-class plugin skill, included in standalone artifacts.
- **`ls-*` command namespace:** Phase skills use explicit prefixes for clearer autocomplete and fewer collisions.
- **Self-review checkpoints:** Skeleton-red and tdd-green phases require a self-review follow-up prompt before advancing.
- **`bun run verify`:** Single command for build + validate + test.
- **Build/test isolation:** `build.ts` and `validate.ts` support env-configurable output paths and optional marketplace sync for test isolation.
- **AGENTS.md:** Contributor reference with PR checklist, build commands, and release process.

### Changed

- **Story/impl guidance alignment:** Story sharding and implementation phases updated for consistency in prompt structure, self-review language, and verification flow.
- Build tests run against isolated temp output and read version from `manifest.json`.

---

## v0.3.1 — Router Layout Readability (2026-02-17)

### Changed

- Restored `/liminal-spec` router phase matrix to a compact 3-column layout (`Phase`, `Skill`, `Start Here If...`) for terminal readability.
- Removed `Entry`/`Exit` router columns and kept current `ls-*` command names.
- Preserved existing router guidance text; presentation fix only.

---

## v0.2.0 — Plugin Restructure (2026-02-14)

Restructured from a single progressive-disclosure skill into a composable plugin with build pipeline.

### Architecture

- **Source-based composition:** Content now lives in `src/` as modular source files. A build script (`scripts/build.ts`) composes them into self-contained skills via `manifest.json`.
- **Plugin packaging:** Output is a Claude Code plugin (`dist/plugin/`) with per-phase skills, a router command, senior-engineer agent, and marketplace metadata.
- **Standalone distribution:** Parallel output (`dist/standalone/`) produces paste-ready markdown files for non-Claude-Code users (BA/PO using Enterprise Chat).
- **No progressive disclosure:** Each composed skill contains all content needed for its phase — no separate reference file loading required.

### Skills

| Skill | Phase | Content |
|-------|-------|---------|
| `/liminal-spec` | Router | Presents phase menu, routes to appropriate skill |
| `/ls-research` | 1 (optional) | Product Research |
| `/ls-epic` | 2 | Feature Specification |
| `/ls-tech-design` | 3 | Tech Design |
| `/ls-story` | 4 | Story Sharding + Prompt Drafting |
| `/ls-impl` | 5 | Execution + Phase Execution + Orchestration |

### Build & CI

- `bun run build` — compose source into dist/
- `bun run validate` — validate output structure and frontmatter
- `bun test` — integration test suite
- GitHub Actions: PR validation and tag-triggered artifact publishing

### Removed

- Old monolithic SKILL.md (replaced by router command + per-phase skills)
- Progressive disclosure reference files (content now inlined by build)
- deploy.sh (replaced by CI/CD)
- V2-ROADMAP.md (completed)

### Phase 1 Status

- Phase 1 (Product Research) is available as `/ls-research`

---

## Prior History (v1 → v1.x)

Liminal Spec started as a single SKILL.md file — one document covering all phases, loaded whole into context. The methodology evolved through several rounds of refinement as real usage exposed what worked and what didn't.

### Early structure

The initial versions established the core pipeline (BA → Tech Lead → Scrum Master → Senior Engineer → Verifier) and the confidence chain (AC → TC → Test → Code). Phase execution, mock-at-API-boundary testing, and state management were solid from early on. The Product Owner phase existed but was marked "often skipped" — most work entered at the BA phase with requirements already in hand.

### Conceptual clarifications

Several rounds of real-world use surfaced concepts that the early versions either missed or left implicit:

- **Agents = context isolation, not roleplay.** The original framing suggested "personas" — be the BA, be the Tech Lead. In practice, what mattered was fresh context windows with artifact handoff. The role labels were convenient shorthand, but the mechanism was context isolation. This distinction was made explicit throughout.

- **Verification gradient.** Upstream phases deserve more scrutiny because errors cascade. The feature spec gets the most review because if it's wrong, everything downstream is wrong. This was implicit in the pipeline design but never stated as a principle.

- **Feature spec hierarchy.** User Profile → Flows → ACs → TCs isn't just a template — it's a cascade where each level depends on the one above. You can't write a good TC without a clear AC. You can't write a good AC without understanding the flow. Making this dependency chain explicit changed how specs were written.

- **Spiral writing style for tech designs.** Tech designs that descended linearly (system → module → interface) produced thin context that agents struggled with. The spiral pattern — functional ↔ technical, high ↔ low, revisiting topics from multiple angles — created redundant connections that both humans and models could navigate. This became a core writing principle.

- **Multi-agent validation.** Using a single model to both write and validate an artifact missed things. The author + downstream consumer + different model pattern caught more issues. This became the dual-validator pattern used throughout.

- **Gorilla testing.** Ad-hoc manual testing between TDD Green and formal verification was happening informally. Making it a named phase legitimized unstructured exploration within the structured process — a recognition that humans catch things automation doesn't.

### Structural shift (v1.x → v0.2.0)

The single-file approach hit practical limits. Skills exceeded reasonable context sizes, shared concepts were duplicated across sections, and updating one concept meant finding every place it appeared. The v0.2.0 restructure moved to source-based composition: modular source files in `src/`, a build that composes them per `manifest.json`, and self-contained output per phase. The conceptual work from v1.x carried forward intact — the restructure changed packaging, not methodology.
