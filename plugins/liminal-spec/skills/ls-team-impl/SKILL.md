---
name: ls-team-impl
description: Orchestrate story-by-story implementation with agent teams. Manages teammates, routes verification, and makes judgment calls across the full implementation cycle.
---

# Team Implementation Orchestration

**Purpose:** Orchestrate story-by-story implementation using agent teams. You are the team lead — you spawn teammates, construct handoffs, route verification, make judgment calls, and move work forward.

You receive a set of technically enriched stories, an epic, and a tech design. You implement them sequentially, one story at a time, using a teammate who supervises a Codex subagent. The teammate manages the build; you manage the process.

If team mode is not available, implement directly from the stories and tech design using your preferred workflow.

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

---

## On Load

### Initialize the Log

Create `team-impl-log.md` alongside the epic and tech design artifacts. This is the orchestration log for the entire run — skill availability, lane decisions, failure modes, process adaptations, and story-level observations all go here. The first entry is the lane determination below.

### Determine Execution Lane

Check which execution capabilities are available by locating skills by name:

**Codex lane** (primary): the `codex-subagent` or `copilot-subagent` skill is available. Either provides access to GPT-5x-codex models for implementation and review. If available, load the skill with the Skill tool (`Skill(codex-subagent)` or `Skill(copilot-subagent)`). Also check for `gpt53-codex-prompting` — if available, load it with `Skill(gpt53-codex-prompting)`. This skill improves prompt quality for Codex subagents but is not required.

Model selection default in Codex/Copilot lane:
- Use `gpt-5.3-codex` for normal implementation and single-review verification tasks.
- Use `gpt-5.2` only when running parallel multi-verifier diversity passes.

**Sonnet-only fallback**: Neither subagent skill is available. Implementation and review will use Sonnet 4.6 directly rather than routing through a Codex subagent. This reduces multi-model verification diversity and removes the literal spec-compliance perspective that Codex provides. Warn the human: success is less likely without multi-model execution. Recommend stopping and installing a subagent skill. If the human chooses to continue, proceed in Sonnet-only mode.

Declare the selected lane once before starting: "Running in Codex lane via codex-subagent" or "Running in Copilot lane via copilot-subagent" or "Running in Sonnet-only mode — reduced verification confidence."

Log the lane determination to `team-impl-log.md`: which skills were found, which were not, which lane was selected, and whether any fallbacks were applied. If a skill wasn't found, note what was tried and what the human decided.

Load required skills yourself before dispatching teammates. Do not instruct teammates to use a skill you have not loaded and verified in your own context first.

### Control Contract (Hard Invariants)

These three invariants are non-negotiable:

1. No story acceptance, commit, or story transition without a Codex evidence reference (run/session identifier and/or output artifact reference).
2. No unresolved Codex finding without explicit disposition: `fixed`, `accepted-risk`, or `defer`.
3. No silent degradation. If Codex fails, declare the failure, handle it (retry/reassign/escalate), and do not present verification as complete.

### Adaptive Controls

Keep process flexibility without weakening the invariants:

- Risk-tier each story (`low`, `medium`, `high`) and scale verification depth accordingly.
- Use bounded review loops; avoid churn when no substantive changes remain.
- Use `accepted-risk` for explicitly reasoned, non-blocking issues.
- Human override always takes precedence over default routing.

### Verification Gate Discovery

Before Story 1 starts, discover and lock the project's verification gates.

1. Read project policy docs (for example: `CLAUDE.md`, `AGENTS.md`, `README`, package scripts, CI config) to identify required verification commands.
2. Define and log two gate sets in `team-impl-log.md`:
   - **Story acceptance gate**: commands required before accepting an individual story.
   - **Epic acceptance gate**: commands required before final epic acceptance/shipping.
3. If policy is ambiguous, ask the human once before implementation begins.

Do not assume unit tests alone are sufficient. Use the project's complete gate (including integration/e2e when required by project policy).

### Collect Artifacts

Ask the human what artifacts are available:
- **Story** (required) — at minimum one technically enriched story to implement
- **Epic** (optional) — the full feature specification the stories derive from
- **Tech design** (optional) — the architecture and interface definitions

Epic and tech design are optional because stories can come from the simple pipeline (lss-story + lss-tech) where no separate epic or tech design exists. The story is always required.

Once the human provides paths, read the epic and tech design if available. List the stories and read the first story. If there are multiple stories, read the first two to understand the dependency relationship and scope progression.

Understanding the cross-cutting patterns in the tech design is the most important preparation. The stories contain the what (ACs, TCs, interfaces). The tech design contains the architecture context that ties everything together — how modules interact, why decisions were made, what the flow patterns are. An orchestrator who only reads stories will miss the connections that inform good handoff decisions.

Note the story sequence and dependency chain. Identify which stories are foundational (types, config — usually Story 0), which are the core algorithm stories, and which are integration/polish stories.

---

## Team Setup

Create a team at the start of the implementation. The team persists across all stories — don't create a new team per story. Teammates are created and shut down within each story's cycle, but the team and its task list span the full run.

All teammates are spawned as general-purpose agents with bypassPermissions. Senior-engineer is reserved exclusively for the orchestrator's own quick fixes via subagent — never for teammates.

Shut down teammates after each phase completes. Don't leave idle teammates running across story boundaries. At the end (after epic-level verification if applicable, and final commit), shut down any remaining teammates and delete the team.

---

## Story Implementation Cycle

For each story in sequence:

### 1. Spawn the Implementer

Spawn a general-purpose teammate (not senior-engineer — senior-engineer is reserved for the orchestrator's own quick fixes). This is an Opus agent running as a Claude Code teammate in tmux. In the Codex/Copilot lane, the teammate is the supervisory layer — it manages a subagent, verifies the output, and reports back to you. In Sonnet-only mode, the teammate is the implementer directly.

The teammate's handoff instructions (one complete prompt, not drip-fed):

**What to read:**
- The epic (path)
- The tech design (path)
- The story being implemented (path)

**What to load:**
- Use the Skill tool to load `codex-subagent` with `Skill(codex-subagent)`. If using the Copilot lane, use `Skill(copilot-subagent)` instead. In Sonnet-only mode, skip the subagent skill.
- Use the Skill tool to load `gpt53-codex-prompting` with `Skill(gpt53-codex-prompting)` if available.
- If a skill load fails, report the exact call you attempted and the error. Do not silently skip it — the orchestrator will either resolve it or confirm the fallback.

**What to do (Codex/Copilot lane):**

Write a prompt for the Codex subagent that gives it the same context — the epic, the tech design, and the story — and instructs it to execute the story. Use `gpt-5.3-codex` as the default model for this implementation pass.

Do not over-prescribe the Codex prompt. Codex receives the same artifacts you do — it has full context on what to build. Keep the prompt lean and execution-oriented. Use the gpt53-codex-prompting skill's guidance if available to write an effective prompt, but don't micromanage. Codex is a capable implementer when given good specifications.

Use your judgment to dial in the prompt based on circumstances. If the story is unusually complex, if there are gotchas you noticed while reading, if the story has spec deviations that need attention — adjust accordingly. You have discretion.

Launch Codex async (no timeout constraints). Wait for it to finish.

If Codex asks questions during execution, answer them if you can from the artifacts you've read. If you can't resolve a question — if it requires a judgment call about requirements or architecture that the artifacts don't clearly answer — escalate to the orchestrator.

**What to do (Sonnet-only mode):**

You are the implementer — there is no subagent. Read the epic, tech design, and story, then implement the story directly. The same principles apply: the story has full context on what to build, use your judgment on complexity, and escalate to the orchestrator if you hit ambiguity the artifacts don't resolve.

**After implementation — the self-review loop:**

In the Codex lane, tell Codex: "Do a thorough critical self-review of your own implementation. If you find issues and the fix is not controversial, fix them. Then report back: what issues you encountered, what you fixed, and any issues you encountered but didn't fix and why." In Sonnet-only mode, do this self-review yourself — review your own implementation critically, fix non-controversial issues, then continue to the report.

Receive the self-review results. If substantive changes were made, run another round of critical self-review. Continue iterating until no substantive changes remain — either clean or nits only. The self-review loop converges when there's nothing left worth fixing.

Then independently verify all remaining open issues from the self-review — read the code, check the claims, form your own assessment of whether the reasoning holds up. (In Sonnet-only mode, this verification is part of your own self-review cycle rather than a separate agent's assessment.)

**Report to orchestrator:**

When your task is complete or blocked, send an explicit message to the orchestrator. If complete: what changed, verification results, open concerns. If blocked: what's blocking and what input you need.

The consolidated report should cover:
- What was built (files created/modified, test counts, verification results)
- What was found and fixed across self-review rounds
- What remains open, with reasoning and your assessment
- Any concerns, spec deviations, or patterns you noticed

---

### 2. Verification

When the implementer reports back, the implementation has already been through one or more rounds of self-review. The easy issues are fixed. What remains is either clean or genuinely ambiguous. Now it gets a fresh set of eyes.

Codex is the literal/pedantic verifier in this loop. Opus provides architectural judgment; Codex provides strict spec-compliance pressure. Treat Codex participation as required, not optional.

**Spawn the reviewer.** A fresh general-purpose Opus teammate (not senior-engineer). Give it the same artifacts: the epic, the tech design, and the story. Instruct it to load required skills with explicit calls (`Skill(codex-subagent)` or `Skill(copilot-subagent)` plus `Skill(gpt53-codex-prompting)` when available). In Sonnet-only mode, skip the subagent skills. If a skill load fails, they report the exact call + error so you can resolve it.

**The reviewer runs a dual review (Codex/Copilot lane):**

The reviewer launches a fresh Codex subagent async to do a thorough code review — Codex reads the epic, tech design, and story, then reviews the implementation against them. Use `gpt-5.3-codex` as the default reviewer model. While Codex reviews, the Opus reviewer also does their own thorough code review independently. Two perspectives running in parallel: Codex's literal spec-compliance check and Opus's architectural/judgment review.

When the Codex review comes back, the Opus reviewer:
1. Reviews Codex's findings
2. Verifies any new claims against the actual code
3. Compiles a consolidated list of fixes needed
4. Launches another Codex to implement the fixes
5. That Codex does a self-review after fixing, iterating until no substantive issues remain

**The reviewer runs a solo review (Sonnet-only mode):**

The reviewer does a thorough code review independently — reads the epic, tech design, and story, reviews the implementation against them. Compiles a list of fixes needed, implements them directly, then self-reviews until no substantive issues remain. Without the Codex perspective, the orchestrator should compensate with more direct code review in the final check.

The reviewer reports the final state to the orchestrator. When complete or blocked, send an explicit message: what changed, verification results, open concerns, or what's blocking and what input is needed.

On first review round, ask: "What else did you notice but did not report?" Capture additional observations before final synthesis.

If Codex output is missing, incomplete, or unverifiable, reject the review as incomplete. Retry/reassign/escalate, and explicitly log degraded status until Codex evidence is available.

---

### 3. Orchestrator Final Check

When the reviewer reports back, the implementation has been through multiple review layers. In the Codex lane: Codex build → iterated self-review → fresh Opus + Codex dual review → fixes → iterated self-review — two separate agents and two separate Codex instances have looked at it. In Sonnet-only mode: teammate build → iterated self-review → fresh reviewer solo review → fixes → iterated self-review.

The orchestrator does the final check:

1. **Run the discovered story acceptance gate yourself** — execute the exact commands you locked in Verification Gate Discovery and confirm they pass. Don't trust reports alone.
2. **Review code as needed** — read files, check implementations against the story, look at anything that was flagged as a concern. Never hesitate to go look at code directly.
3. **Review open issues** — if either teammate surfaced issues they didn't fix, assess them. Read the code, reflect against the epic and tech design, make a call.

**Handling remaining fixes:**

- **Quick fixes** (typos, small adjustments, one-file changes): fire a senior-engineer subagent. This keeps your context clean — the subagent handles the tool calls, you get the result. Senior-engineer is only for the orchestrator's own quick fixes, never for teammates.
- **More extensive work** (multi-file changes, architectural adjustments): spawn a new general-purpose teammate to handle it.

**Accepting the story:**

Before acceptance, write a short pre-acceptance receipt to the log or report:

1. Codex evidence reference (run/session and/or output artifact reference)
2. Top findings and dispositions (`fixed`, `accepted-risk`, `defer`)
3. Exact story gate command(s) run and result summary
4. Open risks (or `none`)

Once satisfied — all gates pass, no open issues, code looks right — stage all changes and commit: `feat: Story N — [story title]`. Each story gets its own commit. Don't amend previous commits.

---

### 4. Story Transition

When a story is accepted and committed, move to the next story in the sequence. Fresh agents, same process, cumulative quality.

Transition discipline:
- Write a transition checkpoint to `team-impl-log.md` as the final action of the completed story cycle.
- Do not commit and spawn the next story in the same action block/turn. After the checkpoint is written, begin the next story cycle.

**Fresh agents per story.** Every story gets a fresh Opus implementer and a fresh Opus reviewer. No carrying forward teammates between stories. The new teammate reads the story cold with no assumptions from previous work. The story should be sufficient for implementation — that's the consumer gate from the publish epic phase. If it isn't, that's a spec gap to flag, not a reason to carry context forward.

**The handoff prompt structure is the same every story.** Read epic, read tech design, read this story, load skills, implement (via subagent or directly), self-review, report. What changes between stories is only the story path and any story-specific flags the orchestrator noticed while reading — like "this story has a spec deviation worth noting" or "this is a large story, ~40 tests expected."

**Track cumulative test counts explicitly.** After each story, record the total test count. Before kicking off the next story, note the expected baseline: "Story 2 ended at 43 tests. Story 3's TC mapping specifies ~12 tests. After Story 3, total should be approximately 55." If the total after the next story is less than the previous total, something regressed or was removed — investigate before accepting.

**Regression is a stop-the-line event.** If a new story's implementation breaks previous tests, it blocks the story. The regression must be resolved before the story can be accepted. The orchestrator's final check should verify the full test suite (not just the new story's tests). A story that adds its own tests but breaks existing ones is not done.

**What carries forward between stories:**
- The committed codebase — each story builds on the previous
- Cumulative test count and verification baseline
- Patterns the orchestrator noticed — if Story 2's Codex drifted on error message formats, flag that risk in Story 3's handoff
- `team-impl-log.md` — each story's orchestration experience informs the next

**What doesn't carry forward:**
- Teammates — fresh per story
- Assumptions about what previous implementers "know" — each agent starts cold
- Unresolved issues from previous stories — if it wasn't fixed and committed, it doesn't exist for the next story's agent

**Logging at story transitions.** At each transition, log to `team-impl-log.md`: what problems were encountered during this story's cycle, what impact they had, how they were resolved, and any recommendations for process adjustments. Include the pre-acceptance receipt fields (Codex evidence, dispositions, gate summary, risks). If you have suggestions for additional instructions or steps that would have prevented issues, present them as possible suggestions for the human to evaluate. Story transitions are natural reflection points.

---

### 5. Escalation Handling

When teammates escalate issues or problems arise during any phase:

1. **Assess the situation yourself.** Read whatever code you need. Don't just forward the question.
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

## Epic-Level Verification

After all stories are accepted and committed, run a full-codebase review before shipping. Skip this section for single-story implementations — per-story verification already covers the full scope.

### Setup

Create a verification output directory with a subdirectory per reviewer model. For example:

```
verification/
  opus/
  sonnet/
  gpt53-codex-high/
  gpt52-high/
```

Directory names are labels for organizing output — use whatever is clear for the project. The model slugs passed to Codex CLI via `-m` are `gpt-5.3-codex` and `gpt-5.2`. Default for routine implementation/review is `gpt-5.3-codex`; `gpt-5.2` is used here only as a secondary parallel verifier for diversity.

### Phase 1: Four Parallel Reviews

Launch four reviewers simultaneously. Each reads the full epic, the full tech design, and the entire codebase. Each writes a detailed review report to their designated directory.

**Two Claude teammates** (general-purpose, not senior-engineer):

1. **Opus reviewer** — reads epic, tech design, all source files, all test files. Writes `epic-review.md` to their directory.
2. **Sonnet reviewer** — same artifacts, same task, writes to their directory.

**Two Codex subagents** (each managed by a general-purpose teammate who loads `codex-subagent` and `gpt53-codex-prompting` via the Skill tool):

3. **gpt-5.3-codex at high reasoning** — same artifacts, writes review. The teammate captures the output and writes the report file (Codex runs read-only).
4. **gpt-5.2 at high reasoning** (not gpt-5.2-codex — different tune) — same artifacts, writes review. Same capture pattern.

In Sonnet-only mode, run two Claude reviewers (Opus + Sonnet) without the Codex reviewers. The review has less multi-model diversity but still provides independent perspectives.

Each reviewer's prompt:

- Read the epic (path), the tech design (path), and every source and test file in the project
- Do a thorough critical review of the full implementation against the epic and tech design
- Organize findings by severity (Critical, Major, Minor)
- Verify AC/TC coverage, interface compliance, architecture alignment, test quality
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
2. **Assess severity.** Claude models tend to grade generously. Codex models tend to grade conservatively. Apply your own judgment — don't average.
3. **Categorize the fix list:**
   - Must-fix: ship blockers
   - Should-fix: correctness or quality issues
   - Nice-to-have: polish and debt
4. **Route fixes by default:** auto-dispatch clear must-fix and should-fix items. Ask the human before proceeding only when a fix changes product scope, requirement intent, or release risk profile.
5. **Report findings to the human** with the categorized list, your recommended ship-readiness grade, what was auto-dispatched, and any items requiring human input.

### Phase 4: Fixes

Default behavior is to auto-dispatch clear must-fix and should-fix items.

- For a well-specified batch of fixes: launch a Codex subagent (via a general-purpose teammate) with the fix list document, the epic, and the tech design. Have it implement all fixes. In Sonnet-only mode, spawn a teammate to implement fixes directly.
- After fixes: launch a fresh review targeting the specific changes to confirm the fixes are correct.
- Run the discovered epic acceptance gate yourself to confirm all required gates pass.
- Stage, commit (`feat: epic verification fixes`), and report completion to the human.
- Ask the human before continuing only when a fix would alter product scope, requirement intent, or release risk profile.

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

After long multi-step tasks (15+ minutes, dozens of tool calls), agents sometimes complete their work and write results to the console but forget to send the completion message back to the team lead. The "report back to team lead" instruction decays over a long execution chain as it gets displaced by implementation work.

This is structural, not random — longer tasks make it more likely. The implementer handoff prompt should place the reporting instruction prominently. If two idle notifications pass after expected completion time with no message, send a nudge.

### Sequencing: Wait for Confirmation Before Proceeding

Do not launch the next phase of work until the current agent confirms completion. Specifically:
- Don't launch verification before the implementer signals "done"
- Don't launch the next story before the current story is fully verified
- Don't assume file state is final because you can read correct-looking files — the agent may have more changes in flight

The teammate's explicit report is the trigger for the next step, not the orchestrator's independent observation of file state.

### Process Adaptation

The workflow defined in the story implementation cycle is the default. The orchestrator has discretion to adjust within bounds.

What can be adjusted:
- How much detail goes into the handoff prompt based on story complexity
- Whether to flag specific risks or gotchas based on patterns from previous stories
- Risk-tier verification depth (`low`, `medium`, `high`)
- Bounded review loop depth when no substantive issues remain
- Use of explicit `accepted-risk` dispositions for non-blocking items

What cannot be adjusted:
- The self-review loop always runs — the implementer always self-reviews until clean
- The orchestrator always runs the discovered story/epic acceptance gates
- Fresh agents per story — no carrying teammates forward
- Full test suite regression check — always verify all tests, not just the new story's
- The three hard invariants in Control Contract

Human override always wins. If the human directs a process change, apply it, log it, and continue.

If a story's verification surfaces a pattern (error message drift, type deviations, specific module fragility), flag it in subsequent story handoffs.

---

## Logging

`team-impl-log.md` is created during On Load and lives alongside the epic and tech design. It captures the full orchestration experience for this run.

**What to log:**
- Lane determination: which skills were found, which weren't, which lane was selected, fallbacks applied
- Skill availability issues: teammates that couldn't find expected skills, how it was resolved
- Decisions and their reasoning (why this verification depth, why this fix routing)
- Corrections the human makes to your process
- Failure modes encountered and how they were resolved
- Patterns that emerge across stories (what works, what breaks)
- Process evolution (when and why the workflow adapted)

**What not to log:**
- Status updates ("Story 3 started")
- Routine events that went as expected
- Implementation details (that's the code's job)

Write narrative entries, not bullet points. Each entry should tell the story of what happened, what was observed, and why it might matter. A future reader building or refining this skill needs to understand the shape of the work, not just the checkboxes.

`team-impl-log.md` is a first-class deliverable. A perfect implementation with thin notes is less valuable than a messy implementation with thorough orchestration documentation. Optimize for learning surface area.

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

## Reference: Verification: The Scrutiny Gradient

# Verification: The Scrutiny Gradient

**Upstream = more scrutiny. Errors compound downward.**

The epic gets the most attention because if it's on track, everything else follows. If it's off, everything downstream is off.

## The Gradient

```
Epic:  #################### Every line
Tech Design:   #############....... Detailed review
Stories:       ########............ Key things + shape
Implementation:####................ Spot checks + tests
```

## Epic Verification (MOST SCRUTINY)

This is the linchpin. Read and verify EVERY LINE.

### Verification Steps

1. **BA self-review** -- Critical review of own work. Fresh eyes on what was just written.

2. **Tech Lead validation** -- Fresh context. The Tech Lead validates the spec is properly laid out for tech design work:
   - Can I map every AC to implementation?
   - Are data contracts complete and realistic?
   - Are there technical constraints the BA missed?
   - Do flows make sense from implementation perspective?

3. **Additional model validation** -- Another perspective (different model, different strengths):
   - Different model, different strengths
   - Adversarial/diverse perspectives catch different issues

4. **Fix all issues, not just blockers** -- Severity tiers (Critical/Major/Minor) set fix priority order, not skip criteria. Address all issues before handoff. Minors at the spec level compound downstream -- zero debt before code exists.

5. **Validation rounds** -- Run validation until no substantive changes are introduced, typically 1-3 rounds. The Tech Lead also validates before designing -- a built-in final gate. Number of rounds is at the user's discretion.

6. **Human review (CRITICAL)** -- Read and parse EVERY LINE:
   - Can you explain why each AC matters?
   - No "AI wrote this and I didn't read it" items
   - This is the document that matters most

## Tech Design Verification

Still detailed review, but less line-by-line than epic.

### What to Check

- Structure matches methodology expectations
- TC-to-test mapping is complete
- Interface definitions are clear
- Phase breakdown makes sense
- No circular dependencies

### Who Validates

- **Tech Lead self-review** -- Critical review of own work
- **BA/SM validation** -- Can I shard stories from this? Can I identify coherent AC groupings?
- **Tech Lead re-validation** -- Can I add story-level technical sections from this?

## Story Verification

Stories go through a two-phase validation reflecting their two-phase authoring.

### Functional Stories (after BA/SM sharding)

Less line-by-line, more shape and completeness:

- Coverage gate: every AC/TC assigned to a story
- Integration path trace: no cross-story seam gaps
- Each story coherent and independently acceptable
- Tech Lead confirms they can add technical sections

### Technically Enriched Stories (after Tech Lead enrichment)

Story contract compliance check:

1. **Tech design shard present** -- substantial, story-scoped tech design content in Architecture Context and Interfaces
2. **TC-to-test mapping present** -- every TC mapped to a test approach with file names and approaches from the tech design
3. **Non-TC decided tests present** -- edge/integration tests from tech design carried forward or explicitly noted as absent
4. **Technical DoD present** -- specific verification commands
5. **Spec deviation field present with citations** -- checked tech design sections listed, even when no deviations
6. **Targets, not steps** -- technical sections describe what, not how

Consumer gate: could an engineer implement from this story alone, without reading the full tech design?

## Implementation Verification

Spot checks + automated tests.

### What to Check

- Tests pass (full suite)
- Types check clean
- Lint passes
- Spot check implementation against tech design
- Gorilla testing catches "feels wrong" moments

---

## Multi-Agent Validation Pattern

Liminal Spec uses this pattern throughout:

| Artifact | Author Reviews | Consumer Reviews |
|----------|---------------|------------------|
| Epic | BA self-review | Tech Lead (needs it for design) |
| Tech Design | Tech Lead self-review | BA/SM (needs it for story derivation) + Tech Lead (needs it for technical sections) |
| Published Stories | BA/SM self-review | Engineer (needs them for implementation) |

### Why This Works

1. **Author review** -- Catches obvious issues, forces author to re-read
2. **Consumer review** -- Downstream consumer knows what they need from the artifact
3. **Different model** -- Different strengths catch different issues. Use adversarial/diverse perspectives for complementary coverage.
4. **Fresh context** -- No negotiation baggage, reads artifact cold

### The Key Pattern: Author + Downstream Consumer

If the Tech Lead can't build a design from the epic -> spec isn't ready.
If the BA/SM can't derive stories from the epic -> epic isn't ready.
If the Engineer can't implement from published stories + tech design -> artifacts aren't ready.

**The downstream consumer is the ultimate validator.**

---

## Orchestration

**How to run validation passes is left to the practitioner.** This skill describes:
- **WHAT to validate** -- Which artifacts, which aspects
- **WHEN to validate** -- Checkpoints in the flow

Leaves flexible:
- **HOW to validate** -- Which models, how many passes
- **Specific orchestration** -- Based on your setup and preferences

---

## Checkpoints

### Before Tech Design

- [ ] Epic complete
- [ ] BA self-review done
- [ ] Model validation complete
- [ ] All issues addressed (Critical, Major, and Minor)
- [ ] Validation rounds complete
- [ ] Tech Lead validated: can design from this
- [ ] Human reviewed every line

### Before Publishing Epic

- [ ] Tech Design complete (all altitudes: system context, modules, interfaces)
- [ ] Tech Lead self-review done (completeness, richness, writing quality, readiness)
- [ ] Model validation complete (different model for diverse perspective)
- [ ] All issues addressed (Critical, Major, and Minor)
- [ ] Validation rounds complete (no substantive changes remaining)
- [ ] TC -> Test mapping complete (every TC from epic maps to a test)
- [ ] Human reviewed structure and coverage

### Before Implementation

- [ ] Functional stories complete (all ACs/TCs assigned, integration path traced)
- [ ] Technical enrichment complete (all six story contract requirements met)
- [ ] Consumer gate passed: engineer can implement from stories
- [ ] Different model reviewed stories (if high-stakes)

### Before Ship

- [ ] All tests pass
- [ ] Gorilla testing complete
- [ ] Verification checklist passes
- [ ] Human has seen it work
