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

---

## Deriving Stories from Tech Design

1. **Identify the chunk** in tech design
2. **List the TCs** from feature spec — include TC IDs explicitly (e.g., TC-6a, TC-6b)
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
- Feature Spec: path/to/feature.md (ACs X-Y)

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
- If you encounter inconsistencies between the prompt, tech design, or feature spec — **stop and ask** before proceeding
- If something doesn't line up (signatures don't match, test counts conflict, a dependency is missing) — surface it rather than silently resolving it
- If you are blocked (missing file, failing prerequisite, unclear requirement) — document what you attempted, what's not working, and what you think the resolution is, then return to the orchestrator
- Do NOT work around ambiguity or inconsistencies without approval

## Verification
When complete:
1. Run: `npm test -- --testPathPattern="FeaturePage"`
2. Expected: [X tests pass | X tests error]
3. Run: `npx tsc --noEmit`
4. Expected: No errors

## Done When
- [ ] All files created/modified
- [ ] Test state matches expected
- [ ] TypeScript compiles
```

### Key Point: Content IN the Prompt

Tech design is referenced but content should be IN the prompt. Don't require model to go read another doc.

Reference files are for human traceability. The model executes from what's inlined.

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
TC-17 to TC-27 (from feature spec)

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
