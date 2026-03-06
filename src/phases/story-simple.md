# Simple Story: Functional Specification

**Purpose:** Produce a single functional story with epic-quality rigor. This is a story-sized epic -- one story with the same specificity of acceptance criteria, test conditions, data contracts, and scope boundaries that a full epic provides, but scoped to a single deliverable unit of work.

There is no separate epic, tech design, or publish-epic phase. The functional story IS the spec. The downstream consumer is the lss-tech enricher, who will perform inline technical design and embed the results directly into this story.

---

## When to Use This (and When Not To)

Use lss-story when the scope of work is genuinely one story -- a single capability, a focused change, a contained feature addition. The work should be describable with 1-2 flows and roughly 5-15 ACs.

**Escalation gate:** If during writing you find yourself defining 3+ distinct flows, 15+ ACs, or multiple user profiles, the work likely needs the full pipeline (ls-epic → ls-tech-design → ls-publish-epic). Don't force epic-scale work into story-scale treatment. It's cheaper to escalate early than to discover mid-implementation that the scope was underestimated.

---

## Functional, Not Technical

The functional story describes *what* the system does from the user's perspective, not *how* it's implemented internally. Technical implementation is added by lss-tech in the next phase.

**When technical detail is appropriate in the functional story:**

- **Contract definitions** -- REST endpoint paths, HTTP response codes, error codes. These are interface boundaries, not implementation.
- **Data shapes** -- TypeScript interfaces, Zod schemas, API payloads. Shapes describe *what* data looks like, not how it's processed.
- **Non-functional requirements** -- Performance thresholds, security constraints. These constrain implementation without specifying it.

Even in these cases, stay focused on contracts and constraints rather than implementation choices. If you're specifying *how* something works internally, that belongs in the technical enrichment phase.

---

## Story Structure

### User Profile

Brief orientation -- who is affected by this change and what's their context.

```markdown
## User Profile

**Primary User:** [Role or persona]
**Context:** [Situation when they encounter this capability]
**Mental Model:** [How they conceptualize the task]
```

Grounds the story in actual use. Prevents building for imaginary users. For a focused story, this may be 2-3 fields rather than the full epic profile.

### Objective

What the user can do after this story ships that they cannot do today. Plain description of the change and why it matters. Not a user story format ("As a... I want...") -- a direct statement of the capability.

```markdown
## Objective

Underwriters can export a filtered prompt list as a shareable URL.
Today, sharing requires manually copying each prompt slug. After this
story, a single "Export" action generates a URL containing the current
filter state and selected prompts.
```

### Scope Boundaries

**Explicit is better than implicit.** Scope boundaries are arguably MORE important at story scale than at epic scale -- "small" work expands if not constrained.

```markdown
## Scope

### In Scope

Brief prose description of what this story delivers:

- Capability 1
- Capability 2

### Out of Scope

- Excluded capability (rationale or future reference)
- Related but separate concern

### Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A1 | Assumption text | Unvalidated | Confirm by [milestone] |
```

### Flows, Acceptance Criteria, and Test Conditions

The core of the story. Each flow or capability is a heading with prose description, steps (if sequential), then ACs with their TCs nested directly beneath. This co-location eliminates cross-referencing overhead.

A simple story typically has 1-2 flows. If you're writing more than 2, consider whether the scope has grown beyond story-sized.

```markdown
### 1. Export Filtered List

The export flow generates a shareable URL from the current filter state.
Users trigger it from the prompt list view after applying any combination
of tag and search filters.

1. User applies filters to prompt list
2. User clicks "Export" button
3. System generates URL encoding current filters and visible prompt slugs
4. System copies URL to clipboard
5. System shows confirmation toast

#### Acceptance Criteria

**AC-1.1:** Export button is visible when at least one prompt is displayed

- **TC-1.1a: Button visible with prompts**
  - Given: Prompt list displays one or more prompts
  - When: User views the list
  - Then: Export button is visible in the toolbar
- **TC-1.1b: Button hidden on empty list**
  - Given: No prompts match current filters
  - When: User views the empty state
  - Then: Export button is not visible

**AC-1.2:** Generated URL encodes current filter state

- **TC-1.2a: URL includes tag filter**
  - Given: User has filtered by tag "workflow"
  - When: User clicks Export
  - Then: Generated URL contains `tags=workflow` parameter
- **TC-1.2b: URL includes search query**
  - Given: User has searched for "deploy"
  - When: User clicks Export
  - Then: Generated URL contains `q=deploy` parameter
- **TC-1.2c: URL includes multiple filters**
  - Given: User has filtered by tag and search
  - When: User clicks Export
  - Then: URL contains both filter parameters
```

### Acceptance Criteria Principles

**Characteristics of good ACs:**
- **Testable** -- Can write a TC for it
- **Independent** -- Understandable alone
- **Specific** -- No "appropriate" or "properly"
- **User-focused** -- Describes behavior, not implementation

**AC anti-patterns:**

| Bad | Better |
|-----|--------|
| "Export works correctly" | "Generated URL encodes current filter state" |
| "User can export and import" | Two separate ACs |
| "Component uses URL encoding" | "URL is valid and decodable by the import flow" |
| "Handles errors appropriately" | "Shows error toast with retry option on clipboard failure" |

### Test Condition Principles

**TC naming convention:** `TC-{AC-number}{letter}` -- Letter suffix allows multiple TCs per AC. If you can't write the TC, the AC is too vague.

**Coverage checklist for each AC:**
- [ ] Happy path
- [ ] Empty/null states
- [ ] Boundary values
- [ ] Error handling
- [ ] Loading states
- [ ] Permission variations (if applicable)

**TC formats -- vary based on what you're testing:**

**Simple checks (bullets):**
- **TC-1.1a:** Description *(Traces to: AC-1.1)*

**Sequential flows (numbered):**
1. **TC-1.2a:** First step in sequence *(Traces to: AC-1.2)*
2. **TC-1.2b:** Second step depends on first *(Traces to: AC-1.2)*

**Comparisons (table):**

| TC | Input | Expected Output | Traces to |
|----|-------|-----------------|-----------|
| TC-1.3a | Valid filters | Encoded URL | AC-1.3 |
| TC-1.3b | No filters | URL with no params | AC-1.3 |
| TC-1.3c | Max-length filter | Truncated or error | AC-1.3 |

### Error Paths

```markdown
## Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Clipboard API unavailable | Show manual-copy fallback with selectable URL text |
| URL exceeds length limit | Show error toast: "Too many prompts selected. Reduce selection and retry." |
```

### Data Contracts (if applicable)

Define shapes precisely when the story involves API changes. These become the source of truth for implementation.

```markdown
## Data Contracts

### Export URL Structure

```
/prompts?tags={comma-separated}&q={search}&slugs={comma-separated}
```

### Response Types

```typescript
interface ExportState {
  tags: string[];
  query: string;
  slugs: string[];
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_EXPORT | Export URL parameters malformed |
```

Include standing contract guidelines:
- **Request/response completeness:** Each interaction should have explicit success and error paths defined.
- **Sort order:** User-facing lists need explicit sort order.
- **Timestamps:** Default to ISO 8601 UTC unless stated otherwise.

### Non-Functional Requirements (Optional)

Include when the story has performance, security, or observability constraints.

```markdown
## Non-Functional Requirements

### Performance
- URL generation completes within 200ms for up to 100 prompts

### Security
- Export URL does not contain authentication tokens or user IDs
```

### Open Technical Questions (Optional)

Technical questions or concerns that surfaced during functional writing. These help the lss-tech enricher by flagging areas that need investigation during codebase analysis.

```markdown
## Open Technical Questions

1. Does the existing URL routing handle query parameters of this length?
2. Should the export URL use hash parameters to avoid server-side logging?
```

These aren't blockers for the functional story -- they're signals for the enricher. If none surfaced, omit this section.

### Definition of Done (Functional)

```markdown
## Definition of Done

- [ ] All ACs met
- [ ] All TC conditions verified
- [ ] PO accepts
```

---

## Validation Before Handoff

Before handing to lss-tech enricher:

- [ ] User Profile grounds the story in actual use
- [ ] Objective clearly states what changes
- [ ] Scope boundaries are explicit (in/out/assumptions)
- [ ] Flows cover all paths (happy, alternate, error)
- [ ] Every AC is testable (no vague terms)
- [ ] Every AC has at least one TC
- [ ] TCs cover happy path, edge cases, and errors
- [ ] Data contracts are fully typed (if applicable)
- [ ] Error paths documented
- [ ] Scope is genuinely story-sized (1-2 flows, ~5-15 ACs)
- [ ] All validator issues addressed (Critical, Major, and Minor)

**Self-review (CRITICAL):**
- Read the story fresh, as if someone else wrote it
- Can you explain why each AC matters?
- No "AI wrote this and I didn't read it" items

**Downstream consumer validation:** The lss-tech enricher validates the functional story by confirming they can identify implementation targets for every AC and plan a test strategy. If they can't, the story isn't ready.

---

## Output: Functional Story

A single functional story containing:
- User Profile
- Objective
- Scope (In/Out/Assumptions)
- Flows with full ACs and TCs (Given/When/Then)
- Error Paths
- Data Contracts (if applicable)
- Non-Functional Requirements (if applicable)
- Open Technical Questions (if any surfaced)
- Definition of Done (functional)

This is the functional half. The lss-tech enricher adds the technical half -- architecture, interfaces, test mapping, and verification criteria -- directly into this story, producing a single complete implementation artifact.

---

## Template

```markdown
# Story: [Story Name]

---

## User Profile

**Primary User:** [Role]
**Context:** [Situation when they use this]
**Mental Model:** [How they conceptualize the task]

---

## Objective

[What the user can do after this story ships that they cannot do today.
Plain description of the change and why it matters.]

---

## Scope

### In Scope

Brief prose description of what this story delivers:

- Capability 1
- Capability 2

### Out of Scope

- Excluded capability (rationale)
- Related but separate concern

### Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A1 | Assumption text | Unvalidated | Notes |

---

## Flows & Requirements

### 1. [Flow/Capability Name]

[Prose description -- what it covers, when it applies.]

1. User [action]
2. System [response]
3. User [action]
4. System [response]

#### Acceptance Criteria

**AC-1.1:** [Testable statement]

- **TC-1.1a: [Descriptive name]**
  - Given: [Precondition]
  - When: [Action]
  - Then: [Expected result]
- **TC-1.1b: [Edge case name]**
  - Given: [Precondition]
  - When: [Action]
  - Then: [Expected result]

**AC-1.2:** [Testable statement]

- **TC-1.2a: [Descriptive name]**
  - Given: [Precondition]
  - When: [Action]
  - Then: [Expected result]

### 2. [Error/Alternate Flow] (if applicable)

[How users handle errors or alternate paths.]

#### Acceptance Criteria

**AC-2.1:** [Testable statement]

- **TC-2.1a: [Descriptive name]**
  - Given: [Precondition]
  - When: [Action]
  - Then: [Expected result]

---

## Error Paths

| Scenario | Expected Response |
|----------|------------------|
| [Error condition] | [Response] |

---

## Data Contracts (if applicable)

[TypeScript interfaces, API shapes, error response tables]

---

## Non-Functional Requirements (if applicable)

[Performance, security, observability constraints]

---

## Open Technical Questions (if any)

1. [Question that surfaced during functional writing]

---

## Definition of Done

- [ ] All ACs met
- [ ] All TC conditions verified
- [ ] PO accepts

---

## Validation Checklist

- [ ] User Profile grounds story in actual use
- [ ] Objective clearly states what changes
- [ ] Scope boundaries explicit (in/out/assumptions)
- [ ] Flows cover all paths (happy, alternate, error)
- [ ] Every AC is testable
- [ ] Every AC has at least one TC
- [ ] TCs cover happy path, edge cases, errors
- [ ] Data contracts fully typed (if applicable)
- [ ] Error paths documented
- [ ] Scope is story-sized (1-2 flows, ~5-15 ACs)
- [ ] Self-review complete
```
