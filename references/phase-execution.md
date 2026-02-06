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
- [ ] TypeScript compiles

---

## TDD Green Phase

**Purpose:** Implement to make tests pass. Replace stubs with real logic.

### Implementation Order

Start with leaf dependencies, move up:
1. API layer (no dependencies)
2. Hooks (depend on API)
3. Components (depend on hooks)

This lets you test each layer as you build.

### Exit Criteria

- [ ] All tests PASS
- [ ] No NotImplementedError remaining in implemented code
- [ ] Implementation matches tech design interfaces
- [ ] No over-engineering beyond what tests require

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

```bash
npm test                    # All tests pass
npm run typecheck          # No type errors  
npm run lint               # No lint errors
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
