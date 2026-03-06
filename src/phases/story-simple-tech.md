# Simple Story: Technical Design & Enrichment

**Purpose:** Perform inline technical design and embed the results directly into a functional story. This is a story-sized tech design -- the same architectural analysis, interface design, and test planning that a full tech design provides, but scoped to a single story and written directly into the story's technical sections.

There is no separate tech design document. The story is the sole artifact. All design thinking -- architecture, interfaces, test strategy, flow design -- is embedded in the story's technical half. The engineer implements from this story alone.

---

## Simple Pipeline Context

This skill is part of the simple pipeline (lss-story → lss-tech). There is no separate epic, tech design, or publish-epic phase. The shared reference content in this skill includes verification checkpoints from the full pipeline ("Before Tech Design," "Before Publishing Epic") — those do not apply here. The relevant checkpoints for the simple pipeline are:

- **Before lss-tech:** Functional story complete (from lss-story), all ACs testable, scope is story-sized
- **Before implementation:** Technical enrichment complete (all six contract requirements met), consumer gate passed
- **Before ship:** All tests pass, gorilla testing complete, human has seen it work

---

## Role: Tech Lead as Designer, Validator, and Enricher

In the full pipeline, these are separate phases with separate agents. In the simple pipeline, you do all three in sequence:

**1. Validate the functional story.** Before designing, verify the functional story (produced by lss-story) is complete and coherent. Can you identify implementation targets for every AC? Are the ACs testable? Are scope boundaries clear? Are there functional gaps?

If issues found, return to the functional story author for revision. Don't design from incomplete functional specs.

**2. Perform technical design.** Analyze the codebase, determine architecture, design interfaces, plan tests. This is the work that ls-tech-design does as a separate document -- you do it inline.

**3. Enrich the story.** Embed your design decisions directly into the story's technical sections below the functional Definition of Done.

---

## Inputs

| Source | What It Provides |
|--------|-----------------|
| **Functional story** | Scope boundaries, ACs, TCs, error paths, data contracts, functional DoD |
| **Existing codebase** | Patterns, module organization, test conventions, interface styles |
| **Open Technical Questions** | Questions flagged during functional writing (if any) |

The functional story tells you *what* to build. The codebase tells you *where* it fits and *what patterns to follow*. There is no separate tech design document to curate from -- you produce the technical design by analyzing the codebase and embedding your decisions in the story.

---

## Escalation Gate

Before beginning technical design, assess whether this story is genuinely story-sized from a technical perspective. The functional story may look simple while the technical implications are complex.

**Escalate to the full pipeline if:**
- The story touches 4+ distinct module boundaries
- The story introduces a new external integration or service
- The story requires significant new architecture (new patterns, new infrastructure)
- The codebase analysis reveals cross-cutting concerns that affect multiple existing features
- The test strategy requires new test infrastructure or patterns not yet established

Don't force story-scale treatment on epic-scale work. It's cheaper to escalate early than to discover mid-implementation that the scope was underestimated. If you escalate, communicate the rationale -- the functional story can often become the starting point for a full epic.

---

## The Design-Then-Embed Workflow

This is the key reliability move. Do NOT skip the design thinking and jump straight to filling in story template sections. The workflow is:

### Step 1: Codebase Analysis

Read the relevant codebase before making any design decisions. Understand:

- **Module organization** -- Where does this type of work live? What's the file/directory pattern?
- **Existing patterns** -- How are similar features implemented? What conventions exist for routes, services, data access?
- **Test conventions** -- Where do tests live? What mock strategy is used? What does an existing test file for similar functionality look like?
- **Interface styles** -- How are types defined? What validation approach is used? How are errors structured?
- **External boundaries** -- What external services does the codebase interact with? Where are the mock boundaries?

Record what you analyzed. This becomes the provenance for your design decisions.

### Step 2: Technical Design (Inline)

With codebase understanding, make design decisions:

- **Architecture** -- Which modules to create or modify, how data flows, what the sequence looks like
- **Interfaces** -- Type definitions, function signatures, API contracts
- **Test plan** -- TC-to-test mapping, test file locations, mock strategy, non-TC tests needed
- **Risks** -- What could go wrong, what requires extra care

This is the same analytical work ls-tech-design does. You're just doing it scoped to one story and embedding the results directly rather than writing a separate document.

### Step 3: Embed in Story

Write the technical sections into the story below the functional Definition of Done. The output format includes: Architecture Context, Interfaces & Contracts, TC-to-test mapping, Non-TC decided tests, Risks & Constraints, Provenance & Deviation (see below), and Technical Checklist. The engineer who reads this story shouldn't be able to tell whether it came from the full pipeline or the simple pipeline.

---

## The Altitude Model

Start at the altitude appropriate to the story's scope, but default to 30,000 feet. Skip higher-altitude context only when you can show it adds no execution value for this story. The altitude model layers attention coherently across the design -- when in doubt, start high and descend.

### High Altitude (30,000 ft) -- System Context

How this story's scope connects to the broader system. External systems, entry points, data flow overview. For a story modifying well-understood internal modules, this may be brief. For a story introducing a new integration or touching system boundaries, this matters.

```markdown
### Architecture Context

**System Context:**

This story adds an export capability to the prompt list view. The export
flow is entirely client-side (URL generation + clipboard), with no new
server endpoints. It reads from the existing GET /api/prompts response
and the current filter state held in the prompt-list component.

```
User → Prompt List (filtered) → Export Button
    → URL Generator (client-side)
    → Clipboard API
    → Confirmation Toast
```
```

### Medium Altitude (10,000 ft) -- Module Architecture

Which modules this story touches, their responsibilities, and how they connect. Include module responsibility table with AC coverage.

```markdown
**Modules and Responsibilities:**

| Module | Responsibility | AC Coverage |
|--------|---------------|-------------|
| `public/js/components/prompt-list.js` | Existing list component. Add export button to toolbar, pass current filter state to export module. | AC-1.1 |
| `public/js/components/export-url.js` | New module. Receives filter state + visible slugs, generates encoded URL, copies to clipboard. | AC-1.2, AC-1.3 |
| `public/js/components/toast.js` | Existing toast component. Show success/error feedback after export. | AC-1.4 |
```

### Low Altitude (Ground Level) -- Interfaces

Full type definitions, function signatures, API contracts. The same detail level that ls-tech-design's Low Altitude section provides.

---

## Technical Writing Style

Tech designs are verbose and intentionally rich. Build a sophisticated web of context through the spiral pattern:

- **Functional ↔ Technical** -- Repeatedly connect ACs to implementation. Don't just list interfaces -- show how they fulfill acceptance criteria.
- **High level ↔ Low level** -- Spiral through abstraction layers. Go high → low → back to high → lower. Not a linear descent.
- **Redundant connections** -- Multiple paths to the same information. If someone reads only the interfaces section, they should still understand why each interface exists (AC reference).

**Anti-pattern: Thin linear design.** A flat list of modules and interfaces with no connections between them. The reader can't understand why anything exists or how it connects.

**Pattern: Woven context.** Each section references others. The architecture context mentions interfaces by name. The interfaces section references the flow. The test mapping references both.

---

## The Technical Sections

Below the functional Definition of Done, add these sections. Together they form the technical half of the story. Spec Deviation is replaced by Provenance & Deviation, since there is no separate tech design to deviate from — instead, the enricher documents codebase analysis and deviations from existing patterns.

### Architecture Context

The architecture you've designed for this story, at the altitude that serves its scope. Include module responsibilities, data flows, and key decisions. The engineer should understand what they're building, where it fits, and how data moves through it.

Since there is no separate tech design document, this section IS the design. Make it substantial enough that the engineer doesn't need to do their own codebase analysis to understand the architecture.

### Interfaces & Contracts

Full type definitions, function signatures, and contract details for everything this story creates or consumes. Include enough detail that the engineer knows exactly what to implement.

```markdown
### Interfaces & Contracts

**Creates:**

```typescript
// public/js/components/export-url.js

/**
 * Generate a shareable URL encoding the current filter state and visible prompts.
 * @returns The generated URL string, or throws ExportError on failure.
 */
function generateExportUrl(state: ExportState): string;

/**
 * Copy text to clipboard with fallback for older browsers.
 * @returns Promise that resolves on success, rejects with ClipboardError on failure.
 */
async function copyToClipboard(text: string): Promise<void>;

interface ExportState {
  tags: string[];
  query: string;
  slugs: string[];
}
```

**Consumes (existing):**

```typescript
// public/js/components/prompt-list.js (existing)
function getVisibleSlugs(): string[];
function getCurrentFilters(): { tags: string[]; query: string };
```
```

### TC to Test Mapping

Every TC from the functional story maps to a test approach. Since there is no pre-existing tech design to carry forward from, you are DECIDING the test plan here. Apply the same rigor: specific test files, specific approaches, traceable to TCs.

**No test-plan guessing by the implementer.** You decide the tests here. The implementer executes your plan.

```markdown
### TC -> Test Mapping

| TC | Test File | Test Description | Approach |
|----|-----------|------------------|----------|
| TC-1.1a | tests/service/ui/export.test.ts | export button visible with prompts | jsdom: render prompt list with data, assert export button present |
| TC-1.1b | tests/service/ui/export.test.ts | export button hidden on empty list | jsdom: render prompt list with empty data, assert no export button |
| TC-1.2a | tests/service/ui/export.test.ts | URL includes tag filter | Unit: call generateExportUrl with tags, assert URL contains tags param |
```

### Non-TC Decided Tests

Tests beyond TC mappings that you've identified during design. Edge cases, defensive tests, or integration concerns that the test plan should include.

```markdown
### Non-TC Decided Tests

| Test File | Test Description | Rationale |
|-----------|------------------|-----------|
| tests/service/ui/export.test.ts | URL encoding handles special characters in search query | Codebase uses encodeURIComponent elsewhere; verify consistency |
| tests/service/ui/export.test.ts | generateExportUrl with empty state returns base URL | Defensive: ensure no undefined params in URL |
```

If none, state explicitly: "None. Codebase patterns at `tests/service/ui/*.test.ts` reviewed -- no additional tests beyond TC mappings needed."

### Risks & Constraints

Implementation risks specific to this story.

### Provenance & Deviation

This replaces the "Spec Deviation" field from the full pipeline. Since there is no separate tech design to deviate from, this section serves two purposes: (1) document what codebase analysis was performed, and (2) document any deviations from existing codebase patterns.

```markdown
### Provenance & Deviation

**Codebase files analyzed:**
- `public/js/components/prompt-list.js` -- existing list component, filter state management
- `public/js/components/toast.js` -- existing toast pattern
- `tests/service/ui/prompt-viewer.test.ts` -- existing UI test patterns
- `src/routes/prompts.ts` -- existing API routes (confirmed no server-side export endpoint needed)

**Patterns adopted:**
- UI component structure follows existing prompt-list.js module pattern
- Test approach follows existing jsdom + service mock pattern from prompt-viewer tests
- Toast feedback follows existing toast.js API

**Deviations from existing patterns:**
- None. Design follows established codebase conventions.
```

Or when deviations exist:

```markdown
**Deviations from existing patterns:**
- New `export-url.js` module introduces async clipboard API usage. Existing codebase
  uses only synchronous DOM operations in UI components. Justified: clipboard API
  requires async, and the fallback handles browsers without support.
```

The provenance must include both "files analyzed" and "patterns adopted/deviated" as required fields. An empty provenance means "I didn't analyze the codebase," which fails the quality gate.

### Technical Checklist

```markdown
## Technical Checklist

- [ ] All TCs have passing tests
- [ ] TypeScript compiles clean (`bun run typecheck`)
- [ ] Lint/format passes (`bun run lint && bun run format:check`)
- [ ] No regressions (`bun test`)
- [ ] Verification: `bun run verify`
- [ ] Provenance documented (files analyzed, patterns adopted/deviated)
```

---

## Story Contract Requirements

Every story that completes lss-tech enrichment must satisfy these non-negotiable requirements. These are the same quality gate as the full pipeline.

**1. Technical design present.** The Architecture Context and Interfaces & Contracts sections contain substantial design work -- architecture decisions, module responsibilities, full type definitions. The implementer should not need to do their own codebase analysis to understand what to build.

**2. TC to test mapping present.** Every TC in the functional story has a corresponding entry in the TC-to-test mapping table, with test file, description, and approach decided by the enricher.

**3. Non-TC decided tests present.** Any additional tests identified during design are listed. If none, the section explicitly states "None" with rationale.

**4. Technical DoD present.** The technical checklist includes specific verification commands and regression expectations.

**5. Provenance & Deviation present.** Files analyzed, patterns adopted, and deviations documented. An empty provenance is a gate failure.

**6. Technical sections describe targets, not steps.** Substantial detail and targets-not-steps coexist: the story can include detailed flows, interfaces, and test plans without prescribing implementation order.

---

## Single-Story Coherence Check

After enrichment, verify internal coherence:

- **AC → Module coverage:** Every AC in the functional story has at least one module in the Architecture Context responsible for it.
- **AC → Interface coverage:** Every AC that involves data or behavior has corresponding interfaces in the Interfaces & Contracts section.
- **TC → Test coverage:** Every TC has a mapped test. Every non-TC decided test has a rationale.
- **Interface → Test coverage:** Every interface created in this story is exercised by at least one test.
- **External boundary coverage:** If the story touches external boundaries (APIs, databases, external services), the test plan includes mock strategy for each boundary.

This is a within-story check, not a cross-story check. It ensures the technical design is internally coherent.

---

## The Consumer Gate

The ultimate validation: **Could an engineer implement from this story alone?**

Apply literally:

- Does the Architecture Context explain what modules to create or modify, with enough flow detail to understand how they connect?
- Does the Interfaces & Contracts section carry full type definitions and signatures?
- Does the TC-to-test mapping tell the engineer exactly what tests to write, with file names and approaches?
- Are non-TC decided tests listed?
- Does the Provenance section document what codebase analysis was performed?
- Does the technical checklist tell them how to verify their work?
- Are there ambiguities that would force the engineer to choose between interpretations?

There is no separate tech design to fall back on. The story must be self-contained. If the engineer would need to do their own codebase analysis to understand the architecture, the design is too thin.

---

## Common Failure Modes

**Skipping the design-thinking step.** Jumping straight to filling in template sections without actually analyzing the codebase or thinking through architecture. The result is thin, generic technical sections that don't reflect how the codebase actually works. The fix: always start with codebase analysis. Read the relevant modules. Understand existing patterns. Then design.

**Thin architecture context.** A 5-line summary instead of actual module responsibilities, flow diagrams, and design decisions. The story is the only design artifact -- if the architecture context is thin, the design thinking didn't happen (or wasn't captured).

**Borrowing test approaches from imagination.** Making up test file paths and mock patterns instead of examining how existing tests in the codebase work. The test plan should reflect the codebase's actual test conventions, not generic best practices.

**Empty provenance.** "Files analyzed: relevant codebase files." This isn't provenance -- it's a placeholder. List the actual files. Name the actual patterns adopted. The provenance exists so reviewers can verify the design is grounded in the codebase, not invented from scratch.

**Steps masquerading as targets.** The technical section says "1. Create the module. 2. Add the function. 3. Wire to the component." This prescribes implementation sequence. Instead: "Export module at `public/js/components/export-url.js` exposes `generateExportUrl()` and `copyToClipboard()`. Prompt-list component calls these on export button click." The engineer decides the sequence.

**Missing TC mappings.** The functional section has 8 TCs but the mapping table has 5 entries. Three TCs have no test approach. Either the design thinking missed them or the enrichment was hasty. Every TC must map.

**Forcing story-scale on epic-scale work.** The codebase analysis reveals the story touches 6 modules, needs a new middleware pattern, and requires changes to the auth flow. This isn't a story -- it's an epic. Escalate rather than producing a bloated, incoherent story.

---

## Output: Complete Story

After lss-tech enrichment, the story contains both halves:

**Functional half (from lss-story):**
- User Profile, Objective, Scope
- Acceptance Criteria with full TCs
- Error Paths, Data Contracts
- Definition of Done (functional)

**Technical half (from lss-tech):**
- Architecture Context (inline design with module responsibilities and flows)
- Interfaces & Contracts (full type definitions and signatures)
- TC to Test Mapping (every TC with test file, description, approach)
- Non-TC Decided Tests (additional tests identified during design)
- Risks & Constraints
- Provenance & Deviation (files analyzed, patterns adopted/deviated)
- Technical Checklist

This complete story is the sole implementation artifact. There is no separate epic, tech design, or other document to reference. The engineer receives this story, forms an implementation plan, and executes.
