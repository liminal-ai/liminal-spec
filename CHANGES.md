# Pending Changes (next release)

Scratch pad for tracking changes as we go. Will be consolidated into CHANGELOG.md at release time.

---

### Stack-neutral data contracts (214114b)

**What changed:** Data contracts in epics and stories now use documentation tables (endpoints, field/type/validation tables, error response tables) instead of language-specific syntax (TypeScript interfaces, Zod schemas). Contracts scoped to significant system boundaries (frontend-to-backend, app-to-external) rather than internal layer contracts.

**Files touched:**
- `src/phases/epic.md` — "When Technical Detail Is Appropriate" reframed, Data Contracts section replaced with doc-table example, template updated, validation gates updated
- `src/phases/story-simple.md` — Same reframe, contract example replaced (now includes success response), validation gates updated
- `src/phases/publish-epic.md` — Removed TypeScript references in story structure, "removed/transformed" lists, validation checklist
- `src/phases/team-spec.md` — Updated business epic validation wording
- `src/templates/feature-spec.template.md` — Updated response types placeholder and validation checklist (not in build, consistency only)

**Why:** Epics are functional, stack-neutral documents. Code syntax (TypeScript interfaces, Zod schemas) is an implementation opinion that belongs in Tech Design. Documentation tables capture the same precision (field names, types, cardinality, validation rules) without locking into a language.

---

### Epic size and scope check (1049aac)

**What changed:** Added a scope check checkpoint after the Epic Structure section. When the agent estimates an epic will exceed ~800 lines (5+ major flows or 30+ expected ACs), it informs the user and offers to analyze requirements for natural splitting points (workflow boundaries, system boundaries, phased delivery). User can proceed with a single large epic if preferred — checkpoint, not a gate.

**Files touched:**
- `src/phases/epic.md` — New "Epic Size and Scope Check" subsection under "The Epic Structure"

**Why:** Large epics create downstream pressure — tech design consumes the full epic as input context, validation quality degrades with length, and internal consistency becomes harder to maintain. Catching this early gives the user the option to split before sinking effort into a massive single artifact.

---

### Individual story files + optional business epic (6002d5f)

**What changed:** `ls-publish-epic` now writes each story to its own numbered file in a `stories/` folder (`00-foundation.md`, `01-[name].md`, etc.) instead of one monolithic story file. The business epic is now optional — the skill presents the user with the choice (stories only, or stories + business epic) before starting work.

**Files touched:**
- `src/phases/publish-epic.md` — New "What This Produces" section with user choice, Step 1 writes individual files, Step 2 conditional on user choice, validation split into story-only and business-epic items, all references updated for individual files
- `src/phases/team-spec.md` — Updated all publish-epic references throughout drafting, verification, handoff, and final verification phases for individual story files and optional business epic
- `manifest.json` — Updated skill and individual plugin descriptions
- `scripts/__tests__/build.test.ts` — Updated content assertion for renamed heading

**Why:** Monolithic story files required a separate step to break into individual files and re-validate. Individual files from the start eliminates that rework. Business epic is not always needed — many workflows go straight from stories to implementation without a PO-facing roll-up.

---

### Standalone/team-spec coherence fixes (885a961)

**What changed:** Fixed three verifier findings from the publish-epic changes: added non-filesystem fallback mode (single document output when filesystem access isn't available), persisted coverage gate and integration path trace as `stories/coverage.md` instead of ephemeral chat output, and updated stale references in the router, terminology, and README.

**Files touched:**
- `src/phases/publish-epic.md` — Dual-mode output (filesystem vs single document), coverage artifact persistence
- `src/phases/team-spec.md` — Updated all references to coverage artifact as durable handoff artifact
- `src/commands/liminal-spec.md` — Updated phase table and routing guidance
- `src/shared/terminology.md` — Updated Publish Epic and Data Contract definitions
- `README.md` — Updated 6 references across quick-start, phase table, descriptions, and standalone pack table

**Why:** The publish-epic changes broke standalone-chat compatibility (assumed filesystem), made verification artifacts ephemeral (coverage gate lost between sessions), and left stale descriptions in user-facing docs.

---

### ls-team-impl-c — Agent teams with external CLI (b497cab)

**What changed:** New implementation orchestration skill for agent teams with Codex or Copilot CLI. Built from operational feedback across 5 epics in 2 projects. Replaces the fallback-lane approach in `ls-team-impl` with a dedicated skill that requires an external CLI model — no fallback, no degraded mode.

**Key additions over ls-team-impl:**
- **Mandatory skill reload per story** — hard requirement to combat context drift, with consequence-based explanation (not caps/ceremony)
- **Explicit state model** — log carries `SETUP`, `BETWEEN_STORIES`, `STORY_ACTIVE`, `PRE_EPIC_VERIFY`, `COMPLETE` states
- **External model failure protocol** — 3-strike retry rule when teammates claim CLI unavailable, immediate teammate replacement if they substitute their own verification
- **Materialized handoff templates** — implementer and reviewer templates written to log during On Load, re-read before each dispatch (converts recall into reference)
- **Sequential reading with reflection** — explicit read order based on information dependencies, reflection checkpoint after spec documents
- **Boundary inventory** — tracks external service dependency status at every story transition
- **Pre-verification cleanup pass** — compile and fix deferred/accepted-risk items before epic verification
- **Discuss before dispatch** — present findings, discuss with user, get direction, then dispatch (not auto-dispatch)
- **Orchestrator never touches code** — absolute prohibition with routing rules for fixes
- **Item list materialization** — write fix lists to file before constructing handoff prompts to prevent context-distance drops

**Build system:**
- New `references` field in manifest.json and SkillEntry type
- Build copies reference files to plugin output (`skills/{name}/references/`)
- Build includes references in skill-pack zips
- Build concatenates reference content into standalone markdown output
- Standalone skill text uses dual-mode reference loading ("if available, or in the appended reference section below")

**Files touched:**
- `src/phases/team-impl-c.md` (new, 486 lines)
- `src/references/team-impl-c/epic-verification.md` (new, ~120 lines)
- `manifest.json` — new skill entry with references field
- `scripts/build.ts` — SkillEntry type updated, reference file handling in build loop
- `scripts/__tests__/build.test.ts` — new skill in all expected lists, content assertions, reference file test
- `src/commands/liminal-spec.md` — router updated with new skill
- `plugins/liminal-spec/` — marketplace source synced

**Why:** The original ls-team-impl treated the Sonnet-only path as a degraded fallback. In practice, users either have an external CLI or they don't — the process is fundamentally different. Splitting into dedicated skills eliminates "if Codex... if Sonnet-only..." branching and lets each skill be optimized for its coordination model. All changes are grounded in specific failures from operational feedback logs.
