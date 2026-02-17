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
