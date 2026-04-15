# Team Implementation Orchestration — External CLI

**Purpose:** Orchestrate story-by-story implementation using agent teams with an external CLI model (Codex or Copilot). You are the team lead — you spawn Opus teammates who manage external model subagents, route verification, make judgment calls, and move work forward.

You receive technically enriched stories (and optionally an epic and tech design). You implement them sequentially, one story at a time. Teammates manage the external CLI; you manage the process.

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
- Spawn a teammate for each story's implementation
- Give clear, complete handoff instructions
- Receive consolidated reports and decide what happens next
- Track cumulative state across stories (test counts, regressions, patterns)
- Escalate to the human only when you genuinely can't resolve something

You should be able to handle routine decisions autonomously — fix routing, severity assessment, pushback evaluation, loop termination. The human is the final authority on judgment calls you aren't confident about, not a checkpoint for every decision.

**The orchestrator NEVER creates, modifies, or deletes code files.** This is absolute. In every orchestration run to date where the orchestrator touched code, it burned context needed for later stories, introduced completion bias (reviewing your own work), and conflated roles. The correct routing:

- Quick fixes (typos, one-file adjustments) → fire a `senior-engineer` subagent
- More extensive work (multi-file changes, architectural adjustments) → spawn a new general-purpose teammate
- Verification gate → run the command yourself (this is the ONE implementation-adjacent action you take — it's a pass/fail check, not investigation)
- If a test fails during the gate check → route it to a teammate or subagent. Do NOT debug it.

### Autonomy and Forward Progress

The goal of this orchestration is to complete the work fully, with quality, and with maximal reasonable autonomy. Default to forward progress. When the next step is routine and clearly in service of the approved objective, take it — don't stop to ask permission.

Stop only when a genuine blocker requires human judgment. Examples of genuine blockers:

- The external CLI is unavailable after investigation and retry
- Verification reveals a meaningful correctness, security, or integration problem with unclear disposition
- The spec or tech design appears inconsistent or insufficient in a way that affects implementation direction
- A fix would materially expand scope or alter user-facing behavior
- Project gates are failing for reasons that require a product or architectural decision, not a routine implementation fix

Everything else — routine story transitions, clean gate passes, trivial fixes clearly within scope, mechanical cleanup — keep moving.

---

## On Load

### Determine State

Check for an existing `team-impl-log.md` alongside the epic and tech design artifacts (or in the working directory). The log carries an explicit state field:

- **No log exists** → this is a `SETUP` (first load). Execute full initialization below.
- **Log exists with state `BETWEEN_STORIES`** → mid-epic reload. Read the log for current position, cumulative test count, selected CLI, and recorded patterns. The directive refresh happened when the skill loaded. Proceed to the next story.
- **Log exists with state `STORY_ACTIVE`** → reload during an active story (error recovery). Read the log for which story is in progress. Resume the current story cycle.
- **Log exists with state `PRE_EPIC_VERIFY`** → all stories accepted. Proceed to the Epic-Level Verification section below.

### Full Initialization (SETUP only)

#### 1. Initialize the Log

Create `team-impl-log.md` alongside the epic and tech design artifacts. Set state to `SETUP`. This log captures the full orchestration experience — CLI selection, verification gates, handoff templates, story-level observations, and process adaptations. It is a first-class deliverable. A perfect implementation with thin notes is less valuable than a messy implementation with thorough orchestration documentation.

#### 2. Select External CLI

Ask the user which external CLI to use: **Codex** or **Copilot**. Record their choice in the log.

Then load the selected skill with the Skill tool:
- Codex → `Skill(codex-subagent)`
- Copilot → `Skill(copilot-subagent)`

If the skill load fails, report the exact error. Do not proceed without a working external CLI. There is no fallback mode — this skill requires an external model for verification. Tell the user and stop.

Verify the CLI works by running a simple test command. Record the result in the log.

Model configuration: use `gpt-5.4` for all implementation and verification passes.

#### 3. Verification Gate Discovery

Before Story 1 starts, discover and lock the project's verification gates.

1. Read project policy docs (for example: `CLAUDE.md`, `AGENTS.md`, `README`, package scripts, CI config) to identify required verification commands and development methodology (TDD, etc.).
2. Define and log two gate sets in `team-impl-log.md`:
   - **Story acceptance gate**: commands required before accepting an individual story
   - **Epic acceptance gate**: commands required before final epic acceptance
3. If policy is ambiguous, ask the human once before implementation begins.

Do not assume unit tests alone are sufficient. Use the project's complete gate (including integration/e2e when required by project policy).

#### 4. Collect Artifacts

Ask the human what artifacts are available:
- **Story** (required) — at minimum one technically enriched story to implement
- **Epic** (optional) — the full feature specification the stories derive from
- **Tech design** (optional) — the architecture and interface definitions

Epic and tech design are optional because stories may exist without a separate epic or tech design document. The story is always required.

**Implementation prompt discovery:** check whether per-story implementation prompts exist alongside the stories. If a `prompts/` directory (or similar) contains `story-N-implementation-prompt.md` files, these should be treated as the primary CLI launch input. Log their presence and paths. Teammates should pipe these directly to the CLI rather than writing prompts from scratch.

Once the human provides paths, read the epic and tech design if available. List the stories and read the first story. If there are multiple stories, read the first two to understand the dependency relationship and scope progression.

Understanding the cross-cutting patterns in the tech design is the most important preparation. The stories contain the what (ACs, TCs). The tech design contains the architecture context that ties everything together — how modules interact, why decisions were made, what the flow patterns are. An orchestrator who only reads stories will miss the connections that inform good handoff decisions.

Note the story sequence and dependency chain. Identify which stories are foundational (types, config — usually Story 0), which are the core stories, and which are integration/polish stories.

#### 5. Boundary Inventory

Identify all external service dependencies from the epic and tech design. Create an inventory in the log:

| Boundary | Status | Story |
|----------|--------|-------|
| Auth API | stub | 0 |
| Payment gateway | not started | 3 |

Track status: `stub` / `mocked` / `integrated`. Check at every story transition. If any external boundary is still a stub at epic verification, flag it as P0 regardless of what previous reviewers said about it.

In a previous run, the primary external integration remained a throwing stub across 3 epics, 26 reviews, and 302 tests. Mock-first testing tested the mocks, not the integration. The boundary inventory exists to prevent this.

#### 6. Materialize Handoff Templates

Write the implementer and reviewer handoff templates to `team-impl-log.md`. These templates are the source of truth for every teammate dispatch. Re-read them before constructing each handoff prompt.

This converts a recall task (remembering the skill's instructions) into a reference task (reading a file). In a previous run, the orchestrator loaded the skill, executed On Load correctly, then forgot the core process by story 3. The handoff templates survived because they were in the log.

**Implementer template:**

```
You are implementing a story. You are a supervisory layer over a CLI subagent. You do NOT implement directly.

Step 1 — Load skill:
  Use the Skill tool: Skill({CLI_SKILL_NAME})
  If this fails, report the exact error. Do not skip it. Do not implement yourself.

Step 2 — Read artifacts sequentially, reflecting after each one:
  Read each file one at a time. After reading each file, stop and reflect on what you
  learned before reading the next. Write your reflections as you go — these become
  compressed context that persists with strong attention weight throughout your work.

  1. [cross-cutting decisions / tech design index] — Read. Reflect: what are the key
     architectural decisions, vocabulary, and cross-cutting patterns?
  2. [primary tech design companion for this story] — Read. Reflect: what interfaces,
     data contracts, and design constraints are relevant?
  3. [epic] — Read. Reflect: how does this story fit in the broader feature? What are
     the upstream/downstream dependencies?
  4. [test plan if available] — Read. Reflect: what testing patterns and coverage
     expectations apply?
  5. [story] — Read. Reflect: what are the ACs, TCs, and any spec deviations or
     gotchas to flag?

  Write your cumulative reflections to /tmp/reflection-story-N.md before touching code.

Step 3 — Write a CLI prompt and launch:
  [If implementation prompts exist: pipe the prompt directly to CLI]
  [Otherwise: write a lean, execution-oriented prompt with artifact paths]
  Give the CLI the same sequential reading and per-file reflection instructions.
  Use gpt-5.4. Launch async. Wait for completion.

Step 6 — Self-review loop:
  Tell the CLI to do a thorough critical self-review. Fix non-controversial issues.
  If substantive changes, iterate. Continue until clean or nits only.
  Then independently verify remaining open issues yourself.

Step 7 — Report to orchestrator (SEND THIS MESSAGE):
  - What was built (files created/modified)
  - Test counts and verification results (run the story gate yourself)
  - CLI session ID(s)
  - What was found and fixed across self-review rounds
  - What remains open with reasoning
  - Any concerns or spec deviations
```

**Reviewer template:**

```
You are reviewing a story implementation. You MUST use a CLI subagent for spec-compliance review. This is not optional.

Step 1 — Load skill:
  Use the Skill tool: Skill({CLI_SKILL_NAME})
  If this fails, report the exact error. Do not skip it. Do not review without CLI.

Step 2 — Read artifacts sequentially, reflecting after each one (same as implementer):
  Read each file one at a time. After each file, stop and reflect on what you learned
  before reading the next. Include the story as the final read. Write cumulative
  reflections to /tmp/reflection-review-story-N.md before starting the review.

Step 3 — Dual review (parallel):
  A. Launch CLI for spec-compliance review. Give it artifact paths and instruct:
     thorough code review against spec, organize by severity, check AC/TC coverage.
     Use gpt-5.4. Launch async.
  B. While CLI reviews, do your own architectural review independently.

Step 6 — Consolidate:
  Read CLI review output. Merge both sets of findings.
  Verify claims against actual code.
  Compile consolidated fix list.
  Launch CLI to implement fixes. Have it self-review after fixing.

Step 7 — Report to orchestrator (SEND THIS MESSAGE):
  - CLI review session ID(s)
  - Your own review findings
  - CLI findings
  - What was fixed
  - What remains open with dispositions
  - Final story gate result
  - "What else did you notice but did not report?"
```

#### 7. Create Team

Create a team at the start of the implementation. The team persists across all stories — don't create a new team per story. Teammates are created and shut down within each story's cycle, but the team and its task list span the full run.

All teammates are spawned as general-purpose agents with bypassPermissions. Senior-engineer is reserved exclusively for the orchestrator's own quick fixes via subagent — never for teammates.

Set log state to `BETWEEN_STORIES`.

---

## Control Contract (Hard Invariants)

These three invariants are non-negotiable:

1. No story acceptance, commit, or story transition without external model verification evidence (CLI session ID or output artifact reference).
2. No unresolved external model finding without explicit disposition: `fixed`, `accepted-risk`, or `defer`.
3. No silent degradation. If the CLI fails, declare the failure, handle it (retry/reassign/escalate), and do not present verification as complete.

These invariants exist because completion bias is structural. As more stories are accepted and committed, the orchestrator builds up investment in forward progress. This creates pressure to rubber-stamp reviews, downplay findings, skip verification steps, and quick-fix things personally. The later stories in a sequence are more vulnerable than the earlier ones. The invariants are external constraints, not suggestions to evaluate against your confidence level.

### Adaptive Controls

Keep process flexibility without weakening the invariants:

- Risk-tier each story (`low`, `medium`, `high`) and scale verification depth accordingly.
- Use bounded review loops; avoid churn when no substantive changes remain.
- Use `accepted-risk` for explicitly reasoned, non-blocking issues.
- Human override always takes precedence over default routing.

---

## External Model Failure Protocol

When a teammate reports that the CLI is unavailable or didn't work:

1. First report → tell them to try again.
2. Second report → tell them to try again.
3. Third report → test the CLI yourself with a simple command.
4. If CLI works → send the teammate back with proof that the CLI is operational.
5. If CLI is genuinely down → escalate to the human.

If a teammate did verification itself instead of using the CLI — i.e., they report findings but have no CLI session ID — shut down that teammate immediately. Spawn a fresh teammate with the same instructions. Do not accept the work the previous teammate did. The verification is not complete.

The explanation for why the CLI didn't work will sound plausible. In multiple runs, teammates reported "Codex CLI not available in environment" while other teammates on the same machine were using it successfully. The teammate read the skill wrong, hit a transient error, or confabulated a reason to skip. Do not accept it.

Runs where external model verification was skipped have consistently resulted in undetected bugs — including security vulnerabilities, spec deviations, and integration gaps — that were later caught by retroactive verification passes. The user will likely roll back work that was done without proper verification.

---

## Story Implementation Cycle

For each story in sequence:

### 1. Spawn the Implementer

Set log state to `STORY_ACTIVE` and record which story is being implemented and the current phase (`implementing` or `reviewing`). Update the phase when transitioning to verification. This ensures a mid-story reload can resume at the correct point in the cycle.

Spawn a general-purpose teammate (Opus, not senior-engineer). The teammate is the supervisory layer — it manages a CLI subagent, verifies the output, and reports back to you.

Re-read the materialized implementer template from the log. Construct the handoff as one complete prompt (not drip-fed). Substitute the actual paths and any story-specific flags you noticed while reading — like "this story has a spec deviation worth noting" or "this is a large story, ~40 tests expected."

If per-story implementation prompts exist, tell the teammate to use them as the primary CLI input.

### 2. Verification

When the implementer reports back, the implementation has already been through one or more rounds of self-review. The easy issues are fixed. What remains is either clean or genuinely ambiguous. Now it gets a fresh set of eyes.

**Spawn the reviewer.** Update the log phase to `reviewing`. A fresh general-purpose Opus teammate (not senior-engineer). Re-read the materialized reviewer template from the log. Same artifacts, explicit CLI requirement.

The reviewer runs a dual review: CLI spec-compliance check in parallel with the reviewer's own architectural review. Two perspectives — the external model's literal compliance check and the Opus reviewer's architectural judgment.

When the CLI review comes back, the Opus reviewer consolidates both sets of findings, verifies claims against the actual code, compiles fixes, launches CLI to implement fixes, and iterates until clean.

On first review round, ask: "What else did you notice but did not report?" Capture additional observations before final synthesis.

### 3. Orchestrator Final Check

When the reviewer reports back, the implementation has been through multiple review layers: CLI build → iterated self-review → fresh Opus + CLI dual review → fixes → iterated self-review. Two separate agents and two separate CLI instances have looked at it.

1. **Run the discovered story acceptance gate yourself** — execute the exact commands you locked in Verification Gate Discovery and confirm they pass. Don't trust reports alone.
2. **Review the report's open issues** — if either teammate surfaced issues they didn't fix, assess them from the report. Route any remaining fixes to a senior-engineer subagent (quick) or fresh teammate (extensive).
3. **Do NOT read implementation files yourself.** Do NOT debug failures. Route them.

**Accepting the story:**

Before acceptance, write a pre-acceptance receipt to the log:

1. CLI evidence reference (session ID(s) and/or output artifact reference)
2. Top findings and dispositions (`fixed`, `accepted-risk`, `defer`)
3. Exact story gate command(s) run and result summary
4. Open risks (or `none`)

Once satisfied — all gates pass, no open issues, code looks right — stage all changes and commit: `feat: Story N — [story title]`. Each story gets its own commit. Don't amend previous commits.

### 4. Story Transition

When a story is accepted and committed:

1. Write a transition checkpoint to `team-impl-log.md` as the final action of the completed story cycle. Include: problems encountered, impact, resolution, recommendations, pre-acceptance receipt fields, cumulative test count.
2. Update boundary inventory — check status of all external dependencies.
3. Update log state:
   - If more stories remain → set state to `BETWEEN_STORIES`
   - If this was the last story in the epic → set state to `PRE_EPIC_VERIFY`

**If more stories remain: RELOAD THIS SKILL and continue.** If the next story was started without reloading the skill, the user will interrupt and roll back.

**If this was the last story of a multi-story epic:** proceed to Pre-Verification Cleanup, then Epic-Level Verification.

**Fresh agents per story.** Every story gets a fresh implementer and a fresh reviewer. No carrying forward teammates between stories. The new teammate reads the story cold with no assumptions from previous work. If the story spec isn't sufficient for cold implementation, that's a spec gap to flag, not a reason to carry context forward.

**Don't tear down the active teammate path until the replacement is confirmed.** Spawn the next teammate before shutting down the current one.

**Track cumulative test counts explicitly.** After each story, record the total test count. Before kicking off the next story, note the expected baseline: "Story 2 ended at 43 tests. Story 3's TC mapping specifies ~12 tests. After Story 3, total should be approximately 55." If the total after the next story is less than the previous total, something regressed — investigate before accepting.

**Regression is a stop-the-line event.** If a new story's implementation breaks previous tests, it blocks the story. The orchestrator's final check should verify the full test suite, not just the new story's tests.

**What carries forward between stories:**
- The committed codebase — each story builds on the previous
- Cumulative test count and verification baseline
- Patterns the orchestrator noticed — if Story 2's CLI drifted on error formats, flag that in Story 3's handoff
- `team-impl-log.md` — each story's orchestration experience informs the next
- Boundary inventory

**What doesn't carry forward:**
- Teammates — fresh per story
- Assumptions about what previous implementers "know" — each agent starts cold
- Unresolved issues from previous stories — if it wasn't fixed and committed, it doesn't exist for the next story's agent

### 5. Escalation Handling

When teammates escalate issues or problems arise during any phase:

1. **Assess the situation yourself.** Read whatever context you need from the report. Don't just forward the question.
2. **Reflect against the epic and tech design.** The artifacts contain the rationale for decisions. Most questions can be answered by tracing back to the spec.
3. **If you can make a reasonable decision, make it.** Route the answer back to the teammate with your reasoning.
4. **If you need the human's ruling:** explain what's needed, what you did to investigate, what you understand about the issue, your recommendation, and your reasoning. Give the human enough context to decide without re-investigating from scratch.

If the human interrupts with process feedback (not task-level content feedback), enter `PAUSED_PROCESS_REVIEW` mode immediately:
- Stop new dispatches.
- Do not commit.
- Diagnose the process behavior with the human.
- Resume only after explicit human instruction to resume orchestration.

In `PAUSED_PROCESS_REVIEW`, prioritize diagnosis over reassurance. Treat frustration as diagnostic signal.

---

## Pre-Verification Cleanup

After all stories are accepted and before epic-level verification, compile all deferred and accepted-risk items from every story cycle into a single list.

Present the categorized list to the human — this is a batch with mixed severity and is worth the human seeing before dispatch. Include small items. Do not defer trivial items just because they're small — if the fix is a few lines, it is faster to fix than to track.

**Materialize the complete fix list to a file before constructing any handoff prompt.** When context distance grows between when items are discussed and when the handoff is written, small items drop off. Write the numbered list to a file, read that file when writing the handoff, paste its contents into the prompt. This is a structural intervention — advisory "remember to include everything" does not reliably work.

Bundle the approved items into one fix batch. Implement as a normal story cycle: implementer teammate with CLI, reviewer teammate with CLI, orchestrator final check. Commit as `fix: pre-verification cleanup`.

Then proceed to epic-level verification with a cleaner codebase.

---

## Epic-Level Verification

After all stories are accepted and committed (and pre-verification cleanup is done), run a full-codebase review before shipping. This also applies to a single-story implementation.

**RELOAD THIS SKILL before starting epic verification.**

This is not optional. Do not ask the user whether to do it. In previous runs, undetected integration gaps, stub implementations shipped as production code, and contract inconsistencies survived 26 story-level reviews and were only caught by the epic-level verification pass.

### Setup

Create a verification output directory with a subdirectory per reviewer. For example:

```
verification/
  opus/
  sonnet/
  gpt54/
  gpt53-codex/
```

### Phase 1: Four Parallel Reviews

Launch four reviewers simultaneously. Each reads the full epic, the full tech design, and the entire codebase. Each writes a detailed review report to their designated directory.

**Two Claude teammates** (general-purpose, not senior-engineer):

1. **Opus reviewer** — reads epic, tech design, all source files, all test files. Writes `epic-review.md` to their directory.
2. **Sonnet reviewer** — same artifacts, same task, writes to their directory.

**Two external model reviews** (each managed by a general-purpose teammate who loads the CLI skill):

3. **gpt-5.4 review** — the primary external verifier. Same artifacts, writes review. The teammate captures the output and writes the report file.
4. **gpt-5.3-codex review** — secondary diversity verifier, if available. Same artifacts, writes review. Same capture pattern. If gpt-5.3-codex is not available, proceed with three reviewers.

Each reviewer's prompt:

- Read the epic (path), the tech design (path), and every source and test file in the project
- Specify the exact working directory for CLI reviewers
- Do a thorough critical review of the full implementation against the epic and tech design
- Organize findings by severity (Critical, Major, Minor)
- Verify AC/TC coverage, interface compliance, architecture alignment, test quality
- Check boundary inventory: is any external dependency still a stub?
- Write the full report to their output file

**Wait for all reports before proceeding.** Do not start Phase 2 until every report is written.

### Phase 2: Meta-Reports

Send each reviewer the paths to all review reports. Each reviewer reads all reports and writes a meta-report to their directory:

- Rank the reports from best to worst
- For each report: what's good about it, what's not good about it
- Describe what they would take from each report if synthesizing a single best review

**Wait for all meta-reports before proceeding.**

### Phase 3: Orchestrator Synthesis

Read all review reports and all meta-reports. Produce a synthesized assessment:

1. **Cross-reference findings.** Build a table: which findings appear in multiple reports (high confidence), which are unique to one reviewer (investigate).
2. **Assess severity.** Claude models tend to grade generously. External models tend to grade conservatively. Apply your own judgment — don't average.
3. **Categorize the fix list:**
   - Must-fix: ship blockers
   - Should-fix: correctness or quality issues
   - Trivial: small fixes that take a few lines of code
4. **Present the categorized fix list to the human** with your recommended ship-readiness grade. This is a large batch with mixed severity — the human should see it before you dispatch.
5. **Materialize the complete fix list to a file** before constructing the handoff prompt. Include all items the human approved — must-fix, should-fix, and trivial. Do not filter out small items. Context distance causes drops; the list must exist as a readable artifact.

### Phase 4: Fixes

After discussion and human approval:

- Launch a teammate with the CLI to implement the approved fixes. Give them the fix list file, the epic, and the tech design.
- After fixes: launch a fresh review targeting the specific changes to confirm correctness.
- Run the discovered epic acceptance gate yourself to confirm all required gates pass.
- Check boundary inventory one final time: no external dependencies should remain as stubs.
- Stage, commit (`fix: epic verification fixes`), and report completion to the human.

Update log state to `COMPLETE`.

---

## Operational Patterns

These patterns emerged from real orchestration experience and encode failure modes the skill needs to handle.

### Idle Notifications Are Unreliable Signals

Teammates emit idle notifications between turns. These are noise during multi-step tasks — a teammate doing a 15-minute implementation will fire multiple idle notifications while actively working. Do not interpret idle notifications as "the agent is done" or "the agent is stuck."

The reliable signal is the teammate's explicit message reporting results. Wait for that. If extended time passes with no message (calibrate based on task complexity), send a brief nudge: "Did you complete the work? Report your results." Don't assume failure from silence alone.

### Context Ceilings

Agents that read the full epic + tech design + story, implement multiple modules, and then process review feedback can exhaust their context window. Symptoms: the agent goes idle without completing, or produces truncated/confused output.

Mitigation: the human configures model context size. If an agent hits context limits, the human may need to intervene to adjust model settings. The orchestrator cannot control context size at spawn time — flag the issue and let the human handle it.

### Agents Forget to Report Back

After long multi-step tasks (15+ minutes, dozens of tool calls), agents sometimes complete their work but forget to send the completion message back to the team lead. The "report back to team lead" instruction decays over a long execution chain.

This is structural, not random — longer tasks make it more likely. The handoff prompt should place the reporting instruction prominently. If two idle notifications pass after expected completion time with no message, send a nudge.

### Sequencing: Wait for Confirmation Before Proceeding

Do not launch the next phase of work until the current agent confirms completion. Specifically:
- Don't launch verification before the implementer signals "done"
- Don't launch the next story before the current story is fully verified
- Don't assume file state is final because you can read correct-looking files — the agent may have more changes in flight

The teammate's explicit report is the trigger for the next step, not the orchestrator's independent observation of file state.

### Completion Bias Degrades the Orchestrator

As more stories are accepted, the orchestrator builds up investment in forward progress. This creates pressure to rubber-stamp reviews, downplay findings, skip verification steps, and quick-fix things personally. This is structural, not a character flaw. The later stories are more vulnerable.

The hard invariants and the skill reload requirement exist precisely for this reason. They are external constraints, not suggestions to evaluate.

### Context Stripping Is Expected

For runs over 5 stories, context may need to be stripped (tool calls removed by the human) to free space. This is a normal operational event, not an emergency. The orchestration log survives context stripping. The session can continue. The important state is in the log and the committed codebase, not in the orchestrator's context.

### Item List Drops During Dispatch

When context distance grows between when items are discussed and when a handoff prompt is written, small items fall off. The orchestrator interprets "the list" as "the things we just discussed in detail" rather than "all remaining items." Materialize the complete list to a file before writing any handoff prompt. Read the file when constructing the prompt.

### CLI Reviewed Wrong Target

In a previous run, a CLI subagent reviewed an old prototype directory instead of the current application directory. The handoff prompt must specify the exact working directory. Verify in the teammate's report that the CLI ran against the correct path.

### Large Fix Batches Need Human Eyes

In a previous run, an orchestrator auto-dispatched all 16 epic-verification fixes without presenting them first. Three items changed disposition through discussion — including one that would have been a scope change. When you have a batch of fixes with mixed severity and disposition, present the categorized list and let the human weigh in before dispatching. This applies to epic verification synthesis and pre-verification cleanup — situations where you're routing a significant volume of fixes at once. It does not mean every routine decision needs human approval.

### Process Adaptation

The workflow defined above is the default. The orchestrator has discretion to adjust within bounds.

What can be adjusted:
- How much detail goes into the handoff prompt based on story complexity
- Whether to flag specific risks or gotchas based on patterns from previous stories
- Risk-tier verification depth
- Bounded review loop depth when no substantive issues remain
- Use of explicit `accepted-risk` dispositions for non-blocking items

What cannot be adjusted:
- The self-review loop always runs
- The orchestrator always runs the discovered story/epic acceptance gates
- Fresh agents per story
- Full test suite regression check
- The three hard invariants in Control Contract
- Skill reload before each story
- External model verification — no substituting your own review

Human override always wins. If the human directs a process change, apply it, log it, and continue.

---

## Logging

`team-impl-log.md` is created during On Load and lives alongside the epic and tech design. It captures the full orchestration experience for this run.

**Mandatory fields:**
- `state`: one of `SETUP`, `BETWEEN_STORIES`, `STORY_ACTIVE`, `PRE_EPIC_VERIFY`, `COMPLETE`
- `cli`: selected CLI skill name
- Verification gates (story and epic)
- Materialized handoff templates
- Boundary inventory
- Story sequence with dependency chain

**What to log per story:**
- Transition checkpoints with pre-acceptance receipt fields
- Decisions and their reasoning
- Corrections the human makes to your process
- Failure modes encountered and how they were resolved
- Patterns that emerge across stories
- Process evolution (when and why the workflow adapted)

**What not to log:**
- Status updates ("Story 3 started")
- Routine events that went as expected
- Implementation details (that's the code's job)

Write narrative entries, not bullet points. Each entry should tell the story of what happened, what was observed, and why it might matter. A future reader building or refining this skill needs to understand the shape of the work, not just the checkboxes.
