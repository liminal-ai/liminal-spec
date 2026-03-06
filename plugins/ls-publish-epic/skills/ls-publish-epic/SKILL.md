---
name: ls-publish-epic
description: Publish a detailed epic as two handoff-ready artifacts: a PO-friendly business epic with grouped ACs and a developer story file with full AC/TC detail and Jira section markers.
---

# Publish Epic

**Purpose:** Transform a detailed epic into two handoff-ready artifacts — a business-friendly epic for POs and a story file for developers. Both include Jira section markers for direct copy-paste into project management tooling.

The detailed epic (produced by ls-epic) is the engineering source of truth. This skill derives two views of it: one rolled up for business stakeholders, one broken down for implementation teams. The detailed epic is not modified.

---

## Input

A complete, validated detailed epic produced by ls-epic. Read it in full before starting. Every AC, TC, data contract, and architectural decision must be fresh in context — the quality of both outputs depends on having internalized the detail, not summarized it.

If the epic has not been validated (validation checklist incomplete, known issues outstanding), stop and tell the user. Publishing from an unvalidated epic propagates errors into two artifacts instead of one.

---

## Output

Two files:

1. **Story file** — all stories in one file, clear delimiters between them. Each story is fully formed with Jira section markers, full AC/TC detail, and a Technical Design section containing relevant data contracts from the epic.
2. **Business epic** — the PO-facing view. Grouped ACs, prose data contracts, story references. No TCs, no TypeScript, no tool schemas.

---

## Process: Stories First, Then Business Epic

**Always build stories first.** Moving detail into stories forces re-handling every AC and TC. By the time you write the business epic, the detail is organized by story, coverage is confirmed, and the roll-up is straightforward.

Writing the business epic first means summarizing from the flat detailed epic — harder to group, easier to lose things. Bottom-up then compress. Not top-down then hope.

### Step 1: Build the Story File

Read the detailed epic's Recommended Story Breakdown. Use it as the starting structure — it tells you which ACs belong to which story.

For each story:

1. **Summary** — one line, what this story delivers
2. **Description** — User Profile (carried from epic), Objective, Scope (in/out), Dependencies
3. **Acceptance Criteria** — full ACs with interspersed TCs, pulled from the detailed epic. Given/When/Then preserved exactly. If the story context requires refinement of a TC (e.g., noting that a TC is exercisable only after a later story), add a note — don't drop the TC.
4. **Technical Design** — data contracts (TypeScript interfaces) relevant to this story, pulled from the detailed epic's Data Contracts section. Include tool schemas, config shapes, or other typed contracts that the developer implementing this story needs. After the contracts, add: *"See the tech design document for full architecture, implementation targets, and test mapping."*
5. **Definition of Done** — checklist specific to this story

Mark every section with a Jira comment indicating which Jira field it maps to:

```markdown
### Summary
<!-- Jira: Summary field -->

### Description
<!-- Jira: Description field -->

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
```

After all stories, add:

- **Integration Path Trace** — every segment of the critical user path mapped to a story and TC. Any segment with no story owner is a gap. Gaps block publishing.
- **Coverage Gate** — every AC and TC from the detailed epic mapped to exactly one story. Unmapped TCs block publishing.

### Step 2: Build the Business Epic

With stories complete and coverage confirmed, create the business epic. This is a compression of known detail, not a vague summary.

#### Business Context (new section, optional)
If the user has provided business objectives or context during the epic phase, include them. If not, ask — but don't block on it. This section is allowed to describe the problem and why it matters. The PO is the audience; context helps them prioritize.

```markdown
## Business Context
<!-- Jira: Epic Description — opening section -->

[Why this matters. Business objectives.]
```

#### User Profile
Carried from the detailed epic unchanged.

#### Feature Overview
Carried from the detailed epic. May include before/after contrast — the PO audience benefits from understanding what changes.

#### Scope
Carried from the detailed epic with one cleanup: remove internal tech stack version references. Instead of "AI SDK v5 with Anthropic provider," write "standard AI stack" or similar, with a reference to Technical Considerations for details. Scope bullets describe what the system does, not what it's built with.

#### Flows & Requirements (grouped ACs)
For each flow in the detailed epic, write one AC summary paragraph covering the related ACs:

- Reference the AC number range (e.g., "AC-1.1 through AC-1.7")
- Summarize what those ACs collectively require — specific enough that a PO can accept or reject the scope
- End with a pointer: *(See Story N for detailed ACs and test conditions.)*
- No TCs in this document

The grouping should follow the epic's flow structure — typically one group per flow heading, covering 2-7 ACs.

#### Data Contracts
Describe system inputs and outputs in prose. No TypeScript. No internal component interfaces. Focus on what the user provides and what they get back.

Internal shapes (config schemas, tool parameter tables, component interfaces) belong in the story file's Technical Design sections.

#### Non-Functional Requirements
Carried from the detailed epic. May be simplified slightly but keep the substance.

#### Tech Design Questions
Carried from the detailed epic.

#### Technical Considerations (if present in the detailed epic)
If the detailed epic has a Technical Considerations section, carry it forward. If architectural decisions are scattered in the preamble, assumptions, or scope, collect them here. This section is for decided things that inform implementation — stack choices, design principles, auth approaches. Not open questions (Tech Design Questions) and not testable constraints (NFRs).

If the epic doesn't have enough architectural context to warrant this section, omit it.

#### Story Breakdown
List each story with a one-line description of what it delivers, which AC range it covers, and a pointer to the story file:

```markdown
### Story 1: [Title]
[What it delivers]. Covers AC-X.Y through AC-X.Z.
*(See story file Story 1 for full details and test conditions.)*
```

#### Validation Checklist
Simplified from the detailed epic — confirms the business epic is complete as a PO artifact.

---

## What Changes Between Detailed Epic and Business Epic

**Removed entirely:**
- All TCs (moved to stories)
- All TypeScript interfaces and code blocks (moved to story Technical Design sections)
- Tool schemas, parameter tables (moved to stories)
- Detailed CLI/API interface specifications (moved to stories)

**Added:**
- Business Context section (optional)
- Technical Considerations section (if warranted)
- Prose data contracts (system boundary only)
- Story references with AC range pointers
- Jira section markers (HTML comments)

**Transformed:**
- Individual ACs → grouped AC summary paragraphs with ranges
- TypeScript contracts → prose descriptions of inputs and outputs
- Scope bullets cleaned of internal tech references

**Kept as-is:**
- User Profile
- Feature Overview
- NFRs (may simplify slightly)
- Tech Design Questions
- Assumptions table

---

## Story Derivation Principles

Stories group acceptance criteria into implementable units based on:

- **Functional coherence** — ACs that belong together because they describe a single user capability
- **Dependency sequencing** — what must exist before this work can begin
- **Scope manageability** — enough work to be meaningful, not so much that it's unwieldy

### Sequencing
1. **Foundation first** — shared infrastructure before feature work
2. **Read before write** — display data before allowing mutations
3. **Happy path before edge cases** — core flow before error handling (though basic error states often belong with their happy path story)
4. **Independent slices** — each story should be demo-able on its own

### Story 0: Foundation
If the epic includes a Story 0 in its breakdown, carry it forward. Story 0 establishes shared plumbing — types, error classes, test fixtures, project config. Minimal or no TDD cycle.

---

## Integration Path Trace

After defining all stories, trace each critical end-to-end user path through the story breakdown. This catches cross-story integration gaps that per-story AC/TC coverage cannot detect.

### How to Trace

1. List the 1-3 most important user paths (from the epic's flows)
2. Break each path into segments
3. For each segment, identify which story owns it
4. Verify at least one TC in that story exercises the segment

Any segment with no story owner is an integration gap. Fix before publishing.

### Format

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| [segment] | [description] | Story N | TC-X.Ya |

---

## Coverage Gate

Before finalizing, verify every AC and TC from the detailed epic is assigned to exactly one story.

| AC | TC | Story |
|----|-----|-------|
| AC-1.1 | TC-1.1a, TC-1.1b | Story N |

**Rules:**
- Every AC must appear at least once
- Every TC must appear exactly once
- Unmapped TCs block publishing

---

## Validation Before Handoff

Before delivering both artifacts:

- [ ] Every AC from the detailed epic appears in the story file
- [ ] Every TC from the detailed epic appears in exactly one story
- [ ] Integration path trace complete with no gaps
- [ ] Coverage gate table complete with no orphans
- [ ] Each story has Jira section markers
- [ ] Business epic has Jira section markers
- [ ] Business epic grouped ACs reference correct story and AC ranges
- [ ] Business epic data contracts describe system boundary only (no internal types)
- [ ] Business epic scope is cleaned of internal tech references
- [ ] No TypeScript or code blocks in the business epic

**Self-review (CRITICAL):**
- Read the business epic as if you're a PO seeing it for the first time. Can you understand what this feature does and why it matters without opening the story file?
- Read each story as if you're a developer picking it up cold. Do you have everything you need to start implementing?

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
