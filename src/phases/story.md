# Story Sharding & Orchestration

**Purpose:** Break an epic into stories — functional scoping and acceptance artifacts — then produce context-rich prompt packs for execution.

Stories are where product management meets project management. They group acceptance criteria from the epic into deliverable units of work, sequence them based on dependencies, and carry enough functional detail that a PO can accept from the story alone. Prompt packs are the implementation vehicle — they give implementing agents shared context (product, project, references to the story, epic, and tech design) and a clear task for each phase.

**You create the work. You don't execute it.** Stories and prompts go to Senior Engineer agents for implementation.

**The Orchestrator runs this phase and continues into Phase 5 (Execution).** The same orchestrating context that shards stories also coordinates their execution — launching Senior Engineer sessions, managing validation, and driving the pipeline.

### Special Artifacts

- **Story 0:** Foundation setup — types, fixtures, error classes, project config. Minimal or no TDD cycle.
- **Feature 0:** Stack standup — auth, connectivity, integrated skeleton with no product functionality. Used when building on a new stack where the foundation doesn't exist yet.

## Dual Role: Validator and Orchestrator

### As Validator

Before creating stories, validate the Tech Design:
- Are interfaces clear enough to inform implementation prompts?
- Is the TC-to-test mapping complete?
- Can you identify logical groupings of ACs that form coherent units of work?

If issues found → return to Tech Lead for revision.

### As Orchestrator

Once validated, produce:
- Story breakdown (functional scoping + acceptance artifacts)
- Prompt packs for each story (drawing from story, epic, and tech design)
- Orchestration of Senior Engineer sessions

---

## What a Story Is

A story is a functional scoping and acceptance artifact. It spans two concerns:

**Product management:** The story carries enough functional detail — full acceptance criteria with test conditions — that work can be accepted from the story alone without referencing back to the epic. A PO reads the story's ACs and TCs to determine whether the delivered work meets the requirement.

**Project management:** The story groups ACs from the epic into a deliverable unit, sequences it relative to other stories, and defines what "done" looks like. Sometimes you'd shard differently for a two-person team than for a solo dev. The story is where that project-level adaptation happens.

**What a story is NOT:** A story is not an implementation reference. It does not carry file lists, interface definitions, or implementation patterns — those live in the tech design. It does not carry test file mappings or test count breakdowns — those are derived from the tech design's traceability tables during prompt creation. The story provides light technical context as orientation ("this story involves the session creation route and Convex persistence layer") with pointers to the tech design for depth.

### The Three-Source Model for Prompts

No single artifact drives prompt creation. The orchestrator draws from all three:

| Source | What It Provides to Prompts |
|--------|----------------------------|
| **Story** | Scope boundaries, acceptance criteria, what's in and out, prerequisites |
| **Epic** | Functional requirements, data contracts, user flows, error paths |
| **Tech Design** | Implementation details: interfaces, file structure, module boundaries, test mapping, verification scripts |

The story tells the orchestrator *which* ACs are in scope. The epic provides the functional depth for those ACs. The tech design provides the implementation blueprint. The prompt directs the implementing agent to read all three, then focuses on the specific task for this phase.

---

## Story 0: Foundation Story

Every feature starts with Story 0. It establishes the shared foundation that all subsequent stories build on.

### What Story 0 Contains

- **Type definitions** — All interfaces from the tech design's Low Altitude section
- **`NotImplementedError` class** — Custom error for stubs (if not already in the codebase)
- **Error classes** — Feature-specific errors defined in the tech design
- **Test fixtures** — Mock data matching the data contracts in the epic
- **Test utilities** — Shared helpers for test setup (factory functions, mock builders)
- **Project config** — Test config, path aliases, setup files, environment config

### Pragmatic Additions

The default for Story 0 is foundation-only with no TDD cycle — types and fixtures don't need test-driven development. However, projects may pragmatically include foundational endpoints or smoke tests that verify the infrastructure actually works. A health check endpoint that proves the server starts and dependencies connect is a reasonable Story 0 addition. The key constraint is that Story 0 establishes what all subsequent stories depend on — it's the shared foundation, not a feature delivery.

Use judgment. If something needs TDD, it probably belongs in Story 1. If it's verifying that the infrastructure from Story 0 is wired correctly, it can live in Story 0 with a simplified prompt structure.

Use these defaults for smoke tests:
- Include smoke tests in Story 0 when they validate shared wiring (boot, connectivity, required env/config).
- Skip smoke tests in Story 0 when they would validate feature behavior better covered by Story 1+ TDD.
- Keep Story 0 smoke coverage minimal; this is a foundation check, not feature verification.

### Story 0 Prompt Structure

Story 0 uses a simplified prompt structure:

```
story-0-foundation/
├── story.md
├── prompt-0.1-setup.md      # Creates all infrastructure
└── prompt-0.R-verify.md     # Verifies setup complete (typecheck passes)
```

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

- **Functional coherence** — ACs that belong together because they describe a single user capability
- **Dependency sequencing** — What must exist before this work can begin
- **Scope manageability** — Enough work to be meaningful, not so much that it's unwieldy
- **Project pragmatics** — Team size, parallelization opportunities, risk isolation

The tech design's chunk breakdown may inform this grouping — chunks often align with natural story boundaries because both are reasoning about logical units of work. But the story doesn't mechanically derive from chunks. Sometimes a chunk splits across stories, or multiple chunks merge into one story, or the sequencing differs from the tech design's ordering.

### Story Types

**Story 0: Foundation**
- Establishes shared infrastructure
- Minimal or no TDD cycle
- No feature delivery (or minimal foundational verification)

**Story 1-N: Feature Stories**
- Deliver user-facing functionality
- Full TDD cycle: Skeleton → Red → Green → Gorilla → Verify
- Each story is independently verifiable and acceptable

### Story Structure

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
- Specific capabilities that must exist (not file lists — functional prerequisites)

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

## Technical Context

Brief orientation — what modules, components, or subsystems are involved. Not
implementation detail; that's in the tech design. Just enough for a reader to
understand what part of the system this story touches.

- **Key modules:** [e.g., "session routes, Convex session persistence, session business logic"]
- **Tech Design reference:** [pointer to relevant tech design sections]

## NFRs

- [Performance, latency, or operational requirements specific to this story]

## Definition of Done

- [ ] [Functional outcome 1 — verifiable from the AC/TC list]
- [ ] [Functional outcome 2]
- [ ] All acceptance criteria test conditions pass
```

### Why Full AC/TC Detail in Stories

The story is the acceptance artifact. If TCs are reduced to one-line summaries ("AC-2.5: Duplicate entries rejected"), a PO can't accept from the story alone — they need the epic open to see what "rejected" actually means. Full Given/When/Then detail makes the story self-contained for acceptance.

Stories may refine or add specificity to the epic's TCs. A story TC can be more implementation-aware than the epic's version ("Given: A session exists; request contains one `user-message` entry and one `assistant-message` entry") because the story is closer to the work. The epic's TC is the source; the story's TC is the acceptance-ready version for this scope.

---

## Integration Path Trace (Required)

After defining all stories and before writing prompts, trace each critical end-to-end user path through the story breakdown. This catches cross-story integration gaps that per-story AC/TC coverage cannot detect.

Per-story validation checks whether each story is internally complete — ACs covered, scope defined, prerequisites met. It does not check whether the *union* of all stories produces a connected system. A relay module, a bridge between subsystems, a glue handler that routes messages — these can fall through the cracks when each story takes one side of the boundary and no story owns the seam.

### How to Trace

1. List the 1-3 most important user paths (from the epic's flows)
2. Break each path into segments (each arrow in the sequence diagram)
3. For each segment, identify which story owns it
4. Verify at least one TC in that story exercises the segment

Any segment with no story owner is an integration gap. Fix before proceeding to prompts.

### Format

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Client → POST /sessions | Create session | Story 1 | TC-1.1a |
| Client → POST /sessions/:id/turns | Ingest turn | Story 2 | TC-2.1a |
| Ingestion → Redis DEL | Cache invalidation | Story 2 (impl) / Story 3 (verification) | TC-3.2d |
| Client → GET /sessions/:id/history | Retrieve history | Story 3 | TC-3.1a |
| History → Redis check | Cache hit | Story 3 | TC-3.2b |
| History → Convex fallback | Cache miss | Story 3 | TC-3.2a |
| WS → portlet | Shell relays to iframe | ??? | ??? |

Empty cells ("???") are integration gaps. They block prompt writing.

### Why Per-Story Checks Don't Catch This

Story-level validation asks: "Are this story's ACs covered?" These are within-story completeness checks. The Integration Path Trace is a cross-story coverage check — does every segment of the critical user path have a story owner? A tech design can perfectly describe how components interact while no story actually owns implementing the glue between them.

---

## Prompt Pack Creation

### Model Capability Assumption

These prompts assume capable models — GPT-5.3 Codex, Opus 4.6, Sonnet 4.6. These models can read multiple documents, synthesize context across them, and make pragmatic decisions in the spirit of the project. The prompt philosophy below trusts agents to operate with judgment rather than micromanaging every step.

For less capable models, more low-level prescription may be required: inlining interface definitions verbatim, spelling out verification steps, providing complete code rather than directives. Scale the prompt detail to the model's capability.

### Prompt Philosophy: Context + Task, Not Micromanagement

Prompts give the implementing agent two things: **shared context** (product, project, references) and a **clear task** (what to do in this phase). The agent reads the story, epic, and tech design to build understanding, then executes the task with enough autonomy to make pragmatic decisions.

This is a deliberate trade: execution precision for agent autonomy. Agents with full document context make better decisions than agents executing inlined instructions mechanically. They understand *why* the design makes certain choices, not just *what* to implement. When they hit ambiguity, they can resolve it in the spirit of the project rather than stopping cold on a missing detail.

The prompt does NOT try to extract and inline everything the agent needs from the source documents. Instead, it provides the context block, directs the agent to read the source documents, and focuses the task section on what's specific to this phase.

### What to Inline vs. What to Reference

**Inline in the task section** — anything specific to this phase that the agent needs immediately:
- Which TCs to write tests for (Red phase)
- Key constraints or scope boundaries specific to this phase
- Task-specific code snippets where the exact implementation matters

**Reference and instruct to read** — the broader context:
- Product and project orientation
- The story (scope, acceptance criteria)
- The epic (functional requirements, data contracts)
- The tech design (interfaces, module structure, verification scripts, test mapping)

The agent reads these documents to build understanding. They don't need every interface definition copied into the prompt — they read the tech design's Low Altitude section directly.

### The Shared Context Block

Every prompt for a story shares the same context block. This is identical across skeleton-red, green, and verify prompts for the same story. It orients the agent in the product, project, and technical landscape.

```markdown
# Prompt N.X: [Phase Name] — Story N: [Title]

## Product Context

[Brief product summary — what the product is, what it does, who it serves.
2-3 sentences. Same across all prompts in the project.]

## Project Context

[Project status — which epic, what's been completed, what's in progress.
Current state of the codebase. Stack and key technologies.
Updated per story as the project progresses.]

## References

Read these documents before beginning work. They provide the functional
requirements, acceptance criteria, and implementation details you need.

- **Story:** [path/to/story-N.md] — Scope and acceptance criteria for this unit of work
- **Epic:** [path/to/epic.md] — Functional requirements, data contracts, user flows
- **Tech Design:** [path/to/tech-design.md] — Implementation details, interfaces, module
  boundaries, test mapping, verification scripts

**Working Directory:** /absolute/path/to/project

**Prerequisites:**
- Story N-1 is complete
- [Any specific prerequisite state]
```

### Phase-Specific Task Sections

After the shared context block, each prompt type has its own task section. These are lighter than you might expect — the agent has read the source docs and understands the full context.

**Story 0 — Setup:**

```markdown
## Task: Foundation Setup

Set up the project infrastructure as described in the tech design.
This includes type definitions, error classes, test fixtures, Zod schemas,
project config, and any foundational modules (Redis wrapper, Convex schema, etc.).

No TDD cycle. Focus on getting the foundation right so subsequent stories
can build on it.

When complete, run the project's format + lint + typecheck pipeline.
Everything should compile clean.
```

**Skeleton + Red:**

```markdown
## Task: Skeleton + Red

Create stubs and write tests for this story's acceptance criteria.

1. Create file stubs for all modules in this story's scope. Stubs throw
   NotImplementedError — no implementation logic.
2. Write tests for the TCs listed in the story. Tests assert real behavior
   (not NotImplementedError). Tests will ERROR because stubs throw — that's
   expected and correct.
3. Run the project's red-verify pipeline (format + lint + typecheck).
   Tests are NOT run at this stage.
4. Commit your work before proceeding to Green.

[Any story-specific guidance — e.g., "The turn ingestion route needs
both Zod validation tests and business logic tests. See the tech design's
Flow 2 for the four validation stages."]
```

**Green:**

```markdown
## Task: TDD Green

Implement to make the Red tests pass.

Red tests are the behavioral contract. Do NOT modify test files. Implement
real logic to satisfy the tests as written. If a test seems wrong, stop and
surface it to the orchestrator rather than editing the test.

When all tests pass, run the project's green-verify pipeline (full verify +
confirm no test files were modified).

[Any story-specific implementation notes — e.g., "Cache invalidation on
the ingestion path is best-effort. Redis failures must be caught and
swallowed per the tech design's resilience contract."]
```

**Verify:**

```markdown
## Task: Verification

Audit the implementation against the story's acceptance criteria and the
tech design.

These gates are the minimum; also look for unexpected regressions or
mismatches with spec/contract beyond this list.

File-touch allow-lists are optional — include them only when they add signal for
this story. If included, treat deviations as audit inputs: require explanation
and a brief risk assessment, and do not fail solely because extra files were
touched unless it introduces regressions, spec drift, or unjustified scope
expansion.

Run the full verification pipeline. Check each TC from the story. Verify
the implementation follows the tech design's patterns and constraints.

If any test files were modified during Green, review git history on those
files to confirm changes preserved AC/TC intent rather than weakening checks.

Run a shim/fudge audit as a required gate:

- Flag temporary shims/placeholders in non-test code presented as final behavior
- Flag internal-module mocking that bypasses real in-process integration
- If any shim is intentionally temporary, require explicit owner + removal condition

Report: PASS or FAIL with TC-by-TC status, plus shim audit status and findings.
```

### If Blocked or Uncertain

All prompts should include this guidance (in the shared context or as a standing instruction):

- If you encounter inconsistencies between documents — **stop and ask** before proceeding
- If something doesn't line up — surface it rather than silently resolving it
- If you are blocked — document what you attempted and what you think the resolution is, then return to the orchestrator
- Make pragmatic decisions in the spirit of the project and design. Not every micro-decision needs escalation. But inconsistencies between spec artifacts do.

### Prompt Anti-Patterns

| Bad | Better |
|-----|--------|
| "Create the component similar to before" | Clear task with specific scope |
| "See tech design for details" (vague hand-wave) | "Read the tech design's Flow 2 section for the ingestion validation stages" (specific direction) |
| "Make sure it works correctly" | "Run `bun run green-verify` — all tests should pass" |
| Inlining the entire tech design into the prompt | Reference + specific reading directions |
| Prescribing every verification step | State the principle + the verification command |

---

## Prompt Validation

Before giving prompts to Senior Engineer, validate them. At minimum: self-review for completeness, then have a fresh agent confirm they can execute from the prompt plus required references (story, epic, tech design) without conversation history.

For the full validation pattern — dual-validator, parallel validation, fix cycles, and consolidation — use the Execution Orchestration guidance in Phase 5 (`/ls-impl`) for this project.

### Final Dual Verification Gate (Required Before Execution)

After all stories are sharded and all prompt packs are written, run one final
feature-level dual verification pass before launching implementation sessions.
This is the final round of verification and edits in Phase 4.

Use two models in parallel:

1. **Codex validator** (`gpt-5.2-codex` or newer available Codex model): detailed,
   cross-story gap audit
2. **Opus validator** (Opus 4.5+): verifies findings and synthesizes final gate
   decision

These are minimum gates, not the full scope:

- End-to-end AC/TC coherence across all stories and prompts
- Integration seam ownership across story boundaries
- Deferred dependency integrity (no "done later" without explicit owner and valid sequence)
- Prompt/reference coherence (story, epic, tech design pointers are correct and aligned)
- Shim/fudge risk indicators in prompts and expected implementation flow

Both validators are expected to find additional issues beyond this list. Do not
constrain review to checklist-only auditing.

If either validator returns blockers or unresolved major issues:

1. Consolidate findings
2. Apply edits to stories/prompts
3. Re-run the dual verification gate

Do not move to execution until this gate returns **READY**.

---

## TDD Principles in Prompts

The TDD cycle depends on a few non-negotiable principles. These should be communicated in prompts as principles the agent follows, not as step-by-step verification scripts.

### Red Phase Principles

- Tests assert real behavior, never NotImplementedError
- The full quality pipeline (format, lint, typecheck) must pass — tests are the only thing expected to fail
- Commit before Green — this creates the audit trail and rollback point between the test contract and the implementation
- After Red, the orchestrator sends the standard Red Self-Review follow-up

### Green Phase Principles

- **Red tests are immutable.** They are the behavioral contract. Implement to satisfy them, not to change them.
- If a test seems wrong, stop and surface it rather than editing the test
- The verification pipeline must pass including a test-immutability check
- After Green, the orchestrator sends the standard Green Self-Review follow-up

### Verify Phase Principles

- Checklist gates are the minimum — also look for unexpected regressions or mismatches beyond the checklist
- If test files were modified during Green, the verifier reviews git history to confirm changes preserved AC/TC intent
- Shim/fudge detection is required in verification; surface and fail unresolved shim risks
- The verifier operates with an auditor's lens, not a builder's

---

## Orchestration

Execution starts only after the Final Dual Verification Gate returns **READY**
and all required edits are complete.

### Launching Senior Engineer Sessions

For each story:
1. Provide Skeleton+Red prompt → Fresh session executes
2. Verify Red state (tests ERROR)
3. Send **Red Self-Review prompt** in the same implementation session
4. If self-review verdict is ready, provide Green prompt
5. Verify Green state (tests PASS)
6. Send **Green Self-Review prompt** in the same implementation session
7. If self-review verdict is ready, proceed to Gorilla + Verify
8. Human does Gorilla testing
9. Provide Verify prompt → Fresh session validates
10. Story complete

### Standard Self-Review Follow-ups (Required)

After `prompt-N.1-skeleton-red.md`, the orchestrator sends this prompt in the same session:

```text
You just completed the skeleton-red phase. Now do a thorough critical
review of your own implementation.

If you find issues and the fix is not controversial or requiring a
judgment call, fix them. Then report back: what issues you encountered,
what you fixed, and any issues you encountered but didn't fix and why.

Do a thorough assessment for readiness to move to the tdd-green phase.
```

After `prompt-N.2-green.md`, the orchestrator sends this prompt in the same session:

```text
You just completed the tdd green phase. Now do a thorough critical
review of your own implementation.

If you find issues and the fix is not controversial or requiring a
judgment call, fix them. Then report back: what issues you encountered,
what you fixed, and any issues you encountered but didn't fix and why.

Do a thorough assessment for readiness to move to the full story dual verification phase.
```

### Handling Issues

**Story blocked:** Document blocker, skip to unblocked work if possible, escalate to human.

**Ground-level discovery:** Senior Engineer found spec gap → document, get human approval, update spec if needed.

---

## Test Tracking

### Regression Prevention

Previous stories' tests must keep passing. If Story 2 breaks Story 1 tests, that's a regression — stop and fix before proceeding. This is a hard rule regardless of how test counts are tracked.

### Running Totals as Orchestration Concern

The orchestrator may track cumulative test counts across stories as a progress indicator. These counts are derived from the tech design's TC-to-test mapping — they're not authored in stories.

A note on precision: exact test count enforcement can cause implementation churn when verifiers are pedantic about natural adaptation. Tests split, merge, or discover edge cases during implementation. A story that expected 20 tests delivering 19 or 21 with equivalent or better coverage is not a failure — it's normal adaptation. Track totals as a sanity check, not as a gate that blocks on exact counts.

```
Story 0 (foundation): 0-5 smoke tests (only for foundational wiring checks)
Story 1: ~25 tests
Story 2: ~50 tests (cumulative)
Story 3: ~75 tests (cumulative)
```

The "~" is intentional. Approximate totals catch real problems (a story claiming 20 tests that delivers 5) without creating false alarms on natural drift.

These totals are illustrative planning checks, not acceptance targets or quotas.

---

## Impl vs Verifier Prompts

Same reference info, same context. Different role and focus.

| Prompt Type | Focus | Lens |
|-------------|-------|------|
| Implementation | Create/modify code | Builder |
| Verification | Check against spec | Auditor |

The verifier prompt should use a thorough, detail-oriented model. The point is to catch what builders miss.

---

## Iteration is Expected

- Engineer finding own issues → iterate
- Verifier finding issues → iterate
- Multiple rounds is normal, not failure

Don't expect one-shot perfection. The structure supports iteration.

---

## Output: Stories + Prompt Packs

For a typical feature, you produce:
- Story 0: Foundation setup
- Stories 1-N: Feature stories with full acceptance criteria
- Each story has: story.md (acceptance artifact), skeleton-red prompt, green prompt, verify prompt, and two inline self-review follow-ups (post-Red and post-Green)

Prompts share a consistent context block across all phases. Agents read the story, epic, and tech design directly — the prompt provides orientation and a clear task, not an extracted copy of the source documents.

---

# Prompt Writing Reference

## Prompt File Structure

### Foundation Story (Story 0)

```
story-0-foundation/
├── story.md
├── prompt-0.1-setup.md      # Creates all infrastructure
└── prompt-0.R-verify.md     # Verifies setup complete
```

**Deliverables:** Types, fixtures, error classes, project config, test utilities.

### Feature Story (Story 1+)

```
story-N-{description}/
├── story.md
├── prompt-N.1-skeleton-red.md   # Stubs + tests
├── prompt-N.2-green.md          # Implementation
└── prompt-N.R-verify.md         # Verification
```

Operational follow-ups (not separate files):
- Post-Red self-review prompt (same implementation session)
- Post-Green self-review prompt (same implementation session)

---

## TC Traceability in Tests

Tests written for a story should reference TC IDs from the story's acceptance criteria. This maintains the confidence chain from requirement to test to implementation.

```typescript
describe("POST /sessions/:id/turns", () => {
  // TC-2.1a: Single-message turn persisted
  test("persists user-message and assistant-message entries", async () => {
    // ...
  });

  // TC-2.7b: Duplicate turnSequenceNumber rejected
  test("returns 400 OUT_OF_ORDER_TURN for duplicate sequence", async () => {
    // ...
  });
});
```

The TC ID in the comment traces from the test back to the story's acceptance criteria, back to the epic's requirement.

---

## Key Principles

1. **Context-rich** — Agents read the story, epic, and tech design. They operate with full understanding, not extracted fragments.
2. **Task-focused** — The prompt is clear about what to do in this phase. The context documents provide the how and why.
3. **Autonomous** — Agents make pragmatic decisions in the spirit of the project. Not every micro-decision needs escalation.
4. **Traceable** — TC numbers in test comments link back to story and epic.
5. **Verifiable** — Clear pass/fail criteria. Run the verification pipeline, report the result.
6. **Escalation on conflict** — Inconsistencies between documents get surfaced, not silently resolved.
