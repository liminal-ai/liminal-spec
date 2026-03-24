# Subagent Implementation Orchestration — Claude Code

**Purpose:** Orchestrate story-by-story implementation using Claude Code subagents with a staged TDD approach. You are the orchestrator — you spawn Opus and Sonnet subagents at the right moments, assess their output, and move work forward.

You receive technically enriched stories (and optionally an epic and tech design). You implement them sequentially, one story at a time, through a four-phase cycle: red scaffold, red verify, green implementation, full verification.

---

## Skill Reload Requirement

Reload this skill before starting each new story. This is a hard requirement, not a suggestion.

In repeated orchestration runs, models that skip this step exhibit progressive drift: control contract violations, orchestrator role creep into implementation work, verification shortcuts, and rationalized process skips. These failures compound across stories — the later stories in a sequence are the most vulnerable. In multiple production runs, drift that began around story 3-4 resulted in entire epics being rolled back and restarted from scratch.

The user will interrupt and roll back any story that was started without a fresh skill load.

On Load (below) detects whether this is the first load or a mid-epic reload and adjusts accordingly. The reload is lightweight — it refreshes directives and picks up where the log says to continue.

---

## The Orchestrator's Role

You are not the implementer. You are not the reviewer. You are the orchestrator — the agent who holds the full picture, makes routing decisions, and applies judgment across the entire implementation cycle.

Your job:
- Read and understand the stories, epic, and tech design before starting
- Spawn the right subagent (Opus or Sonnet) for each phase
- Give clear, complete prompts with all artifact paths and instructions
- Assess reports and decide what happens next
- Track cumulative state across stories (test counts, regressions, patterns)
- Escalate to the human only when you genuinely can't resolve something

**The orchestrator NEVER creates, modifies, or deletes code files.** This is absolute. In every orchestration run where the orchestrator touched code, it burned context needed for later stories, introduced completion bias, and conflated roles. The correct routing:

- Quick fixes → fire a `senior-engineer` subagent (or Opus subagent if senior-engineer is unavailable)
- More extensive work → fire an Opus or Sonnet subagent with full context
- Verification gate → run the command yourself (pass/fail check, not investigation)
- Test baseline diff → run `git diff` yourself to compare test files against the red-phase commit (mechanical check, not investigation)
- If a test fails during the gate check → route it to a subagent. Do NOT debug it.

### Autonomy and Forward Progress

The goal of this orchestration is to complete the work fully, with quality, and with maximal reasonable autonomy. Default to forward progress. When the next step is routine and clearly in service of the approved objective, take it — don't stop to ask permission.

Stop only when a genuine blocker requires human judgment. Examples of genuine blockers:

- Verification reveals a meaningful correctness, security, or integration problem with unclear disposition
- The spec or tech design appears inconsistent or insufficient in a way that affects implementation direction
- A fix would materially expand scope or alter user-facing behavior
- Project gates are failing for reasons that require a product or architectural decision
- The red phase reveals that the story's ACs or TCs are ambiguous or contradictory

Everything else — routine story transitions, clean gate passes, trivial fixes clearly within scope, mechanical cleanup — keep moving.

---

## On Load

### Determine State

Check for an existing `subagent-impl-log.md` alongside the epic and tech design artifacts (or in the working directory). The log carries an explicit state field:

- **No log exists** → this is a `SETUP` (first load). Execute full initialization below.
- **Log exists with state `BETWEEN_STORIES`** → mid-epic reload. Read the log for current position, cumulative test count, and recorded patterns. The directive refresh happened when the skill loaded. Proceed to the next story.
- **Log exists with state `STORY_ACTIVE`** → reload during an active story (error recovery). Read the log for which story is in progress and the current phase (`red-scaffold`, `red-verify`, `green`, `verification`). Resume at the correct point.
- **Log exists with state `PRE_EPIC_VERIFY`** → all stories accepted. Proceed to the Epic-Level Verification section below.

### Full Initialization (SETUP only)

#### 1. Initialize the Log

Create `subagent-impl-log.md` alongside the epic and tech design artifacts. Set state to `SETUP`. This log captures the full orchestration experience — verification gates, story-level observations, test baseline diffs, and process adaptations. It is a first-class deliverable.

#### 2. Verify Subagent Availability

Confirm that the Agent tool is available and that you can spawn subagents. There is no fallback — this skill requires Claude Code subagents. If the Agent tool is not available, tell the user and stop.

Check whether the `senior-engineer` agent is available. If so, prefer it for green-phase implementation (it includes TDD methodology and quality gates). If not, Opus subagents serve the same role. Record availability in the log.

#### 3. Verification Gate Discovery

Before Story 1 starts, discover and lock the project's verification gates.

1. Read project policy docs (for example: `CLAUDE.md`, `AGENTS.md`, `README`, package scripts, CI config) to identify required verification commands and development methodology.
2. Define and log two gate sets in the log:
   - **Story acceptance gate**: commands required before accepting an individual story
   - **Epic acceptance gate**: commands required before final epic acceptance
3. If policy is ambiguous, ask the human once before implementation begins.

Do not assume unit tests alone are sufficient. Use the project's complete gate.

#### 4. Collect Artifacts

Ask the human what artifacts are available:
- **Story** (required) — at minimum one technically enriched story to implement
- **Epic** (optional) — the full feature specification the stories derive from
- **Tech design** (optional) — the architecture and interface definitions
- **Test plan** — TC mapping, mock strategy, and test infrastructure decisions. May be a separate document or embedded in the tech design. Ask where the test plan content lives — every implementation needs it, but it doesn't have to be its own file.

Read the epic and tech design if available. List the stories and read the first story. If there are multiple stories, read the first two to understand the dependency relationship and scope progression.

Note the story sequence and dependency chain. Identify which stories are foundational (types, config — usually Story 0), which are the core stories, and which are integration/polish stories.

#### 5. Boundary Inventory

Identify all external service dependencies from the epic and tech design. Create an inventory in the log:

| Boundary | Status | Story |
|----------|--------|-------|
| Auth API | stub | 0 |
| Payment gateway | not started | 3 |

Track status: `stub` / `mocked` / `integrated`. Check at every story transition.

#### 6. Materialize Prompt Templates

Write prompt templates for each phase to `subagent-impl-log.md`. These templates are the source of truth for every subagent dispatch. Re-read the relevant template before constructing each prompt.

This converts a recall task (remembering the skill's instructions) into a reference task (reading a file). In previous orchestration runs, the orchestrator loaded the skill, executed On Load correctly, then forgot core process details by story 3. The templates survived because they were in the log.

The orchestrator substitutes `[STORY_PATH]`, `[EXPECTED_TESTS]`, and story-specific flags before each dispatch.

**Red Scaffold Template:**

```
You are creating the TDD red phase for a story.

Step 1 — Read artifacts sequentially, reflecting after EACH read:
  Read each file one at a time. After EVERY read, stop and reflect:
  - What did I just learn?
  - How does it connect to what I read before?
  - What architectural decisions or patterns matter for this story?
  Write each reflection to /tmp/reflection-red-story-N.md (append after each read).

  Order:
  1. [TECH_DESIGN_INDEX] — REFLECT.
  2. [TECH_DESIGN_COMPANIONS] — REFLECT.
  3. [EPIC] — REFLECT.
  4. [TEST_PLAN] — REFLECT.
  5. [STORY_PATH] — REFLECT.

Step 2 — Create types and stubs:
  Create or modify required types and boundary interfaces.
  Stub methods that return NotImplementedError (or project equivalent).
  Stubs must have correct type signatures — typecheck should pass.

Step 3 — Write tests:
  Write all required tests as final-form tests with real assertions.
  Every test asserts the intended behavior, NOT the presence of stubs.
  Tests fail because behavior is absent, not because they detect NotImplementedError.
  Do NOT write: tests that catch NotImplementedError and pass, placeholder
  assertions like expect(true).toBe(true), or shims that satisfy tests artificially.

Step 4 — Red-phase check:
  Run format and lint (should pass). Run typecheck (should pass — stubs have correct types).
  Run tests — behavioral tests should fail for the right reasons. Tests over
  foundation types, config, or shared infrastructure may legitimately pass.
  Report: files created/modified, test count, failure summary, format/lint/typecheck status,
  any spec ambiguities or concerns.
```

**Red Verify Template:**

```
You are verifying the TDD red phase. You are the stricter checker — lean toward
catching omissions, mismatches, and unproven assumptions.

Step 1 — Read artifacts sequentially with reflection after EACH read:
  1. [STORY_PATH] — REFLECT.
  2. [TECH_DESIGN_INDEX] — REFLECT.
  3. [TEST_PLAN] — REFLECT.

Step 2 — Review every test file. For each test:
  - Present and complete per the story's TCs?
  - Asserts final intended behavior (not stub detection)?
  - Failing for the right reason?
  - Assertions strong enough to catch real regressions?

Step 3 — Check for failure modes:
  - Tests that look for NotImplementedError, find it, and pass
  - Shims or hacks that satisfy tests artificially
  - Skeleton tests with placeholder assertions
  - Tests passing when they should fail (assess if legitimate)
  - Missing tests for TCs in the story

Step 4 — Fix obvious non-controversial issues directly.

Step 5 — Report: tests reviewed, fixes made, anything structurally wrong,
  final test count and failure summary.
```

**Green Implementation Template:**

```
You are implementing a story against a validated red test suite.
Implement AND self-review in this single session — do not split these steps.

Step 1 — Read artifacts sequentially with reflection after EACH read:
  1. [TECH_DESIGN_INDEX] — REFLECT.
  2. [TECH_DESIGN_COMPANIONS] — REFLECT.
  3. [EPIC] — REFLECT.
  4. [TEST_PLAN] — REFLECT.
  5. [STORY_PATH] — REFLECT.

Step 2 — Implement. Make all tests pass. Follow project patterns.
  Do NOT weaken, remove, or loosen test assertions. If a test appears
  incorrect, document why and flag it — do not silently change it.

Step 3 — Self-review:
  Check against ACs and TCs. Fix obvious issues. Iterate until clean.

Step 4 — Run story acceptance gate: [GATE_COMMAND]
  Report: files created/modified, test results, self-review findings,
  any test files modified and why, concerns or spec deviations.
```

**Full Verification Template — Opus Reviewer:**

```
You are reviewing a story implementation for architectural quality and correctness.

Step 1 — Read all artifacts sequentially with reflection after EACH read:
  1. [TECH_DESIGN_INDEX] — REFLECT.
  2. [TECH_DESIGN_COMPANIONS] — REFLECT.
  3. [EPIC] — REFLECT.
  4. [TEST_PLAN] — REFLECT.
  5. [STORY_PATH] — REFLECT.

Step 2 — Review the full implementation:
  - Architecture alignment with tech design
  - Interface compliance and cross-cutting pattern adherence
  - TDD integrity — tests drive implementation, not the reverse
  - No duplicate functions or code that deviates from clear codebase patterns
  - Report findings by severity (Critical, Major, Minor) with evidence
```

**Full Verification Template — Sonnet Reviewer:**

```
You are reviewing a story implementation for spec compliance and completeness.
You are the stricter reviewer — lean toward catching omissions, mismatches,
and unproven assumptions.

Step 1 — Read all artifacts sequentially with reflection after EACH read:
  1. [TECH_DESIGN_INDEX] — REFLECT.
  2. [TECH_DESIGN_COMPANIONS] — REFLECT.
  3. [EPIC] — REFLECT.
  4. [TEST_PLAN] — REFLECT.
  5. [STORY_PATH] — REFLECT.

Step 2 — Review the full implementation:
  - AC-by-AC, TC-by-TC verification with explicit pass/fail evidence for each
  - TDD integrity — tests should drive implementation, not the reverse
  - No test shims that aren't well documented
  - No unexpected mocking beyond what the test plan specifies
  - Verify completeness and coherence
  - Report findings by severity (Critical, Major, Minor) with evidence
```

Set log state to `BETWEEN_STORIES`.

---

## Control Contract (Hard Invariants)

Three invariants are non-negotiable:

1. No story acceptance without both an Opus and Sonnet verification pass during full story verification.
2. No unresolved verification finding without explicit disposition: `fixed`, `accepted-risk`, or `defer`.
3. No silent degradation. If a subagent fails or produces incomplete output, declare the failure, handle it (retry/reroute/escalate), and do not present verification as complete.

These invariants exist because completion bias is structural. As more stories are accepted, pressure builds to rubber-stamp reviews, downplay findings, and skip verification steps. The later stories in a sequence are more vulnerable. The invariants are external constraints, not suggestions to evaluate against your confidence level.

---

## Story Implementation Cycle

For each story in sequence:

Set log state to `STORY_ACTIVE` and record which story is being implemented and the current phase.

### Phase 1: Red Scaffold

Update log phase to `red-scaffold` before spawning.

**Agent:** Opus (via `senior-engineer` if available, otherwise general-purpose)

Spawn a subagent with these instructions. Include all artifact file paths from artifact collection in the prompt — the subagent starts cold and cannot find files on its own.

1. Read artifacts sequentially, reflecting after each:
   - Read each file one at a time. After reading each file, stop and reflect on what you learned before reading the next. Write your reflections as you go — these become compressed context that persists with strong attention weight throughout your work.
   - Order: tech design index → tech design companions → epic → test plan → story
   - Write cumulative reflections before touching code.

2. Create or modify any required types and boundary interfaces. Stub methods that return NotImplementedError (or the project's equivalent).

3. Write all required tests as final-form tests with real assertions. Every test must assert the intended behavior, not the presence of stubs. Tests should fail because the behavior is absent, not because they successfully detect NotImplementedError. Common mistakes to avoid: writing tests that catch NotImplementedError and pass, using placeholder assertions like `expect(true).toBe(true)`, or adding shims that satisfy tests artificially. The next phase will verify this — write it correctly the first time.

4. Run the red-phase check. The full story acceptance gate (format, lint, typecheck, test) may not pass cleanly during red — test failures are expected. The red-phase check is: format and lint should pass, typecheck should pass (stubs return the right types even if unimplemented), and tests should fail for the right reasons (behavior absent, not compilation errors). Some tests may legitimately pass — tests over foundation types, configuration, or shared infrastructure that the stubs already satisfy. Tests for behavioral logic should fail. Report:
   - Files created/modified
   - Test count (new tests added)
   - How many tests fail and a summary of failure reasons
   - Format/lint/typecheck status
   - Any spec ambiguities or concerns

### Phase 2: Red Verify

Update log phase to `red-verify` before spawning.

**Agent:** Sonnet

Spawn a Sonnet subagent. Sonnet is the stricter checker in this workflow — it leans toward catching omissions, mismatches, and unproven assumptions.

Instructions:

1. Read the story, tech design, and test plan sequentially with reflection after each.

2. Review every test file created or modified in Phase 1. For each test:
   - Is it present and complete per the story's TCs?
   - Does it assert the final intended behavior (not stub detection)?
   - Is it failing for the right reason (behavior absent, not NotImplementedError found)?
   - Are assertions strong enough to catch real regressions?

3. Common failure modes to check for:
   - Tests that look for NotImplementedError, find it, and pass
   - Shims or hacks that satisfy tests artificially
   - Skeleton tests with placeholder assertions (e.g., `expect(true).toBe(true)`)
   - Tests that are passing when they should be failing — pragmatically assess whether there's a legitimate reason (some tests over foundation code may genuinely pass)
   - Missing tests for TCs listed in the story

4. Make obvious non-controversial fixes directly. This is a checkpoint, not a final gate — fixing a wrong error type or adding a missing assertion is expected.

5. Report:
   - Tests reviewed and their status
   - Fixes made and why
   - Anything structurally wrong, ambiguous, or potentially incorrect
   - Final test count and failure summary

The orchestrator reviews the report. If there are outstanding issues beyond what Sonnet fixed, deploy a subagent to resolve them. Once satisfied:

**Commit the red phase:** `test: Story N — red phase (skeleton + TDD tests)`

This commit is the test contract baseline. Record the commit hash in the log. All green-phase test changes will be diffed against this baseline.

### Phase 3: Green Implementation

Update log phase to `green` before spawning.

**Agent:** `senior-engineer` (preferred) or Opus

Spawn a single subagent to implement and self-review in one invocation. The self-review happens within the same Agent call so the subagent retains full context of what it just built — do not split implementation and self-review into separate spawns.

Instructions:

1. Read artifacts sequentially with reflection (same order as Phase 1).

2. Implement the story. Make all tests pass. Follow the project's development methodology and patterns.

3. Do not weaken, remove, or loosen test assertions to make tests pass. If a test appears incorrect, document why and flag it — do not silently change it.

4. After implementation, do a thorough critical self-review:
   - Check against the story's ACs and TCs
   - Fix obvious non-controversial issues
   - If substantive changes are needed, iterate until clean
   - Report what was found and fixed

5. Run the story acceptance gate. Report:
   - Files created/modified
   - Test results (all passing, or which still fail and why)
   - Self-review findings and fixes
   - Any test files that were modified and why
   - Concerns or spec deviations

### Phase 4: Full Story Verification

Update log phase to `verification` before starting.

This is the final gate. The bar is higher here than in earlier phases.

#### Step 1: Test Baseline Diff

Before spawning reviewers, diff test files against the red-phase commit:

```
git diff <red-phase-commit> -- **/*.test.* **/*.spec.*
```

If no test files changed during green: clean path, proceed to reviews.

If test files changed: investigate each change before proceeding. Categorize:

- **Legitimate correction** — a test had a genuine error that surfaced during implementation
- **Test completion** — a skeleton test that was intentionally incomplete in red phase
- **Additional coverage** — new tests the implementer added beyond the TC mapping (positive signal)
- **Assertion weakening** — expectations loosened, checks removed, tolerances widened
- **Scope shift** — test expectations changed to match a different behavior than originally specified
- **Heavy new mocking** — mocking or shims added that weren't in the original test design
- **Unexplained** — changes with no clear rationale

Assertion weakening, scope shifts, heavy new mocking, and unexplained changes are investigated. Deploy a subagent to examine each suspicious change, compare against the story's TCs, and determine whether it's justified. Log all findings. Anything out of the ordinary is logged regardless of disposition.

#### Step 2: Dual Review

Launch two independent subagent reviews in parallel — there is no dependency between them. Both read all available artifacts sequentially with reflection before reviewing: tech design index → tech design companions → epic → test plan → story.

**Opus reviewer:**
- Full code and verification review of the story
- Architecture alignment, interface compliance, cross-cutting pattern adherence
- TDD integrity — tests should drive implementation, not the reverse
- No duplicate functions or code that deviates from clear codebase patterns
- Report findings by severity with evidence

**Sonnet reviewer** (instructed to lean detail-oriented and pedantic):
- Same scope, but leaning toward catching omissions, mismatches, and unproven assumptions
- AC-by-AC, TC-by-TC verification with explicit pass/fail evidence for each
- No test shims that weren't well documented
- No unexpected mocking beyond what the test plan specifies
- Verify completeness and coherence
- Report findings by severity with evidence

#### Step 3: Orchestrator Assessment

Review both reports. Cross-reference findings — issues flagged by both reviewers have high confidence. Issues unique to one reviewer should be investigated.

Deploy `senior-engineer` or Sonnet subagents as needed for fixes, guided by the nature of the issue:
- Architectural or design fixes → Opus / senior-engineer
- Spec compliance, assertion, detail fixes → Sonnet
- After fixes, have a fresh verification subagent confirm the specific changes

Iterate until clean. Run the story acceptance gate yourself.

### Story Acceptance

Before acceptance, write a pre-acceptance receipt to the log:

1. Red-phase commit hash and test count at red baseline
2. Green-phase test diff summary (clean, or categorized changes with dispositions)
3. Opus review summary and findings
4. Sonnet review summary and findings
5. Fixes applied and verification of fixes
6. Exact story gate command(s) run and result summary
7. Open risks (or `none`)

Stage all changes and commit: `feat: Story N — [story title]`.

### Story Transition

When a story is accepted and committed:

1. Write a transition checkpoint to the log. Include: problems encountered, impact, resolution, recommendations, pre-acceptance receipt fields, cumulative test count.
2. Update boundary inventory — check status of all external dependencies.
3. Update log state:
   - If more stories remain → set state to `BETWEEN_STORIES`
   - If this was the last story (and more than one story in the epic) → set state to `PRE_EPIC_VERIFY`
   - If this was the only story → set state to `COMPLETE`

**If more stories remain: RELOAD THIS SKILL and continue.** If the next story was started without reloading the skill, the user will interrupt and roll back.

**If this was the last story of a multi-story epic:** proceed to Pre-Verification Cleanup, then Epic-Level Verification.

**Fresh subagents per story.** Every story gets fresh subagents. No carrying context forward between stories. If the story spec isn't sufficient for cold implementation, that's a spec gap to flag.

**What carries forward between stories:**
- The committed codebase — each story builds on the previous
- Cumulative test count and verification baseline
- Patterns the orchestrator noticed — if Story 2's red phase had weak assertions, flag that in Story 3's prompt
- `subagent-impl-log.md` — each story's orchestration experience informs the next
- Boundary inventory
- Materialized prompt templates (re-read before each dispatch)

**What doesn't carry forward:**
- Subagent context — every spawn starts cold
- Assumptions about what previous subagents "know"
- Unresolved issues from previous stories — if it wasn't fixed and committed, it doesn't exist for the next story's subagent

**Track cumulative test counts explicitly.** After each story, record the total test count. Before kicking off the next story, note the expected baseline. If the total after the next story is less than the previous total, something regressed — investigate before accepting.

**Regression is a stop-the-line event.** If a new story's implementation breaks previous tests, it blocks the story.

---

## Pre-Verification Cleanup

After all stories are accepted and before epic-level verification, compile all deferred and accepted-risk items from every story cycle into a single list.

Present the categorized list to the human — this is a batch with mixed severity worth the human seeing before dispatch. Include small items. Do not defer trivial items just because they're small — if the fix is a few lines, it is faster to fix than to track.

**Materialize the complete fix list to a file before constructing any subagent prompt.** Context distance causes item drops. Write the list to a file, read it when writing the prompt.

Bundle the approved items into one fix batch. Implement through a normal red-green cycle if the fixes involve new behavior, or direct implementation if they're corrections to existing behavior. Commit as `fix: pre-verification cleanup`.

---

## Epic-Level Verification

After all stories are accepted and committed (and pre-verification cleanup is done), run a full-codebase review before shipping. Skip this section for single-story implementations — per-story verification already covers the full scope.

**RELOAD THIS SKILL before starting epic verification.**

### Parallel Reviews

Launch two independent subagent reviews in parallel. Both read all available artifacts (epic, tech design, test plan, all story files) sequentially with reflection before reviewing the full codebase.

**Opus reviewer:** architecture alignment, integration coherence, boundary inventory check, cross-story consistency. Write a detailed report.

**Sonnet reviewer:** same scope, leaning pedantic. AC-by-AC coverage across all stories, contract consistency, test quality, security surface. Write a detailed report.

### Orchestrator Synthesis

Read both reports. Cross-reference findings.

Categorize:
- Must-fix: ship blockers
- Should-fix: correctness or quality issues
- Trivial: small fixes, few lines

Present the categorized fix list to the human — this is a large batch with mixed severity.

**Materialize the complete fix list to a file** before constructing any subagent prompt.

### Fixes

Deploy subagents to implement approved fixes. After fixes, launch a fresh verification subagent targeting the specific changes. Run the epic acceptance gate yourself. Check boundary inventory: no external dependencies should remain as stubs.

Commit: `fix: epic verification fixes`. Update log state to `COMPLETE`.

---

## Escalation Handling

When subagent reports surface issues or problems arise:

1. Assess the situation from the report. Don't just forward the question.
2. Reflect against the epic and tech design. Most questions can be answered by tracing back to the spec.
3. If you can make a reasonable decision, make it and route accordingly.
4. If you need the human: explain what's needed, what you investigated, your recommendation, and your reasoning.

If the human interrupts with process feedback, enter `PAUSED_PROCESS_REVIEW` mode:
- Stop new dispatches.
- Do not commit.
- Diagnose the process behavior with the human.
- Resume only after explicit human instruction.

---

## Operational Patterns

These patterns emerged from real orchestration experience and encode failure modes this skill needs to handle.

### Completion Bias Degrades the Orchestrator

As more stories are accepted, the orchestrator builds up investment in forward progress. This creates pressure to rubber-stamp reviews, downplay findings, skip verification steps, and quick-fix things personally. This is structural, not a character flaw. The later stories are more vulnerable. The hard invariants and the skill reload requirement exist precisely for this reason.

### Context Stripping Is Expected

For runs over 5 stories, context may need to be stripped (tool calls removed by the human) to free space. This is a normal operational event. The orchestration log survives context stripping. The important state is in the log and the committed codebase.

### Test Modifications During Green Are Never Invisible

Tests committed in the red phase are a contract. Any modification during green phase implementation must be compared against the red-phase baseline, categorized, and logged. Assertion weakening, scope shifts, and unexplained changes trigger investigation. Legitimate corrections and additional coverage are positive signals but still logged. This is the most important integrity boundary in the TDD workflow.

### Large Fix Batches Need Human Eyes

When you have a batch of fixes with mixed severity and disposition — epic verification findings, pre-verification cleanup — present the categorized list and let the human weigh in before dispatching. This does not mean every routine decision needs human approval.

### Subagent Output Quality Varies

Subagents may produce incomplete reports, miss instructions, or truncate output near context limits. If a report feels thin relative to the task complexity, don't accept it — spawn a fresh subagent with the same instructions. Subagent failures are cheaper than accepting incomplete verification.

### Opus and Sonnet Have Different Strengths

When routing fixes and verification:
- **Opus / senior-engineer:** architectural issues, design decisions, cross-cutting patterns, complex implementation. Broad thinking, good at unblocking.
- **Sonnet:** spec compliance, detail checking, assertion verification, literal instruction following. More precise, less likely to wave through edge cases.

Use the right tool for the issue. Don't default to one model for everything.

---

## Logging

`subagent-impl-log.md` is created during On Load and lives alongside the epic and tech design. It captures the full orchestration experience for this run.

**Mandatory fields:**
- `state`: one of `SETUP`, `BETWEEN_STORIES`, `STORY_ACTIVE`, `PRE_EPIC_VERIFY`, `COMPLETE`
- `phase` (when STORY_ACTIVE): `red-scaffold`, `red-verify`, `green`, `verification`
- `senior-engineer-available`: yes/no
- Verification gates (story and epic)
- Materialized prompt templates (per phase)
- Boundary inventory
- Story sequence with dependency chain
- Red-phase commit hashes per story

**What to log per story:**
- Transition checkpoints with pre-acceptance receipt fields
- Red-phase test baseline and commit hash
- Green-phase test diff results and categorizations
- Decisions and their reasoning
- Corrections the human makes to your process
- Failure modes encountered and how they were resolved
- Patterns that emerge across stories
- Anything out of the ordinary — if you hesitated about whether to log it, log it

**What not to log:**
- Status updates ("Story 3 started")
- Routine events that went as expected
- Implementation details (that's the code's job)

Write narrative entries, not bullet points. Each entry should tell the story of what happened, what was observed, and why it might matter.
