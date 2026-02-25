---
name: ls-story
description: Break an epic into functional stories with full acceptance criteria and test conditions. Validates coverage completeness and cross-story integration path coherence.
---

# Story Sharding

**Purpose:** Break an epic into functional stories -- discrete, independently acceptable vertical slices of user-facing value.

Stories are where product management meets project management. They group acceptance criteria from the epic into deliverable units of work, sequence them based on dependencies, and carry enough functional detail that a PO can accept from the story alone. The story is the acceptance artifact. The engineer receives it, implements from it, and the PO accepts against it.

**You create the functional stories. You don't add technical implementation detail.** Technical sections (implementation targets, test mapping, verification criteria) are added by the Tech Lead in the Story Technical Enrichment phase that follows.

### Special Artifacts

- **Story 0:** Foundation setup -- types, fixtures, error classes, project config. Minimal or no TDD cycle.
- **Feature 0:** Stack standup -- auth, connectivity, integrated skeleton with no product functionality. Used when building on a new stack where the foundation doesn't exist yet.

## Validator Role

Before creating stories, validate the Tech Design:

- Are interfaces clear enough to identify logical groupings of ACs?
- Is the TC-to-test mapping complete?
- Can you identify logical groupings of ACs that form coherent units of work?
- Can you trace dependency chains between groups?

If issues found, return to Tech Lead for revision. Don't shard from a broken design.

---

## What a Story Is

A story is a functional scoping and acceptance artifact. It spans two concerns:

**Product management:** The story carries enough functional detail -- full acceptance criteria with test conditions -- that work can be accepted from the story alone without referencing back to the epic. A PO reads the story's ACs and TCs to determine whether the delivered work meets the requirement.

**Project management:** The story groups ACs from the epic into a deliverable unit, sequences it relative to other stories, and defines what "done" looks like. Sometimes you'd shard differently for a two-person team than for a solo dev. The story is where that project-level adaptation happens.

## What a Story Is NOT

A story is not an implementation reference. It does not carry file lists, interface definitions, or implementation patterns -- those live in the tech design. It does not carry test file mappings or test count breakdowns -- those are added by the Tech Lead in the Story Technical Enrichment phase. The story provides light technical context as orientation ("this story involves the session creation route and Convex persistence layer") with pointers to the tech design for depth.

A story is not a prompt pack. The v0.5.0 pipeline removes prompt packs entirely. Stories -- once enriched with technical sections by the Tech Lead -- become the sole implementation artifact. Engineers implement from complete stories using their own judgment and plan mode.

---

## Story 0: Foundation Story

Every feature starts with Story 0. It establishes the shared foundation that all subsequent stories build on.

### What Story 0 Contains

- **Type definitions** -- All interfaces from the tech design's Low Altitude section
- **`NotImplementedError` class** -- Custom error for stubs (if not already in the codebase)
- **Error classes** -- Feature-specific errors defined in the tech design
- **Test fixtures** -- Mock data matching the data contracts in the epic
- **Test utilities** -- Shared helpers for test setup (factory functions, mock builders)
- **Project config** -- Test config, path aliases, setup files, environment config

### Pragmatic Additions

The default for Story 0 is foundation-only with no TDD cycle -- types and fixtures don't need test-driven development. However, projects may pragmatically include foundational endpoints or smoke tests that verify the infrastructure actually works. A health check endpoint that proves the server starts and dependencies connect is a reasonable Story 0 addition. The key constraint is that Story 0 establishes what all subsequent stories depend on -- it's the shared foundation, not a feature delivery.

Use judgment. If something needs TDD, it probably belongs in Story 1. If it's verifying that the infrastructure from Story 0 is wired correctly, it can live in Story 0 with a simplified structure.

Use these defaults for smoke tests:
- Include smoke tests in Story 0 when they validate shared wiring (boot, connectivity, required env/config).
- Skip smoke tests in Story 0 when they would validate feature behavior better covered by Story 1+ TDD.
- Keep Story 0 smoke coverage minimal; this is a foundation check, not feature verification.

### Exit Criteria

- [ ] All type definitions from tech design created
- [ ] Test fixtures match data contracts
- [ ] Error classes and `NotImplementedError` available
- [ ] TypeScript compiles clean
- [ ] Project config validated (env vars, test runner, linter)

---

## Story Derivation

### Stories as Project-Level Adaptation

Stories are a project-level adaptation of the epic. They group acceptance criteria into implementable units of work based on:

- **Functional coherence** -- ACs that belong together because they describe a single user capability
- **Dependency sequencing** -- What must exist before this work can begin
- **Scope manageability** -- Enough work to be meaningful, not so much that it's unwieldy
- **Project pragmatics** -- Team size, parallelization opportunities, risk isolation

The tech design's chunk breakdown may inform this grouping -- chunks often align with natural story boundaries because both are reasoning about logical units of work. But the story doesn't mechanically derive from chunks. Sometimes a chunk splits across stories, or multiple chunks merge into one story, or the sequencing differs from the tech design's ordering.

### Story Types

**Story 0: Foundation**
- Establishes shared infrastructure
- Minimal or no TDD cycle
- No feature delivery (or minimal foundational verification)

**Story 1-N: Feature Stories**
- Deliver user-facing functionality
- Full TDD cycle: Skeleton, Red, Green, Gorilla, Verify
- Each story is independently verifiable and acceptable

---

## Story Structure (Functional Sections)

This template covers the functional half of a complete story. The Tech Lead adds the technical half during Story Technical Enrichment.

```markdown
# Story N: [Title]

## Objective

What this story delivers. What a user/consumer can do after this story ships that they couldn't before.

## Scope

### In Scope
- Specific capabilities this story delivers
- Which endpoints, features, or behaviors

### Out of Scope
- What's explicitly excluded (and which story handles it)

## Dependencies / Prerequisites

- Story N-1 must be complete
- Specific capabilities that must exist (not file lists -- functional prerequisites)

## Acceptance Criteria

**AC-X.Y:** [Acceptance criterion title]

- **TC-X.Ya: [Test condition name]**
  - Given: [precondition]
  - When: [action]
  - Then: [expected outcome]
- **TC-X.Yb: [Test condition name]**
  - Given: [precondition]
  - When: [action]
  - Then: [expected outcome]

**AC-X.Z:** [Next acceptance criterion]
[... full Given/When/Then for each TC]

## Error Paths

| Scenario | Expected Response |
|----------|------------------|
| [Error condition] | [HTTP status and error code] |

## Definition of Done

- [ ] All ACs met
- [ ] All TC conditions verified
- [ ] PO accepts
```

**Ownership boundary:** The BA/SM authors these functional sections. The PO accepts from them. Technical implementation sections are added below this boundary by the Tech Lead in the next phase.

---

## Why Full AC/TC Detail in Stories

The story is the acceptance artifact. If TCs are reduced to one-line summaries ("AC-2.5: Duplicate entries rejected"), a PO can't accept from the story alone -- they need the epic open to see what "rejected" actually means. Full Given/When/Then detail makes the story self-contained for acceptance.

Stories may refine or add specificity to the epic's TCs. A story TC can be more implementation-aware than the epic's version ("Given: A session exists; request contains one `user-message` entry and one `assistant-message` entry") because the story is closer to the work. The epic's TC is the source; the story's TC is the acceptance-ready version for this scope.

---

## Integration Path Trace (Required)

After defining all stories and before handing off to the Tech Lead, trace each critical end-to-end user path through the story breakdown. This catches cross-story integration gaps that per-story AC/TC coverage cannot detect.

Per-story validation checks whether each story is internally complete -- ACs covered, scope defined, prerequisites met. It does not check whether the *union* of all stories produces a connected system. A relay module, a bridge between subsystems, a glue handler that routes messages -- these can fall through the cracks when each story takes one side of the boundary and no story owns the seam.

### How to Trace

1. List the 1-3 most important user paths (from the epic's flows)
2. Break each path into segments (each arrow in the sequence diagram)
3. For each segment, identify which story owns it
4. Verify at least one TC in that story exercises the segment

Any segment with no story owner is an integration gap. Fix before handing off.

### Format

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Client -> POST /sessions | Create session | Story 1 | TC-1.1a |
| Client -> POST /sessions/:id/turns | Ingest turn | Story 2 | TC-2.1a |
| Ingestion -> Redis DEL | Cache invalidation | Story 2 (impl) / Story 3 (verification) | TC-3.2d |
| Client -> GET /sessions/:id/history | Retrieve history | Story 3 | TC-3.1a |
| History -> Redis check | Cache hit | Story 3 | TC-3.2b |
| History -> Convex fallback | Cache miss | Story 3 | TC-3.2a |
| WS -> portlet | Shell relays to iframe | ??? | ??? |

Empty cells ("???") are integration gaps. They block handoff.

### Why Per-Story Checks Don't Catch This

Story-level validation asks: "Are this story's ACs covered?" These are within-story completeness checks. The Integration Path Trace is a cross-story coverage check -- does every segment of the critical user path have a story owner? A tech design can perfectly describe how components interact while no story actually owns implementing the glue between them.

---

## Coverage Gate

Before proceeding to Story Technical Enrichment, verify that every AC and TC from the epic is assigned to exactly one story. Build a coverage table:

| AC | TC | Story | Notes |
|----|-----|-------|-------|
| AC-1.1 | TC-1.1a | Story 1 | |
| AC-1.1 | TC-1.1b | Story 1 | |
| AC-1.2 | TC-1.2a | Story 1 | |
| AC-2.1 | TC-2.1a | Story 2 | |
| ... | ... | ... | |

**Rules:**
- Every AC must appear at least once
- Every TC must appear exactly once (no duplication across stories, no gaps)
- Unmapped TCs block handoff -- they indicate a story is missing scope or the epic has orphaned requirements

---

## Validation Before Handoff

Before handing functional stories to the Tech Lead for technical enrichment:

- [ ] Every AC from the epic is assigned to a story
- [ ] Every TC from the epic is assigned to exactly one story
- [ ] Stories sequence logically (read before write, foundation before features)
- [ ] Each story has full Given/When/Then detail for all TCs
- [ ] Integration path trace complete with no gaps
- [ ] Coverage gate table complete
- [ ] Error paths documented per story
- [ ] Story 0 covers types, fixtures, error classes, project config
- [ ] Each feature story is independently acceptable by a PO

**Self-review (CRITICAL):**
- Read each story fresh, as if someone else wrote it
- Can you explain why each AC belongs in this story?
- Does each story tell a coherent "what the user can do after" narrative?

**Downstream consumer:** The Tech Lead validates functional stories by confirming they can add technical sections. If they can't identify implementation targets for a story's ACs, the story isn't ready.

---

## Output: Functional Stories

For a typical feature, you produce:
- Story 0: Foundation setup (types, fixtures, error classes)
- Stories 1-N: Feature stories with full acceptance criteria, error paths, and definition of done
- Integration path trace table
- Coverage gate table

These are functional stories -- the acceptance half. The Tech Lead adds technical sections (implementation targets, TC-to-test mapping, technical DoD, spec deviation field) in the Story Technical Enrichment phase before stories go to engineers.

---

## Iteration is Expected

- Tech Lead finding functional gaps -> iterate
- Coverage table revealing orphaned TCs -> iterate
- Integration trace exposing seam gaps -> iterate
- Multiple rounds is normal, not failure

Don't expect one-shot perfection. The structure supports iteration.

---

## Reference: confidence-chain

## The Confidence Chain

Every line of code traces back through a chain:

```
AC (requirement) → TC (test condition) → Test (code) → Implementation
```

**Validation rule:** Can't write a TC? The AC is too vague. Can't write a test? The TC is too vague.

This chain is what makes the methodology traceable. When something breaks, you can trace from the failing test back to the TC, back to the AC, back to the requirement.

---

## Reference: Context Economics

# Context Economics

**Why Liminal Spec uses multiple agents with artifact handoff instead of one long conversation.**

## The Core Problem

AI agents have fundamental limitations:

| Problem | Description |
|---------|-------------|
| **Context rot** | Attention degrades as context grows |
| **Lost in the middle** | Middle of context gets less attention than start/end |
| **Tool result bloat** | Tool calls accumulate and dominate context |
| **Negotiation baggage** | Accumulated assumptions and back-and-forth clutter |
| **State tracking failures** | Agents lose track of decisions over long conversations |

## The Solution: Agents = Context Isolation

**"Agents" doesn't mean roleplay personas. It means fresh context with artifact handoff.**

```
Agent 1 (planning context)
    │
    └── Produces artifact (Epic)
              │
              ▼
Agent 2 (fresh context)
    │
    ├── Reads artifact cold
    └── No negotiation history
              │
              └── Produces artifact (Tech Design)
                        │
                        ▼
Agent 3 (fresh context)
    ...
```

The artifact (document) IS the handoff. Not a summary. Not "see above." The complete document.

---

## Why This Works

### 1. No Negotiation Baggage

A fresh agent reads the artifact as-is. No "well, we discussed maybe doing it differently" or "I think earlier you said..." 

The artifact is the source of truth. The conversation that produced it is gone.

### 2. Expansion Ratios

Each phase expands the prior artifact:

| Input | Output | Ratio |
|-------|--------|-------|
| Requirements | Epic | ~6x |
| Epic | Tech Design | ~6-7x |
| Tech Design chunk | Story + Prompts (500 lines) | varies |

A single context trying to hold requirements + spec + design + implementation = bloat. Separate contexts give each phase room to breathe.

### 3. Planner ≠ Coder

**Planning context:** Exploratory, iterative, accumulates tool calls, can tolerate some rot.

**Execution context:** Precise, focused, fresh context per phase, cannot tolerate rot.

Don't make the context that explored 15 files and had 3 rounds of revision the same one that implements. The coder should receive clean, decided instructions.

### 4. Artifact as Interface

The artifact IS the handoff. Not a summary of what we discussed. Not "see the conversation above." The document itself contains everything needed.

This is why artifacts must be complete and self-contained:
- Feature spec includes all ACs and TCs
- Tech design includes all interfaces and test mapping
- Complete story provides functional requirements and technical implementation context for execution

---

## Practical Application

### Fresh Context per Phase

For execution phases (Skeleton, Red, Green), start fresh:

```
Phase 1 Prompt → Fresh Session → Execute → Complete
Phase 2 Prompt → Fresh Session → Execute → Complete
```

No accumulated exploration noise. Just prompt + execute.

### State Files for Recovery

When an agent session ends (compaction, crash, human break), state files enable recovery:

```
.sdd/state.json        # Project state
.sdd/epic-state.md   # Feature spec session state
.sdd/tech-design-state.md    # Tech design session state
```

The next agent (or resumed agent) reads state, loads relevant artifacts, continues.

### Long Session with Checkpoints

For planning phases (Epic, Tech Design), use checkpoints:

```
Start Session
  │
  ├── Work on section 1
  ├── [Checkpoint: Update state file]
  │
  ├── Work on section 2  
  ├── [Checkpoint: Update state file]
  │
  ├── Context getting large...
  └── [Compact: Summarize, update state, continue fresh]
```

### Parallel Agent Sessions

For research or validation, spawn short-lived agents:

```
Main Session (orchestrator)
  │
  ├── Spawn: Research Agent → Returns findings
  ├── Spawn: Validation Agent → Returns issues
  │
  └── Continue with results (not with their full context)
```

Sub-agents have isolated context. They return findings, not their entire conversation.

---

## The Economics

| Approach | Tokens | Quality |
|----------|--------|---------|
| One long conversation | Accumulates to limit | Degrades over time |
| Agent pipeline with artifacts | Resets per phase | Consistent quality |

The "cost" of artifacts (writing them, reading them in new context) is paid back by:
- Higher quality execution
- Debuggable handoffs (you can read what was passed)
- Recovery capability (state files + artifacts)
- Parallelization potential

---

## Anti-Patterns

**❌ "Let me continue where we left off"**
If "where we left off" is buried in 100k tokens of conversation, the agent won't find it reliably. Use state files.

**❌ "Remember when we discussed X"**
If X matters, it should be in the artifact. If it's not in the artifact, the next agent won't know it.

**❌ "I'll just keep going in this context"**
Context rot is real. If you notice quality degrading, that's the signal to checkpoint and continue fresh.

**❌ "The spec is in the conversation above"**
Conversations are not artifacts. Extract the decisions into a document. That document is the artifact.

**❌ Treating agents as roleplay**
"Be the BA persona" is not the point. Fresh context with artifact handoff is the point. The "role" is just scope, not a character to play.

---

## Reference: Writing Principle: Plain Description

# Writing Principle: Plain Description

## What It Is

Every sentence describes what something does, what it is, or where it fits. Nothing else. No framing, no selling, no justifying, no self-describing. Every word has a job. If you remove a word and the meaning doesn't change, the word shouldn't have been there.

The reader is a Tech Lead or Senior Engineer who needs to understand the system and build from the spec. They don't need to be convinced the project is worthwhile. They don't need a tour guide announcing what they're about to read. They need to know what the thing does so they can design it.

## What It Isn't

It isn't terse for the sake of brevity. Longer sentences are fine when every word earns its place — detailed descriptions of behavior, specific examples, enumerated capabilities. The principle isn't "be short." It's "don't waste the reader's time."

It also isn't a ban on context. Saying where something fits ("first of two epics"), what it replaces ("re-uploading replaces existing data"), or what it doesn't do ("stages 3-6 are inactive") is plain description. That's useful information. The line is: does this sentence describe the system, or does it describe how the reader should feel about the system?

## The Failure Modes

### 1. The Prologue

Writing that sets the scene before getting to the point. Background, history, the current pain, the journey to the solution. This is a spec, not a pitch deck.

**Bad:**
> Today, converting business rules from spreadsheets into executable application logic is a manual, team-intensive process — two offshore teams contracted for a year to work through ~1,300 rules across two product lines. There's no tooling to help. A developer reads each row, interprets the English condition, figures out what entity it maps to, and writes the code by hand.

Three sentences of archaeology. The reader doesn't need to understand the history of the problem to design the solution. This is justification — it belongs in a project proposal, not a epic.

**Good:**
> This feature provides the ability to upload a business rules spreadsheet, validate and parse each rule, and diagnose rule loading issues. This is the first half of an ETL process to convert business rules from the source workbook into executable validation rules.

What it does. Where it fits. Done.

### 2. The Brochure

Sentences that describe the value or benefit instead of the behavior. Words like "enables," "empowers," "provides orientation," "designed to be." The reader can figure out why something is useful — they need to know what it does.

**Bad:**
> It provides orientation — the dev always knows where they are in the process.

Selling the benefit of a progress bar. The first sentence already said what it does.

**Good:**
> The pipeline progress bar appears at the top of every page, showing all six stages with the current stage highlighted.

What it is. Where it is. What it shows. Stop.

**Bad:**
> After this epic ships, a dev team that previously needed months and offshore contractors to convert a spreadsheet of rules can do it in days.

This is a pitch. "Previously needed months" vs "can do it in days" is a sales comparison. The reader building the system doesn't need the before/after contrast.

### 3. The Tour Guide

Sentences that announce what comes next or describe the structure of the document itself. "This section covers..." or "This epic gives the dev team two new capabilities and a persistent assistant."

**Bad:**
> This epic gives the dev team two new capabilities and a persistent assistant:

Counting and categorizing before the list. The list does this job. The sentence is a tour guide standing in front of the exhibit saying "you're about to see three paintings."

**Good:**
Just go straight to the bullets. The heading "In Scope" is the only framing needed.

### 4. The Defensive Justification

Sentences that explain why a choice was made, preemptively defending it. "Not just the ones the pipeline uses immediately" or "supporting future reporting and analytics integration."

**Bad:**
> All fields from the workbook are preserved, not just the ones the pipeline uses immediately, supporting future reporting and analytics integration.

"Not just the ones..." is anticipating the question "why store fields you don't use?" and answering it preemptively. "Supporting future reporting" is justifying the decision. Neither describes the system.

**Good:**
> Every column from the workbook is preserved, including fields not used by current pipeline stages.

What it stores. How completely. Done. If someone wants to know why, they can ask.

### 5. The Ceremony

Extra words that add formality but no meaning. "Begins a rule loading session by," "This flow is designed to be re-run," "on demand."

**Bad:**
> The developer begins a rule loading session by selecting a product and version, uploading the business spreadsheet, and reviewing what the system found.

"Begins a rule loading session by" is ceremony. The developer isn't "beginning a session" — they're selecting a product, uploading a file, and reviewing results.

**Good:**
> The dev selects a product and version, uploads the spreadsheet, and reviews what the system found.

Same information. No ceremony.

**Bad:**
> This flow is designed to be re-run — uploading to a version that already has data replaces everything and starts fresh.

"This flow is designed to be re-run" is a meta-statement about the flow's design intent. The dash clause is the actual behavior.

**Good:**
> Re-uploading to a version with existing data replaces everything and starts fresh.

Just the behavior.

### 6. The Vague Benefit

Words that sound descriptive but don't actually specify anything. "Clear summary," "explain what the system found," "ask for help at any point."

**Bad:**
> Ask the AI assistant for help at any point — a chat sidebar available on every page that can answer questions about the data, explain what the system found, and provide quick summaries via one-click Quick Chat Links.

"Ask for help" is vague. "Explain what the system found" is vague — explain what about what it found? The specific parts (answers questions, Quick Chat Links) are buried after the vague parts.

**Good:**
> AI assistant chat sidebar — available on every page, answers questions about the data and provides quick summaries via one-click Quick Chat Links.

Starts with what it is. Says what it does. Specific throughout.

### 7. The Implementation Leak

Naming internal tools, specific function names, or return shapes when the requirement is about behavior the user sees.

**Bad:**
> `inspect_upload` returns summary data (total rows, sheets, valid count, problem count, duplicate count).

The functional requirement is that the AI can answer questions using upload data. The tool name is an implementation choice.

**Good:**
> Response includes relevant summary data (total rows, sheets, valid count, problem count, duplicate count).

Same specificity about what data is available. No opinion about how it's wired.

## The Test

For any sentence, ask: **does this describe the system, or does it describe something about the system?**

- "The progress bar shows six stages" → describes the system. Keep.
- "It provides orientation" → describes a quality of the system. Cut.
- "Upload a spreadsheet and see parsed results" → describes the system. Keep.
- "What used to take months starts taking days" → describes the value of the system. Cut.
- "Re-uploading replaces existing data" → describes the system. Keep.
- "This flow is designed to be re-run" → describes the intent behind the system. Cut.

If the sentence survives the test, check each word: remove it, re-read. Did the meaning change? No? The word goes.
