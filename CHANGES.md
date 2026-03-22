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

---

### ls-team-impl-c refinements — autonomy, state model, inlined verification (d303045)

**What changed:** Major refinements to ls-team-impl-c based on operational feedback review and skill design principles discussion.

- **Autonomy objective** replaces "discuss before dispatch" — goal-oriented forward progress with blocker examples, not universal stop-and-ask behavior
- **State model tightened** — STORY_ACTIVE now tracks implementing/reviewing phase for mid-story reload recovery
- **Epic verification inlined** — removed progressive disclosure reference file, full 4-phase protocol now in the main SKILL.md
- **Single-story flow explicit** — skips pre-verification cleanup and epic verification when only one story
- **Pre-verification cleanup** aligned with autonomy objective (present batch, not discuss each item)
- **"Large Fix Batches Need Human Eyes"** replaces the overly broad "Discuss Before Dispatch" gotcha

**Files touched:**
- `src/phases/team-impl-c.md` — all changes above
- `plugins/liminal-spec/skills/ls-team-impl-c/references/epic-verification.md` — removed
- `plugins/liminal-spec/skills/ls-team-impl-c/SKILL.md` — rebuilt

**Why:** "Discuss before dispatch" was an overgeneralized rule from one failure (auto-dispatching 16 fixes) that got promoted to a universal behavior. It conflicted with the skill's purpose of autonomous orchestration and caused the orchestrator to stop at routine transitions asking permission. The Anthropic skill-writing guidance ("avoid railroading") and operational feedback both pointed to replacing low-level control rules with a goal-oriented autonomy objective.

---

### ls-subagent-impl-cc — Claude Code subagent orchestration with staged TDD (b320e13)

**What changed:** New implementation orchestration skill for Claude Code subagents without external CLI. Designed as the Claude-only complement to ls-team-impl-c.

**Key features:**
- **Four-phase TDD cycle:** red scaffold (Opus) → red verify (Sonnet) → green implementation (senior-engineer/Opus) → full verification (Opus + Sonnet)
- **Commit after red phase** creates a locked test contract baseline
- **Green-phase test diff protocol** — diffs test files against red baseline, categorizes changes (legitimate correction, assertion weakening, scope shift, etc.), investigates suspicious changes
- **Opus/Sonnet role separation** — Opus for broad implementation and architecture review, Sonnet for strict red-phase verification and pedantic spec compliance
- **Five materialized prompt templates** — concrete prompt bodies for each phase written to log during On Load
- **Same orchestration infrastructure** as ls-team-impl-c: skill reload, autonomy objective, state model, boundary inventory, logging discipline

**Build system:**
- New manifest entry, standalone name mapping, router routing
- 70 tests total (2 new content assertions)

**Files touched:**
- `src/phases/subagent-impl-cc.md` (new, 589 lines)
- `manifest.json` — new skill entry
- `scripts/build.ts` — standalone name mapping
- `scripts/__tests__/build.test.ts` — new skill in expected lists, content assertions
- `src/commands/liminal-spec.md` — router updated
- `plugins/liminal-spec/` — marketplace source synced

**Why:** Users without Codex/Copilot CLI need an implementation orchestration path. The Claude-only approach compensates for the lack of cross-model-family diversity by using Opus and Sonnet in differentiated roles (broad vs pedantic) and by adding the TDD red-phase separation — a structural integrity mechanism that catches test weakening before implementation begins.

---

### ls-team-impl-c — additional refinements (included in d303045)

**What changed:** Additional refinements folded into the d303045 commit — mid-review recovery phase tracking (STORY_ACTIVE distinguishes implementing vs reviewing) and per-file reflection instructions in both handoff templates ("stop and reflect on what you learned before reading the next file").

---

### ls-tech-design refinements — multi-doc standard, deviation table, grounding, stage-directions cleanup

**What changed:** Comprehensive refinements to the tech design skill based on operational feedback from building 6 epics' worth of tech designs in the md-viewer project.

**Multi-doc output standardization:**
- Two configurations: Config A (2 docs: index + test plan) or Config B (4 docs: index + frontend companion + backend companion + test plan). Never 3.
- Trigger for Config B is index density approaching ~1200-1500 lines. Companion docs named by project domain boundaries, not prescribed labels.
- Test plan is always a separate document. If the work doesn't justify a test plan with TC traceability, this skill isn't the right tool — downshift to plan mode.
- Config A/B annotations added throughout the template marking what stays in the index vs moves to companions.

**Spec validation deviation table:**
- Template now teaches both pre-design validation issues and design-time deviations ("Resolved — deviated", "Resolved — clarified").
- Deviations with documented rationale are accepted design decisions; deviations without rationale look like bugs. This pattern significantly reduced verifier churn when used in real outputs.

**Dependency and version grounding:**
- Phase source now prescribes that version/dependency choices must be grounded by current web research, not training data. Includes the Stack Additions table pattern (package, version, purpose, research confirmed) and rejected-package documentation.

**Verification scripts introduction:**
- Phase source now introduces the verification scripts concept (red-verify, verify, green-verify, verify-all) before the agent encounters the template's full section.
- Fixed placeholder script guidance: placeholders output "SKIP: suite not yet implemented" rather than silently passing.

**Test count reconciliation:**
- Phase source now includes a known-trap section: after completing the test plan, do a mechanical reconciliation pass (per-file → per-chunk → index summary). One pass, three cross-checks.

**Actor-reading-stage-directions cleanup:**
- Template headings cleaned: "High Altitude: System View" → "System View", etc. Altitude guidance kept as italic ✏️ inline instructions.
- Added early warning in the template explaining that methodology commentary (✏️ markers, altitude references, spiral pattern mentions) is instruction to the writer, not content for the output document.
- Phase source altitude model section updated to match (no longer claims template uses altitude labels in headings).
- All inline methodology commentary (Connection Checks, repetition explanations) reformatted as italic ✏️ guidance blocks.

**Module responsibility matrix:**
- Template now shows both NEW and MODIFIED modules in the example, with Status column distinguishing them.

**Files touched:**
- `src/phases/tech-design.md` — Output Structure section (replaces 3-bullet list), Dependency and Version Grounding section, Verification Scripts section, Test Count Reconciliation section, altitude model wording update
- `src/templates/tech-design.template.md` — Config A/B output structure table, Config A/B section annotations, deviation table pattern, module matrix with MODIFIED rows, stage-directions warning, cleaned headings, italicized methodology commentary, placeholder script fix, self-review checklist update

**Why:** The real tech design outputs across 6 epics established patterns (deviation tables, 4-doc split, web-researched versions) that the skill didn't teach. First-time users or first epics in new projects would miss these patterns because they had no prior artifacts to learn from. These changes encode what emerged operationally so the skill produces high-quality output from the first run, not just after several iterations.

---

### ls-prd — new upstream PRD + Tech Architecture skill

**What changed:** New skill for producing Product Requirements Documents and optional Technical Architecture documents. The upstream artifact that feeds ls-epic and the full Liminal Spec pipeline.

**Key features:**
- **PRD output** — product context (vision, user profile, problem, principles, scope, NFRs), features as lightweight epics with rolled-up ACs, milestones, epic sequencing, cross-cutting decisions, future directions
- **Tech Architecture output** (optional companion) — architecture thesis, core stack table with versions, system shape and ownership, boundaries and flows, cross-cutting technical decisions with choice/rationale/consequence, constraints that shape epics, open questions for tech design, relationship to downstream
- **Altitude discipline** — the skill's core teaching: PRD operates at 50k-30k feet, tech arch at 50k-25k feet, with explicit stopping boundaries. The rolled-up vs line-level AC distinction is the key calibration mechanism.
- **On Load choice** — PRD only, Tech Arch only, or both. Recommended together for new products.
- **Common Feature Section Failures** — five named gotchas (feature wishlist, premature precision, vague scope, missing out-of-scope, implementation leaking in)
- **Full templates** for both PRD and Tech Architecture documents
- **Advisory tone guidance** for tech arch — counteracts models' natural authoritative bias at this altitude

**Design decisions:**
- One skill for both artifacts (they inform each other in real time during creation)
- md-viewer PRD as the gold standard for output shape
- Tech arch's driving statement: "what technical world the epics must live inside"
- PRD cross-cutting decisions are product/design level; tech arch cross-cutting decisions are technical level
- Core stack table includes versions where they change available patterns (React 18 vs 19, Node 22 vs 24)

**Build system:**
- New manifest entry (no shared dependencies), standalone name mapping (`00-prd`), router updated with Phase 0
- 72 tests total (2 new content assertions for ls-prd)

**Files touched:**
- `src/phases/prd.md` (new, ~608 lines)
- `manifest.json` — new skill entry
- `scripts/build.ts` — standalone name mapping
- `scripts/__tests__/build.test.ts` — new skill in expected lists, content assertions
- `src/commands/liminal-spec.md` — router updated with Phase 0

**Why:** Previously, upstream product framing required using ls-epic and manually de-specifying it (removing TCs, contracts, collapsing ACs). A dedicated skill aims directly at the right altitude and produces the artifacts that downstream spec orchestration needs without the rework. The tech arch companion prevents epics from being scoped against the wrong seams and tech designs from re-litigating foundational decisions across every epic.
