---
name: ls-impl
description: Execute stories using TDD cycle (Skeleton, Red, Green, Gorilla, Verify) with multi-agent verification. Covers implementation, phase execution, and orchestration.
---

# Implementation

**Purpose:** Execute implementation from self-contained prompt packs. Zero prior context.

**The same Orchestrator from Phase 4 drives this phase.** The Orchestrator handles coordination, verification, and iteration. The Senior Engineer doesn't orchestrate or document — they receive a self-contained prompt and execute it.

## The Execution Mindset

You receive a prompt pack. That's it. No conversation history, no "remember when we discussed," no assumptions from prior work.

The prompt pack contains everything you need:
- Role and assignment
- Stack context (product, project, feature, story)
- Task details (inlined from tech design)
- Expected output format

**If it's not in the prompt, it doesn't exist for this execution.**

---

## The Execution Cycle

Each story follows: **Skeleton → TDD Red → TDD Green → Gorilla → Verify**. Each phase may be a separate session with fresh context.

→ See `references/phase-execution.md` for detailed phase mechanics, stub patterns, mock setup examples, exit criteria, and common issues.

---

## Handling Issues

### Inconsistencies or Ambiguity

If something doesn't line up — signatures don't match between prompt and tech design, test counts conflict, a dependency seems wrong, or requirements contradict each other — **stop and ask**. Do not silently resolve inconsistencies. The confidence chain depends on traceability, and a quiet workaround creates invisible spec drift.

1. Describe what doesn't line up
2. State what you think the resolution is
3. Wait for orchestrator/human decision before proceeding

### Stuck >15 minutes on Green

1. **Simplify** — Implement one test at a time
2. **Add logging** — Trace data flow
3. **Check TC** — Is the test expectation wrong?
4. **Escalate** — Ask human, don't spin

### Ground-Level Discovery

When implementation reveals spec gaps:

1. Document the discovery
2. Propose minimal solution
3. Get human approval
4. Update spec if significant

Don't silently deviate from spec.

### Test Failures After Green

Common causes:
- Mock setup doesn't match implementation expectations
- Type mismatch between mock and real data
- Race condition in async test

Debug by checking mock return values against what implementation actually needs.

---

## Constraints

- **Only implement what's in the prompt** — No "improvements" or extra features
- **Match existing patterns** — Look at how similar things are done in the codebase
- **No hardcoding for tests** — Implement actual logic that works for all valid inputs
- **Readable code** — Clear names, maintainable solutions, comments only where logic isn't self-evident

---

## Output Format

After completing each phase, summarize:
- Files created/modified
- Test counts (new, total)
- Any decisions made
- Any issues discovered
- Confirmation of expected state (X tests PASS, Y tests ERROR)

---

## The Prompt Pack is Your World

You may see references to tech design, epic, etc. These are for human traceability.

For your execution: **the prompt pack is self-contained**. The Orchestrator inlined everything you need. Trust the prompt.

If something seems missing or doesn't line up, **stop and surface it** — don't silently work around gaps. Document what's missing and return to the orchestrator. The prompt pack should have everything; if it doesn't, that's a prompt quality issue to fix, not something to improvise past.

---

# Phase Execution Deep Dive

The execution cycle for each story.

## The Cycle

```
SKELETON → TDD RED → TDD GREEN → GORILLA → VERIFY
```

Each phase may run in a fresh context. The prompt pack contains everything needed.

---

## Skeleton Phase

**Purpose:** Create structural scaffolding. Validate architecture before writing logic.

### Deliverables

- File structure (all directories and files)
- Type definitions
- Component/function stubs that throw `NotImplementedError`
- Export statements
- Route registration (wired to stubs)

### The NotImplementedError Pattern

```typescript
// errors.ts
export class NotImplementedError extends Error {
  constructor(message = 'Not implemented') {
    super(message);
    this.name = 'NotImplementedError';
  }
}
```

### Stub Examples

**Component:**
```typescript
import { NotImplementedError } from '@/errors';
import type { LocationListProps } from '@/types';

export function LocationList(props: LocationListProps): JSX.Element {
  throw new NotImplementedError('LocationList');
}
```

**Hook:**
```typescript
import { NotImplementedError } from '@/errors';
import type { UseLocationsReturn } from '@/types';

export function useLocations(): UseLocationsReturn {
  throw new NotImplementedError('useLocations');
}
```

**API function:**
```typescript
import { NotImplementedError } from '@/errors';

export const locationApi = {
  getAll: async (sai: string) => {
    throw new NotImplementedError('locationApi.getAll');
  },
};
```

### Exit Criteria

- [ ] All files created per prompt
- [ ] TypeScript compiles without errors
- [ ] All exports in place
- [ ] Stubs throw NotImplementedError
- [ ] No actual logic implemented

---

## TDD Red Phase

**Purpose:** Write tests that assert real behavior. Tests will ERROR because stubs throw.

### Critical Rule: Assert Behavior, Not Errors

```typescript
// ✅ CORRECT - Asserts expected behavior
it('TC-10: renders location rows', () => {
  render(<LocationList locations={mockLocations} />);
  expect(screen.getByText('125 York Street')).toBeInTheDocument();
});

// ❌ WRONG - This passes before AND after implementation
it('TC-10: renders location rows', () => {
  expect(() => render(<LocationList locations={mockLocations} />))
    .toThrow(NotImplementedError);
});
```

**Why tests ERROR:** Stubs throw before assertions execute. The test is correctly written — it just can't complete yet.

**Why the anti-pattern is dangerous:** Testing that NotImplementedError throws will PASS both before AND after implementation. You've verified nothing about actual behavior. This defeats the entire purpose of TDD.

### Mock Setup Patterns

**Basic mock:**
```typescript
mockLocationApi.getAll.mockResolvedValue(mockLocations);
```

**Delayed (for loading states):**
```typescript
mockLocationApi.getAll.mockImplementation(
  () => new Promise(resolve => setTimeout(() => resolve(mockLocations), 100))
);
```

**Never-resolving (persistent loading):**
```typescript
mockLocationApi.getAll.mockImplementation(() => new Promise(() => {}));
```

**Error:**
```typescript
mockLocationApi.getAll.mockRejectedValue(new Error('Network error'));
```

### Exit Criteria

- [ ] Tests written for all TCs in this phase
- [ ] Tests assert behavior (not error throwing)
- [ ] Tests ERROR when run (stubs throw)
- [ ] Previous phase tests still PASS
- [ ] Full lint/format/typecheck pipeline passes (everything except tests)
- [ ] **Commit checkpoint created** before proceeding to Green

The Red exit gate must run the full quality pipeline minus tests. Tests are expected to fail (stubs throw), but all other quality checks — formatting, linting, type checking — must pass. If the project defines a `red-verify` script (or equivalent), use it. Otherwise run format check, lint, and typecheck individually.

**Why this matters:** If Red produces lint-dirty code, Green implements against it. When lint failures surface later, fixing them risks destroying working Green implementation. Catch it at Red.

**Commit boundary:** Create a commit at Red completion before entering Green. This preserves a clean audit trail (requirement → red tests → implementation) and provides a rollback point if Green goes sideways. The commit includes failing tests and any skeleton scaffolding.

---

## TDD Green Phase

**Purpose:** Implement to make tests pass. Replace stubs with real logic.

### Implementation Order

Start with leaf dependencies, move up:
1. API layer (no dependencies)
2. Hooks (depend on API)
3. Components (depend on hooks)

This lets you test each layer as you build.

### Red Test Immutability

**Red tests are the behavioral contract for Green. Do not modify test files during Green.**

Green implementation must satisfy the tests as written in Red. If a test file is modified during Green, that's a signal something is wrong — either the Red tests were incorrect (fix in a separate cycle, not silently during Green) or the implementation is gaming the tests rather than satisfying intent.

If test files genuinely need editing during Green (e.g., environment setup fixes, not assertion changes), the change must be explicitly reviewed during verification. The verifier checks git history on affected test files to confirm the changes preserved AC/TC intent rather than weakening checks.

### Exit Criteria

- [ ] All tests PASS
- [ ] No NotImplementedError remaining in implemented code
- [ ] Implementation matches tech design interfaces
- [ ] No over-engineering beyond what tests require
- [ ] No test files modified (or modifications explicitly justified and reviewed)
- [ ] Full verification pipeline passes, including test immutability check

If the project defines a `green-verify` script (or equivalent) that runs the standard verification pipeline plus a test-immutability guard, use it. Otherwise run verification and manually confirm no test files changed via `git diff --name-only`.

---

## Gorilla Testing Phase

**Purpose:** Human-in-loop, ad hoc testing. Catches "feels wrong."

### What It Is

After TDD Green, before formal verification:
- Run the feature manually
- Try weird inputs
- Click things in unexpected order
- Use it like a real user would
- Look for anything that feels broken

### What It's Not

- Not scripted
- Not automated
- Not systematic

The point is to catch things tests don't cover — UX issues, edge cases you didn't think of, flows that technically work but feel wrong.

### Exit Criteria

- [ ] Human has used the feature manually
- [ ] No "feels wrong" moments (or they're documented/fixed)
- [ ] Ready for formal verification

### Why This Phase Exists

TDD ensures correctness against specified behavior. But:
- Specs can miss things
- Tests can miss things
- "Correct" isn't always "good"

**Gorilla testing legitimizes unstructured exploration within the structured process.** It's not a failure of rigor — it's a recognition that humans catch things automation doesn't.

---

## Verify Phase

**Purpose:** Formal verification. Full test suite, types, lint.

### Commands

Run the project's `verify` or `verify-all` script. If the project doesn't define these, run the components individually:

```bash
npm run format:check       # Formatting correct
npm run lint               # No lint errors
npm run typecheck          # No type errors
npm test                   # All tests pass
```

### Checklist Template

```markdown
## Story N Verification

### Automated
- [ ] All tests pass (this story + previous)
- [ ] Test count: Expected X, Actual X
- [ ] TypeScript compiles clean
- [ ] Lint passes

### Manual (from Gorilla)
- [ ] Feature works as expected
- [ ] No console errors in browser
- [ ] Previous functionality still works

### Implementation Details
- [ ] Uses correct types from tech design
- [ ] Calls correct API endpoints
- [ ] Has correct data-testid values
- [ ] Matches component structure from design
```

### Exit Criteria

- [ ] All checklist items pass
- [ ] Story marked complete
- [ ] Ready for next story

---

## Common Issues

### Tests pass but behavior is wrong
**Cause:** Tests don't assert actual behavior
**Fix:** Review tests — are they checking real outcomes?

### Tests ERROR instead of PASS after Green
**Cause:** Stubs still throwing somewhere
**Fix:** Check all code paths hit by tests are implemented

### Tests FAIL (not ERROR) after Green
**Cause:** Implementation doesn't match expected behavior
**Fix:** Debug the specific assertion failure

### Previous tests break
**Cause:** Regression introduced
**Fix:** Don't proceed — fix the regression first

### Type errors in tests
**Cause:** Mock types don't match real types
**Fix:** Ensure fixtures match actual data shapes

---

# Execution Orchestration

Detailed patterns for coordinating agents during Phase 5 (Execution). SKILL.md defines the pipeline flow (validate → fix → execute → verify); this reference covers the operational details: dual-validator pattern, agent selection, session management, and parallel pipeline mechanics.

## The Pipeline

Execution follows a validation-execute-verify pipeline that can run in parallel:

```
Story N-1: [Verify] → Complete
Story N:   [Validate] → [Fix] → [Execute] → [Verify]
Story N+1:        [Validate] → [Fix] → (queued)
```

While one story executes, the next story validates. This maximizes throughput while maintaining quality gates.

---

## Story Validation

Before executing a story, validate its prompts are ready.

### Dual-Validator Pattern

Launch two validators in parallel with the same instructions but different cognitive profiles:

1. **Builder validator** — Holistic, understands implementation intent, catches structural issues
2. **Detail validator** — Literal spec reader with high reasoning, catches spec drift and edge cases

Use different models for complementary coverage. See `references/prompting-opus-4.6.md` and `references/prompting-gpt-5x.md` for model-specific guidance.

Both read:
- The story (`story.md`)
- All prompts (`prompt-X.1-skeleton-red.md`, `prompt-X.2-green.md`, `prompt-X.R-verify.md`)
- Tech design (relevant sections)
- Feature spec (relevant ACs/TCs)
- Liminal Spec methodology references

### Validator Instructions Template

```
You are validating Story N for execution readiness.

**Assume:** Story N-1 is complete (or in progress).

**Read:**
- docs/stories/story-N-{name}/story.md
- docs/stories/story-N-{name}/prompt-N.1-skeleton-red.md
- docs/stories/story-N-{name}/prompt-N.2-green.md
- docs/stories/story-N-{name}/prompt-N.R-verify.md
- docs/tech-design.md (relevant sections)
- docs/epic.md (relevant ACs)

**Validate:**
1. Story structure (prerequisites, ACs, files, test counts)
2. Prompt self-containment (can fresh agent execute?)
3. Tech-design alignment (signatures, interfaces match)
4. TDD flow (stubs throw, tests assert behavior)
5. Verification completeness (all TCs covered)
6. AC/TC traceability

**Report:**
- Blockers (must fix before execution)
- Issues (should fix, not blocking)
- Nits (minor polish)
- Overall verdict: PASS or FAIL
- Confidence level with reasoning
```

### Why Two Validators

| Validator | Strengths | Typically Catches |
|-----------|-----------|-------------------|
| Builder validator | Holistic, understands implementation intent | Missing dependencies, structural gaps |
| Detail validator | Literal spec reading, disciplined | Signature mismatches, test count errors, edge cases |

Using both increases coverage. They find different issues.

### Consolidating Results

After both validators return:

1. **Merge findings** into categories:
   - **Blockers** — Prevent execution, must fix
   - **Issues** — Quality problems, should fix
   - **Nits** — Minor polish, optional

2. **Human decides** on ambiguous items (see Human Decision Points below)

3. **Create fix list** with all blockers + issues

---

## Fix Cycle

When validation fails, iterate until it passes.

### Fix Pattern

```
Validator finds issues
    ↓
Senior Engineer fixes all issues
    ↓
SAME validator session re-validates
    ↓
Orchestrator verifies validator's claims
    ↓
Repeat until PASS
```

### Why Resume Same Session

Resuming the validator that found issues:
- Has full context of what was wrong
- Can confirm specific fixes were applied
- More efficient than re-explaining
- Catches if fix introduced new problems

### Orchestrator Verification

After validator re-validates, the orchestrator should:
- Spot-check key claims against actual files
- Verify fixes were applied correctly
- Catch false positives/negatives

This prevents blind trust in either direction.

---

## Story Execution

Once validation passes, execute the story.

### Implementation

Launch Senior Engineer with both prompts sequentially:

1. **Skeleton + Red** — Creates stubs and tests
   - Expected: Tests ERROR (stubs throw NotImplementedError)
   - Run `red-verify` (or equivalent) — format, lint, typecheck must pass
   - Commit checkpoint before proceeding to Green
   - Run required **Red Self-Review follow-up prompt** in the same session

2. **Green** — Implements to pass tests
   - Expected: All tests PASS, no test files modified
   - Run `green-verify` (or equivalent) — full verify + test immutability check
   - Run required **Green Self-Review follow-up prompt** in the same session

### Self-Review

After each major phase (Red complete, Green complete), the implementing agent reviews its own work in the same session.

Use this exact prompt after Skeleton+Red:

```text
You just completed the skeleton-red phase. Now do a thorough critical
review of your own implementation.

If you find issues and the fix is not controversial or requiring a
judgment call, fix them. Then report back: what issues you encountered,
what you fixed, and any issues you encountered but didn't fix and why.

Do a thorough assessment for readiness to move to the tdd-green phase
```

Use this exact prompt after TDD Green:

```text
You just completed the tdd green phase. Now do a thorough critical
review of your own implementation.

If you find issues and the fix is not controversial or requiring a
judgment call, fix them. Then report back: what issues you encountered,
what you fixed, and any issues you encountered but didn't fix and why.

Do a thorough assessment for readiness to move to the full story dual verification phase
```

If self-review returns `NOT READY`, do not advance. Fix, then re-run the same self-review prompt.

### Gorilla Testing (Human)

Between Green and Verify, human does ad-hoc testing:
- Run the feature manually
- Try unexpected inputs
- Look for "feels wrong" moments
- This phase cannot be delegated to agents

---

## Formal Verification

After implementation, run the verify prompt.

### Verification Pattern

Launch a verification model with write access (needs to run tests). See `references/prompting-gpt-5x.md` for specific model and CLI syntax.

```
Execute the verification prompt for Story N.

Read: docs/stories/story-N-{name}/prompt-N.R-verify.md

Run all verification steps including actual test execution.
Report: PASS or FAIL with TC-by-TC status.
```

### What Verifiers Check

- Test results (counts match expected)
- TypeScript compilation
- Lint results
- TC-by-TC verification against spec
- Edge cases and invariants
- Implementation correctness
- Test integrity — if any test files were modified during Green, review git history on those files to confirm changes preserved AC/TC intent rather than weakening checks

### Required Verifier Permissions

Verifiers need git access to check test integrity:
- `git log`, `git show`, `git diff` on test file paths
- If git access is unavailable, the verifier must state this in the report and flag test-integrity checks as incomplete rather than silently skipping them

### Handling Verification Failures

If verification fails:
1. Identify specific failures
2. Senior Engineer fixes
3. Re-run verification
4. Repeat until PASS

---

## Agent Selection Guide

| Task | Intent | Access | Session | Notes |
|------|--------|--------|---------|-------|
| Validate story | Builder perspective | Read-only | Fresh | Holistic, catches structural issues |
| Validate story | Detail perspective | Read-only | Fresh | Literal spec reading, catches details |
| Fix issues | Implementation | Write | Same or fresh | Fix what validators found |
| Re-validate | Detail re-check | Read-only | **Same session** | Validator has context of original issues |
| Implement | Implementation | Write | Fresh | Execute prompt pack |
| Self-review | Builder review | Read-only | **Same session** | Senior Engineer reviews own work |
| Verify | Formal verification | Write (runs tests) | Fresh | Formal TC-by-TC check |

For specific model and CLI syntax for each task, see `references/prompting-opus-4.6.md` (orchestration, implementation) and `references/prompting-gpt-5x.md` (verification).

### Session Management

**Resume same session when:**
- Re-validating after fixes (validator has context)
- Self-reviewing implementation (SE has context)
- Follow-up questions on same work

**Fresh session when:**
- Starting new story
- Different type of task
- Context is stale or overflowed

---

## Human Decision Points

The orchestrator cannot fully automate these decisions:

### 1. Blocker Triage

When validators find issues:
- Is this a real blocker or a nitpick?
- Fix now or defer to polish pass?
- Does the spec need updating instead?

### 2. Spec vs Implementation Conflicts

When implementation differs from spec:
- Is implementation better? → Update spec
- Is spec correct? → Fix implementation
- This requires understanding intent

### 3. Effort/Quality Tradeoff

For non-blocking issues:
- Fix everything? (Thorough, slower)
- Fix blockers only? (Velocity, tech debt)
- Your call based on project phase

### 4. Test Count Discrepancies

Running totals cascade through stories. When counts don't match:
- Which source is authoritative?
- Reconcile before proceeding

### 5. Gorilla Testing

Manual ad-hoc testing cannot be delegated:
- Does the feature "feel right"?
- Are there UX issues tests don't catch?
- Only human judgment applies

### 6. Final Acceptance

Deciding when a story is truly "done":
- All tests pass
- Verification passes
- Gorilla testing passes
- Human says "ship it"

---

## Parallel Pipeline Example

```
Time →

Story 2: ═══[Verify]═══════════[Complete]
Story 3:    ════[Execute]════[Verify]════[Complete]
Story 4:         ═══[Validate]═══[Fix]═══[Execute]═══
Story 5:                  ═══[Validate]═══[Fix]═══
Story 6:                           ═══[Validate]═══
```

**Constraints:**
- Story N cannot execute until N-1 is complete (dependency)
- Validation can run ahead (no dependency)
- Fixing can happen while previous story executes

**Throughput:** With parallel validation, you're never waiting for validation after a story completes—it's already done.

---

## Anti-Patterns

### Skipping Validation

"Let's just run it and see what happens."

Problems:
- Prompt issues surface during execution (wastes agent context)
- May implement wrong thing
- Harder to debug

### Single Validator

Using only one perspective.

Problems:
- Misses issues the other would catch
- False confidence in PASS verdict

### Fresh Session for Re-validation

Starting new validator session after fixes.

Problems:
- Loses context of what was wrong
- May miss that fix was incomplete
- Less efficient

### Trusting Validators Blindly

Not verifying validator claims.

Problems:
- Validators make mistakes
- May approve broken fixes
- May reject valid implementations

---

## Checklist: Story Execution

```markdown
## Story N Execution Checklist

### Validation
- [ ] Builder validator validated
- [ ] Pedantic validator validated
- [ ] Findings consolidated
- [ ] Blockers fixed
- [ ] Re-validation passed
- [ ] Human approved

### Implementation
- [ ] Skeleton + Red executed
- [ ] Tests ERROR as expected
- [ ] `red-verify` passes (format + lint + typecheck)
- [ ] Red commit checkpoint created
- [ ] Red self-review prompt executed
- [ ] Green executed
- [ ] Tests PASS
- [ ] No test files modified (or modifications justified)
- [ ] `green-verify` passes
- [ ] Green self-review prompt executed

### Verification
- [ ] Gorilla testing done (human)
- [ ] Verify prompt executed
- [ ] All TCs verified
- [ ] Story marked complete

### Ready for Next
- [ ] Story N+1 already validated
- [ ] Or validation in progress
```

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

## Reference: model-selection

## Model Selection

Different models excel at different tasks. Use the right model for the job.

| Task | Recommended Model | Why |
|------|-------------------|-----|
| **Orchestration** | Opus 4.6 | Gestalt thinking, manages complexity |
| **Story sharding** | Opus 4.6 | Understands scope, breaks work coherently |
| **Prompt drafting** | Opus 4.6 | Captures intent, writes for other models |
| **Spec/design writing** | Opus 4.6 | Narrative flow, functional-technical weaving |
| **Implementation** | Claude Code / Opus 4.6 | TDD discipline, service mocks |
| **Finicky implementation** | GPT 5x / 5x Codex | Precise, disciplined, less drift |
| **Difficult debugging** | GPT 5x / 5x Codex | Methodical, catches details |
| **Verification** | GPT 5x / 5x Codex | Thorough, catches what builders miss |
| **Code review** | GPT 5x / 5x Codex | Thorough, checks against spec |

### Typical Flow

1. **Opus 4.6** orchestrates, shards stories, drafts prompts
2. **Claude Code subagent** (or Opus with TDD context) executes implementation
3. **GPT 5x** verifies artifacts and reviews code

### Access Methods

- **Opus 4.6:** Claude Code, API, Clawdbot subagents
- **GPT 5x:** Codex CLI (`codex exec`), GitHub Copilot, API
- **GPT 5x Codex:** Codex CLI with `-m gpt-5.2-codex`

→ Reference: `references/prompting-opus-4.6.md`
→ Reference: `references/prompting-gpt-5x.md`

---

## Reference: Verification: The Scrutiny Gradient

# Verification: The Scrutiny Gradient

**Upstream = more scrutiny. Errors compound downward.**

The epic gets the most attention because if it's on track, everything else follows. If it's off, everything downstream is off.

## The Gradient

```
Epic:  ████████████████████ Every line
Tech Design:   █████████████░░░░░░░ Detailed review
Stories:       ████████░░░░░░░░░░░░ Key things + shape
Prompts:       ██████░░░░░░░░░░░░░░ Shape + intuition
Implementation:████░░░░░░░░░░░░░░░░ Spot checks + tests
```

## Epic Verification (MOST SCRUTINY)

This is the linchpin. Read and verify EVERY LINE.

### Verification Steps

1. **BA self-review** — Critical review of own work. Fresh eyes on what was just written.

2. **Tech Lead validation** — Fresh context. The Tech Lead validates the spec is properly laid out for tech design work:
   - Can I map every AC to implementation?
   - Are data contracts complete and realistic?
   - Are there technical constraints the BA missed?
   - Do flows make sense from implementation perspective?

3. **Additional model validation** — Another perspective (different model, different strengths):
   - Different model, different strengths
   - Adversarial/diverse perspectives catch different issues

4. **Fix all issues, not just blockers** — Severity tiers (Critical/Major/Minor) set fix priority order, not skip criteria. Address all issues before handoff. Minors at the spec level compound downstream — zero debt before code exists.

5. **Validation rounds** — Run validation until no substantive changes are introduced, typically 1-3 rounds. The Tech Lead also validates before designing — a built-in final gate. Number of rounds is at the user's discretion.

6. **Human review (CRITICAL)** — Read and parse EVERY LINE:
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

- **Tech Lead self-review** — Critical review of own work
- **Orchestrator validation** — Can I derive stories from this? Can I generate proper prompts?

## Story and Prompt Verification

Less line-by-line, more shape and intuition.

### What to Check

- Pick out key things to look for
- Intuitively judge the shape
- "Looks about right or not"
- Running test totals are accurate

### Prompt Validation (Multi-Agent)

Before giving prompts to the Senior Engineer:

1. **Orchestrator self-review** — Does the prompt have everything needed?
2. **Senior Engineer preview** — Can a fresh agent understand and execute?
3. **Different model review** — Different model reviews prompts against summary
4. **Cross-check with tech design** — Do prompts cover all chunks?

The Senior Engineer validates prompts by executing them. If they can't execute cleanly, the prompt isn't ready.

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
| Tech Design | Tech Lead self-review | Orchestrator (needs it for stories) |
| Prompts | Orchestrator self-review | Senior Engineer + different model |

### Why This Works

1. **Author review** — Catches obvious issues, forces author to re-read
2. **Consumer review** — Downstream consumer knows what they need from the artifact
3. **Different model** — Different strengths catch different issues. Use adversarial/diverse perspectives: Opus for gestalt, GPT 5x for detail and precision. When validators disagree on data contract completeness, defer to GPT 5x — it has consistently been more accurate on contract specifics.
4. **Fresh context** — No negotiation baggage, reads artifact cold

### The Key Pattern: Author + Downstream Consumer

If the Tech Lead can't build a design from the epic → spec isn't ready.
If the Orchestrator can't derive stories from tech design → design isn't ready.
If the Senior Engineer can't execute from prompt → prompt isn't ready.

**The downstream consumer is the ultimate validator.**

---

## Orchestration

**Opus orchestrates validation passes.** Launches subagents for:
- Self-reviews
- Downstream consumer validation
- Different model passes

### Challenge

Hard to prescribe exact orchestration in a skill.

### Solution

This skill describes:
- **WHAT to validate** — Which artifacts, which aspects
- **WHEN to validate** — Checkpoints in the flow

Leaves flexible:
- **HOW to validate** — Which models, how many passes
- **Specific orchestration** — Based on your setup and preferences

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

### Before Stories

- [ ] Tech Design complete (all altitudes: system context, modules, interfaces)
- [ ] Tech Lead self-review done (completeness, richness, writing quality, agent readiness)
- [ ] Model validation complete (different model for diverse perspective)
- [ ] All issues addressed (Critical, Major, and Minor)
- [ ] Validation rounds complete (no substantive changes remaining)
- [ ] TC → Test mapping complete (every TC from epic maps to a test)
- [ ] Orchestrator validated: can derive stories from this
- [ ] Human reviewed structure and coverage

### Before Execution

- [ ] Stories and prompts complete
- [ ] Orchestrator self-review done
- [ ] Senior Engineer validated: can execute from prompts
- [ ] Different model reviewed prompts

### Before Ship

- [ ] All tests pass
- [ ] Gorilla testing complete
- [ ] Verification checklist passes
- [ ] Human has seen it work

---

## Reference: Prompting GPT 5x

# Prompting GPT 5x

GPT 5x is the primary model for verification, code review, and detailed/finicky implementation in Liminal Spec. It excels at catching details Opus misses, thorough verification, and disciplined execution.

## When to Use GPT 5x

| Task | Why GPT 5x |
|------|-------------|
| **Verification** | Thorough, catches details others miss |
| **Code review** | Thorough, checks against spec systematically |
| **Difficult debugging** | Disciplined, methodical problem-solving |
| **Finicky implementation** | Precise instruction following, less drift |
| **Structured extraction** | Strong at schema adherence, JSON output |

**Access methods:**
- Codex CLI (`codex exec` with `--sandbox workspace-write` for implementation)
- GitHub Copilot
- API (expensive — use sparingly for high-value verification)

## Key Behavioral Traits

### More Deliberate Scaffolding

GPT 5x builds clearer plans and intermediate structure by default. Benefits from explicit scope and verbosity constraints.

### Lower Verbosity

More concise and task-focused than GPT 5/5.1. Still prompt-sensitive — articulate verbosity preference.

### Stronger Instruction Adherence

Less drift from user intent. Improved formatting and rationale presentation. Will follow specifications exactly.

### Conservative Grounding

Favors correctness and explicit reasoning. Handles ambiguity better with clarification in prompts.

## Prompting Patterns

### Controlling Verbosity

```xml
<output_verbosity_spec>
- Default: 3–6 sentences or ≤5 bullets for typical answers.
- For simple questions: ≤2 sentences.
- For complex multi-step tasks:
  - 1 short overview paragraph
  - ≤5 bullets: What changed, Where, Risks, Next steps, Open questions.
- Avoid long narrative paragraphs; prefer compact bullets.
- Do not rephrase the user's request.
</output_verbosity_spec>
```

### Preventing Scope Drift

GPT 5x may produce more than minimal specs. Explicitly forbid extras:

```xml
<design_and_scope_constraints>
- Implement EXACTLY and ONLY what the user requests.
- No extra features, no added components, no embellishments.
- Do NOT invent colors, animations, or new elements unless requested.
- If any instruction is ambiguous, choose the simplest valid interpretation.
</design_and_scope_constraints>
```

### Long-Context Recall

For inputs over ~10k tokens:

```xml
<long_context_handling>
- First, produce a short internal outline of key sections.
- Re-state the user's constraints explicitly before answering.
- Anchor claims to sections ("In the 'Data Retention' section…").
- If the answer depends on fine details, quote or paraphrase them.
</long_context_handling>
```

### Handling Ambiguity

```xml
<uncertainty_and_ambiguity>
- If the question is ambiguous, explicitly call this out and:
  - Ask 1–3 precise clarifying questions, OR
  - Present 2–3 plausible interpretations with labeled assumptions.
- Never fabricate exact figures or references when uncertain.
- Prefer "Based on the provided context…" instead of absolute claims.
</uncertainty_and_ambiguity>
```

### High-Risk Self-Check

For verification tasks:

```xml
<high_risk_self_check>
Before finalizing, re-scan your answer for:
- Unstated assumptions
- Specific numbers not grounded in context
- Overly strong language ("always," "guaranteed")
If found, soften or qualify them and state assumptions.
</high_risk_self_check>
```

## Tool Usage

```xml
<tool_usage_rules>
- Prefer tools over internal knowledge for:
  - Fresh or user-specific data
  - Specific IDs, URLs, or document titles
- Parallelize independent reads when possible.
- After any write/update tool call, briefly restate:
  - What changed
  - Where (ID or path)
  - Any follow-up validation performed
</tool_usage_rules>
```

## Agentic Updates

Keep updates minimal and outcome-focused:

```xml
<user_updates_spec>
- Send brief updates (1–2 sentences) only when:
  - You start a new major phase, or
  - You discover something that changes the plan.
- Avoid narrating routine tool calls.
- Each update must include at least one concrete outcome.
- Do not expand the task beyond what was asked.
</user_updates_spec>
```

## Structured Extraction

GPT 5x excels at structured output. Always provide schema:

```xml
<extraction_spec>
Extract structured data into JSON following this schema exactly:
{
  "party_name": string,
  "jurisdiction": string | null,
  "effective_date": string | null,
  "termination_clause_summary": string | null
}
- If a field is not present, set it to null rather than guessing.
- Before returning, re-scan for any missed fields.
</extraction_spec>
```

## Reasoning Effort

GPT 5x supports `reasoning_effort` parameter:

| Level | Use Case |
|-------|----------|
| `none` | Fast responses, simple tasks |
| `low` | Straightforward implementation |
| `medium` | Standard verification, code review |
| `high` | Complex debugging, thorough verification |
| `xhigh` | Deep analysis, catching subtle issues |

For verification, use `medium` to `high`. Reserve `xhigh` for critical artifact review (Epic, Tech Design).

## For Liminal Spec Verification

When using GPT 5x to verify artifacts or review code:

```markdown
## Role
You are verifying [artifact] against [specification]. Your job is to catch what the builder missed.

## Task
Review the artifact systematically against the spec.
These gates are the minimum; also look for unexpected regressions or mismatches with spec/contract beyond this list.

## Verification Checklist
1. Every AC in the spec has corresponding implementation
2. Every TC has a test that verifies the condition
3. No untested code paths
4. No drift from specification
5. Type safety: all types match spec definitions

## Output Format
For each issue found:
- Location: [file:line or section]
- Severity: [blocker|major|minor]
- Issue: [what's wrong]
- Spec reference: [AC-X or TC-Y]
- Suggested fix: [how to resolve]

If no issues found, state "Verification passed" with brief summary
of what was checked.
```

## Codex CLI Usage

```bash
# Standard implementation (can write files + run commands)
codex exec --sandbox workspace-write "prompt"

# Read-only analysis
codex exec "prompt"

# Detailed/nuanced work (more care needed)
codex exec --sandbox workspace-write -m gpt-5.2-codex \
  -c model_reasoning_effort=high "prompt"
```

**Model selection:**
- `gpt-5.2` + `medium`: Straightforward tasks
- `gpt-5.2-codex` + `high`: Detailed implementation, verification

**Important:** Default `codex exec` is read-only. Use `--sandbox workspace-write` for:
- Writing/editing files
- Running tests, builds, typechecks
- Any task that modifies the project

---

## Reference: Prompting Claude Opus 4.6

# Prompting Claude Opus 4.6

Opus 4.6 is the primary model for orchestration, story sharding, and prompt drafting in Liminal Spec. It excels at gestalt thinking, capturing spirit and intent, and managing multi-step workflows.

## When to Use Opus 4.6

| Task | Why Opus 4.6 |
|------|--------------|
| **Orchestration** | Exceptional at managing complex workflows, delegating to subagents |
| **Story sharding** | Understands feature scope, breaks work into coherent stories |
| **Prompt drafting** | Captures intent and writes prompts for other models |
| **Spec/design writing** | Strong narrative flow, functional-technical weaving |
| **Code review synthesis** | Integrates feedback from multiple sources |

## General Principles

### Be Explicit

Opus 4.6 responds well to clear, explicit instructions. If you want "above and beyond" behavior, request it explicitly.

```
# Less effective
Create an analytics dashboard

# More effective
Create an analytics dashboard. Include as many relevant features
and interactions as possible. Go beyond the basics to create a
fully-featured implementation.
```

### Add Context for Why

Explain motivation behind instructions. Opus generalizes well from understanding.

```
# Less effective
NEVER use ellipses

# More effective
Your response will be read aloud by a text-to-speech engine,
so never use ellipses since the engine won't know how to
pronounce them.
```

### Communication Style

Opus 4.6 is more concise and natural than previous models:
- **Direct and grounded** — fact-based, not self-congratulatory
- **More conversational** — less machine-like
- **Less verbose** — may skip summaries unless prompted

If you want updates as it works:
```
After completing a task that involves tool use, provide a quick
summary of the work you've done.
```

## Agentic Behavior

### Tool Usage

Opus 4.6 follows instructions precisely. If you say "suggest changes," it will suggest rather than implement.

```
# Will only suggest
Can you suggest some changes to improve this function?

# Will implement
Change this function to improve its performance.
```

For proactive action by default:
```xml
<default_to_action>
By default, implement changes rather than only suggesting them.
If the user's intent is unclear, infer the most useful likely
action and proceed, using tools to discover any missing details
instead of guessing.
</default_to_action>
```

### Subagent Orchestration

Opus 4.6 naturally recognizes when to delegate to subagents. Ensure:
- Subagent tools are well-defined
- Let Opus orchestrate naturally (no explicit instruction needed)

For more conservative delegation:
```
Only delegate to subagents when the task clearly benefits from
a separate agent with a new context window.
```

### Parallel Tool Calling

Opus 4.6 excels at parallel execution. For maximum parallelism:
```xml
<use_parallel_tool_calls>
If you intend to call multiple tools and there are no dependencies
between the calls, make all independent calls in parallel. Never
use placeholders or guess missing parameters.
</use_parallel_tool_calls>
```

## Long-Horizon Work

### Context Awareness

Opus 4.6 tracks its remaining context window. For agent harnesses with compaction:
```
Your context window will be automatically compacted as it approaches
its limit, allowing you to continue working indefinitely. Do not stop
tasks early due to token budget concerns. Save progress and state
before the context window refreshes.
```

### Multi-Context Workflows

For work spanning multiple sessions:
1. **First context** — Set up framework, write tests, create setup scripts
2. **Subsequent contexts** — Iterate on todo list
3. **Use structured state** — `tests.json`, `progress.txt`
4. **Use git** — Log of what's done, checkpoints to restore

### State Management

```json
// Structured state (tests.json)
{
  "tests": [
    {"id": 1, "name": "auth_flow", "status": "passing"},
    {"id": 2, "name": "user_mgmt", "status": "failing"}
  ],
  "passing": 150,
  "failing": 25
}
```

```
// Progress notes (progress.txt)
Session 3:
- Fixed auth token validation
- Next: investigate user_mgmt failures
```

## Coding Behavior

### Code Exploration

Opus can be conservative about exploring code. Add explicit instructions:
```
ALWAYS read and understand relevant files before proposing edits.
Do not speculate about code you have not inspected. Be rigorous
and persistent in searching code for key facts.
```

### Minimizing Overengineering

Opus may overengineer (extra files, unnecessary abstractions). Counter with:
```
Avoid over-engineering. Only make changes that are directly requested.
Don't add features, refactor code, or make "improvements" beyond
what was asked. A bug fix doesn't need surrounding code cleaned up.
Don't create helpers or abstractions for one-time operations.
```

### Minimizing Hallucinations

```xml
<investigate_before_answering>
Never speculate about code you have not opened. If the user
references a specific file, you MUST read it before answering.
Give grounded, hallucination-free answers.
</investigate_before_answering>
```

## Output Formatting

### Reduce Markdown

```xml
<avoid_excessive_markdown>
Write in clear, flowing prose using complete paragraphs. Use
standard paragraph breaks. Reserve markdown for inline code,
code blocks, and simple headings. Avoid bold/italics.

DO NOT use bullet lists unless presenting truly discrete items
or explicitly requested. Incorporate items naturally into sentences.
</avoid_excessive_markdown>
```

### Match Prompt Style to Output

The formatting in your prompt influences response style. If you want less markdown, remove markdown from your prompt.

## For Liminal Spec Prompt Writing

When Opus 4.6 drafts prompts for execution (implementation, verification):

1. **Specify the target model** — "This prompt will be executed by GPT 5x Codex"
2. **Include model-specific guidance** — Reference the appropriate prompting guide
3. **Be explicit about constraints** — Service mocks, contract-first, TDD expectations
4. **Include verification criteria** — Clear pass/fail, test counts, type checks
5. **For verify prompts, set scope** — Include: "These gates are the minimum; also look for unexpected regressions or mismatches with spec/contract beyond this list."

Example prompt preamble for implementation execution:
```markdown
## Model Context
This prompt targets Claude Code or a fresh Opus 4.6 context.
Execute with TDD discipline: service mocks at API boundary,
contract-first development, assert behavior not errors.

## Constraints
- Mock external dependencies only (network, database)
- Never mock in-process logic
- Tests must verify behavior, not NotImplementedError
```
