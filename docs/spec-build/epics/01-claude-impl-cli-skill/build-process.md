# Build Process: ls-claude-impl

## Purpose

This is the manual orchestration playbook for building the `ls-claude-impl` epic. It applies the methodology defined in `epic.md` and the tech-design pack to a build where **Claude Code (the assistant in this session) is the orchestrator** and **codex CLI subagents are the implementor / verifier / quick-fix lanes**. The user is the human in the loop for design rulings, scope decisions, and final acceptance.

The doc is durable. Any fresh Claude Code session in this repo should be able to load `team-impl-log.md` plus this file and resume the build without prior conversation context.

The methodology principles from the spec apply unchanged. The differences are mechanical:

- No `ls-impl-cli` runtime exists yet — we are building it. Codex dispatches happen via `codex exec` directly through Bash.
- No `impl-run.config.json` — role assignments are pinned in this doc.
- No CLI result envelope — codex returns JSONL; receipts are markdown sections in `team-impl-log.md`.
- Epic-level verification and synthesis are deferred. We will design that lane when the story work is complete.

## Roles and Dispatch Contracts

| Role | Who | Session Shape |
|---|---|---|
| Orchestrator | Claude Code (this session) | Retained; owns state, prompts, gates, routing |
| Human | User | Final acceptance, design rulings, ambiguity resolution |
| Story Implementor | codex gpt-5.4 high | Retained per story via `codex exec resume` |
| Story Verifier 1 | codex gpt-5.4 xhigh | Fresh per story |
| Story Verifier 2 | codex gpt-5.3-codex high | Fresh per story |
| Quick Fixer | codex gpt-5.4 medium | Fresh per fix |

### Orchestrator Responsibilities

- Read the story to be implemented and the relevant tech-design sections
- Compose role prompts from the templates below + story-specific context
- Dispatch codex subagents and persist JSONL artifacts under `artifacts/story-XX/`
- Run the story gate locally (`bun run verify` until Story 0 adds `green-verify`, then `bun run green-verify`)
- Compare cumulative test count to the prior accepted baseline; block on regression
- Compare verifier reports; preserve disagreement; route fixes
- Surface receipt + ask user for explicit acceptance before advancing
- Update `team-impl-log.md` after every state transition

### Codex Dispatch Commands

Implementor (initial):
```bash
codex exec --json "<implementor prompt>" > docs/spec-build/epics/01-claude-impl-cli-skill/artifacts/story-XX/NNN-implementor.jsonl 2>/dev/null
```

Implementor (self-review resume):
```bash
codex exec resume --json <SESSION_ID> "<self-review prompt>" > docs/spec-build/epics/01-claude-impl-cli-skill/artifacts/story-XX/NNN-implementor-self-review-K.jsonl 2>/dev/null
```

Verifier 1 (codex gpt-5.4 xhigh):
```bash
codex exec --json -c model_reasoning_effort=xhigh "<verifier prompt>" > docs/spec-build/epics/01-claude-impl-cli-skill/artifacts/story-XX/NNN-verifier-codex54-xhigh.jsonl 2>/dev/null
```

Verifier 2 (codex gpt-5.3-codex high):
```bash
codex exec --json -m gpt-5.3-codex -c model_reasoning_effort=high "<verifier prompt>" > docs/spec-build/epics/01-claude-impl-cli-skill/artifacts/story-XX/NNN-verifier-codex53-high.jsonl 2>/dev/null
```

Quick Fixer:
```bash
codex exec --json -c model_reasoning_effort=medium "<quick-fix prompt>" > docs/spec-build/epics/01-claude-impl-cli-skill/artifacts/story-XX/NNN-quick-fix.jsonl 2>/dev/null
```

Verifiers always run **in parallel** via two separate Bash tool calls each with `run_in_background: true`. Capture session-id from implementor's first JSONL using `codex-result session-id <path>` and record it in the log.

## Artifact Layout

```
docs/spec-build/epics/01-claude-impl-cli-skill/
├── epic.md
├── tech-design.md
├── tech-design-skill-process.md
├── tech-design-cli-runtime.md
├── test-plan.md
├── stories/
├── build-process.md          ← this file
├── team-impl-log.md          ← durable orchestration record
└── artifacts/
    ├── story-00/
    │   ├── 001-implementor.jsonl
    │   ├── 002-implementor-self-review-1.jsonl
    │   ├── 003-implementor-self-review-2.jsonl
    │   ├── 004-implementor-self-review-3.jsonl
    │   ├── 005-verifier-codex54-xhigh.jsonl
    │   ├── 006-verifier-codex53-high.jsonl
    │   └── 00N-...
    └── story-NN/
```

Numeric prefix on artifact filenames is the dispatch order within the story. Never rewrite or rename a prior artifact — append new ones for follow-up dispatches.

## Verification Gates

| Phase | Gate Command | Notes |
|---|---|---|
| Until Story 0 adds the script | `bun run verify` | existing repo gate |
| After Story 0 adds verification scripts | `bun run green-verify` | per tech-design `Verification Scripts` section |
| Epic gate | `bun run verify-all` | not used in v1 of this build process — epic verification deferred |

Story 0 includes adding `red-verify`, `green-verify`, `verify-all`, `guard:no-test-changes`, and `smoke:impl-cli` (with a visible skip notice if no real smoke exists yet) to `package.json`. Until then the orchestrator runs `bun run verify` and notes the substitution in the receipt.

`guard:no-test-changes` runs as part of `green-verify` to enforce test-immutability between red and green phases of the same story.

## Per-Story Workflow

The orchestrator follows these steps for every story, in order. Each step ends with a `team-impl-log.md` update.

### Step 1 — Story load and scope confirmation

1. Read the full story file from `stories/`.
2. Read the relevant tech-design sections listed in the story's "Relevant Tech Design Sections" block.
3. Re-read any prior story receipts that the current story depends on.
4. Confirm story ACs, TCs, and the test files implicated by `test-plan.md`.
5. Update the log: set state to `STORY_ACTIVE`, record current story id and phase = `implement-pending`.

### Step 2 — Implementor dispatch

1. Compose the implementor prompt from the template below + story-specific values.
2. Run `codex exec --json "<prompt>"` and capture JSONL.
3. Extract session id with `codex-result session-id <path>` and record it in the log under `Current Continuation Handles`.
4. Read the implementor's last message with `codex-result last <path>`. Read full messages with `codex-result messages <path>` only if the last message is insufficient.
5. Inspect the implementor's reported changed files and tests. Confirm tests were written before implementation (TDD discipline embedded in the prompt).

### Step 3 — Self-review passes (1, 2, 3) via session resume

For each pass K in 1..3:

1. Run `codex exec resume --json <SESSION_ID> "<self-review pass K prompt>"` and persist JSONL.
2. Read the result. The implementor either reports "no findings," fixes non-controversial issues in-session, or surfaces uncertain findings to the orchestrator.
3. If the pass surfaces only human-ruling issues or a blocking condition, stop early.
4. If the pass auto-applied fixes, the next pass operates on the updated code.

After all passes (or early stop), update the log with: passes run, findings fixed in-session, findings surfaced for orchestrator routing, any open questions.

### Step 4 — Orchestrator review and story gate

1. Run the story gate locally (`bun run green-verify` once available, `bun run verify` until then).
2. If the gate fails, route the failure: same-session continuation if the implementor can fix it confidently, quick-fix if it is small and bounded, escalate to user otherwise.
3. Compute the test count delta vs the prior accepted story's baseline. Lower-than-expected total = regression block.
4. Inspect changed files for: backwards-compat hacks, vestigial code, oversized scope creep, mocks on production paths. Per repo CLAUDE.md these are not allowed.

If the gate passes and the orchestrator review is clean, advance to verification. Otherwise route the issue.

### Step 5 — Dual verifier dispatch (parallel, fresh sessions)

1. Compose the verifier prompt from the template below.
2. Dispatch verifier 1 and verifier 2 in parallel — two Bash tool calls each with `run_in_background: true`.
3. When both complete, read full agent messages from both JSONL files (`codex-result messages <path>`) since verifier reports are usually structured prose, not just a final line.

### Step 6 — Verifier comparison and routing

1. For each verifier: extract findings, AC/TC coverage claims, mock/shim audit findings, recommended fix scope, pass/revise/block.
2. Cross-compare:
   - Both `pass` with no findings → proceed to receipt.
   - Both `pass` with overlapping non-blocking findings → record findings, proceed to receipt with dispositions.
   - Disagreement (one pass, one revise/block) → **do not auto-resolve**. Surface both reports to user for ruling.
   - Both `revise`/`block` → route fix.
3. If fixes are needed, route to:
   - **Same-session implementor continuation** when the implementor's recent context still matters and the fix is in-flow.
   - **Quick-fix subagent** when the fix is small, bounded, and doesn't need full story context.
   - **User escalation** when there is design ambiguity, scope dispute, or verifier disagreement.

After **substantial fixes**, re-verify with fresh verifier sessions (no resume of prior verifier session). Persist the new JSONL with a higher numeric prefix. For **small / bounded fixes, nits, and end-of-story cleanup**, the orchestrator spot-checks the change and reruns the gate locally — no re-verification dispatch needed. Use judgment about which category a fix falls into; default to re-verification only when the fix touched non-trivial logic or surface area.

### Step 7 — Mock/shim audit

For integration-facing stories (anything touching `processes/impl-cli/core/provider-adapters/`, command handlers, or the prompt asset embedding pipeline), inspect verifier `mockOrShimAuditFindings`. Inappropriate mocks/shims/placeholders/fake adapters that allow tests to pass without exercising the intended path **block acceptance**.

### Step 8 — Receipt, acceptance, advancement

1. Write the receipt to `team-impl-log.md` (template below).
2. Surface the receipt to the user with: gate result, verifier outcomes, test-count delta, open dispositions, recommended next step.
3. **Orchestrator owns acceptance.** If the story is clean (gates pass, dispositions resolved, mock/shim audit clean, no open risks, no verifier disagreement affecting code), close it and advance. The user is the interruption authority, not a per-story approval bottleneck.
4. Update log state to `BETWEEN_STORIES`, update `Cumulative Baselines`, write the receipt with `User Acceptance: ACCEPTED (orchestrator-autonomous per standing direction)`, and advance to the next story.
5. If the story is NOT clean — unresolved blocker, verifier disagreement that affects code, scope ambiguity, or anything requiring a design ruling — surface to user before advancing.

## Prompt Templates

These are the assembled prompts the orchestrator hands to codex subagents. They embed the methodology's prompt-asset principles (role stance, reading journey, result contract, mock audit) into a single string until the real prompt asset system exists.

### Implementor (initial dispatch)

```
You are the story implementor for story <STORY_ID> of the ls-claude-impl epic. Use TDD discipline: write tests first, see them fail, then implement to green.

Reading order (read these fully before writing any code; the only story you read is the one at hand):
1. /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/stories/<STORY_FILE>
2. /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design.md
3. /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-skill-process.md
4. /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-cli-runtime.md
5. /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/test-plan.md
Read each in 500-line chunks if large; reflect after each chunk.

Scope discipline:
- Implement ONLY the ACs/TCs in this story. Do not anticipate downstream stories.
- Do NOT add backwards-compat shims, _-renamed unused vars, or "removed in X" comments.
- Do NOT mock production paths to make tests pass. Mock only external boundaries (provider CLIs, auth checks, child processes, network).
- Filesystem fixtures should run on real temp dirs.
- Default to no comments. Only add a comment when the WHY is non-obvious.

Workflow:
1. Identify the test files implicated by this story per test-plan.md.
2. Write red tests for every AC/TC owned by this story. Run them — confirm they fail for the right reason.
3. Implement until tests are green. Do not modify the tests during the green phase.
4. Run `bun run verify` (or `bun run green-verify` if it exists) to confirm the full project gate.
5. Self-check: did you over-implement scope? Did you introduce mocks on production paths? Did you change tests during green?

Return a final message containing a structured implementor result with these fields:
- story id and title
- plan summary (ACs, TCs, approach, likely failure modes)
- changed files (path + reason for each)
- tests: added, modified, removed; total count after story; delta vs prior baseline (the orchestrator will tell you the prior baseline if relevant)
- gates run + result (pass/fail/not-run)
- self-review findings fixed in this dispatch (will be empty for the initial pass)
- self-review findings surfaced to orchestrator (uncertain or unresolved)
- open questions
- spec deviations (if any)
- recommended next step
```

### Implementor self-review pass 1 — broad correctness

```
Self-review pass 1 of 3: broad correctness and obvious omissions.

Re-read the story and your implementation. Look for:
- ACs or TCs that are claimed-covered but not actually exercised by a test
- Obvious correctness bugs in the implementation paths
- Missing edge cases that the story explicitly calls out
- Any code that was added beyond the story's scope

For each finding:
- If it is a clear local correction with no design ambiguity, fix it now in this session.
- If you are not confident in the fix, do NOT change the code. Surface it to the orchestrator instead.

Return a structured pass-1 result: findings fixed, findings surfaced, files changed, recommended next step.
```

### Implementor self-review pass 2 — test coverage and requirement alignment

```
Self-review pass 2 of 3: test/coverage and requirement alignment.

Look specifically for:
- ACs/TCs in the story whose corresponding test does not actually assert the behavior described
- Tests that pass without exercising the intended implementation path (mock-shaped passes)
- Inappropriate mocks/shims/placeholders/fake adapters on production paths
- Test count vs the test-plan's expected count for this story's surface

Same fix-vs-surface rule as pass 1. Return a structured pass-2 result.
```

### Implementor self-review pass 3 — residual risk and boundary audit

```
Self-review pass 3 of 3: residual risk and boundary audit.

Look for:
- Boundary conditions left unverified (empty inputs, missing files, malformed JSON, etc. — but only for ACs that imply them)
- Security/operational guardrails the story implicates per the tech-design (path resolution, timeouts, secret redaction, git-root requirement) — only those owned by this story
- Anything you are uncertain about that future stories will rely on

Same fix-vs-surface rule. Return a structured pass-3 result and a final recommended next step (ready-for-verification | needs-followup-fix | needs-human-ruling | blocked).
```

### Verifier (fresh dispatch)

```
You are story verifier <LABEL> for story <STORY_ID> of the ls-claude-impl epic. You are a FRESH session. You have not seen the implementor's reasoning. Verify by reading the artifacts and the code on disk.

Reading order:
1. /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/stories/<STORY_FILE>
2. The full tech-design pack: tech-design.md, tech-design-skill-process.md, tech-design-cli-runtime.md
3. /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/test-plan.md
4. The implementor's structured result (paste below) — read for the file/test inventory only; do not trust its conclusions
5. The actual changed files on disk
6. The actual test files on disk

Implementor result:
<<<
<PASTE LAST MESSAGE OR STRUCTURED SECTIONS HERE>
>>>

Your job:
- For each AC and TC in the story, identify the test that covers it and confirm the test actually exercises the implementation path.
- Run the project gate yourself: `bun run green-verify` (or `bun run verify` if green-verify doesn't exist yet). Capture the result.
- Audit for inappropriate mocks/shims/placeholders/fake adapters on production paths. List every offender by path and reason.
- Identify additional observations that don't rise to formal findings but are worth surfacing.

Return a structured verifier result with:
- verifier label (<LABEL>), provider id, model
- artifacts read (paths)
- review scope summary
- findings: list of {id, severity (critical|major|minor|observation), title, evidence, affected files, requirement ids covered, recommended fix scope, blocking (true|false)}
- requirement coverage: verified ACs/TCs vs unverified
- gates run + result
- mockOrShimAuditFindings: list of paths + descriptions, or [] if none
- recommended next step: pass | revise | block
- recommended fix scope: same-session-implementor | quick-fix | fresh-fix-path | human-ruling
- open questions
- additional observations

Do not auto-fix anything. Do not modify code. You are read-only.
```

### Quick Fixer

No template. The quick fixer doesn't know about the epic, the current story, or the methodology — and it shouldn't. Its only purpose is to do mechanical work the orchestrator should not be spending its own context on (small fixes, doc backfill after an implementation pivot, rote edits, etc.). Tell it what to do in plain language and dispatch.

```bash
codex exec --json -c model_reasoning_effort=medium "<the task, plainly stated>" > docs/spec-build/epics/01-claude-impl-cli-skill/artifacts/story-XX/NNN-quick-fix.jsonl 2>/dev/null
```

The orchestrator decides when a quick-fix dispatch is appropriate (Step 6 routing rules). The subagent itself just executes the task as described.

> **Spec drift to revisit when we reach Story 5.** The tech-design currently describes the quick-fix CLI command and prompt asset with a structured contract (narrow-scope rule, no-full-reimplementation rule, structured result, prompt-asset-contract test). Per user direction, the quick-fix lane is intentionally dumber than that. Reconcile the spec when implementing Story 5: the CLI surface should still pass a task description through to a quick-fix subagent without imposing a story-aware contract on it.

## Receipt Template

Append to `team-impl-log.md` after every accepted story.

```markdown
### story-NN-<short-name>

- Implementor Artifacts:
  - artifacts/story-NN/001-implementor.jsonl (session: <id>)
  - artifacts/story-NN/002-implementor-self-review-1.jsonl
  - artifacts/story-NN/003-implementor-self-review-2.jsonl
  - artifacts/story-NN/004-implementor-self-review-3.jsonl
- Verifier Artifacts:
  - artifacts/story-NN/005-verifier-codex54-xhigh.jsonl (outcome: pass|revise|block)
  - artifacts/story-NN/006-verifier-codex53-high.jsonl (outcome: pass|revise|block)
- Follow-up Artifacts (if any):
  - artifacts/story-NN/007-quick-fix.jsonl
  - artifacts/story-NN/008-reverify-codex54-xhigh.jsonl
  - artifacts/story-NN/009-reverify-codex53-high.jsonl
- Final Story Gate: `bun run green-verify` → pass
- Test Count: prior baseline N → current M (delta +K)
- Findings Dispositions:
  - FIND-1: fixed | accepted-risk | deferred (reason)
- Open Risks: <list or "none">
- Mock/Shim Audit: clean | findings: <list>
- User Acceptance: <date/time> by <user>
- Notes: <any prose worth keeping>
```

## Recovery From Disk

A fresh Claude Code session resumes by:

1. Reading this file (`build-process.md`) for methodology.
2. Reading `team-impl-log.md` for current state, current story, current phase, continuation handles, baselines, dispositions.
3. Listing `artifacts/story-XX/` to confirm what was actually persisted vs what the log says.
4. If state is `STORY_ACTIVE`, the log's `Current Continuation Handles` block names the active codex session id. Resume it with `codex exec resume --json <SESSION_ID> "<next pass prompt>"`.
5. If artifacts and log disagree, trust the artifacts and reconcile the log; do not silently overwrite either.

The orchestrator never relies on prior chat context to advance. Everything load-bearing lives on disk.

## Scope Guardrails

| Rule | Reason |
|---|---|
| One story at a time, in numeric order | Matches story dependencies declared in each story file |
| Final story gate is orchestrator-run | Per AC-5.5; the orchestrator runs `bun run green-verify` itself |
| User holds final acceptance | This build is not autonomous; user accepts each story before advance |
| Verifiers are always fresh sessions | Per AC-5.1; never resume a verifier session |
| Verifier disagreement is never auto-resolved | Per AC-5.4; surface to user |
| Test-count regression blocks acceptance | Per AC-6.2 |
| Mock/shim audit gates integration-facing stories | Per AC-5.2c, AC-8.1c |
| Cleanup, epic-verify, epic-synthesis are deferred | User direction; design later when story work completes |
| No backwards-compat shims, no `_var` renames, no "removed" comments | Per repo CLAUDE.md |
| No comments explaining WHAT — only non-obvious WHY | Per repo CLAUDE.md |
| `team-impl-log.md` is orchestrator-only | No subagent reads or writes the log. Implementor / verifier / quick-fixer prompts never reference it. The orchestrator is the sole reader and author. |

## Deferred Items

| Item | Reason |
|---|---|
| Epic verification, synthesis, and final epic gate | User direction — design when stories are complete |
| Copilot adapter | Out of scope for this build; codex is the only secondary harness in use |
| Real `smoke:impl-cli` against a fixture spec pack | Created with a visible skip notice in Story 0; expanded as the CLI gains real surface |
| `impl-run.config.json` parsing being driven by an actual orchestrator at runtime | This build hardcodes role assignments here; the runtime support is what we're building |
