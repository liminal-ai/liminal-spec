# Implementation

**Purpose:** Execute implementation from self-contained prompt packs. Zero prior context.

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

You may see references to tech design, feature spec, etc. These are for human traceability.

For your execution: **the prompt pack is self-contained**. The Scrum Master inlined everything you need. Trust the prompt.

If something seems missing or doesn't line up, **stop and surface it** — don't silently work around gaps. Document what's missing and return to the orchestrator. The prompt pack should have everything; if it doesn't, that's a prompt quality issue to fix, not something to improvise past.
