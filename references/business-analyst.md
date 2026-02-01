# Business Analyst Phase

**Purpose:** Transform requirements into a complete, traceable Feature Specification.

**This is the linchpin.** The feature spec gets the most scrutiny because errors here compound downstream. Everything else flows from this document.

---

## Functional, Not Technical

Feature specs are **functional and detailed, but generally not technical**. They describe *what* the system does from the user's perspective, not *how* it's implemented internally. Technical implementation belongs in the Tech Design phase.

**When in doubt, keep it functional.** If you're unsure whether something belongs in the feature spec or tech design, put it in tech design. The spec should give the Tech Lead a target to hit, not dictate how to hit it.

### When Technical Detail Is Appropriate

Some situations warrant technical specificity in the feature spec:

- **Contract definitions** — REST endpoint paths, HTTP response codes, error codes. These are interface boundaries, not implementation.
- **Data shapes** — TypeScript interfaces, Zod schemas, API payloads. Shapes describe *what* data looks like, not how it's processed.
- **Non-functional requirements** — Performance thresholds, security constraints, compliance needs. These constrain implementation without specifying it.

Even in these cases, stay focused on contracts and constraints rather than implementation choices.

### What Belongs in Tech Design

- Implementation algorithms
- Directory structures, file paths
- Library and framework choices
- Internal architecture decisions
- Database schemas and queries

If you find yourself specifying *how* something works internally, you've crossed into Tech Design territory. Move it there.

---

## The Feature Spec Hierarchy

```
User Profile → User Flows → Acceptance Criteria → Test Conditions
```

Each level constrains the next. Each level exposes gaps.

**Why this hierarchy matters:**
- **User Profile** — Who is this for? Grounds everything in actual use
- **User Flows** — What sequences? Reveals real complexity, catches missing states
- **ACs** — What must be true? Testable claims, scope boundary
- **TCs** — How to verify? Given/When/Then forces precision, exposes ambiguity

**The cascade:** You can't write a good TC without a clear AC. You can't write a good AC without understanding the flow. You can't understand the flow without knowing who you're building for.

---

## User Profile

**Who is this for? What's their mental model?**

```markdown
## User Profile

**Primary User:** Policy underwriter
**Context:** Adding locations to a commercial policy during quote process
**Mental Model:** "I have an account, the account has locations, I pick which ones apply to this policy"
**Key Constraint:** User is in Guidewire, this is an embedded flow
```

**Why it matters:** Grounds everything in actual use. Prevents building for imaginary users.

---

## User Flows

**What sequences? What paths through the feature?**

```markdown
## User Flows

### Flow 1: Select Existing Location
1. User clicks "Add Location" in Guidewire
2. System displays account locations
3. User selects one or more locations
4. User clicks "Add to Policy"
5. System returns selected locations to Guidewire

### Flow 2: Create New Location
1. User clicks "Add Location" in Guidewire
2. System displays account locations (or empty state)
3. User clicks "Add New"
4. User enters location details
5. System validates and saves
6. System returns new location to Guidewire

### Flow 3: Cancel
1. User clicks "Cancel" at any point
2. System returns to Guidewire with no data
```

**Why it matters:** Reveals real complexity. Catches missing states. Shows where flows intersect.

---

## Acceptance Criteria

**What must be true? Testable claims.**

Group by flow or functional area. Include prose context before each group.

```markdown
## Acceptance Criteria

### 3.1 Location List Display

The location list shows all account locations with key identifying information.

**AC-3.1.1:** Page displays loading indicator while fetching locations
**AC-3.1.2:** Page displays error state if fetch fails with retry option
**AC-3.1.3:** Page displays location list when fetch succeeds
**AC-3.1.4:** Each location row shows address, city, state, zip
**AC-3.1.5:** Locations are sorted by address alphabetically
```

**Characteristics of good ACs:**
- **Testable** — Can write a TC for it
- **Independent** — Understandable alone
- **Specific** — No "appropriate" or "properly"
- **User-focused** — Describes behavior, not implementation

**Anti-patterns:**

| ❌ Bad | ✅ Better |
|--------|----------|
| "Page loads quickly" | "Page displays content within 3s" |
| "User can add, edit, delete" | Three separate ACs |
| "Component uses React Query" | "Data is cached for 5 minutes" |
| "Handles errors appropriately" | "Shows error message with retry button on API failure" |

---

## Test Conditions

**How to verify? Given/When/Then forces precision.**

```markdown
## Test Conditions

### TC-3.1.1a: Loading indicator shown during fetch
**Traces to:** AC-3.1.1
- **Given:** Page is mounting
- **When:** Data fetch is in progress
- **Then:** Loading spinner is visible

### TC-3.1.1b: Loading indicator hidden after fetch
**Traces to:** AC-3.1.1
- **Given:** Data fetch was in progress
- **When:** Fetch completes (success or error)
- **Then:** Loading spinner is not visible

### TC-3.1.2a: Error state on fetch failure
**Traces to:** AC-3.1.2
- **Given:** Page is loading data
- **When:** API returns error
- **Then:** Error message is displayed
- **And:** Retry button is visible
```

**Why it matters:** Exposes ambiguity. If you can't write the TC, the AC is too vague.

**Naming convention:** `TC-{AC-number}{letter}` — Letter suffix allows multiple TCs per AC.

**Coverage checklist for each AC:**
- [ ] Happy path
- [ ] Empty/null states
- [ ] Boundary values
- [ ] Error handling
- [ ] Loading states
- [ ] Permission variations (if applicable)

---

## Data Contracts

Define all shapes precisely. These become the source of truth for implementation.

```typescript
interface LocationListResponse {
  locations: Location[];
  pagination: { page: number; totalPages: number; };
}

interface Location {
  locRefId: string;
  locRefVerNbr: number;
  address: string;
  city: string;
  state: string;
  postalCode: string;
}
```

---

## Scope Boundaries

**Explicit is better than implicit.** AI agents will expand scope if not constrained.

```markdown
## Scope

### In Scope
- Select existing account locations
- Create new location with address validation
- Return selected/created locations to Guidewire

### Out of Scope
- Edit existing locations (separate feature)
- Delete locations (separate feature)
- Bulk import (future enhancement)
- International addresses (US only for now)

### Assumptions
- Account locations are filtered server-side by SAI parameter
- User has permission to view account locations
- Guidewire handles the policy association after return
```

---

## Validation Before Handoff

**Before handing to Tech Lead:**

- [ ] Every AC has at least one TC
- [ ] TCs cover happy path, edge cases, errors
- [ ] Data contracts are fully typed
- [ ] Scope boundaries are explicit (in/out/assumptions)
- [ ] User profile is clear
- [ ] Flows cover all paths

**Self-review (CRITICAL):**
- Do a critical review of your own work
- Read it fresh, as if someone else wrote it

**Human review (CRITICAL):**
- Read EVERY LINE
- Can you explain why each AC matters?
- No "AI wrote this and I didn't read it" items

---

## Collaboration with Tech Lead

Before finalizing, get feasibility feedback:
- Are data contract shapes realistic?
- Any technical constraints that affect scope?
- API endpoint structures
- Scope negotiation if something isn't feasible

**The Tech Lead validates the spec by confirming they can design from it.** If they can't, the spec isn't ready.

This is the downstream consumer validation pattern. The Tech Lead is the consumer of your artifact. Their inability to use it = your artifact isn't ready.

---

## Output: Feature Spec (~300 lines)

A complete feature spec typically runs about 300 lines and contains:
- User Profile
- User Flows (all paths)
- Acceptance Criteria (grouped by area)
- Test Conditions (for every AC)
- Data Contracts
- Scope Boundaries

This document becomes the source of truth for the Tech Lead's work. It expands to ~2000 lines of tech design.
