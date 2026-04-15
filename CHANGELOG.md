# Changelog

## v1.2.0 (2026-04-15)

Codex-native implementation orchestration and current-docs continuity formalized as first-class release surfaces.

### Added

- **`ls-codex-impl` skill:** Codex-native implementation orchestration with `gpt-5.4 xhigh` as the persistent orchestrator, Codex workers as the implementation lane, and dual fresh verification from Codex and Claude Sonnet. The skill now includes explicit blocking-dependency continuation rules, waiting states, timeout recovery, no-fire-and-forget language for blocking work, durable report artifact requirements, and stronger role-boundary rules so the orchestrator stays an orchestrator rather than collapsing into a worker.

### Changed

- **`ls-current-docs` skill** (renamed from `ls-current-state`): continuity/current-docs skill is now presented under the final public name `ls-current-docs` across manifest, build outputs, standalone markdown, and user-facing docs.
- **Scoped currentness discipline** added to `ls-current-docs`: current behavior must now be calibrated by producing surface, entrypoint, platform, and ownership seam. The skill now requires explicit distinction between currently produced behavior, supported-but-not-currently-produced behavior, and planned-not-current behavior.
- **Config selection and refresh stability** tightened in `ls-current-docs`: runs must declare Config A vs Config B with justification, and refresh mode preserves prior layout unless there is a stated reason to restructure.
- **Functional output contracts** tightened: compact and domain-level functional docs now require a stricter section floor and stronger extension guidance.
- **Code-map contract** tightened: code maps must include targeted read orders for server/API, client/UI, and durable-state/data-model work, plus major behavior-owning routes, services, contract roots, persistence roots, non-obvious tested components, and repo-level workflow support surfaces when relevant.
- **Technical baseline guidance** tightened: current technical docs now explicitly call out surface / entrypoint / platform scope where behavior differs by runtime or OS assumptions, and include workflow-support docs/scripts when they materially shape implementation or QA.
- **Drift and consumer-test gates** strengthened: drift ledgers must track supported/planned-but-not-current surfaces, and completion now requires explicit answers about whether fresh spec, design, and implementation agents can proceed without historical replay and whether they can distinguish the real differences between current supported types or modes.

---

## v1.1.1 (2026-04-05)

Requirements intake discipline. Structured Socratic clarification for ls-prd and ls-epic before drafting from vague input.

### Added

- **Requirements intake shared concept** (`src/shared/intake-discipline.md`): Structured clarification protocol for when requirements arrive as a brief, idea, or conversation rather than a structured artifact. Core thesis: execution quality is bottlenecked by intent clarity, not implementation detail. Includes a questioning stance (treat every answer as a claim to pressure-test, depth over breadth, intent and boundaries before implementation detail), a four-step pressure ladder (evidence, assumption, boundary/tradeoff, root-cause reframe), brownfield evidence-backed confirmation technique, and explicit readiness gates (intent articulable in user's words, non-goals explicit, decision boundaries clear, no dimension thin enough for invention). Adapted from concepts in the open-source `deep-interview` skill.

  Added to two skills where human-agent dialogue drives requirements discovery:
  - **ls-prd:** Highest-leverage integration — the PRD intake had five example questions and no questioning discipline. Now references the shared concept with a compressed stance summary.
  - **ls-epic:** New On Load section handles both paths — upstream artifact exists (use it) and standalone cold start (conduct structured intake). The epic's altitude drop is larger when no PRD exists, making intake discipline proportionally more important.

### Changed

- **`ls-prd`:** On Load paragraph updated — five example interview questions replaced with a reference to the Requirements Intake shared concept and a compressed summary of the questioning stance and readiness criteria. Intake bar and consumer test sentences preserved.
- **`ls-epic`:** On Load section added between Purpose and Functional, Not Technical. Two-path intake: if PRD exists, use it as input; if standalone, conduct structured intake before drafting.

---

## v1.1.0 (2026-03-29)

Dimensional reasoning interrupts. Simple pipeline removal.

### Added

- **Dimensional reasoning check:** New shared concept (`src/shared/dimensional-reasoning.md`) adding higher-order reasoning prompts at key structural decisions across four skills. When a model chooses an organizing structure — top-tier surfaces, module boundaries, feature boundaries, story partitions — it tends to lock onto the first compelling axis and settle the decision before weighing competing considerations. The check prompts the model to enumerate the tensions for the specific system, identify where they pull toward different answers, and weight which should win before committing. It names the process, not the factors — those are different every time.

  Added at four decision points, heaviest where the decision is most unconstrained and highest-cascade:
  - **ls-arch:** top-tier surface identification — navigability, ownership, testing leverage, stability, and domain coherence compete
  - **ls-tech-design:** module decomposition (including inherited surface fit) and chunk breakdown
  - **ls-prd:** feature boundary selection when the four boundary criteria conflict
  - **ls-epic:** story grouping when flows don't suggest an obvious partition

### Removed

- **`lss-story` and `lss-tech` skills:** Simple pipeline skills removed. These encoded older principles and had not been updated since initial creation. Will be regenerated from current methodology when needed. Source files (`src/phases/story-simple.md`, `src/phases/story-simple-tech.md`) deleted. Orchestrator single-story flow emptied with skip markers on affected tests.

### Changed

- **`ls-tech-design`:** Module decomposition interrupt includes inherited surface fit as a competing factor alongside responsibility clarity, coupling, AC coverage, and testability.
- **`ls-epic`:** Story breakdown guidance names the specific default failure mode ("one flow = one story") to avoid when partitioning is ambiguous.
- **`ls-prd`:** Feature boundary section now explicitly addresses what to do when the four boundary criteria conflict rather than only listing the criteria.
- **`ls-team-impl` and `ls-team-impl-cc`:** Removed simple pipeline cross-references; language generalized for stories without separate epic/tech-design documents.

### Testing

- Regression test for dimensional reasoning composition: positive inclusion across 4 skills, negative exclusion across 4 skills that should not contain it.
- Source safety check updated for new shared file.
- Removed skills added to build-output and build-summary exclusion assertions.
- 3 orchestrator tests for single-story flow skipped with removal labels.
- Skill count: 10 → 8. Test count: 48 pass, 3 skip.

---

## v1.0.2 (2026-03-28)

Technical architecture breakout. PRD rewrite. Tech design bridge. The upstream pipeline is now three skills with distinct jobs and distinct writing registers, connected by explicit inheritance.

### Added

- **`ls-arch` skill:** Technical architecture as a standalone skill, extracted from `ls-prd`. Own writing register (diagram-forward with functional-to-technical weave, advisory tone), research-grounded stack decisions with date-stamped verification, human-first architecture principle with curated top-tier surfaces, downstream inheritance contract (every diagram followed by "what downstream inherits"), and two-part consumer test (single-epic usability + cross-epic consistency). This split resolves the competing writing registers that made `ls-prd` produce inconsistent tech arch output — the PRD's subtractive plain description discipline and the tech arch's rationale-rich advisory tone are fundamentally different jobs.

### Changed

- **`ls-prd` rewritten:** Feature sections restructured from capability buckets (Context → User Need → In Scope → Out of Scope → Rolled-Up ACs) to scenario-driven proto-epics (Feature Overview → Scope → Scenarios with numbered AC ranges). Writing-style-epic and confidence-chain shared references added. Consumer test validation: can an epic-writing agent expand each feature section without foundational questions? Three-way AC contrast (too vague / just right / too detailed). Feature boundary guidance for clean single-epic seams. Tech architecture section removed — now produced by `ls-arch`.

- **`ls-tech-design` updated:** Optional tech arch intake — when a tech architecture document exists, the tech design inherits system context, stack decisions, cross-cutting patterns, and top-tier surfaces rather than re-deriving them. Human-first architecture principle applied at module decomposition level. Top-tier surfaces field added to template (inherited or locally derived). Dependency grounding now distinguishes inherited multi-epic decisions from epic-scoped research. Upstream document evolution principle: proceed with better approach on deviations, document rationale, surface upstream for backfill. Verification prompt updated with top-tier surface coherence criterion.

### New internal documentation

- **`docs/skill-chain.md`:** Developer-facing functional guide to the skill chain — what each skill produces, who consumes it, what the consumer needs, quality signals, and settles/leaves-open boundaries. Not user-facing, not composed into builds.

---

## v1.0.1 (2026-03-26)

Claude Code-only implementation orchestration. Replaces `ls-subagent-impl` with `ls-team-impl-cc`.

### Added

- **`ls-team-impl-cc` skill:** Claude Code-only implementation orchestration using agent teams. Sonnet implements with TDD methodology (skeleton → red → green per chunk), Opus and Sonnet verify in fresh sessions with evidence-bound review. Red-stop/green-resume flow with committed red baseline for diff-based verification. Dual story-level verification on every story. Evidence log with finding schema (including disproof requirements) replaces external CLI session IDs. Story 0 and correction-batch exception flows. Prompt map with six formalized prompts adapted from research on Claude 4.6 prompting.

### Removed

- **`ls-subagent-impl` skill:** Replaced by `ls-team-impl-cc`. The subagent-based approach was never used in production. The new skill uses agent teams (with SendMessage for mid-task communication) instead of fire-and-forget subagents, and is built as a Claude-only fork of the battle-tested `ls-team-impl` rather than an independent design.

### Changed

- **`ls-team-spec` updated:** Implementation handoff reference updated from `ls-subagent-impl` to `ls-team-impl-cc`.

---

## v1.0.0 (2026-03-24)

Skill pack distribution. Rebuilt orchestration. New upstream pipeline. The methodology reaches a coherent, proven state — validated through 6 epics of real spec work and iterative operational refinement.

### Distribution

Plugin system removed entirely. Output is now a skill pack (`dist/skills/`) installable to `~/.claude/skills/` or `~/.agents/skills/`, plus a standalone markdown pack for paste-into-chat use. No plugin.json, no marketplace, no router command.

### Added

- **`ls-prd` skill:** Shape product direction into a structured PRD with epic breakdown and optional Technical Architecture document. Replaces `ls-research` as the upstream entry point. The PRD operates at 50k-30k feet with rolled-up ACs (not line-level). The tech arch companion establishes "what technical world the epics must live inside." Both artifacts feed `ls-epic` and the full pipeline.

- **`ls-subagent-impl` skill:** Orchestrate implementation with Claude Code subagents using staged TDD. Four-phase cycle: red scaffold (Opus) → red verify (Sonnet) → green implementation → full verification. Commit after red phase creates a locked test contract baseline. Green-phase test diff protocol catches assertion weakening.

### Changed

- **`ls-team-spec` rebuilt:** Complete rebuild as procedural learning architect with contextual pedagogy. The orchestrator designs learning journeys for teammates, delivers guidance at the point of action (not front-loaded), and constructs handoff prompts using three-phase structure: objective framing → reading journey with reflection → skill activation (loaded last). Includes prompt map with concrete prompts for 7 roles, core/foundational spec tagging for continuity scaling, question curation filter, dependency research gate, and human scrutiny gradient (more involvement upstream, less downstream).

- **`ls-team-impl` rebuilt:** Replaced with external CLI orchestration (was `ls-team-impl-c`). Requires Codex or Copilot CLI — no fallback mode. Hard skill reload per story to combat context drift. Materialized handoff templates written to log for recall durability. Explicit state model for mid-story reload recovery. Boundary inventory tracking across stories. Epic-level four-model verification with meta-reports.

- **`ls-tech-design` refined:** Multi-doc output standardized to 2-doc (index + test plan) or 4-doc (+ frontend/backend companions). Never 3. Spec validation deviation table taught as first-class pattern ("Resolved — deviated", "Resolved — clarified"). Dependency/version grounding via web research required. Verification scripts introduced in phase source. Test count reconciliation step. Actor-reading-stage-directions cleaned up — altitude labels removed from template headings, methodology commentary marked as writer guidance.

- **`ls-publish-epic` refined:** Individual story files (one per story in `stories/` folder) instead of monolithic output. Business epic optional (user chooses at start). Coverage artifact (`stories/coverage.md`) with coverage gate table and integration path trace.

- **`ls-epic` refined:** Stack-neutral data contracts — documentation tables instead of language-specific syntax. Epic size and scope check checkpoint for large epics.

### Removed

- **`ls-research` skill:** Superseded by `ls-prd`.
- **Plugin system:** plugin.json, marketplace.json, individual plugins, router command (`/liminal-spec`), marketplace source directories.
- **Senior engineer agent:** Dropped from distribution. Implementation skills reference it as optional ("if available, otherwise Opus").

---

## v0.9.0 (2026-03-06)

Pipeline simplification: publish-epic replaces story sharding + tech enrichment. Implementation handled by external orchestration.

### Added

- **`ls-publish-epic` skill (Phase 4):** Takes a validated detailed epic and produces two handoff-ready artifacts — a PO-friendly business epic (grouped ACs, prose data contracts, Jira section markers) and a developer story file (full AC/TC detail per story, Technical Design sections, Jira section markers). Stories first, then business epic — bottom-up compression preserves fidelity.

### Removed

- **`ls-story` skill (Phase 4):** Story sharding is now handled by `ls-publish-epic`, which produces stories directly from the detailed epic.
- **`ls-story-tech` skill (Phase 4b):** Story technical enrichment eliminated. Developers receive stories with relevant contracts plus the tech design as a separate reference document.
- **`ls-impl` skill (Phase 5):** Implementation is handled by external orchestration tooling (`ls-team-impl`, orchestrator-mvp scripts, or direct developer workflow), not a spec skill.

### Changed

- **Full pipeline simplified:** `ls-epic → ls-tech-design → ls-publish-epic` (was `ls-epic → ls-tech-design → ls-story → ls-story-tech → ls-impl`).
- **`ls-team-spec`:** Phases 3-5 (story sharding, tech enrichment, final verification) replaced with Phase 3 (publish epic) and Phase 4 (final verification). Skill references updated throughout.
- **`ls-team-impl`:** Removed `/ls-impl` fallback reference. Solo implementation uses stories + tech design directly.
- **`lss-tech`:** Removed `ls-impl` from simple pipeline flow description. Removed `ls-story-tech` format references.
- **`lss-story`:** Updated escalation gate to reference new pipeline shape.
- **Router command:** Updated phase table and routing logic for 4-phase pipeline.
- **Plugin count:** 8 skills (was 10), 5 individual plugins (was 6).

## v0.8.1 (2026-03-02)

Team orchestration hardening and release discipline updates. `ls-team-impl` and `ls-team-spec` now enforce Codex participation with lightweight mechanical controls while preserving pragmatic execution flow.

### Added

- **Control Contract (hard invariants) for team orchestration:** Both `ls-team-impl` and `ls-team-spec` now define three non-negotiable invariants: no accept/transition without Codex evidence reference, no unresolved Codex findings without explicit disposition (`fixed`, `accepted-risk`, `defer`), and no silent degradation when Codex fails.
- **Verification gate discovery (project-specific):** Both team skills now require upfront discovery of project verification gates from policy sources (`CLAUDE.md`, `AGENTS.md`, README, scripts, CI config), with explicit logging and one-time clarification from the human when ambiguous.
- **Pre-acceptance receipts:** Story/phase acceptance now requires a short receipt including Codex evidence reference, top findings + dispositions, exact gate command/check summary, and open risks.
- **Process interrupt mode:** Added explicit `PAUSED_PROCESS_REVIEW` behavior to both skills for human process feedback interrupts (stop dispatches, stop commit/acceptance, diagnose, resume only on explicit instruction).
- **Phase/story cadence discipline:** Added explicit checkpoint boundaries to prevent same-turn close-and-dispatch churn at transitions.

### Changed

- **Skill loading semantics corrected:** Team skills now explicitly require Skill tool loading (`Skill(...)`) rather than “read skill file” language for Codex/Copilot/prompting and phase skills.
- **Codex model selection made explicit:** Default model for routine Codex/Copilot implementation and verification is now `gpt-5.3-codex`. `gpt-5.2` is reserved for parallel multi-verifier diversity passes.
- **Post-synthesis autonomy tightened:** Team orchestrators now auto-dispatch clear must-fix/should-fix items by default and only pause for human approval when scope, requirement intent, or release risk profile would change.
- **Verification command wording clarified:** Team skills now require running discovered project gates directly (story/phase and final/epic), replacing generic “format/lint/typecheck/tests” phrasing as the acceptance standard.
- **Router wording alignment:** Team rows in `/liminal-spec` now explicitly describe Codex-fenced team orchestration.

---

## v0.8.0 (2026-03-01)

Team orchestration. Two new skills for orchestrating multi-agent work in tmux — `ls-team-impl` for story-by-story implementation and `ls-team-spec` for the full spec pipeline from orientation through technically enriched stories.

### Added

- **`/ls-team-impl` skill:** Team implementation orchestration for the team lead / orchestrator role. Covers: dependency lane detection (Codex/Copilot/Sonnet fallback), implementer handoff with iterated self-review, dual verification (fresh reviewer + Codex in parallel), orchestrator final check, story transition with regression tracking, epic-level four-model verification with meta-reports, and operational patterns (idle notification noise, context ceilings, forgot-to-report, sequencing). Named orchestration log (`team-impl-log.md`). Distilled from real orchestration logs during multi-story agent team implementation.
- **`/ls-team-spec` skill:** Team spec orchestration for the team lead / orchestrator role. Covers: orientation and pre-epic documentation, phased artifact creation (epic → tech design → story sharding → story technical enrichment), reusable verification pattern (author self-review + Opus/Codex dual verification with iterative fix loops), five-phase final story verification (per-story + cross-story coherence), escalation handling, and operational patterns. Skill loading per phase ensures all teammates work from the correct methodology. Named orchestration log (`team-spec-log.md`).

### Changed

- **Router command updated:** New "Team Orchestration" section routes to `/ls-team-impl` and `/ls-team-spec` for agent team implementation and spec pipeline orchestration.
- **CI marketplace check widened:** `git diff` now checks all `plugins/` directories, not just `plugins/liminal-spec`.

---

## v0.7.0 (2026-02-27)

Simple pipeline and story technical enrichment overhaul. Two new skills (`lss-story`, `lss-tech`) provide a streamlined path for story-sized work with the same rigor as the full pipeline. The `ls-story-tech` skill is substantially rewritten to require tech design sharding into stories rather than thin summaries.

### Added

- **Simple pipeline:** `lss-story` and `lss-tech` -- a two-phase pipeline for story-sized work that doesn't warrant a full epic/tech-design/sharding cycle. Same quality bar, fewer phases. `lss-story` produces a functional story with epic-quality ACs/TCs. `lss-tech` performs inline technical design (codebase analysis, architecture, interfaces, test planning) and embeds the results directly in the story.
- **`/lss-story` skill (Simple S1):** Story-sized epic. Produces a single functional story with full acceptance criteria, test conditions, data contracts, scope boundaries, and error paths. Includes escalation gate -- if scope exceeds story-sized thresholds, directs to the full pipeline.
- **`/lss-tech` skill (Simple S2):** Story-sized tech design + enrichment. Design-then-embed workflow: codebase analysis, inline technical design, then embed in story format. Introduces Provenance & Deviation section (replaces Spec Deviation for simple pipeline -- documents codebase files analyzed, patterns adopted, and deviations from existing patterns). Includes escalation gate for technical complexity.
- **Individual plugins for `lss-story` and `lss-tech`:** Both available as standalone installable plugins in the `liminal-plugins` marketplace, plus standalone markdown files and inclusion in skill/markdown pack zips.
- **Non-TC Decided Tests section** in `ls-story-tech`: Tests decided in the tech design that aren't 1:1 with a TC (edge cases, collision tests, integration tests) must now be carried forward into each story. Prevents orphaned tests that the implementer would have to discover independently.
- **Tech Design Sharding concept** in `ls-story-tech`: New section establishing that technical enrichment shards the tech design into stories the same way story sharding distributes ACs/TCs. Enrichment is curation (selection + inclusion), not compression (summarization).
- **Tech design chunk enrichments** in `ls-tech-design`: Chunk template now includes "Relevant Tech Design Sections" (heading references for enrichment) and "Non-TC Decided Tests" fields. Handoff checklist updated accordingly.
- **Simple pipeline routing** in `/liminal-spec` command: Router now presents both pipelines and routes to `lss-story`/`lss-tech` based on user intent.

### Changed

- **`ls-story-tech` substantially rewritten:**
  - Architecture Context: replaced "focused extract, not a repeat" with "story-scoped tech design shard via curation." Examples expanded from 4-line snippets to substantial module tables, flow diagrams, and error handling.
  - Interfaces & Contracts: now requires full type definitions and function signatures, not thin listings.
  - TC to Test Mapping: added "no test-plan guessing" rule. Implementer should never derive test approaches the tech design already decided.
  - Spec Deviation: now requires citing checked tech design sections by heading name. Empty deviations without citations fail the quality gate.
  - Story Contract Requirements: expanded from 4 to 6 (added: tech design shard present, non-TC decided tests present; strengthened spec deviation to require citations).
  - Consumer Gate: strengthened from "without asking clarifying questions" to "without reading the full tech design."
  - Verification Prompt: expanded from 7 to 9 evaluation criteria (added: tech design shard completeness, non-TC test coverage).
  - New failure modes: "Over-compressed tech sections" and "Missing non-TC decided tests."
- **`ls-story` updated:** "What a Story Is NOT" section clarified pre-enrichment vs post-enrichment lifecycle. Functional stories are deliberately non-technical; post-enrichment stories are self-contained implementation artifacts.
- **`ls-impl` updated:** Story is now primary and usually sufficient guide. Tech design shifted from routine reading (step 2) to conditional fallback for ambiguity/rationale. Mismatch between story and tech design triggers stop-and-flag.
- **Shared `verification-model.md` updated:** Enriched stories checklist expanded from 4 to 6 items. "All four" references updated to "all six." Consumer gate wording updated throughout.
- **CLAUDE.md updated:** 8 skills, simple pipeline, individual plugins, updated plugin sync paths.
- **AGENTS.md updated:** Repository map includes simple pipeline phase files, plugin sync covers all individual plugin directories.
- **README rewritten:** Both pipelines with equal billing, quick start example, compatibility section, value proposition, solo developer setup, expanded markdown/skill pack tables.

### Test Changes

- 51 tests (up from 47). New assertions cover: `lss-story` and `lss-tech` standalone files, individual plugin directories, marketplace entries, and skill content guardrails.

---

## v0.6.0 (2026-02-25)

Individual skill plugins. Each mid-pipeline phase is now available as a standalone Claude Code plugin, installable separately from the full suite. Teams can assign phases to roles -- BAs install `ls-epic`, Tech Leads install `ls-tech-design` -- without pulling the entire methodology.

### Added

- **Individual skill plugins:** `ls-epic`, `ls-tech-design`, `ls-story`, and `ls-story-tech` are each published as standalone plugins in the `liminal-plugins` marketplace. Each contains a single self-contained skill with the same composed content as the full suite. No agents or router commands -- skill only.
- **`individualPlugins` manifest key:** Declares which skills get standalone plugin packaging. Supports optional `agents` array for bundling agents with specific plugins.
- **Build: individual plugin generation.** Build script creates `dist/individual/{name}/` with `.claude-plugin/plugin.json` and `skills/{name}/SKILL.md` for each declared individual plugin. Syncs to `plugins/{name}/` for marketplace resolution.
- **Validation: individual plugin checks.** Validates plugin.json name/version, SKILL.md frontmatter, bundled agents if declared, and absence of commands directory.
- **9 new integration tests** covering individual plugin structure, content identity with full suite, and absence of commands/agents.
- **Root marketplace.json** now lists 5 plugins (1 full suite + 4 individual). Generated by the build from manifest data.

### Changed

- **Senior engineer agent:** TDD reframed from "you follow TDD rigorously" to "your default approach is TDD" with explicit flexibility for prototyping, debugging, and small patches. New Component Development collapsed from rigid Phase 1/2/3 numbered gates to prose descriptions of Skeleton/Red/Green/Refactor as a preferred approach. `NotImplementedError` aligned as primary stub convention (matching `/ls-impl`). Quality Gate Protocol, TypeScript Best Practices, and Debugging Protocol unchanged.
- **`generatePluginJson`** now accepts name and description parameters (was hardcoded to `liminal-spec`).
- **`generateMarketplaceJson`** now accepts a source prefix and individual plugins map, generating entries for all plugins in one pass.
- **Marketplace source validation** generalized from single hardcoded `liminal-spec` check to iterating all plugin entries in marketplace.json.
- **README rewritten:** Installation section expanded with full suite vs. individual plugin commands, team role mapping, and à la carte examples.

---

## v0.5.1 (2026-02-25)

Senior engineer agent aligned with v0.5.0's less prescriptive stance on implementation process.

### Changed

- **Senior engineer agent:** TDD stance and component development process softened. See v0.6.0 for the full description (changes were folded into the v0.6.0 release).
- **README:** Execution SOP and agent description updated.

---

## v0.5.0 (2026-02-24)

Stories become the sole implementation artifact. Prompt packs and execution orchestration are removed. A new skill (ls-story-tech) splits technical enrichment from functional sharding. The pipeline is now: functional stories (BA/SM) -> technical enrichment (Tech Lead) -> implementation (Engineer).

### Added

- **`/ls-story-tech` skill (Phase 4b):** Tech Lead adds technical sections to functional stories -- architecture context, interfaces & contracts, TC-to-test mapping, risks & constraints, spec deviation field, and technical DoD.
- **Story contract requirements:** Four non-negotiable requirements for technically enriched stories: TC-to-test mapping, technical DoD, spec deviation field, targets not steps.
- **Consumer gate:** "Could an engineer implement from this story without clarifying questions?" -- the quality bar for complete stories.
- **Coverage gate:** Table mapping every AC/TC to a story number. Unmapped items block handoff.
- **Story technical enrichment verification prompt:** `src/examples/story-tech-verification-prompt.md` for external validation of technically enriched stories.

### Changed

- **`/ls-story` rewritten:** Now produces functional stories only (ACs, TCs, scope, error paths, functional DoD). Prompt pack creation, orchestration, and TDD principles in prompts removed. ~660 lines -> ~280 lines.
- **`/ls-impl` rewritten:** Now story-driven and plan-mode compatible. Engineers implement from complete stories with TDD discipline. Execution orchestration (~400 lines) removed. "Plan Before You Build" section added. Self-review framed as recommended practice, not orchestrated mandate. ~792 lines -> ~340 lines.
- **`/ls-tech-design` updated:** Orchestrator references replaced with BA/SM and Tech Lead as downstream consumers.
- **Tech design template updated:** Prompt-era assumptions replaced with story-driven terminology.
- **Tech design verification prompt updated:** Downstream consumer description, chunk breakdown, and agent readiness sections reframed for the two-phase story process.
- **Verification model updated:** Orchestrator/prompt references removed. Checkpoints updated for functional stories -> technically enriched stories -> implementation flow.
- **Terminology updated:** Story definition expanded to include functional + technical sections. Story Contract and Consumer Gate terms added. Prompt Pack definition removed. Lite Mode anti-pattern removed. Dual-Validator Pattern noted as optional.
- **Model selection simplified:** Prescriptive model-to-task table removed. General principle retained: match model strengths to task requirements.
- **Senior engineer agent:** Model reference updated from Opus 4.5 to Opus 4.6.
- **Router command:** Phase 4b added to phase table and routing logic. Phase descriptions updated.
- **README rewritten:** Pipeline table, key ideas, commands, skill pack listing, markdown pack table, and execution SOP updated for story-driven model.
- **CLAUDE.md updated:** Plugin structure, skills table, and descriptions updated for 6 skills.

### Removed

- **Prompt pack creation** from `/ls-story` (~350 lines of prompt philosophy, shared context blocks, phase-specific task sections, prompt validation, and file structure).
- **Execution orchestration** from `/ls-impl` (~400 lines of pipeline, dual-validator pattern, fix cycle, agent selection, session management, human decision points, parallel pipeline, anti-patterns, and execution checklist).
- **Prompting reference files from build:** `prompting-opus-4.6.md` and `prompting-gpt-5x.md` removed from manifest shared arrays. Files kept in `src/shared/` as reference material.
- **Prompt Pack** artifact definition from terminology.
- **Lite Mode** anti-pattern from terminology.

### Migration

- `/ls-story` no longer produces prompt packs. Use `/ls-story-tech` to add technical sections to functional stories.
- `/ls-impl` no longer includes execution orchestration. Engineers implement from complete stories using plan mode and TDD discipline.
- Prompt-era references in project docs should be updated to story-driven terminology.

---

## v0.4.1 (2026-02-23)

Story Sharding adds a dual-model verification gate and shim/fudge audit. Release artifacts consolidated from individual files to two versioned packs. README and changelog rewritten for clarity.

### Added

- **Pre-execution verification gate:** All stories and prompt packs go through a dual-model pass with fix cycles before execution begins.
- **Shim/fudge audit in verification:** Per-story verify now flags temporary shims, placeholder behavior, and internal-module mocking bypasses.

### Changed

- **Standalone packaging:** Build emits two packs instead of per-skill `.skill` zips:
  - `liminal-spec-skill-pack.zip` -- installable skill directories
  - `liminal-spec-markdown-pack.zip` -- paste-into-chat markdown files
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

## v0.3.1 -- Router Layout Readability (2026-02-17)

### Changed

- Restored `/liminal-spec` router phase matrix to a compact 3-column layout (`Phase`, `Skill`, `Start Here If...`) for terminal readability.
- Removed `Entry`/`Exit` router columns and kept current `ls-*` command names.
- Preserved existing router guidance text; presentation fix only.

---

## v0.2.0 -- Plugin Restructure (2026-02-14)

Restructured from a single progressive-disclosure skill into a composable plugin with build pipeline.

### Architecture

- **Source-based composition:** Content now lives in `src/` as modular source files. A build script (`scripts/build.ts`) composes them into self-contained skills via `manifest.json`.
- **Plugin packaging:** Output is a Claude Code plugin (`dist/plugin/`) with per-phase skills, a router command, senior-engineer agent, and marketplace metadata.
- **Standalone distribution:** Parallel output (`dist/standalone/`) produces paste-ready markdown files for non-Claude-Code users (BA/PO using Enterprise Chat).
- **No progressive disclosure:** Each composed skill contains all content needed for its phase -- no separate reference file loading required.

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

- `bun run build` -- compose source into dist/
- `bun run validate` -- validate output structure and frontmatter
- `bun test` -- integration test suite
- GitHub Actions: PR validation and tag-triggered artifact publishing

### Removed

- Old monolithic SKILL.md (replaced by router command + per-phase skills)
- Progressive disclosure reference files (content now inlined by build)
- deploy.sh (replaced by CI/CD)
- V2-ROADMAP.md (completed)

### Phase 1 Status

- Phase 1 (Product Research) is available as `/ls-research`

---

## Prior History (v1 -> v1.x)

Liminal Spec started as a single SKILL.md file -- one document covering all phases, loaded whole into context. The methodology evolved through several rounds of refinement as real usage exposed what worked and what didn't.

### Early structure

The initial versions established the core pipeline (BA -> Tech Lead -> Scrum Master -> Senior Engineer -> Verifier) and the confidence chain (AC -> TC -> Test -> Code). Phase execution, mock-at-API-boundary testing, and state management were solid from early on. The Product Owner phase existed but was marked "often skipped" -- most work entered at the BA phase with requirements already in hand.

### Conceptual clarifications

Several rounds of real-world use surfaced concepts that the early versions either missed or left implicit:

- **Agents = context isolation, not roleplay.** The original framing suggested "personas" -- be the BA, be the Tech Lead. In practice, what mattered was fresh context windows with artifact handoff. The role labels were convenient shorthand, but the mechanism was context isolation. This distinction was made explicit throughout.

- **Verification gradient.** Upstream phases deserve more scrutiny because errors cascade. The feature spec gets the most review because if it's wrong, everything downstream is wrong. This was implicit in the pipeline design but never stated as a principle.

- **Feature spec hierarchy.** User Profile -> Flows -> ACs -> TCs isn't just a template -- it's a cascade where each level depends on the one above. You can't write a good TC without a clear AC. You can't write a good AC without understanding the flow. Making this dependency chain explicit changed how specs were written.

- **Spiral writing style for tech designs.** Tech designs that descended linearly (system -> module -> interface) produced thin context that agents struggled with. The spiral pattern -- functional / technical, high / low, revisiting topics from multiple angles -- created redundant connections that both humans and models could navigate. This became a core writing principle.

- **Multi-agent validation.** Using a single model to both write and validate an artifact missed things. The author + downstream consumer + different model pattern caught more issues. This became the dual-validator pattern used throughout.

- **Gorilla testing.** Ad-hoc manual testing between TDD Green and formal verification was happening informally. Making it a named phase legitimized unstructured exploration within the structured process -- a recognition that humans catch things automation doesn't.

### Structural shift (v1.x -> v0.2.0)

The single-file approach hit practical limits. Skills exceeded reasonable context sizes, shared concepts were duplicated across sections, and updating one concept meant finding every place it appeared. The v0.2.0 restructure moved to source-based composition: modular source files in `src/`, a build that composes them per `manifest.json`, and self-contained output per phase. The conceptual work from v1.x carried forward intact -- the restructure changed packaging, not methodology.
