# Story Sharding & Orchestration

**Purpose:** Parse feature into stories and generate prompt packs for execution.

**You create the work. You don't execute it.** Stories and prompts go to Senior Engineer agents for implementation.

**The Orchestrator runs this phase and continues into Phase 5 (Execution).** The same orchestrating context that shards stories also coordinates their execution — launching Senior Engineer sessions, managing validation, and driving the pipeline.

### Special Artifacts

- **Story 0:** Infrastructure setup — types, fixtures, error classes, stubs. No TDD cycle.
- **Feature 0:** Stack standup — auth, connectivity, integrated skeleton with no product functionality. Used when building on a new stack where the foundation doesn't exist yet.

## Dual Role: Validator and Orchestrator

### As Validator

Before creating stories, validate the Tech Design:
- Can you map design chunks to discrete stories?
- Are interfaces clear enough to write implementation prompts?
- Is test mapping complete?

If issues found → return to Tech Lead for revision.

### As Orchestrator

Once validated, produce:
- Story breakdown
- Prompt packs for each story
- Orchestration of Senior Engineer sessions

---

## Story 0: Infrastructure Story

Every feature starts with Story 0. It establishes the shared foundation that all subsequent stories build on. Story 0 has no user-facing functionality and no TDD cycle — it's pure setup.

### What Story 0 Contains

- **`NotImplementedError` class** — Custom error for stubs (if not already in the codebase)
- **Type definitions** — All interfaces from the tech design's Low Altitude section
- **Test fixtures** — Mock data matching the data contracts in the epic
- **Test utilities** — Shared helpers for test setup (factory functions, mock builders)
- **Error classes** — Feature-specific errors defined in the tech design
- **Project config** — Any test config, path aliases, or setup files needed

### What Story 0 Does NOT Contain

- No tests (types and fixtures don't need TDD)
- No implementation logic
- No component/hook/API stubs (those come in Story 1+ skeleton phase)
- No user-facing functionality

### Why It's Always First

Story 0 establishes the contracts that all subsequent stories depend on. Types defined here become the interfaces that stubs implement, tests assert against, and implementations fulfill. If types change mid-feature, every downstream story is affected — getting them right first reduces rework.

### Story 0 Prompt Structure

Story 0 uses a simplified prompt structure since there's no TDD cycle:

```
story-0-infrastructure/
├── story.md
├── prompt-0.1-setup.md      # Creates all infrastructure
└── prompt-0.R-verify.md     # Verifies setup complete (typecheck passes)
```

### Exit Criteria

- [ ] All type definitions from tech design created
- [ ] Test fixtures match data contracts
- [ ] `NotImplementedError` class available
- [ ] TypeScript compiles clean
- [ ] No tests (none expected)

---

## Story Derivation

### From Tech Design Chunks to Stories

Tech designs include "chunks" — logical groupings of work:

```markdown
## Chunk 1: Initial Load
**Scope:** Page mount, data fetching, loading/error states
**ACs:** AC-1 to AC-9
**Phases:** Skeleton + Red, Green
```

Each chunk maps to a story, usually 1:1. Sometimes a large chunk splits into multiple stories (if it has too many TCs for one execution cycle) or small related chunks merge into one story. Use judgment — the goal is stories that are independently executable and verifiable.

### Story Types

**Story 1-N: Feature Stories**
- Deliver user-facing functionality
- Full TDD cycle: Skeleton → Red → Green → Gorilla → Verify

### Story Structure

```markdown
# Story N: [Title]

## Overview
What this story delivers. What user can do after.

## Prerequisites
- Story N-1 must be complete
- These files exist: [list]

## ACs Covered
- AC-X: [summary]
- AC-Y: [summary]

## Files

**New:**
- src/path/to/NewFile.tsx

**Modified:**
- src/path/to/ExistingFile.tsx (add X functionality)

## Test Breakdown
- NewFile.test.tsx: 8 tests (TC-X to TC-Y)
- ExistingFile.test.tsx: 4 additional tests (TC-Z)
- **Story total:** 12 tests
- **Running total:** 24 tests (12 from Story 1 + 12 new)

## Prompts
| Phase | File | Purpose |
|-------|------|---------|
| Skeleton+Red | prompt-N.1-skeleton-red.md | Stubs + tests |
| Red Self-Review | Inline follow-up prompt (same session) | Readiness gate before TDD Green |
| Green | prompt-N.2-green.md | Implementation |
| Green Self-Review | Inline follow-up prompt (same session) | Readiness gate before dual verification |
| Verify | prompt-N.R-verify.md | Verification checklist |
```

---

## Integration Path Trace (Required)

After defining all stories and before writing prompts, trace each critical end-to-end user path through the story breakdown. This catches cross-story integration gaps that per-story AC/TC coverage cannot detect.

Per-story validation checks whether each story is internally complete — ACs covered, files listed, test counts correct. It does not check whether the *union* of all stories produces a connected system. A relay module, a bridge between subsystems, a glue handler that routes messages — these can fall through the cracks when each story takes one side of the boundary and no story owns the seam.

### How to Trace

1. List the 1-3 most important user paths (from the epic's flows)
2. Break each path into segments (each arrow in the sequence diagram)
3. For each segment, identify which story owns it
4. Verify the owning story lists the relevant file in its Modified Files
5. Verify at least one test in that story exercises the segment

Any segment with no story owner is an integration gap. Fix before proceeding to prompts.

### Format

| Path Segment | Description | Owning Story | Modified File | Test |
|---|---|---|---|---|
| User → sidebar | Click "New Session" | Story 4 | sidebar.js | TC-2.2a |
| sidebar → server | session:create WS message | Story 4 | websocket.ts | TC-2.2a |
| server → ACP | AcpClient.sessionNew() | Story 2a | acp-client.ts | TC-2.2a |
| WS → portlet | Shell relays to iframe | ??? | ??? | ??? |
| portlet → WS | Shell receives postMessage | ??? | ??? | ??? |

Empty cells ("???") are integration gaps. They block prompt writing.

### Why Per-Story Checks Don't Catch This

Story-level validation asks: "Are this story's ACs covered? Are its interfaces clear? Is its test mapping complete?" These are within-story completeness checks. The Integration Path Trace is a cross-story coverage check — does every segment of the critical user path have a story owner? A tech design can perfectly describe how components interact (sequence diagrams, data flows, message traces) while no story actually owns implementing the glue between them.

---

## Prompt Pack Creation

Each prompt must be **self-contained**. A fresh agent executes without conversation history.

### Prompt Structure

```markdown
# Prompt N.X: [Phase Name]

## Context
You are implementing Story N of [Feature].

**Working Directory:** /absolute/path/to/project

**Prerequisites complete:**
- Story N-1 files exist and tests pass
- [List specific files]

## Reference Documents
- Tech Design: path/to/tech-design.md (section X)
- Epic: path/to/epic.md (ACs X-Y)

## Task

### Files to Create/Modify
1. `src/path/to/File.tsx`
   - Purpose: [what it does]
   - [Key requirements]

### Code
[For skeleton/green: include actual code, not "similar to before"]

```typescript
// Full implementation here
```

## Constraints
- Do NOT implement beyond this story's scope
- Do NOT modify files not listed
- Use exact type names from tech design
- Use exact data-testid values specified

## Verification
1. Run: `bun run red-verify` (Red) or `bun run green-verify` (Green)
   — or the project's equivalent verification command for this phase
2. Expected: [phase-specific expectations]
   — See TDD Prompt Rules below for phase-specific verification details

## Done When
- [ ] All files created/modified
- [ ] Test state matches expected
- [ ] Verification pipeline passes for this phase
```

### Key Point: Inline Content

Tech design is referenced but **content should be IN the prompt**. Don't require the model to go read another doc.

The prompt pack is self-contained. Reference documents are for human traceability, not model execution.

### Prompt Anti-Patterns

| ❌ Bad | ✅ Better |
|--------|----------|
| "Create the component similar to what we discussed" | Full code in prompt |
| "Now implement the hook" | Complete context + code |
| "Make sure it works correctly" | Explicit verification commands + expected output |
| "See the tech design for details" | Details inlined in prompt |

---

## Prompt Validation

Before giving prompts to Senior Engineer, validate them. At minimum: self-review for completeness, then have a fresh agent confirm they can execute from the prompt alone.

For the full validation pattern — dual-validator, parallel validation, fix cycles, and consolidation — see `references/execution-orchestration.md`.

---

## Orchestration

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

**Test count mismatch:** Investigate before proceeding. Running totals must be accurate.

---

## Running Test Totals

Track cumulative counts across stories:

```
Story 0 (infrastructure): 0 tests (setup only)
Story 1: 12 tests
Story 2: 12 + 15 = 27 tests
Story 3: 27 + 10 = 37 tests
```

**Previous stories' tests must keep passing.** If Story 2 breaks Story 1 tests, that's a regression to fix before proceeding.

---

## Impl vs Verifier Prompts

The same reference info, the same context, but different role and focus.

| Prompt Type | Focus | Lens |
|-------------|-------|------|
| Implementation | Create/modify code | Builder |
| Verification | Check against spec | Auditor |

Same material, different lens. The verifier prompt should be thorough — that's the point.

---

## Iteration is Expected

- Engineer finding own issues → iterate
- Verifier finding issues → iterate
- Multiple rounds is normal, not failure

Don't expect one-shot perfection. The structure supports iteration.

---

## Output: Stories + Prompt Packs

For a typical feature, you produce:
- Story 0: Infrastructure setup
- Stories 1-N: Feature stories with full TDD cycle
- Each story has: overview (story.md), skeleton-red prompt, green prompt, verify prompt, and two inline self-review follow-ups (post-Red and post-Green)

Each prompt pack is self-contained. Senior Engineers execute with zero prior context.

---

# Story Prompts Reference

Stories are the execution layer that translates specs and designs into working code.

## The Confidence Chain

```
AC (requirement) → TC (testable condition) → Test (code) → Implementation → Verification
```

## Story Types

### Infrastructure Story (Story 0)

Sets up shared infrastructure before feature stories begin.

```
story-0-infrastructure/
├── story.md
├── prompt-0.1-setup.md      # Creates all infrastructure
└── prompt-0.R-verify.md     # Verifies setup complete
```

**Deliverables:** NotImplementedError, types, fixtures, test utilities.

### Feature Story (Story 1+)

Delivers user-facing functionality with TDD.

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

## Deriving Stories from Tech Design

1. **Identify the chunk** in tech design
2. **List the TCs** from epic — include TC IDs explicitly (e.g., TC-6a, TC-6b)
3. **Pull test mapping** from tech design's TC-to-test table
4. **Identify files** to create/modify

**TC traceability carries through:** The story should list which TCs it covers. Tests written for this story should reference those TC IDs in comments or test names.

---

## Writing Self-Contained Prompts

Phase prompts must be **self-contained**. A fresh agent with no conversation context should be able to execute.

### Prompt Structure (Composable Prompt Pack)

```markdown
# Prompt N.X: [Phase Name]

## Context
Product summary
  → Project summary
    → Feature summary (referenced, key points inlined)
      → Story summary (what's in scope here)
        → Task details (what's done here)

**Working Directory:** /absolute/path/to/project

**Prerequisites complete:**
- Story N-1 files exist and tests pass
- [List specific files]

## Reference Documents
(For human traceability — key content inlined below)
- Tech Design: path/to/tech-design.md (section X)
- Epic: path/to/epic.md (ACs X-Y)

## Task

### Files to Create/Modify
1. `src/path/File.tsx` — [Purpose, requirements]

### Implementation Requirements
- [Specific requirement 1]
- [Specific requirement 2]

### Code
[For skeleton/green: include actual code]

## Constraints
- Do NOT implement beyond this phase's scope
- Do NOT modify files outside the specified list
- Use exact type names from tech design
- Use exact data-testid values specified

## If Blocked or Uncertain
- If you encounter inconsistencies between the prompt, tech design, or epic — **stop and ask** before proceeding
- If something doesn't line up (signatures don't match, test counts conflict, a dependency is missing) — surface it rather than silently resolving it
- If you are blocked (missing file, failing prerequisite, unclear requirement) — document what you attempted, what's not working, and what you think the resolution is, then return to the orchestrator
- Do NOT work around ambiguity or inconsistencies without approval

## Verification
When complete:
1. Run the phase-appropriate verification command
   — Red: `bun run red-verify` (format + lint + typecheck, no tests)
   — Green: `bun run green-verify` (verify + test immutability)
   — Or the project's equivalent commands
2. Expected: [phase-specific pass/fail expectations]

## Done When
- [ ] All files created/modified
- [ ] Test state matches expected
- [ ] Verification pipeline passes for this phase
```

### Key Point: Content IN the Prompt

Tech design is referenced but content should be IN the prompt. Don't require model to go read another doc.

Reference files are for human traceability. The model executes from what's inlined.

---

## TDD Prompt Rules

Phase prompts must enforce TDD integrity. These rules apply when writing Red, Green, and Verify prompts.

### Red Prompts

Red prompts must include a verification step that runs the full quality pipeline *except* tests. Tests are expected to fail (stubs throw), but formatting, linting, and type checking must pass. If the project defines a `red-verify` script, the prompt should use it. Otherwise, specify the individual commands.

Red prompts must end with a commit instruction: commit all work before proceeding to Green. This creates the audit trail and rollback point between the test contract and the implementation.

After Red completes, the orchestrator must send the standard Red Self-Review follow-up prompt before advancing.

```markdown
## Verification
1. Run: `bun run red-verify` (or: format check + lint + typecheck)
2. Expected: All pass (tests are NOT run — they will ERROR at this stage)
3. **Commit your work** before proceeding to Green
```

### Green Prompts

Green prompts must explicitly state that Red tests are immutable:

- **Do NOT modify test files.** Red tests are the behavioral contract. Implement to satisfy them, not to change them.
- If a test seems wrong, stop and surface it to the orchestrator rather than editing the test.

Green verification must include a test-immutability check. If the project defines a `green-verify` script, use it. Otherwise, specify the verification pipeline plus a manual check that no test files changed.

After Green completes, the orchestrator must send the standard Green Self-Review follow-up prompt before moving to dual verification.

```markdown
## Verification
1. Run: `bun run green-verify` (or: verify + confirm no test files changed)
2. Expected: All tests PASS, no test files modified
```

### Verify Prompts

Verify prompts must explicitly state that checklist gates are the minimum. Include this line verbatim near the top of the verification section:
`These gates are the minimum; also look for unexpected regressions or mismatches with spec/contract beyond this list.`

If test files were modified during Green (override case — environment fixes, not assertion changes), the verify prompt must require the verifier to:

1. Review git history on affected test files
2. Compare changed assertions against AC/TC intent
3. Confirm the changes preserved or strengthened coverage, not weakened it

```markdown
## Test Integrity Check (if any test files were modified in Green)
- Review `git diff` on all modified test files
- For each changed assertion: does it still verify the original TC intent?
- Flag any assertion that was relaxed, removed, or made less specific
```

---

## Prompt Anti-Patterns

| ❌ Bad | ✅ Better |
|--------|----------|
| "Create the component similar to before" | "Create FeatureList.tsx with: [full code]" |
| "Now implement the hook" | "Implement useFeatureData. Previous phases created types in..." |
| "Make sure it works" | "After implementation, `npm test` shows 8 tests passing" |
| "See tech design for interface" | Interface definition inlined in prompt |

---

## Story Derivation Example

**From tech design chunk:**
```markdown
## Chunk 2: Select and Return
**Scope:** Filtering, selection, return data
**ACs:** AC-17 to AC-26
```

**Becomes:**
```markdown
## Story 2: Select and Return

### TCs Covered
TC-17 to TC-27 (from epic)

### Files
- New: `src/hooks/useLocationSelection.ts`
- Modified: `src/components/LocationList.tsx`

### Test Breakdown
- useLocationSelection.test.ts: 6 tests (NEW)
- LocationList.test.tsx: 10 additional tests (MODIFY)
- **Story total:** 16 tests
- **Running total:** 26 + 16 = 42 tests
```

---

## Impl vs Verifier Prompts

Same reference info, same context. Different role and focus.

| Prompt Type | Focus | Lens |
|-------------|-------|------|
| Implementation | Create/modify code | Builder |
| Verification | Check against spec | Auditor |

The verifier prompt should use a thorough, detail-oriented model (GPT 5x, Codex). The point is to catch what builders miss.

---

## Key Principles

1. **Self-contained** — No reliance on conversation history
2. **Explicit** — Exact file paths, exact code, exact test counts
3. **Verifiable** — Clear pass/fail criteria
4. **Traceable** — TC numbers in comments link back to spec
5. **Inlined** — Key content in prompt, not just references
