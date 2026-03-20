---
name: ls-epic
description: Write complete, traceable Epics using Liminal Spec methodology. Covers User Profile, Flows, Acceptance Criteria, Test Conditions, Data Contracts, and Story Breakdown.
---

# Epic

**Purpose:** Transform requirements into a complete, traceable Epic — the linchpin artifact of Liminal Spec.

The epic gets the most scrutiny because errors here cascade through every downstream phase. A complete spec is one that a Tech Lead can design from without asking questions. It contains: User Profile, Feature Overview, Scope, Flows with Acceptance Criteria and Test Conditions, Data Contracts, and a recommended Story Breakdown.

---

## Functional, Not Technical

Epics are **functional and detailed, but generally not technical**. They describe *what* the system does from the user's perspective, not *how* it's implemented internally. Technical implementation belongs in Tech Design.

**When in doubt, keep it functional.** If you're unsure whether something belongs in the epic or tech design, put it in tech design. The spec should give the Tech Lead a target to hit, not dictate how to hit it.

### When Technical Detail Is Appropriate

Some situations warrant technical specificity in the epic:

- **Boundary contracts** — Endpoint paths, methods, HTTP response codes, error codes for communication across significant system boundaries (frontend to backend, application to external service, system to integration partner). Express in tables and structured prose, not code syntax.
- **Data shapes** — Field names, types, cardinality, and validation rules for data crossing system boundaries. Express in documentation tables, not language-specific syntax (no TypeScript interfaces, Zod schemas, or similar). The epic is stack-neutral.
- **Non-functional requirements** — Performance thresholds, security constraints, compliance needs. These constrain implementation without specifying it.

Even in these cases, stay focused on contracts and constraints rather than implementation choices. Internal contracts within a layer (service-to-service calls, component interfaces, module APIs) belong in Tech Design unless there is strong rationale to surface them in the spec.

### What Belongs in Tech Design

- Implementation algorithms
- Directory structures, file paths
- Library and framework choices
- Internal architecture decisions
- Database schemas and queries

If you find yourself specifying *how* something works internally, you've crossed into Tech Design territory. Move it there.

---

## The Epic Structure

An epic defines a related set of capabilities that let a user do something they couldn't do before. The structure nests naturally: each user flow or capability is a heading that groups its ACs, and each AC groups its TCs.

```
Epic
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
  └── Non-Functional Requirements (if applicable)
  └── Tech Design Questions
  └── Recommended Story Breakdown
```

**The cascade:** You can't write a good TC without a clear AC. You can't write a good AC without understanding the flow. You can't understand the flow without knowing who you're building for.

### Epic Size and Scope Check

After assessing requirements and before writing the full epic, estimate the likely output size. Count the major flows and expected AC density — an epic with 5+ major flows or 30+ expected ACs will typically exceed 800 lines.

Large epics create downstream pressure: the tech design phase consumes the entire epic as input context, validation quality degrades with length, and internal consistency becomes harder to maintain across many flows. If your estimate suggests 800+ lines, inform the user and offer to analyze the requirements for natural splitting points — typically along user workflow boundaries, system capability boundaries, or phased delivery lines.

If the user prefers a single large epic, proceed. This is a checkpoint for the user's benefit, not a gate.

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

- Excluded capability (see LS-XXX if planned)
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

- **TC-1.3a:** Location list rendered on successful fetch
  - Given: User navigates to location list
  - When: API returns location data
  - Then: Location list is displayed with all returned locations

**AC-1.4:** Each location row displays address, city, state, and zip code

- **TC-1.4a:** All required fields displayed per row
  - Given: Location list is displayed
  - When: User views a location row
  - Then: Address, city, state, and zip code are all visible

**AC-1.5:** Locations are sorted by address alphabetically

- **TC-1.5a:** Sort order verified
  - Given: Location list is displayed with multiple locations
  - When: User views the list
  - Then: Locations appear in ascending alphabetical order by address
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

Data contracts define the inputs and outputs at significant system boundaries — frontend to backend, application to external service, system to integration partner. Internal contracts within a layer (service-to-service calls, component props, module interfaces) belong in Tech Design unless there is strong rationale to surface them here.

Express contracts in documentation format — tables, structured prose, and lists. All the precision of typed definitions without language-specific syntax. The epic is stack-neutral; implementation types belong in Tech Design.

```markdown
### Endpoints

| Operation | Method | Path | Description |
|-----------|--------|------|-------------|
| List locations | GET | /accounts/{accountId}/locations | Returns paginated locations for an account |

### Location List Response

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| locations | array of Location | yes | All locations for the account |
| pagination.page | integer | yes | Current page number |
| pagination.totalPages | integer | yes | Total number of pages |

### Location

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| locRefId | string | yes | non-empty | Location reference identifier |
| locRefVerNbr | integer | yes | ≥ 0 | Location reference version number |
| address | string | yes | non-empty | Street address |
| city | string | yes | non-empty | City name |
| state | string | yes | 2-char code | State code |
| postalCode | string | yes | 5 or 9 digit | Postal/ZIP code |
```

Include error response shapes:

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_ACCOUNT | Account ID format invalid |
| 404 | ACCOUNT_NOT_FOUND | Account does not exist |
| 500 | INTERNAL_ERROR | Unexpected server error |

### Standing Data Contract Guidelines

**Request/response completeness:** Each client message type should have an explicit success response and error path defined. The success behavior often seems "obvious" and gets omitted — spell it out.

**Sort order:** User-facing lists need an explicit sort order. Don't leave it to implementation assumption.

**Timestamps:** Default to ISO 8601 UTC unless the spec states otherwise.

### Streaming / Real-Time Data Contracts

If the feature involves real-time messaging or streaming, the data contracts section should address:

- **Correlation IDs** — How are request/response pairs matched?
- **Message sequencing** — Is ordering guaranteed? How are out-of-order messages handled?
- **Upsert vs append semantics** — Does a new message replace or add to existing data?
- **Completion markers** — How does the client know a stream is finished?

These are consistently missed in initial specs and caught by validators. Address them upfront.

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

NFRs become constraints in the Tech Design rather than TCs in the spec. The Tech Lead uses them to make architecture decisions (caching strategy, indexing, error handling patterns). Include them in the epic so they're visible early — don't wait for Tech Design to discover them.

---

## Tech Design Questions

During spec writing and validation, technical questions will surface that belong in Phase 3 (Tech Design), not in the spec itself. Give them a formal home so they're guaranteed to be answered downstream.

```markdown
## Tech Design Questions

Questions for the Tech Lead to address during design:

1. [Technical question raised during spec or validation]
2. [Another question — e.g., "What caching strategy for the location list?"]
3. [Implementation concern flagged by validator]
```

These aren't spec blockers — they're legitimate questions that the spec can't and shouldn't answer. The Tech Design reference includes instructions to answer every question listed here.

---

## Recommended Story Breakdown

After the spec is complete, draft a story breakdown. A good epic naturally suggests how to shard into implementable stories. This section bridges the spec and execution — it doesn't replace full story docs, but provides enough structure for planning and sequencing.

### Story 0: Foundation (Infrastructure)

Always first. Sets up shared plumbing before feature work begins: types, error classes, test fixtures, utility stubs, and project config. Minimal or no TDD cycle — just foundation setup. Everything downstream depends on this.

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

1. **Foundation first** — Story 0 creates the shared infrastructure
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
- [ ] Data contracts are fully specified at system boundaries (if applicable)
- [ ] Scope boundaries are explicit (in/out/assumptions)
- [ ] Story breakdown covers all ACs
- [ ] Stories sequence logically (read before write, happy before edge)
- [ ] All validator issues addressed (Critical, Major, and Minor — severity sets fix order, not skip criteria)
- [ ] Validation rounds complete (run until no substantive changes, typically 1-3 rounds)

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

## Epic Template

Use the following template when producing an epic.

---

### Template Start

```markdown
# Epic: [Epic Name]

This epic defines the complete requirements for [epic name]. It serves as the
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

- Excluded capability (see LS-XXX if planned)
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

[Contracts at significant system boundaries — frontend to backend, application
to external service, system to integration partner. Express in documentation
tables, not code syntax.]

### Endpoints

| Operation | Method | Path | Description |
|-----------|--------|------|-------------|
| [operation] | [method] | [path] | [description] |

### [Response/Message Name]

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| [field] | [type] | [yes/no] | [rules] | [description] |

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| [status] | [ERROR_CODE] | [description] |

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

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. [Technical question raised during spec writing or validation]

---

## Recommended Story Breakdown

### Story 0: Foundation (Infrastructure)
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
- [ ] Data contracts are fully specified at system boundaries (if applicable)
- [ ] Scope boundaries are explicit (in/out/assumptions)
- [ ] Story breakdown covers all ACs
- [ ] Stories sequence logically (read before write, happy before edge)
- [ ] All validator issues addressed (Critical, Major, and Minor)
- [ ] Validation rounds complete (no substantive changes remaining)
- [ ] Self-review complete
```

### Template End

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

## Reference: Context Economics

# Context Economics

**Why Liminal Spec uses multiple agents with artifact handoff instead of one long conversation.**

## The Core Problem

AI agents have fundamental limitations:

| Problem | Description |
|---------|-------------|
| **Context rot** | Attention degrades as context grows |
| **Lost in the middle** | Middle of context gets less attention than start/end |
| **Tool result bloat** | Tool calls accumulate and dominate context |
| **Negotiation baggage** | Accumulated assumptions and back-and-forth clutter |
| **State tracking failures** | Agents lose track of decisions over long conversations |

## The Solution: Agents = Context Isolation

**"Agents" doesn't mean roleplay personas. It means fresh context with artifact handoff.**

```
Agent 1 (planning context)
    │
    └── Produces artifact (Epic)
              │
              ▼
Agent 2 (fresh context)
    │
    ├── Reads artifact cold
    └── No negotiation history
              │
              └── Produces artifact (Tech Design)
                        │
                        ▼
Agent 3 (fresh context)
    ...
```

The artifact (document) IS the handoff. Not a summary. Not "see above." The complete document.

---

## Why This Works

### 1. No Negotiation Baggage

A fresh agent reads the artifact as-is. No "well, we discussed maybe doing it differently" or "I think earlier you said..." 

The artifact is the source of truth. The conversation that produced it is gone.

### 2. Expansion Ratios

Each phase expands the prior artifact:

| Input | Output | Ratio |
|-------|--------|-------|
| Requirements | Epic | ~6x |
| Epic | Tech Design | ~6-7x |
| Tech Design chunk | Story + Prompts (500 lines) | varies |

A single context trying to hold requirements + spec + design + implementation = bloat. Separate contexts give each phase room to breathe.

### 3. Planner ≠ Coder

**Planning context:** Exploratory, iterative, accumulates tool calls, can tolerate some rot.

**Execution context:** Precise, focused, fresh context per phase, cannot tolerate rot.

Don't make the context that explored 15 files and had 3 rounds of revision the same one that implements. The coder should receive clean, decided instructions.

### 4. Artifact as Interface

The artifact IS the handoff. Not a summary of what we discussed. Not "see the conversation above." The document itself contains everything needed.

This is why artifacts must be complete and self-contained:
- Feature spec includes all ACs and TCs
- Tech design includes all interfaces and test mapping
- Complete story provides functional requirements and technical implementation context for execution

---

## Practical Application

### Fresh Context per Phase

For execution phases (Skeleton, Red, Green), start fresh:

```
Phase 1 Prompt → Fresh Session → Execute → Complete
Phase 2 Prompt → Fresh Session → Execute → Complete
```

No accumulated exploration noise. Just prompt + execute.

### State Files for Recovery

When an agent session ends (compaction, crash, human break), state files enable recovery:

```
.sdd/state.json        # Project state
.sdd/epic-state.md   # Feature spec session state
.sdd/tech-design-state.md    # Tech design session state
```

The next agent (or resumed agent) reads state, loads relevant artifacts, continues.

### Long Session with Checkpoints

For planning phases (Epic, Tech Design), use checkpoints:

```
Start Session
  │
  ├── Work on section 1
  ├── [Checkpoint: Update state file]
  │
  ├── Work on section 2  
  ├── [Checkpoint: Update state file]
  │
  ├── Context getting large...
  └── [Compact: Summarize, update state, continue fresh]
```

### Parallel Agent Sessions

For research or validation, spawn short-lived agents:

```
Main Session (orchestrator)
  │
  ├── Spawn: Research Agent → Returns findings
  ├── Spawn: Validation Agent → Returns issues
  │
  └── Continue with results (not with their full context)
```

Sub-agents have isolated context. They return findings, not their entire conversation.

---

## The Economics

| Approach | Tokens | Quality |
|----------|--------|---------|
| One long conversation | Accumulates to limit | Degrades over time |
| Agent pipeline with artifacts | Resets per phase | Consistent quality |

The "cost" of artifacts (writing them, reading them in new context) is paid back by:
- Higher quality execution
- Debuggable handoffs (you can read what was passed)
- Recovery capability (state files + artifacts)
- Parallelization potential

---

## Anti-Patterns

**❌ "Let me continue where we left off"**
If "where we left off" is buried in 100k tokens of conversation, the agent won't find it reliably. Use state files.

**❌ "Remember when we discussed X"**
If X matters, it should be in the artifact. If it's not in the artifact, the next agent won't know it.

**❌ "I'll just keep going in this context"**
Context rot is real. If you notice quality degrading, that's the signal to checkpoint and continue fresh.

**❌ "The spec is in the conversation above"**
Conversations are not artifacts. Extract the decisions into a document. That document is the artifact.

**❌ Treating agents as roleplay**
"Be the BA persona" is not the point. Fresh context with artifact handoff is the point. The "role" is just scope, not a character to play.

---

## Reference: Writing Principle: Plain Description

# Writing Principle: Plain Description

## What It Is

Every sentence describes what something does, what it is, or where it fits. Nothing else. No framing, no selling, no justifying, no self-describing. Every word has a job. If you remove a word and the meaning doesn't change, the word shouldn't have been there.

The reader is a Tech Lead or Senior Engineer who needs to understand the system and build from the spec. They don't need to be convinced the project is worthwhile. They don't need a tour guide announcing what they're about to read. They need to know what the thing does so they can design it.

## What It Isn't

It isn't terse for the sake of brevity. Longer sentences are fine when every word earns its place — detailed descriptions of behavior, specific examples, enumerated capabilities. The principle isn't "be short." It's "don't waste the reader's time."

It also isn't a ban on context. Saying where something fits ("first of two epics"), what it replaces ("re-uploading replaces existing data"), or what it doesn't do ("stages 3-6 are inactive") is plain description. That's useful information. The line is: does this sentence describe the system, or does it describe how the reader should feel about the system?

## The Failure Modes

### 1. The Prologue

Writing that sets the scene before getting to the point. Background, history, the current pain, the journey to the solution. This is a spec, not a pitch deck.

**Bad:**
> Today, converting business rules from spreadsheets into executable application logic is a manual, team-intensive process — two offshore teams contracted for a year to work through ~1,300 rules across two product lines. There's no tooling to help. A developer reads each row, interprets the English condition, figures out what entity it maps to, and writes the code by hand.

Three sentences of archaeology. The reader doesn't need to understand the history of the problem to design the solution. This is justification — it belongs in a project proposal, not a epic.

**Good:**
> This feature provides the ability to upload a business rules spreadsheet, validate and parse each rule, and diagnose rule loading issues. This is the first half of an ETL process to convert business rules from the source workbook into executable validation rules.

What it does. Where it fits. Done.

### 2. The Brochure

Sentences that describe the value or benefit instead of the behavior. Words like "enables," "empowers," "provides orientation," "designed to be." The reader can figure out why something is useful — they need to know what it does.

**Bad:**
> It provides orientation — the dev always knows where they are in the process.

Selling the benefit of a progress bar. The first sentence already said what it does.

**Good:**
> The pipeline progress bar appears at the top of every page, showing all six stages with the current stage highlighted.

What it is. Where it is. What it shows. Stop.

**Bad:**
> After this epic ships, a dev team that previously needed months and offshore contractors to convert a spreadsheet of rules can do it in days.

This is a pitch. "Previously needed months" vs "can do it in days" is a sales comparison. The reader building the system doesn't need the before/after contrast.

### 3. The Tour Guide

Sentences that announce what comes next or describe the structure of the document itself. "This section covers..." or "This epic gives the dev team two new capabilities and a persistent assistant."

**Bad:**
> This epic gives the dev team two new capabilities and a persistent assistant:

Counting and categorizing before the list. The list does this job. The sentence is a tour guide standing in front of the exhibit saying "you're about to see three paintings."

**Good:**
Just go straight to the bullets. The heading "In Scope" is the only framing needed.

### 4. The Defensive Justification

Sentences that explain why a choice was made, preemptively defending it. "Not just the ones the pipeline uses immediately" or "supporting future reporting and analytics integration."

**Bad:**
> All fields from the workbook are preserved, not just the ones the pipeline uses immediately, supporting future reporting and analytics integration.

"Not just the ones..." is anticipating the question "why store fields you don't use?" and answering it preemptively. "Supporting future reporting" is justifying the decision. Neither describes the system.

**Good:**
> Every column from the workbook is preserved, including fields not used by current pipeline stages.

What it stores. How completely. Done. If someone wants to know why, they can ask.

### 5. The Ceremony

Extra words that add formality but no meaning. "Begins a rule loading session by," "This flow is designed to be re-run," "on demand."

**Bad:**
> The developer begins a rule loading session by selecting a product and version, uploading the business spreadsheet, and reviewing what the system found.

"Begins a rule loading session by" is ceremony. The developer isn't "beginning a session" — they're selecting a product, uploading a file, and reviewing results.

**Good:**
> The dev selects a product and version, uploads the spreadsheet, and reviews what the system found.

Same information. No ceremony.

**Bad:**
> This flow is designed to be re-run — uploading to a version that already has data replaces everything and starts fresh.

"This flow is designed to be re-run" is a meta-statement about the flow's design intent. The dash clause is the actual behavior.

**Good:**
> Re-uploading to a version with existing data replaces everything and starts fresh.

Just the behavior.

### 6. The Vague Benefit

Words that sound descriptive but don't actually specify anything. "Clear summary," "explain what the system found," "ask for help at any point."

**Bad:**
> Ask the AI assistant for help at any point — a chat sidebar available on every page that can answer questions about the data, explain what the system found, and provide quick summaries via one-click Quick Chat Links.

"Ask for help" is vague. "Explain what the system found" is vague — explain what about what it found? The specific parts (answers questions, Quick Chat Links) are buried after the vague parts.

**Good:**
> AI assistant chat sidebar — available on every page, answers questions about the data and provides quick summaries via one-click Quick Chat Links.

Starts with what it is. Says what it does. Specific throughout.

### 7. The Implementation Leak

Naming internal tools, specific function names, or return shapes when the requirement is about behavior the user sees.

**Bad:**
> `inspect_upload` returns summary data (total rows, sheets, valid count, problem count, duplicate count).

The functional requirement is that the AI can answer questions using upload data. The tool name is an implementation choice.

**Good:**
> Response includes relevant summary data (total rows, sheets, valid count, problem count, duplicate count).

Same specificity about what data is available. No opinion about how it's wired.

## The Test

For any sentence, ask: **does this describe the system, or does it describe something about the system?**

- "The progress bar shows six stages" → describes the system. Keep.
- "It provides orientation" → describes a quality of the system. Cut.
- "Upload a spreadsheet and see parsed results" → describes the system. Keep.
- "What used to take months starts taking days" → describes the value of the system. Cut.
- "Re-uploading replaces existing data" → describes the system. Keep.
- "This flow is designed to be re-run" → describes the intent behind the system. Cut.

If the sentence survives the test, check each word: remove it, re-read. Did the meaning change? No? The word goes.

---

## Verification Prompt

# Epic Verification Prompt

Use this prompt template to have an agent critically review a Epic before handing off to Tech Design.

---

## Prompt Template

**Critical Review: [Feature Name] Epic**

You are reviewing a Epic for [brief description]. This is Phase 2 (Epic) of a Liminal Spec pipeline.

**Step 1: Load liminal-spec Skill Context**

Read these files to understand the methodology and evaluation criteria:

1. **Core methodology:** `~/.claude/skills/liminal-spec/SKILL.md`
2. **Feature spec guidance:** the Epic section inside `~/.claude/skills/liminal-spec/SKILL.md`
3. **Writing style:** the writing-style guidance section inside `~/.claude/skills/liminal-spec/SKILL.md`

**Step 2: Review These Files**

1. **Epic (primary):** `[path to epic.md]`
2. **Product Brief (for alignment):** `[path to product-brief.md]`
3. **Reference Implementation (if applicable):** `[path to similar existing code]`

**Important Boundary:** A detailed Tech Design phase follows Epic. The spec defines *what* the system does, not *how* it's implemented. Technical implementation concerns (architecture, library choices, internal algorithms) are not spec issues. If you identify genuine technical questions that affect feasibility, add them to a "Tech Design Questions" section for the Tech Lead to address — don't flag them as spec blockers.

**Step 3: Evaluation Criteria**

Assess the epic against these criteria:

1. **Functional vs Technical Balance**
   - Is the spec appropriately functional (what) rather than technical (how)?
   - Are technical details limited to contracts and constraints?
   - Are implementation decisions properly deferred to Tech Design?

2. **Completeness**
   - Does User Profile have all four fields (Primary User, Context, Mental Model, Key Constraint)?
   - Is there a Feature Overview describing what the user can do after that they can't do today?
   - Do User Flows cover all paths including error cases?
   - Does every AC have at least one TC?
   - Are scope boundaries explicit (In Scope, Out of Scope, Assumptions)?
   - Were Non-Functional Requirements considered (performance, security, observability)? If applicable, are they documented?

3. **Traceability**
   - Can you trace from User Profile → Flows → ACs → TCs?
   - Are TC IDs properly linked to ACs?

4. **Testability**
   - Can each AC be verified as true/false?
   - Are ACs specific (no "appropriate" or "properly")?
   - Do TCs have clear structure? (Given/When/Then for behavioral checks, numbered steps for sequential flows, tables for input/output comparisons)

5. **Alignment with Product Brief**
   - Does the epic deliver on the product brief's vision?
   - Is broader context reflected appropriately?

6. **Reference Implementation Consistency** (if applicable)
   - Does it follow proven patterns where applicable?
   - Similar ergonomics and conventions?

7. **Story Breakdown**
   - Is there a Recommended Story Breakdown section?
   - Does Story 0 (foundation/infrastructure) cover types, fixtures, error classes, and project config?
   - Do Feature Stories (1-N) cover all ACs?
   - Do stories sequence logically (read before write, happy path before edge cases)?

8. **Tech Design Readiness**
   - Could a Tech Lead design from this spec without asking clarifying questions?
   - Are technical unknowns identified but appropriately scoped?
   - Are data contracts clear enough to implement against?

**Step 4: Report Format**

Provide your review in this structure:

```
## Overall Assessment
[READY / NOT READY] for Tech Design

## Strengths
[What the spec does well]

## Issues

### Critical (Must fix before Tech Design)
[Issues that would block a Tech Lead from designing]

### Major (Should fix)
[Issues that would cause confusion or rework]

### Minor (Fix before handoff)
[Polish items — address these too, not just blockers]

## Missing Elements
[Anything that should be present but isn't]

## Recommendations
[Specific fixes, in priority order]

## Questions for the BA
[Clarifying questions that would improve the spec]
```

Be thorough and critical. The goal is to catch issues before they compound downstream.

**Step 5: AC → TC Traceability Table**

As part of your review, produce a traceability table mapping every AC to its TCs:

```
| AC | TC(s) | Coverage Notes |
|----|-------|----------------|
| AC-1.1 | TC-1.1a, TC-1.1b | Happy path + edge case covered |
| AC-1.2 | TC-1.2a | Missing error path TC |
```

This table makes gaps immediately visible. If an AC has no TCs, or TCs don't adequately cover the AC, flag it.

---

## Usage Notes

- Run this with a verification-oriented model (GPT 5x recommended for detail and precision)
- Can also run with multiple agents in parallel for diverse perspectives
- Compare results across reviewers to find consensus issues vs edge cases
- Critical and Major issues should be addressed before Tech Design handoff
