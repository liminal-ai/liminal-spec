# Current State Baseline

**Purpose:** Reconstruct the current functional and technical state of an implemented system from code, tests, runtime/config surfaces, and historical specs so a fresh spec agent can onboard without replaying every prior epic.

Historical epics and tech designs are point-in-time deltas. They describe what changed when they were written. After later implementation cycles ship, they are no longer the baseline for "what the system is now." This skill creates that missing baseline.

The output is not a changelog and not a rewrite of every historical epic. It is a cold-start handoff artifact: current behavior, current boundaries, current technical world, and the read path a new spec agent should follow before extending the system.

---

## On Load

This skill produces a **current-state baseline**. It works best when the repository has some Liminal Spec history, but mixed-origin systems are valid input. Earlier work may have been built before Liminal Spec, outside Liminal Spec, or with only partial artifacts. Use whatever historical material exists, but let current code, tests, and repo-visible runtime/config evidence decide what is true now.

Establish which situation you are in:

- **Refresh mode** -- current-state docs already exist and one or more new implementation cycles have shipped. Reconcile the new work against the prior baseline and update it.
- **Catch-up mode** -- no current-state docs exist, but the repo has historical epics, tech designs, stories, or related documentation. Reconstruct the baseline from those artifacts plus current implementation evidence.
- **Mixed-origin mode** -- some current capability areas were not created with Liminal Spec. Treat those areas as reverse-engineered current state. Do not invent original intent; document current behavior and mark low-confidence interpretation explicitly.

Before doing broad repo discovery, ask the user:

- **Is there a directory of specs, docs, or prior artifacts I should treat as the main documentation/spec root for this repo?**

If the user names one, start there.

If the user does not answer or does not know, inspect obvious candidate roots such as:

- `docs/`
- `specs/`
- `references/`
- `architecture/`
- any repo-specific docs/build/spec directories that appear early in the tree

Do not conclude that the repo has no spec history from one shallow file sweep. Absence of obvious files is not proof that no meaningful artifact tree exists deeper in the repo.

Before drafting, gather:

- Historical Liminal artifacts: PRDs, epics, tech designs, published stories, prior current-state docs if any
- Project evidence sources: `AGENTS.md`, `CLAUDE.md`, `README`, package scripts, CI config, test layout, dev docs
- Current implementation evidence: source directories, public entry points, tests, fixtures, manual launchers, runtime config, API contracts
- Human context only where evidence is materially ambiguous: which recent epics are actually implemented, which accepted spec packs are planned but not shipped, and whether any known capability areas are intentionally disabled or partial

If the user wants both current and planned views, produce **current state first**. Planned state is an overlay on top of the current baseline, not part of it.

---

## What This Produces

The output shape expands or contracts with system density. The skill's job does not change.

### Config A: Compact Baseline

Use when the system is still coherent as one functional artifact and one technical artifact.

- `current-state.md` -- Current functional baseline plus read path
- `current-state-tech-design.md` -- Current technical baseline
- `current-state-code-map.md` -- Current code reading map and guided read order
- `current-state-drift-ledger.md` -- Historical-to-current reconciliation log

### Config B: Baseline Pack

Use when a single functional doc would force a new agent to read through too many unrelated domains before they can place new work safely.

- `current-state-index.md` -- Current system overview, domain map, cross-domain flows, read path
- `current-state-[domain].md` -- One or more current functional domain docs
- `current-state-tech-design.md` -- Current technical baseline across the whole system
- `current-state-code-map.md` -- Current code reading map and guided read order
- `current-state-drift-ledger.md` -- Historical-to-current reconciliation log

### Optional Support Artifacts

Emit these when the repo is large enough that refreshability, machine-readable clustering, or downstream automation would benefit:

- `current-state-module-tree.json` -- machine-readable module/domain grouping and path map
- `current-state-doc-meta.json` -- generation metadata such as repo state, output shape, and refresh inputs

Default emission rule:

- emit `current-state-doc-meta.json` by default in refreshable repos
- emit `current-state-module-tree.json` only when code-area density or downstream automation need justifies it

**The trigger is onboarding density, not epic count.** Split into a pack when one doc would likely exceed ~1200-1500 lines, cover more than 5-6 top-tier capability domains, or require a fresh agent to scan multiple unrelated areas before they can understand where new work belongs.

Small systems may stay in Config A indefinitely. Large systems may need Config B early. A mature product does not need a new skill -- it needs the same skill to emit a broader pack.

### Config Selection Rule

Before drafting, explicitly declare:

- chosen config: `Config A` or `Config B`
- one-paragraph justification

In refresh mode:

- preserve the prior config and file layout by default
- only reclassify if there is a stated reason such as document bloat, domain split/merge, or prior onboarding failure

Do not silently change the artifact topology between runs.

---

## The Core Reset

The central reset in this skill is simple:

- A historical epic is a delta, not the baseline.
- A historical tech design is a point-in-time implementation plan, not the current architecture.
- The current baseline is whatever the implemented system now does and how it is now shaped.

After Epic 2 ships, Epic 1 is no longer "the state of the system before Epic 2" in a way a fresh agent can rely on. Later work may merge boundaries, rename surfaces, supersede flows, or alter technical structure. The current-state baseline exists so future spec work starts from implemented reality rather than from accumulated deltas.

Do not produce historical replay:

- Do not organize the baseline as "Epic 1, Epic 2, Epic 3..."
- Do not tell the reader to reconstruct reality by reading all prior spec packs
- Do not silently inherit historical requirements that code and tests no longer support

Organize by **current top-tier capability domains** and **current technical surfaces**. The baseline should reflect how the system is navigated now, not how work happened to be sequenced over time.

---

## Truth Model

This skill is evidence-bound. Historical documents matter, but current implementation evidence decides current state.

### Evidence Hierarchy

Weight evidence in this order:

1. **Current code at public seams** -- routes, screens, commands, jobs, event handlers, exported entry points, persisted contracts
2. **Current tests and repo-visible evidence** -- test names, fixtures, API mocks, integration/e2e suites, manual harnesses, package scripts, CI config
3. **Current runtime/config surfaces** -- package scripts, environment docs, health checks, migration files, setup instructions
4. **Historical current-state docs** -- if they already exist, use them as prior baseline input
5. **Historical Liminal artifacts** -- PRDs, epics, tech designs, stories, verification notes
6. **Other project docs** -- READMEs, architecture notes, onboarding docs, tickets
7. **Human clarification** -- only for ambiguity that code and docs cannot settle safely

### Conflict Rules

When evidence conflicts:

- **Code + tests beat historical specs** for current-state behavior
- **Current runtime/config beats historical tech design** for current technical setup
- **Historical specs still matter** for naming, intended seams, drift detection, and explaining why the current state may be shaped a certain way
- **Do not invent intent** from code alone when the evidence only supports behavior

Do not execute repo verification by default. Inspect tests, scripts, CI config, and other repo-visible evidence first. Only run a narrow read-only command if the user explicitly asks for it or if a tiny probe is needed to resolve a material ambiguity.

### Evidence Status Labels

Use evidence labels directly in the output where they help readers calibrate trust:

| Label | Meaning |
|------|---------|
| **Confirmed current state** | Observed in code and supported by tests or verification evidence |
| **Implemented, weakly evidenced** | Observed in code but test/verification evidence is thin or missing |
| **Inferred from implementation** | Likely true from structure and call paths, but not strongly evidenced |
| **Historical, superseded** | Present in older specs but not supported by current implementation |
| **Planned, not implemented** | Accepted spec work not yet reflected in current code |
| **Needs human confirmation** | Ambiguity cannot be settled safely from repository evidence |

Use these labels sparingly but honestly. They are calibration signals, not decorative metadata.

### Claim Calibration

For every important claim, ask:

- is this claim based on current runtime code?
- or only on tests, fixtures, or contracts?
- or only on historical docs?

Then choose the evidence label before drafting it as current truth.

This is mandatory for:

- top-level capability claims
- important user-visible flows
- current-vs-planned distinctions
- type / mode / workflow differentiation

---

## Output Altitude

The current-state functional baseline lives **between PRD and Epic altitude**:

- **PRD-like in breadth** -- top-tier domains, scope map, cross-domain flows, read path
- **Epic-like at critical seams** -- current behavior, key edge/error/cancel paths, important boundary contracts, extension-safe constraints

Do **not** default to rewriting the full mature system as a giant epic with complete AC/TC density. That recreates the context overload this skill is meant to solve.

Do **not** stay so high-level that a fresh spec agent still has to read a dozen historical epics before they know where new work belongs.

### Precision Rule

Default to **current behavior clusters**, not full AC/TC explosion. Increase precision only where it matters:

- A domain is a likely extension point for upcoming spec work
- The behavior is subtle, safety-critical, or easy to regress
- Historical specs and current implementation drift materially
- The code path is weakly tested and needs explicit current-state description
- A public contract or cross-domain seam must stay stable

The question is not "Can I make this more detailed?" The question is "What level of precision lets the next spec agent place new work safely without replaying history?"

### Produced vs Supported vs Planned

This distinction is mandatory.

Do not describe a state, flow, or outcome as current end-to-end behavior just because:

- contracts exist
- tests or fixtures support it
- UI surfaces appear ready for it
- historical docs planned for it

For important behavior, distinguish explicitly between:

- **Currently produced behavior** -- behavior the in-repo system actually produces now through its real implemented paths
- **Supported but not currently produced** -- contracts, tests, fixtures, or surfaces support it, but the current runtime/orchestration does not yet produce it end-to-end
- **Planned, not implemented** -- accepted or historical intent not yet reflected in current implementation

Overstating “current” behavior is worse than being slightly conservative.

---

## This Is Not

This skill does not produce:

- A changelog
- A release note
- A historical replay of prior epics
- A full rewrite of every current behavior into exhaustive AC/TC form
- An aspirational roadmap blended into current truth
- A code-only architecture inventory with no user-facing functional meaning

This skill does produce:

- A fresh-agent onboarding baseline
- A current capability map
- A current technical world
- A drift record between historical specs and implemented reality
- A read path for future spec work

---

## Modes

### Refresh Mode

Use after a new implementation cycle ships.

Inputs:
- Prior current-state baseline docs
- Newly implemented epic/spec pack and tech design
- Current codebase and tests

Goal:
- Update the baseline so the new current state replaces the previous one
- Record drift and merges rather than stacking another point-in-time delta on top
- Preserve prior naming, layout, and artifact topology unless there is a stated reason to restructure

### Catch-Up Mode

Use when the repo has multiple implemented capability areas but no current-state baseline.

Inputs:
- Whatever historical epics, tech designs, stories, or notes exist
- Current implementation evidence

Goal:
- Build the first baseline pack
- Re-cluster old work into current domains
- Preserve lineage without forcing the reader to think in historical epic order

### Mixed-Origin Mode

Use when some capability areas were not created with Liminal Spec.

Inputs:
- Current codebase, tests, runtime docs
- Any historical artifacts that exist, even if inconsistent or partial

Goal:
- Reconstruct current behavior and technical shape honestly
- Mark inferred intent and low-confidence areas explicitly
- Avoid pretending old non-Liminal work had cleaner specification than the evidence supports

---

## Workflow

### 1. Inventory the Ground Truth

Identify what exists before you organize it:

- Historical specs, stories, tech designs, and prior baselines
- Public entry points: routes, screens, commands, jobs, event consumers
- Test suites at those seams
- Test layout, scripts, CI config, and manual harnesses
- Runtime prerequisites, environment docs, setup scripts

Create an explicit inventory. The skill should know what evidence exists before deciding what to trust.

### 2. Inspect Existing Test and Validation Surfaces

Read repository policy sources and identify:

- Standard fast lane, if the repo defines one
- Deeper lanes, if the repo defines them
- Test suite layout
- Integration/e2e/manual surfaces

Record:

- What evidence surfaces exist
- What they appear to cover
- What looks standard vs optional
- What is unavailable or ambiguous from repo inspection alone

The point is to understand what the project currently treats as stable and how behavior is exercised. Do not let missing dependencies, browser installs, or packaging setup block drafting.

### 3. Read Historical Artifacts for Shape, Not Worship

Historical Liminal artifacts still matter. They reveal:

- Prior domain names and seams
- Intended user outcomes
- Public contract expectations
- Design rationale that may still explain current structure

But do not treat them as the answer key. Read them to understand how the system got here and what drift to look for.

### 4. Inspect Current Code at Public Seams

Start from public behavior surfaces:

- UI routes and launch points
- API handlers and request entry points
- CLI commands
- Scheduled/background entry points
- Export/import boundaries
- Integration boundaries

Trace inward from those seams. This keeps the baseline anchored in user-visible and contract-visible behavior rather than in arbitrary internal helpers.

For any capability with multiple access paths, inspect all live entrypoints separately:

- UI action
- startup / launch path
- desktop shell path
- CLI path
- route / API path

Record where behavior is:

- currently produced
- partially wired
- supported by surrounding contracts/tests only
- planned, not implemented

### 5. Inspect Tests at the Same Seams

Read tests that exercise those entry points:

- Service mock tests
- Integration tests
- E2E tests
- Manual verification harnesses
- Fixtures and contract mocks

Tests do not define the whole truth, but they are a strong evidence signal for what the team currently treats as stable behavior.

### 6. Map Current Functional Domains

Use dimensional reasoning before finalizing the current domain map. Current domains should be chosen for:

- User-facing coherence
- Read-path clarity
- Stable extension seams
- Manageable document size
- Useful alignment with the current technical world

Do not force a 1:1 mapping between historical epics and current domains. Multiple old epics may now live in one domain. One old epic may now split across multiple current domains.

If the system has multiple supported types, modes, workflow classes, or process variants, add a **per-type matrix** in the index.

That matrix should answer:

- what durable state each type owns today
- what is shared today
- what is distinct today
- what is supported but not currently produced
- what is planned but not current

### 7. Map Current Technical Surfaces

Identify the current top-tier technical surfaces:

- major runtime boundaries
- responsibility zones
- domain ownership seams
- current stack decisions that affect all future work
- public contracts and test seams

This map may overlap with the functional domain map, but it is not identical. Functional domains answer "what the system does now." Technical surfaces answer "where that work lives now and what future designs must respect."

### 8. Draft the Functional Baseline

Write either:

- one compact functional baseline document, or
- an index plus domain docs

The functional baseline should tell a fresh spec agent:

- what the system currently does
- how the current capability areas are grouped
- what the important flows and constraints are
- which documents to read next for their area of work

If important behavior depends on a specific producing surface or platform, state that directly in the functional docs rather than implying it is current everywhere.

### 9. Draft the Technical Baseline

Write the current technical world as it exists now:

- system context
- top-tier surfaces
- module ownership
- boundary contracts
- current request/interaction sequences
- test seams and repo validation surfaces
- known technical drift from older designs

This is not a new speculative tech design. It is the current technical baseline future designs inherit.

### 10. Draft the Code Map

Write a curated code-reading map for fresh agents:

- where the real entry points are
- what top-level code areas exist
- what to read first, second, and only-if-needed
- how current functional domains map to current code
- where contracts, state roots, and tests live

This is a navigation artifact, not a file inventory. Favor guided read order over exhaustive listing.

The code map must include targeted read orders for at least:

- server / API work
- client / UI work
- durable-state / data-model work

It should also include repo-level mandatory onboarding files when relevant, for example:

- `AGENTS.md`
- `CLAUDE.md`
- generated or repo-specific policy files such as `convex/_generated/ai/guidelines.md`

Curated does not mean sparse. The code map must mention every major behavior-owning:

- route
- service
- contract root
- persistence root
- non-obvious tested component

especially when it owns user-visible, safety-critical, performance-critical, or platform-scoped behavior.

### 11. Draft the Drift Ledger

Record how historical artifacts map into current state:

- unchanged
- implemented with drift
- merged
- split
- superseded
- planned but not current
- unverified

This is where the historical sequence lives. Keep it out of the functional baseline unless it helps future work directly.

### 12. Run the Consumer Test

Validate the draft by asking:

- Could a fresh spec agent place the next epic without foundational questions about current system behavior?
- Could a fresh tech designer place that work in the existing technical world without re-deriving boundaries and stack decisions?
- Could a fresh implementer find the right code and tests to start from without scanning the whole repo blindly?
- Could a fresh agent tell what is actually different between supported process types, workflow types, or modes today?

If not, the baseline is not ready. Improve the docs until those consumers can work from them cold.

Record the answers explicitly as a completion gate. If any answer is "no," the run is not done.

### 12b. Overstatement Review Pass

Before finalizing, review the draft specifically for scope inflation:

- Which claims become wrong if read as cross-surface?
- Which claims become wrong if read as cross-platform?
- Which code surfaces would a fresh implementer still fail to find?

If any answer exposes overstatement, revise before handoff.

### 13. Make The Baseline Discoverable

If the target repo has agent-onboarding docs such as:

- `AGENTS.md`
- `CLAUDE.md`
- similar repo-level agent guidance files

then update or propose a **minimal onboarding pointer** to the new current-state artifacts.

This pointer should be short and discoverability-focused:

- where the current-state docs live
- functional baseline first
- technical baseline second
- code map third

Do this only when:

- those files already exist
- there is a natural place for a short onboarding note
- the new baseline is intended to become the repo's current onboarding surface

Do not rewrite those files broadly. Add or update a small pointer so future agents can actually find the baseline.

---

## Bundled Companion Guides

Installed skill packs should bundle two focused companion references:

- `references/current-state-functional.md`
- `references/current-state-technical.md`
- `references/current-state-code-map.md`

These are **specialization boosters**, not required life support. This main skill remains sufficient on its own. The companion files exist to improve draft quality and to support clean subagent dispatch.

### When to Load the Functional Guide

Read `references/current-state-functional.md` when:

- drafting `current-state.md` in compact mode
- drafting `current-state-index.md`
- drafting one or more `current-state-[domain].md` docs
- handing the functional drafting pass to a subagent

### When to Load the Technical Guide

Read `references/current-state-technical.md` when:

- drafting `current-state-tech-design.md`
- clarifying current technical surfaces and module ownership
- documenting current request/interaction sequences and test seams
- handing the technical drafting pass to a subagent

### When to Load the Code-Map Guide

Read `references/current-state-code-map.md` when:

- drafting `current-state-code-map.md`
- deciding entry points, read order, and domain-to-code mapping
- deciding whether to emit `current-state-module-tree.json`
- handing the code-map drafting pass to a subagent

### Subagent Pattern

If subagents are available:

1. The orchestrator completes the evidence pass, current domain map, and current technical surface map first
2. The orchestrator may then dispatch:
   - a **functional drafter** that reads `references/current-state-functional.md`
   - a **technical drafter** that reads `references/current-state-technical.md`
   - a **code-map drafter** that reads `references/current-state-code-map.md`
3. The orchestrator reconciles terminology, domain boundaries, code ownership seams, and drift across all drafts before finalizing the baseline

Do not let the two passes invent separate maps of the system. Shared evidence and map-setting happen first.

---

## Writing Register

This skill has **two writing registers** because it produces two different kinds of artifact.

### Functional Outputs

Use **plain description**:

- describe what the system does now
- describe where capability boundaries sit now
- describe what is not present now
- describe key edge/error/cancel/recovery behavior where it matters

Do not write history lectures, brochure language, or implementation leakage into the functional baseline.

### Technical Outputs

Use **woven technical context**:

- start with current system context
- descend into current technical surfaces, modules, sequences, and seams
- keep functional anchors visible so technical structure always ties back to current capability terrain

Do not turn the technical baseline into a flat inventory or a speculative redesign.

### Drift Ledger

Use a terse, mechanical register. The drift ledger is not prose-forward. It exists to preserve historical mapping and explicit drift status without becoming the onboarding surface itself.

### Code Map

Use a **curated navigation register**:

- entry points first
- ownership and read order before file inventory
- start-here / then-read / only-if-needed guidance
- tests, contracts, and state roots as first-class reading surfaces

Do not turn the code map into a raw tree dump or a second technical baseline.

---

## Functional Baseline

The functional baseline is the onboarding artifact for future spec work.

At minimum it must tell a fresh spec agent:

- what the system currently does
- how the current capability terrain is grouped
- what constraints and invariants matter
- what to read next for the area they need to extend

Every compact baseline or domain-level functional artifact must include, at minimum:

- `Status`
- `Evidence Scope`
- `Overview`
- `Current User Outcomes`
- `In Scope Now`
- `Not Present / Deferred / Deprecated`
- `Major Current Flows`
- `Important Contracts / Invariants`
- `Read Next`
- `Adjacent Domains`
- `Extension Guidance`

Use compact mode when one functional artifact still reads cleanly end-to-end. Use pack mode when unrelated domains create onboarding drag.

For the full functional writing guide, document shapes, precision dial, and templates, read:

- `references/current-state-functional.md`

---

## Technical Baseline

The technical baseline is the current technical world future designs inherit.

At minimum it must tell a fresh tech designer:

- what runtime and responsibility surfaces exist now
- where current module ownership sits
- what major contracts and sequences matter
- where tests enter and what repo-visible validation surfaces define current project truth
- which behaviors are surface-bounded or platform-bounded today
- which repo workflow docs/scripts materially shape implementation or QA

For the full technical writing guide, structure, and template, read:

- `references/current-state-technical.md`

---

## Code Map

The code map is the onboarding artifact for finding the right code quickly.

At minimum it must tell a fresh agent:

- where the main entry points are
- what top-level code areas exist
- what files to read first for each current domain
- where shared contracts, state roots, and validation surfaces live

For the full code-map writing guide, structure, and template, read:

- `references/current-state-code-map.md`

---

## Drift Ledger

The drift ledger keeps history without making history the onboarding surface.

### Drift Ledger Structure

`current-state-drift-ledger.md` should usually contain:

| Historical Source | Current Domain / Surface | Status | What Changed | Evidence | Follow-Up |
|-------------------|--------------------------|--------|--------------|----------|-----------|
| `epic-1.md` | Workspace | Implemented with drift | [summary] | [tests/code] | None |
| `tech-design-2.md` | Documents surface | Superseded | [summary] | [current module map] | Backfill optional |
| `epic-7.md` | Search domain | Planned, not current | [summary] | [no code yet] | Keep out of baseline |

### Status Vocabulary

Use a small, explicit status set:

- **Unchanged**
- **Implemented with drift**
- **Merged into current domain**
- **Split across current domains**
- **Superseded**
- **Planned, not current**
- **Unverified**

This file is where historical epic sequence, naming drift, and merged capability lines are preserved for later reasoning.

If the index or domain docs include “supported but not currently produced” or “planned, not current” surfaces, the drift ledger must include corresponding rows so the current/non-current boundary is preserved in one place.

---

## Onboarding Read Path

The baseline must tell a new agent what to read next.

At minimum, the index or compact baseline should include a reading guide like:

1. Read the current-state index or compact baseline
2. Read the domain doc(s) relevant to the new work
3. Read the technical baseline sections for those domains/surfaces
4. Read the drift ledger only if the area has important historical merge/split context
5. Read the original historical epic/tech design only when current-state docs explicitly point there for nuance

The correct baseline reduces -- not eliminates -- the need to consult historical artifacts. If a new agent still needs to read every past epic to work safely, the baseline failed.

---

## Mixed-Origin Repositories

This skill should not collapse when early capability areas were built outside Liminal Spec.

For mixed-origin areas:

- derive current behavior from code, tests, and public contracts
- derive current technical shape from current module ownership and test seams
- use older docs only as hints unless they still align with implementation
- mark low-confidence intent and missing verification honestly

Do not punish the repo for missing historical formality. The skill's job is to create the baseline that was missing.

If the repo has almost no usable historical artifacts, you can still produce a partial baseline from implementation evidence. The output should simply carry more `Inferred from implementation` and `Needs human confirmation` labels. Do not invent cleaner certainty than the evidence supports.

---

## Optional Overlay: Planned State

When the user explicitly wants it, add a planned-state overlay after the current baseline is complete.

The overlay is separate from current-state docs. It should capture:

- accepted but unimplemented spec packs
- the current domains or surfaces they would affect
- the delta between current state and planned future state

Do not blend planned work into current-state descriptions. "Planned, not implemented" belongs in the drift ledger or a separate overlay document, never inside the core baseline as if it already exists.

---

## Validation Before Handoff

### Structural Checklist

- [ ] Relevant test and CI surfaces were discovered from repository evidence
- [ ] Current code and tests were actually inspected at public seams
- [ ] Historical specs informed shape and drift, but did not override current implementation truth
- [ ] Config A vs Config B was declared explicitly with justification
- [ ] Current functional domains are organized by current capability terrain, not historical epic sequence
- [ ] Important claims were calibrated as produced vs supported vs planned
- [ ] Important current behaviors were calibrated by actual producing surface, not just by implementation somewhere in the repo
- [ ] Platform-bounded behaviors were explicitly called out where they affect onboarding
- [ ] Multi-entrypoint capabilities were checked across their live entrypaths
- [ ] Current technical surfaces reflect current system ownership and boundaries
- [ ] Code map provides entry points, read order, domain-to-code mapping, and test map
- [ ] Targeted read orders exist for server/API, client/UI, and durable-state/data-model work
- [ ] The code map mentions major behavior-owning routes, services, contract roots, persistence roots, and non-obvious tested components
- [ ] Important public contracts and invariants are documented
- [ ] Drift between historical specs and current implementation is recorded explicitly
- [ ] Planned but unimplemented work is kept separate from current-state truth
- [ ] Read path for new agents is explicit
- [ ] Evidence limitations are stated where confidence is reduced
- [ ] Optional machine-readable support artifacts were emitted when they materially help refreshability or downstream automation
- [ ] Repo-level workflow docs/scripts that materially affect implementation or QA were included where relevant
- [ ] If repo-level agent docs exist, a minimal pointer to the new current-state docs was added or proposed

### Consumer Test (Critical)

**Spec-agent test:** Could a fresh spec agent place the next epic without foundational questions about what the system currently does and where the work belongs?

**Tech-design test:** Could a fresh tech designer place that work in the existing technical world without re-deriving the system shape, module ownership, contracts, and seams?

**Code-map test:** Could a fresh implementer find the right files and tests to begin work without scanning the whole repo blindly?

**Type/mode test:** Could a fresh agent tell what is actually different between the supported process types, workflow types, or modes today?

If any answer is "no," revise the baseline.
