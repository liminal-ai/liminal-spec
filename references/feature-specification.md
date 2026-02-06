# Feature Specification

**Purpose:** Transform requirements into a complete, traceable Feature Specification — the linchpin artifact of SDD.

The feature spec gets the most scrutiny because errors here cascade through every downstream phase. A complete spec is ~300 lines that a Tech Lead can design from without asking questions. It contains: User Profile, Feature Overview, Scope, Flows with Acceptance Criteria and Test Conditions, Data Contracts, and a recommended Story Breakdown.

---

## Functional, Not Technical

Feature specs are **functional and detailed, but generally not technical**. They describe *what* the system does from the user's perspective, not *how* it's implemented internally. Technical implementation belongs in Tech Design.

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

## The Feature Spec Structure

A feature spec is an **epic** — a related set of capabilities that let a user do something they couldn't do before. The structure nests naturally: each user flow or capability is a heading that groups its ACs, and each AC groups its TCs.

```
Feature (epic)
  └── User Profile + Feature Overview
  └── Scope
  └── Flow/Capability 1 (heading)
  │     ├── Prose description
  │     ├── Steps (if sequential flow)
  │     ├── AC-1.1 + TCs
  │     └── AC-1.2 + TCs
  └── Flow/Capability 2 (heading)
        ├── Prose description
        ├── AC-2.1 + TCs
        └── AC-2.2 + TCs
  └── Data Contracts
  └── Recommended Story Breakdown
```

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

Grounds everything in actual use. Prevents building for imaginary users.

---

## Feature Overview

A brief prose description of what the user will be able to do after this feature ships that they cannot do today. Not a user story ("As a... I want... so that...") — a plain description of the new capability and why it matters.

```markdown
### Feature Overview

This feature enables underwriters to associate account locations with a policy
directly from within the Guidewire quoting workflow. Today, location assignment
requires switching to a separate system and manually entering reference IDs.
After this feature, underwriters can browse, select, or create locations without
leaving the quote process.
```

---

## Scope Boundaries

**Explicit is better than implicit.** AI agents will expand scope if not constrained.

```markdown
## Scope

### In Scope

Brief prose description of what this feature delivers and why it matters to the primary user:

- Capability 1
- Capability 2
- Capability 3

### Out of Scope

- Excluded capability (see SDD-XXX if planned)
- Future enhancement (planned for Phase N)
- Related but separate concern (handled by [other system/feature])

### Assumptions

| ID | Assumption | Status | Owner | Notes |
|----|------------|--------|-------|-------|
| A1 | Assumption text | Unvalidated | [stakeholder/team] | Confirm by [date/milestone] |
| A2 | Assumption text | Validated | [who confirmed] | [any caveats] |
```

---

## Flows, ACs, and TCs Together

Each flow or capability is a heading. Under it: prose description, flow steps (if sequential), then ACs with their TCs nested directly beneath. This co-location eliminates cross-referencing overhead — you can see the AC and immediately verify its TCs are complete.

```markdown
### 1. Location List Display

The location list shows all account locations with key identifying information.
Users land here after clicking "Add Location" in Guidewire.

1. User clicks "Add Location" in Guidewire
2. System displays loading indicator
3. System fetches and displays account locations
4. User browses the list

#### Acceptance Criteria

**AC-1.1:** Page displays loading indicator while fetching locations

- **TC-1.1a:** Loading indicator shown during fetch
  - Given: User navigates to location list
  - When: Data fetch is in progress
  - Then: Loading spinner is visible
- **TC-1.1b:** Loading indicator hidden after fetch completes
  - Given: Data fetch was in progress
  - When: Fetch completes (success or error)
  - Then: Loading spinner is not visible

**AC-1.2:** Page displays error message with retry button if fetch fails

- **TC-1.2a:** Error state displayed on fetch failure
  - Given: User navigates to location list
  - When: API returns error
  - Then: Error message is displayed and retry button is visible
- **TC-1.2b:** Retry triggers new fetch
  - Given: Error state is displayed
  - When: User clicks retry button
  - Then: Loading indicator appears and new fetch request is sent

**AC-1.3:** Page displays location list when fetch succeeds
**AC-1.4:** Each location row displays address, city, state, and zip code
**AC-1.5:** Locations are sorted by address alphabetically
```

### Acceptance Criteria Principles

**Characteristics of good ACs:**
- **Testable** — Can write a TC for it
- **Independent** — Understandable alone
- **Specific** — No "appropriate" or "properly"
- **User-focused** — Describes behavior, not implementation

**AC anti-patterns:**

| Bad | Better |
|-----|--------|
| "Page loads quickly" | "Page displays content within 3s" |
| "User can add, edit, delete" | Three separate ACs |
| "Component uses React Query" | "Data is cached for 5 minutes" |
| "Handles errors appropriately" | "Shows error message with retry button on API failure" |

### Test Condition Principles

**TC naming convention:** `TC-{AC-number}{letter}` — Letter suffix allows multiple TCs per AC. If you can't write the TC, the AC is too vague.

**Coverage checklist for each AC:**
- [ ] Happy path
- [ ] Empty/null states
- [ ] Boundary values
- [ ] Error handling
- [ ] Loading states
- [ ] Permission variations (if applicable)

**TC formats — vary based on what you're testing:**

**Simple checks (bullets):**
- **TC-3.1a:** Description *(Traces to: AC-3.1)*

**Sequential flows (numbered):**
1. **TC-3.2a:** First step in sequence *(Traces to: AC-3.2)*
2. **TC-3.2b:** Second step depends on first *(Traces to: AC-3.2)*

**Comparisons (table):**

| TC | Input | Expected Output | Traces to |
|----|-------|-----------------|-----------|
| TC-3.3a | Valid input | Success response | AC-3.3 |
| TC-3.3b | Empty input | Validation error | AC-3.3 |
| TC-3.3c | Malformed input | Parse error | AC-3.3 |

---

## Data Contracts

Define all shapes precisely. These become the source of truth for implementation. Use this section when defining new or modified API shapes.

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

Include error response shapes:

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_ACCOUNT | Account ID format invalid |
| 404 | ACCOUNT_NOT_FOUND | Account does not exist |
| 500 | INTERNAL_ERROR | Unexpected server error |

---

## Non-Functional Requirements (Optional)

Use this section when the feature has performance, security, observability, or other cross-cutting constraints that affect implementation. NFRs don't flow through the AC → TC chain the same way functional requirements do — they constrain *how* things are built rather than *what* is built.

```markdown
## Non-Functional Requirements

### Performance
- Location list renders within 2 seconds for up to 500 locations
- Search results return within 500ms

### Security
- All API calls require authenticated session
- Location data must not be cached in browser storage

### Observability
- Log all API failures with request context
- Track location selection events for analytics
```

NFRs become constraints in the Tech Design rather than TCs in the spec. The Tech Lead uses them to make architecture decisions (caching strategy, indexing, error handling patterns). Include them in the feature spec so they're visible early — don't wait for Tech Design to discover them.

---

## Recommended Story Breakdown

After the spec is complete, draft a story breakdown. A good feature spec naturally suggests how to shard into implementable stories. This section bridges the spec and execution — it doesn't replace full story docs, but provides enough structure for planning and sequencing.

### Story 0: Infrastructure

Always first. Sets up shared plumbing before feature work begins: types, error classes, test fixtures, utility stubs. No TDD cycle — just setup. Everything downstream depends on this.

### Feature Stories (1-N)

Each story delivers a vertical slice of user-facing functionality. Derive stories from the flows and AC groupings in the spec — typically one story per flow or major capability.

**Story skeleton:**

```markdown
## Story N: [Title]

**Delivers:** [What the user can do after this story ships]
**Prerequisite:** Story N-1 complete
**Flows/ACs covered:**
- Flow 1: Location List Display
  - AC-1.1 (loading indicator)
  - AC-1.2 (error state with retry)
  - AC-1.3 (list display)

**Estimated test count:** [N tests]
```

### Sequencing Principles

1. **Infrastructure first** — Story 0 creates the foundation
2. **Read before write** — Display data before allowing mutations
3. **Happy path before edge cases** — Core flow before error handling (though basic error states often belong with their happy path story)
4. **Independent slices** — Each story should be demo-able on its own

---

## Validation Before Handoff

Before handing to Tech Lead:

- [ ] User Profile has all four fields + Feature Overview
- [ ] Flows cover all paths (happy, alternate, cancel/error)
- [ ] Every AC is testable (no vague terms)
- [ ] Every AC has at least one TC
- [ ] TCs cover happy path, edge cases, and errors
- [ ] Data contracts are fully typed (if applicable)
- [ ] Scope boundaries are explicit (in/out/assumptions)
- [ ] Story breakdown covers all ACs
- [ ] Stories sequence logically (read before write, happy before edge)

**Self-review (CRITICAL):**
- Do a critical review of your own work
- Read it fresh, as if someone else wrote it
- Can you explain why each AC matters?
- No "AI wrote this and I didn't read it" items

**Human review (CRITICAL):**
- Read EVERY LINE
- Can you explain why each AC matters?
- No "AI wrote this and I didn't read it" items

### Downstream Consumer Validation

**The Tech Lead validates the spec by confirming they can design from it.** If they can't, the spec isn't ready.

Before finalizing, get feasibility feedback:
- Are data contract shapes realistic?
- Any technical constraints that affect scope?
- API endpoint structures
- Scope negotiation if something isn't feasible

The Tech Lead is the downstream consumer of this artifact. Their inability to use it means it isn't ready.

---

## Feature Spec Template

Use the following template when producing a feature spec.

---

### Template Start

```markdown
# Feature: [Feature Name]

This specification defines the complete requirements for [feature name]. It serves as the
source of truth for the Tech Lead's design work.

---

## User Profile

**Primary User:** [Role]
**Context:** [Situation when they use this]
**Mental Model:** [How they conceptualize the task]
**Key Constraint:** [Environmental or technical limitation]

---

## Feature Overview

[What the user will be able to do after this feature ships that they cannot do today.
Plain description of the new capability and why it matters.]

---

## Scope

### In Scope

Brief prose description of what this feature delivers and why:

- Capability 1
- Capability 2
- Capability 3

### Out of Scope

- Excluded capability (see SDD-XXX if planned)
- Future enhancement (planned for Phase N)
- Related but separate concern

### Assumptions

| ID | Assumption | Status | Owner | Notes |
|----|------------|--------|-------|-------|
| A1 | Assumption text | Unvalidated | [stakeholder] | Confirm by [date] |

---

## Flows & Requirements

### 1. [Flow/Capability Name]

[Prose description of this flow — what it covers, when it applies, why it matters.]

1. User [entry action]
2. System [response]
3. User [next action]
4. System [feedback]
5. User [completion action]
6. System [final response]

#### Acceptance Criteria

**AC-1.1:** [Testable statement]

- **TC-1.1a: [Descriptive name]**
  - Given: [Precondition]
  - When: [Action]
  - Then: [Expected result]
- **TC-1.1b: [Edge case name]**
  - Given: [Different precondition]
  - When: [Action]
  - Then: [Expected result]

**AC-1.2:** [Testable statement]

- **TC-1.2a: [Descriptive name]**
  - Given: [Precondition]
  - When: [Action]
  - Then: [Expected result]

### 2. [Flow/Capability Name]

[Prose description.]

1. User [entry action]
2. System [response]
3. User [action]
4. System [response]

#### Acceptance Criteria

**AC-2.1:** [Testable statement]

- **TC-2.1a: [Descriptive name]**
  - Given: [Precondition]
  - When: [Action]
  - Then: [Expected result]

### 3. [Error/Cancel Flow]

[How users exit without completing, and what the system preserves or discards.]

1. User [triggers cancel/close]
2. System [cleanup behavior]
3. System [return behavior]

#### Acceptance Criteria

**AC-3.1:** [Testable statement]

- **TC-3.1a: [Descriptive name]**
  - Given: [Precondition]
  - When: [Action]
  - Then: [Expected result]

---

## Data Contracts (if applicable)

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| param1 | string | Yes | Description |

### Response Types

[TypeScript interfaces or equivalent typed shapes]

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | ERROR_CODE | Description |

---

## Dependencies

Technical dependencies:
- [API, library, or feature dependency]

Process dependencies:
- [Approval, sign-off, or sequencing dependency]

---

## Non-Functional Requirements (if applicable)

[Cross-cutting constraints: performance, security, observability, accessibility.
These constrain how things are built rather than what is built.
NFRs become Tech Design constraints, not TCs.]

---

## Recommended Story Breakdown

### Story 0: Infrastructure
[Types, error classes, fixtures, test utilities needed by all stories]

### Story 1: [Title — first vertical slice]
**Delivers:** [What the user can do after]
**Prerequisite:** Story 0
**ACs covered:**
- AC-1.1 ([summary])
- AC-1.2 ([summary])
- AC-1.3 ([summary])

### Story 2: [Title — next slice]
**Delivers:** [What the user can do after]
**Prerequisite:** Story 1
**ACs covered:**
- AC-2.1 ([summary])
- AC-2.2 ([summary])

### Story N: [Continue as needed]

---

## Validation Checklist

- [ ] User Profile has all four fields + Feature Overview
- [ ] Flows cover all paths (happy, alternate, cancel/error)
- [ ] Every AC is testable (no vague terms)
- [ ] Every AC has at least one TC
- [ ] TCs cover happy path, edge cases, and errors
- [ ] Data contracts are fully typed (if applicable)
- [ ] Scope boundaries are explicit (in/out/assumptions)
- [ ] Story breakdown covers all ACs
- [ ] Stories sequence logically (read before write, happy before edge)
- [ ] Self-review complete
```

### Template End
