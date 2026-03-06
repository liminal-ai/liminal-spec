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
