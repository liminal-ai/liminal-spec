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
2. **Pedantic validator** — Literal spec reader with high reasoning, catches spec drift and edge cases

Use different models for complementary coverage. See `references/prompting-opus-4.5.md` and `references/prompting-gpt-5.2.md` for model-specific guidance.

Both read:
- The story (`story.md`)
- All prompts (`prompt-X.1-skeleton-red.md`, `prompt-X.2-green.md`, `prompt-X.R-verify.md`)
- Tech design (relevant sections)
- Feature spec (relevant ACs/TCs)
- SDD methodology references

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
- docs/feature-spec.md (relevant ACs)

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
| Pedantic validator | Literal spec reading, disciplined | Signature mismatches, test count errors, edge cases |

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

2. **Green** — Implements to pass tests
   - Expected: All tests PASS

3. **Quality gates** — Run after green:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```

### Self-Review

Have the same SE session review their own implementation:
- Check against prompt requirements
- Verify all files created
- Confirm quality gates pass
- Note any deviations or discoveries

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

Launch a pedantic verifier model with write access (needs to run tests). See `references/prompting-gpt-5.2.md` for specific model and CLI syntax.

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
| Validate story | Pedantic perspective | Read-only | Fresh | Literal spec reading, catches details |
| Fix issues | Implementation | Write | Same or fresh | Fix what validators found |
| Re-validate | Pedantic re-check | Read-only | **Same session** | Validator has context of original issues |
| Implement | Implementation | Write | Fresh | Execute prompt pack |
| Self-review | Builder review | Read-only | **Same session** | Senior Engineer reviews own work |
| Verify | Pedantic verification | Write (runs tests) | Fresh | Formal TC-by-TC check |

For specific model and CLI syntax for each task, see `references/prompting-opus-4.5.md` (orchestration, implementation) and `references/prompting-gpt-5.2.md` (pedantic verification).

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
- Is this a real blocker or pedantic?
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
- [ ] Green executed
- [ ] Tests PASS
- [ ] Quality gates pass
- [ ] Self-review done

### Verification
- [ ] Gorilla testing done (human)
- [ ] Verify prompt executed
- [ ] All TCs verified
- [ ] Story marked complete

### Ready for Next
- [ ] Story N+1 already validated
- [ ] Or validation in progress
```
