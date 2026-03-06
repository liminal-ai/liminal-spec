---
name: lss-tech
description: Perform inline technical design and embed results into a functional story. Story-sized tech design + enrichment with codebase analysis, architecture, interfaces, and test mapping.
---

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

## Reference: Verification: The Scrutiny Gradient

# Verification: The Scrutiny Gradient

**Upstream = more scrutiny. Errors compound downward.**

The epic gets the most attention because if it's on track, everything else follows. If it's off, everything downstream is off.

## The Gradient

```
Epic:  #################### Every line
Tech Design:   #############....... Detailed review
Stories:       ########............ Key things + shape
Implementation:####................ Spot checks + tests
```

## Epic Verification (MOST SCRUTINY)

This is the linchpin. Read and verify EVERY LINE.

### Verification Steps

1. **BA self-review** -- Critical review of own work. Fresh eyes on what was just written.

2. **Tech Lead validation** -- Fresh context. The Tech Lead validates the spec is properly laid out for tech design work:
   - Can I map every AC to implementation?
   - Are data contracts complete and realistic?
   - Are there technical constraints the BA missed?
   - Do flows make sense from implementation perspective?

3. **Additional model validation** -- Another perspective (different model, different strengths):
   - Different model, different strengths
   - Adversarial/diverse perspectives catch different issues

4. **Fix all issues, not just blockers** -- Severity tiers (Critical/Major/Minor) set fix priority order, not skip criteria. Address all issues before handoff. Minors at the spec level compound downstream -- zero debt before code exists.

5. **Validation rounds** -- Run validation until no substantive changes are introduced, typically 1-3 rounds. The Tech Lead also validates before designing -- a built-in final gate. Number of rounds is at the user's discretion.

6. **Human review (CRITICAL)** -- Read and parse EVERY LINE:
   - Can you explain why each AC matters?
   - No "AI wrote this and I didn't read it" items
   - This is the document that matters most

## Tech Design Verification

Still detailed review, but less line-by-line than epic.

### What to Check

- Structure matches methodology expectations
- TC-to-test mapping is complete
- Interface definitions are clear
- Phase breakdown makes sense
- No circular dependencies

### Who Validates

- **Tech Lead self-review** -- Critical review of own work
- **BA/SM validation** -- Can I shard stories from this? Can I identify coherent AC groupings?
- **Tech Lead re-validation** -- Can I add story-level technical sections from this?

## Story Verification

Stories go through a two-phase validation reflecting their two-phase authoring.

### Functional Stories (after BA/SM sharding)

Less line-by-line, more shape and completeness:

- Coverage gate: every AC/TC assigned to a story
- Integration path trace: no cross-story seam gaps
- Each story coherent and independently acceptable
- Tech Lead confirms they can add technical sections

### Technically Enriched Stories (after Tech Lead enrichment)

Story contract compliance check:

1. **Tech design shard present** -- substantial, story-scoped tech design content in Architecture Context and Interfaces
2. **TC-to-test mapping present** -- every TC mapped to a test approach with file names and approaches from the tech design
3. **Non-TC decided tests present** -- edge/integration tests from tech design carried forward or explicitly noted as absent
4. **Technical DoD present** -- specific verification commands
5. **Spec deviation field present with citations** -- checked tech design sections listed, even when no deviations
6. **Targets, not steps** -- technical sections describe what, not how

Consumer gate: could an engineer implement from this story alone, without reading the full tech design?

## Implementation Verification

Spot checks + automated tests.

### What to Check

- Tests pass (full suite)
- Types check clean
- Lint passes
- Spot check implementation against tech design
- Gorilla testing catches "feels wrong" moments

---

## Multi-Agent Validation Pattern

Liminal Spec uses this pattern throughout:

| Artifact | Author Reviews | Consumer Reviews |
|----------|---------------|------------------|
| Epic | BA self-review | Tech Lead (needs it for design) |
| Tech Design | Tech Lead self-review | BA/SM (needs it for story derivation) + Tech Lead (needs it for technical sections) |
| Published Stories | BA/SM self-review | Engineer (needs them for implementation) |

### Why This Works

1. **Author review** -- Catches obvious issues, forces author to re-read
2. **Consumer review** -- Downstream consumer knows what they need from the artifact
3. **Different model** -- Different strengths catch different issues. Use adversarial/diverse perspectives for complementary coverage.
4. **Fresh context** -- No negotiation baggage, reads artifact cold

### The Key Pattern: Author + Downstream Consumer

If the Tech Lead can't build a design from the epic -> spec isn't ready.
If the BA/SM can't derive stories from the epic -> epic isn't ready.
If the Engineer can't implement from published stories + tech design -> artifacts aren't ready.

**The downstream consumer is the ultimate validator.**

---

## Orchestration

**How to run validation passes is left to the practitioner.** This skill describes:
- **WHAT to validate** -- Which artifacts, which aspects
- **WHEN to validate** -- Checkpoints in the flow

Leaves flexible:
- **HOW to validate** -- Which models, how many passes
- **Specific orchestration** -- Based on your setup and preferences

---

## Checkpoints

### Before Tech Design

- [ ] Epic complete
- [ ] BA self-review done
- [ ] Model validation complete
- [ ] All issues addressed (Critical, Major, and Minor)
- [ ] Validation rounds complete
- [ ] Tech Lead validated: can design from this
- [ ] Human reviewed every line

### Before Publishing Epic

- [ ] Tech Design complete (all altitudes: system context, modules, interfaces)
- [ ] Tech Lead self-review done (completeness, richness, writing quality, readiness)
- [ ] Model validation complete (different model for diverse perspective)
- [ ] All issues addressed (Critical, Major, and Minor)
- [ ] Validation rounds complete (no substantive changes remaining)
- [ ] TC -> Test mapping complete (every TC from epic maps to a test)
- [ ] Human reviewed structure and coverage

### Before Implementation

- [ ] Functional stories complete (all ACs/TCs assigned, integration path traced)
- [ ] Technical enrichment complete (all six story contract requirements met)
- [ ] Consumer gate passed: engineer can implement from stories
- [ ] Different model reviewed stories (if high-stakes)

### Before Ship

- [ ] All tests pass
- [ ] Gorilla testing complete
- [ ] Verification checklist passes
- [ ] Human has seen it work

---

## Reference: Writing Style Reference

# Writing Style Reference

*Deep-dive guide for documentation that serves both humans and AI agents. Load when writing Epics and Tech Designs.*

---

## Quick Navigation (If You're Stuck Mid-Doc)

| Problem | Jump to |
|---------|---------|
| Everything feels flat / equal weight | [Branches, Leaves, Landmarks](#branches-leaves-and-landmarks) • [Before/After #1](#example-1-flat-list--rich-context) |
| Altitude jump / reader lost | [The Smooth Descent](#the-smooth-descent) • [Extended Example](#extended-example-tracing-through-altitudes) |
| Functional ↔ technical drift | [The Weave](#functional-and-technical-the-weave) • [Before/After #3](#example-3-separated--woven) |
| Unsure how deep to go | [Bespoke Depth](#bespoke-depth-signal-optimization) • [Scoring Rubric](#scoring-rubric) |
| Complex diagram overwhelming | [Progressive Construction](#progressive-construction-the-whiteboard-phenomenon) |
| Fast final-pass check | [Quick Diagnostic](#quick-diagnostic) |

---

## The Core Insight: Documentation Has Three Dimensions

Most technical documentation uses one dimension: hierarchy. Categories, subcategories, sections. This works for reference lookup but fails for understanding. Good documentation uses three dimensions—and the third is what makes it work.

**Dimension 1: Hierarchy** — Parent/child relationships. What contains what.

**Dimension 2: Network** — Cross-references. What connects to what.

**Dimension 3: Narrative** — Temporal and causal flow. What leads to what, and why.

The third dimension is where context lives. Not just *what* things are, but *how* they connect, *why* they exist, and *what happens when* you use them.

This matters for AI agents because LLMs trained on internet text—50TB of messy, narrative, temporal human writing—encode knowledge using narrative substrate. When you conform to that structure, you get efficient encoding and better retrieval almost for free. The relationships you'd otherwise need to enumerate explicitly are encoded in the temporal flow.

### Why Narrative Is Compression

Consider two ways to express the same information:

**Enumerated (explicit relationships):**
```
- ConversationManager exists
- Session exists  
- ConversationManager creates Session
- Session handles messages
- Relationship: ConversationManager owns Session
```

**Narrative (implicit relationships):**
```
When a user starts chatting, ConversationManager creates a Session to handle
the conversation. The Session manages message history and coordinates with
external services. The manager holds the session reference throughout the
conversation lifecycle.
```

Both encode the same facts. The narrative version is shorter because relationships emerge from temporal flow ("when... creates... manages... throughout"). You don't enumerate "Relationship: A owns B"—the ownership is implicit in "manager holds the session reference."

For LLMs, narrative structure activates learned patterns from training data. For humans, narrative matches how we naturally think. We remember journeys better than lists.

---

## Branches, Leaves, and Landmarks

Think of your document as a tree. Prose paragraphs establish **branches**—the structural limbs that hold everything together. Bullet lists hang **leaves**—specific details attached to their branch. Diagrams create **landmarks**—spatial anchors that help readers navigate.

This creates attentional hierarchy. When all information has equal visual weight (flat bullets, uniform paragraphs), readers and models spread attention evenly. Key insights get lost in noise.

### The Branch: Prose Paragraphs

Prose establishes context, importance, and relationships. It tells the reader *why* something matters before presenting *what* specifically exists. Two to five sentences. One clear point per paragraph.

### The Leaves: Bullet Lists

Lists enumerate specifics *after* context is established. They hang from the branch that prose creates. Never more than two levels deep in any single section.

**Good list usage:**
```
OAuth tokens are retrieved from keyring storage where other CLI tools have 
already obtained and stored them. We're not implementing OAuth flows—just 
reading tokens.

Token locations:
- ChatGPT: ~/.codex/auth/chatgpt-token
- Claude: ~/.claude/config
```

**Poor list usage:**
```
Authentication:
- API keys supported
- OAuth supported
- ChatGPT tokens
- Claude tokens
- Token refresh
```

The second example forces readers to infer all relationships. The cognitive load is on the reader instead of the writer.

### The Landmarks: Diagrams

Diagrams encode spatial relationships that prose can't express efficiently. They create memory anchors through visual variation.

```
User Command → AuthManager → Check method
                  ↓
            API Key ──→ Config → Headers
                  ↓
            OAuth ──→ Keyring → Token → Headers
```

The same information in prose would take 3-4 sentences and lose the spatial relationship. Diagrams are compression.

### The Ratio: A Compass, Not a Rule

Most well-structured sections land around:

- **~70% prose** — Paragraphs establishing context, relationships, purpose
- **~25% lists** — Specifics, enumerations, steps
- **~5% diagrams** — Spatial relationships, architecture, flow

This isn't prescription. Some sections need more diagrams (architecture overviews). Some need more lists (API references). The ratio is a compass: if you're at 90% bullets, you're probably missing branches. If you're at 100% prose, you're probably missing scannable specifics.

When a section feels off, check the ratio. Monotonous structure often explains the problem.

### Putting It Together

```markdown
## Session Management

Conversations persist through the Session abstraction. When a user starts 
chatting, ConversationManager creates a Session to hold conversation state—
message history, active provider, pending tool calls.

Sessions coordinate between three subsystems:

    Session
    ├── MessageHistory (stores conversation)
    ├── ModelClient (sends to LLM)
    └── ToolRouter (handles tool calls)

Key methods:
- `sendMessage(content)` — Format, send, process response, update history
- `getHistory()` — Return full message history for context
- `processToolCall(call)` — Route to executor, await result, append

The separation between Session and ConversationManager matters for testing.
Sessions test with mocked clients. Managers test lifecycle without message flow.
```

Five elements: branch paragraph, diagram landmark, detail leaves, closing branch. Complete concept.

---

## The Altitude Metaphor

Documentation exists at different altitudes. Higher = broader view, less detail. Lower = narrower focus, more specifics.

```
25,000 ft   PRD: "The system enables collaborative AI conversations"
    ↓
15,000 ft   Tech Approach: "ConversationManager orchestrates Sessions"
    ↓
10,000 ft   Phase README: "Session.sendMessage() formats per provider spec"
    ↓
5,000 ft    Checklist: "Task 3: Wire Session to ModelClient with retry"
    ↓
1,000 ft    Code: const response = await client.send(formatted, { retries: 3 })
```

The failure mode isn't being at the wrong altitude—it's **jumping altitudes without bridges**.

### The Smooth Descent

Each document should bridge levels, not exist at one. Start higher than you'll finish. Descend gradually. Each level answers questions raised by the level above.

**PRD says:** "User can authenticate with ChatGPT OAuth"
**Reader asks:** How does that work technically?

**Tech Design says:** "Read token from ~/.codex keyring"
**Reader asks:** What's the implementation approach?

**Phase Doc says:** "Use keyring-store module, mock filesystem in tests"
**Reader asks:** What are the specific tasks?

**Checklist says:** "1. Import keyring-store  2. Add getToken() wrapper  3. Create mock"

No gaps. Each level makes sense in context of the previous one.

### The Consistency Ladder

The same capability should be visible at every altitude level:

| Altitude | Example |
|----------|---------|
| 25K (PRD) | User can start a conversation and receive a response |
| 15K (Approach) | ConversationManager wires CLI → Codex → ModelClient |
| 10K (Phase) | Implement createConversation(), wire CLI command, mock ModelClient |
| 5K (Checklist) | 1) Add CLI command 2) Implement createConversation 3) Write mocked test |

If a capability appears at one level but not another, something is missing. The ladder is the alignment test.

### Extended Example: Tracing Through Altitudes

**Epic (25K feet):**
> Users can execute tools (read files, run commands) through the AI assistant. The assistant requests permission before executing.

Reader understands: what capability exists, who controls it.
Reader wonders: how does this work technically?

**Tech Design - Overview (15K feet):**
> Tool execution flows through three components. Session detects when the model requests a tool call. ToolRouter matches the request to an executor. The CLI presents approval before execution proceeds.

Reader understands: which components, how they connect.
Reader wonders: what are the specific interfaces?

**Tech Design - Details (10K feet):**
> Session.processResponse() checks for tool_calls in model output. When found, it extracts the tool name and arguments, then calls ToolRouter.route(toolCall). Before execution, Session emits a 'tool_request' event that the CLI handler intercepts.

Reader understands: specific methods, data flow, event mechanism.
Reader wonders: what are my implementation tasks?

**Implementation Checklist (5K feet):**
> 1. Add tool_calls detection to Session.processResponse()
> 2. Implement ToolRouter.route() with executor registry
> 3. Wire CLI approval handler to 'tool_request' event

**Each level answered the question raised by the previous level.** That's the smooth descent.

---

## Functional and Technical: The Weave

Traditional process separates functional requirements ("user can chat") from technical design ("WebSocket with JSON-RPC"). Product writes the PRD, throws it over the wall, engineering writes the tech spec. The gap that opens between them is where projects fail.

Better: weave functional and technical together at every altitude level.

**In high-level docs (mostly functional, touch technical):**
- User outcome: "User can resume saved conversations"
- Technical grounding: "Verify by loading JSONL, continuing from last message"

**In technical docs (mostly technical, ground in functional):**
- Architecture: "Session coordinates ModelClient and ToolRouter"
- Functional anchor: "This enables users to review tool actions before execution"

**In implementation docs (deep technical, verify via functional):**
- Task: "Implement resumeConversation() method"
- Functional test: "User can continue conversation where they left off"

The weave prevents drift. When functional and technical stay interlocked, you can't over-engineer (functional bounds what's needed) and you can't under-deliver (technical serves functional outcomes).

### Functional Verification Grounds Testing

Technical tests without functional grounding:
"Test that ConversationManager.createConversation() returns Conversation object"

This can pass while the user *still can't chat*. The test verified mechanism, not outcome.

Functional test criteria:
"User can start conversation, send message, receive response"

The test name describes the user capability. The test implementation exercises the technical path. The assertion verifies functional success. This is the weave in action.

---

## Bespoke Depth: Signal Optimization

The anti-pattern: uniform depth across all topics. Everything documented to the same depth means nothing stands out.

Better: go deep where it matters, stay shallow where it doesn't.

### The Four Questions

Before diving into any topic, ask:

| Question | Deep if... | Shallow if... |
|----------|-----------|--------------|
| Is this complex or simple? | Complex | Simple |
| Is this new or already done? | Novel | Existing |
| Is this critical or optional? | Critical | Optional |
| Will implementers struggle here? | High risk | Low risk |

### Scoring Rubric

Score each topic 1-5 on four dimensions, then sum:

- **Complexity:** How many moving parts?
- **Novelty:** Is this new or already implemented?
- **Criticality:** Does the project fail if this is wrong?
- **Risk:** How likely is confusion or error?

| Score | Depth |
|-------|-------|
| 4-8 | Shallow (one paragraph, maybe a link) |
| 9-13 | Medium (2-3 paragraphs, small list) |
| 14-20 | Deep (multi-paragraph, diagram, examples) |

**Example:**
- OAuth token retrieval: 4+5+5+4 = 18 → Deep
- Config file parsing: 2+1+2+2 = 7 → Shallow

### Token Budget Thinking

Instead of 10 topics × 500 tokens = 5,000 tokens of uniform depth:

- 2 critical topics × 1,500 tokens = 3,000 tokens of real depth
- 8 simple topics × 100 tokens = 800 tokens of appropriate brevity
- Total: 3,800 tokens, higher signal-to-noise

The critical topics got the depth they need. The simple topics didn't waste tokens.

---

## Progressive Construction: The Whiteboard Phenomenon

There's a difference between seeing a complex diagram and *building* one. People who build understand deeply. People who receive are overwhelmed.

When you whiteboard a system, you add one box at a time, connect it, then add the next. Each step scaffolds the next. Documentation should mimic that process.

### Build Diagrams in Stages

Instead of dropping a 20-component diagram:

```
Step 1: System has three layers.
    CLI → Library → External

Step 2: Library entry point is ConversationManager.
    CLI → ConversationManager → External

Step 3: Manager coordinates Codex and Session.
    CLI → ConversationManager → Codex → Session → External

Step 4: Session routes to ModelClient and ToolRouter.
    CLI → ConversationManager → Codex → Session → ModelClient
                                       ↘ ToolRouter
```

By the final diagram, readers have *constructed* the understanding.

### Conceptual Spiral

Progressive construction applies to concepts, not just diagrams. Revisit from multiple angles, each pass adding detail:

- Pass 1: "Phase 2 adds tool execution to the conversation flow."
- Pass 2: "Session detects tool calls and routes them to ToolRouter."
- Pass 3: "ToolRouter executes the tool, returns results, Session resumes the model call."
- Pass 4: "Here is the sequence diagram of that cycle."

Each pass deepens without forcing a leap. The spiral guides into complexity without drowning.

---

## Before/After Transformations

### Example 1: Flat List → Rich Context

**Before:**
```
CLI Features:
- Interactive REPL
- One-shot command mode  
- JSON output flag
- Provider switching
```

**After:**
```
The CLI supports three interaction modes for different audiences. Interactive 
REPL serves humans who want conversational flow. One-shot commands serve 
automation and testing. JSON output serves programmatic consumption.

Modes available:
- Interactive: `codex` → enters REPL, `quit` to exit
- One-shot: `codex chat "message"` → execute and exit
- JSON output: Add `--json` flag for structured response
```

The prose establishes *why* (the branch). The bullets enumerate *what* (the leaves).

### Example 2: Altitude Jump → Smooth Descent

**Before:**
```
## Tool Execution
The system enables AI-assisted tool execution.

const result = await executor.run(tool, args, { timeout: 30000 });
```

**After:**
```
## Tool Execution
The system enables AI-assisted tool execution, where the model can request 
actions like reading files, running commands, or making API calls.

Tool execution follows a request-approve-execute cycle. The model requests 
a tool call, the system presents it for approval, execution runs sandboxed, 
and results return to the model.

    Model Request → Approval Gate → Executor → Result → Model

const result = await executor.run(tool, args, { timeout: 30000 });
```

Three altitudes (concept → mechanism → implementation), smooth descent between each.

### Example 3: Separated → Woven

**Before:**
```
## Authentication Implementation
AuthManager reads from config.toml or keyring. API keys use ConfigReader.
OAuth tokens use KeyringStore.

Implementation:
- ConfigReader.get('api_key')
- KeyringStore.retrieve(provider)
```

**After:**
```
## Authentication Implementation
Users authenticate through two paths: API keys (for personal accounts) and
OAuth tokens (for reusing existing ChatGPT or Claude subscriptions).

AuthManager abstracts this choice. When a user starts a conversation, the 
manager checks the configured auth method. For API keys, it reads from config.
For OAuth, it retrieves tokens from keyring.

This abstraction enables provider switching without re-authentication—users
configure once, the system handles the rest.

Technical components:
- ConfigReader: Load from config.toml or environment
- KeyringStore: Retrieve OAuth tokens (path varies by provider)
```

Opens with functional context. Shows mechanism. Grounds in benefit. Then enumerates components.

---

## Common Failure Modes

### Bullet Soup
**Symptom:** Every section is bullets. No paragraphs. Lists all the way down.
**Fix:** Add prose branches. Explain why the list matters before presenting it.

### Wall of Text
**Symptom:** Dense paragraphs. No lists. No diagrams. No variation.
**Fix:** Break up with lists for enumerations, diagrams for spatial relationships.

### Altitude Yoyo
**Symptom:** Document bounces between vision and implementation randomly.
**Fix:** Pick an altitude and stay there, or descend smoothly. Don't yoyo.

### All Technical, No Functional
**Symptom:** Describes mechanisms without purpose.
**Fix:** Ground in functional outcome. "When a user sends a message, ConversationManager... This enables users to..."

### Premature Depth
**Symptom:** Edge cases before establishing normal path.
**Fix:** Normal path first, edge cases second.

### Orphaned Diagrams
**Symptom:** Diagram appears without prose context.
**Fix:** Introduce diagrams with prose, then reference them. The diagram confirms; prose explains.

---

## Writing for Agents

This reference will be loaded by AI agents writing Epics and Tech Designs. Understanding how agents read—and fail to read—makes the difference between documentation that works and documentation that wastes context.

### How Agents Read Differently

Humans skim, backtrack, ask questions, fill gaps with intuition. Agents process sequentially, can't ask clarifying questions, and treat ambiguity as noise rather than invitation.

**Human reading:** Scan headings → jump to relevant section → skim for keywords → read closely when relevant → ask if confused.

**Agent reading:** Load document into context → process sequentially → attempt task → fail or succeed based on what was explicit.

This means:
- Gaps that humans bridge intuitively become blockers for agents
- Implied relationships that humans infer need to be stated
- "Obviously" is never obvious—if it matters, write it

### Context Window Economics

Every token of documentation is a token not available for reasoning or code generation. Agents operate under hard context limits. This creates pressure for compression—but compression mustn't sacrifice clarity.

The solution is *signal density*: every token earns its place.

**Low signal density:**
```
The configuration system is designed to be flexible and extensible. 
It supports multiple configuration sources and can be extended by 
implementing the IConfigSource interface.
```

**High signal density:**
```
Configuration loads from config.toml. Extend via IConfigSource interface.
See /src/config/ for implementation.
```

Same information, half the tokens. Strip:
- Obvious filler ("designed to be flexible")
- Vague claims without specifics ("can be extended"—*how*?)
- Redundant phrasing

### What Agents Need Explicitly

| Implicit for Humans | Explicit for Agents |
|---------------------|---------------------|
| "Handle errors appropriately" | "Catch ConfigError, log message, return null" |
| "Test this thoroughly" | "Write tests for: valid input, empty input, malformed input" |
| "Wire up the components" | "Import X from Y, instantiate with config, pass to Z constructor" |
| "Follow the pattern from Phase 1" | "Copy the approach from Session.sendMessage(): validate → transform → execute → handle result" |

### The Explicit Stack

For any task, agents need these layers explicit:

1. **Scope** — What to do, what NOT to do
2. **Inputs** — What exists, where to find it
3. **Outputs** — What to produce, where to put it
4. **Sequence** — What order, what depends on what
5. **Verification** — How to confirm success

**Before (human-readable):**
```
Implement the auth flow. Make sure it works with both API keys and OAuth.
```

**After (agent-executable):**
```
Implement AuthManager.authenticate():

Scope:
- Implement API key and OAuth paths
- Do NOT implement token refresh (out of scope for Phase 1)

Inputs:
- AuthConfig from config.toml (method: 'api_key' | 'oauth', credentials)
- Existing KeyringStore for OAuth token retrieval

Outputs:
- Returns AuthToken { token: string, expiresAt: Date }
- Throws AuthError on failure

Sequence:
1. Read config.method
2. Branch: API key → read from config, OAuth → read from keyring
3. Validate token format
4. Return AuthToken

Verification:
- Test: API key path returns token from config
- Test: OAuth path retrieves from keyring mock
- Test: Invalid config throws AuthError
```

The second version is longer but executable. An agent can complete it without asking questions.

### The Isolation Test

Agents often read documents in isolation—loaded into fresh context without the conversation history that produced them. The document must stand alone.

**Test:** Cover the rest of the document. Read only this section. Could you complete the work described?

If yes: section is self-contained.
If no: identify what's missing and add it.

### Progressive Loading Strategy

For large specifications, don't load everything into every context. Instead:

1. **Core context** (always loaded): Architecture overview, key patterns, current phase
2. **Task context** (loaded for specific work): Relevant phase spec, related component docs
3. **Reference context** (linked, not loaded): API docs, style guides, examples

This mirrors bespoke depth at the document level. Load what matters for this task; link to the rest. Mention what exists even if you don't include it—agents can request additional context if they know it exists.

---

## Quick Diagnostic

When a section feels wrong but you can't identify why:

1. **Altitude check:** Am I jumping levels without bridges?
2. **Branch check:** Do lists have prose context, or are they orphaned?
3. **Depth check:** Am I going deep everywhere, or allocating based on importance?
4. **Weave check:** Is functional purpose present, or is this pure mechanism?
5. **Variation check:** Is the structure monotonous?
6. **Narrative check:** Does this read as a journey, or as disconnected facts?

### The Writing Loop (Mid-Doc Recalibration)

When you drift—and you will—run through:

1. Check altitude: Where am I? 25k, 15k, 10k, 5k?
2. Check bridge: Did I explain why the next level exists?
3. Check weave: Does each technical detail map to a functional outcome?
4. Check depth: Did I go deep where complex and shallow where simple?
5. Check structure: Did I vary form to distribute attention?

If any answer is "no," rewrite that paragraph or section. This loop is the fast path to high-signal documentation.

---

## The Meta-Test

This document should demonstrate what it teaches:

- ✓ Opens with core insight, builds from there
- ✓ Spirals through ideas with increasing depth
- ✓ Mixes structural forms (prose, lists, diagrams, tables, code)
- ✓ Creates attentional weight through variation
- ✓ Includes before/after transformations
- ✓ Weaves functional with technical
- ✓ Uses progressive disclosure

If this document is comprehensible and useful, the principles work.

---

*Remember: You're not following rules. You're thinking about how information encodes and transmits. The patterns are heuristics that usually work. When they don't fit, understand why and adapt.*

---

## Reference: Testing Reference

# Testing Reference

## Philosophy: Service Mocks

**Service mocks** are in-process tests at public entry points. They test as close to where external calls enter your code as possible, exercise all internal pathways, and mock only at external boundaries. Not unit tests (too fine-grained, mock internal modules). Not end-to-end tests (too slow, require deployed systems). Service mocks hit the sweet spot.

### Core Principle

Test at the entry point. Exercise the full component. Mock only what you must.

```
Your Code
┌─────────────────────────────────────────────────────┐
│  Entry Point (API handler, exported function, etc.) │ ← Test here
│         ↓                                           │
│  Internal logic, state, transformations             │ ← Exercised, not mocked
│         ↓                                           │
│  External boundary (network, DB, filesystem)        │ ← Mock here
└─────────────────────────────────────────────────────┘
```

### Why Service Mocks Work

Traditional unit tests mock at module/class boundaries — testing `UserService` by mocking `UserRepository`. This hides integration bugs between your own components.

Service mocks push the mock boundary outward to where your code ends and external systems begin. You test real integration between your modules while keeping tests fast and deterministic.

**The insight:** Your code is one unit. External systems are the boundary.

### Mock Strategy

| Boundary | Mock? | Why |
|----------|-------|-----|
| **Off-machine** (network, external APIs, services) | Always | Speed, reliability, no external dependencies |
| **On-machine, out-of-process** (local database, Redis) | Usually | Speed; judgment call based on setup complexity |
| **In-process** (your code, your modules) | Never | That's what you're testing |

### The Two Test Layers

Coverage comes from two complementary layers:

**Layer 1: Service mocks (primary)**
- Many tests, fast, in-process
- This is where TDD lives
- Coverage goals met here
- Run on every save, every CI build

**Layer 2: Wide integration tests (secondary)**
- Few tests, slower, require deployed environment
- Verify deployed pieces work together
- Catch configuration and wiring issues
- Run locally before merge, post-CD as verification — NOT on CI

```
┌──────────────────────────────────────────────────┐
│  Service Mocks (many, fast, in-process)         │  ← TDD lives here
│  Coverage goals met here                         │
└──────────────────────────────────────────────────┘
                        +
┌──────────────────────────────────────────────────┐
│  Wide Integration Tests (few, slower, deployed)  │  ← Smoke tests, critical paths
│  Run locally + post-CD, not CI                   │
└──────────────────────────────────────────────────┘
```

### Confidence Distribution

Service mocks provide high confidence for logic and behavior. Wide integration tests provide confidence for deployment and wiring. Together they cover most failure modes.

**What they can't cover:** Visual correctness, UX feel, edge cases you didn't anticipate. That's what gorilla testing is for.

---

## API Testing (Deepest Section)

API testing is the cleanest application of service mocks. The entry point is obvious (the HTTP handler), the boundaries are clear (external services), and the response is easily asserted. This is the pattern to internalize — UI testing adapts it with more friction.

### Pattern: Test the Route Handler

Get as close to the HTTP handler as possible. Use your framework's test injection (Fastify's `inject()`, Express's supertest, etc.) to send requests without network overhead.

```typescript
// Service mock test for POST /api/prompts
describe("POST /api/prompts", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildApp();  // Your app factory
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("authentication", () => {
    // TC-1: requires authentication
    test("returns 401 without auth token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        payload: { prompts: [] },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("validation", () => {
    // TC-2: validates input
    test("returns 400 with invalid slug format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${testToken()}` },
        payload: {
          prompts: [{ slug: "Invalid:Slug", name: "Test", content: "Test" }],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toMatch(/slug/i);
    });
  });

  describe("success paths", () => {
    // TC-3: creates prompt and returns ID
    test("persists to database and returns created ID", async () => {
      mockDb.insert.mockResolvedValue({ id: "prompt_123" });

      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${testToken({ sub: "user_1" })}` },
        payload: {
          prompts: [{ slug: "my-prompt", name: "My Prompt", content: "Content" }],
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().ids).toContain("prompt_123");
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "my-prompt", userId: "user_1" })
      );
    });
  });

  describe("error handling", () => {
    // TC-4: handles database errors gracefully
    test("returns 500 when database fails", async () => {
      mockDb.insert.mockRejectedValue(new Error("Connection lost"));

      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${testToken()}` },
        payload: { prompts: [{ slug: "test", name: "Test", content: "Test" }] },
      });

      expect(response.statusCode).toBe(500);
      expect(response.json().error).toMatch(/internal/i);
    });
  });
});
```

### Setting Up Mocks

Mock external dependencies before importing the code under test. The pattern is framework-agnostic:

```typescript
// Mock external boundaries — database, auth service, config
const mockDb = {
  insert: vi.fn(),
  query: vi.fn(),
  delete: vi.fn(),
};
vi.mock("../lib/database", () => ({ db: mockDb }));

vi.mock("../lib/auth", () => ({
  validateToken: vi.fn(async (token) => {
    if (token === "valid") return { valid: true, userId: "user_1" };
    return { valid: false };
  }),
}));

// Reset between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

### What Makes a Good API Service Mock Test

1. **Tests one behavior** — authentication, validation, success path, or error handling
2. **Uses real request/response** — not calling internal functions directly
3. **Mocks only external boundaries** — database, auth service, external APIs
4. **Asserts on observable behavior** — status code, response body, side effects
5. **Traces to a TC** — comment links back to spec

### Wide Integration Tests for APIs

After service mocks verify logic, wide integration tests verify the deployed system works:

```typescript
// Integration test — runs against deployed staging
describe("Prompts API Integration", () => {
  const baseUrl = process.env.TEST_API_URL;
  let authToken: string;

  beforeAll(async () => {
    authToken = await getTestAuth();
  });

  test("create and retrieve prompt round trip", async () => {
    const slug = `test-${Date.now()}`;

    // Create
    const createRes = await fetch(`${baseUrl}/api/prompts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompts: [{ slug, name: "Test", content: "Test" }] }),
    });
    expect(createRes.status).toBe(201);

    // Retrieve
    const getRes = await fetch(`${baseUrl}/api/prompts/${slug}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(getRes.status).toBe(200);
    expect((await getRes.json()).slug).toBe(slug);

    // Cleanup
    await fetch(`${baseUrl}/api/prompts/${slug}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
  });
});
```

**When to run:**
- Locally before merge
- Post-CD as deployment verification
- NOT on CI (too slow, requires deployed environment)

---

## UI Testing (Lighter Section)

UI testing follows the same service mock philosophy but with more friction. The "entry point" is less clear, browser APIs complicate mocking, and visual/UX correctness can't be verified programmatically.

**Same ideals, messier execution.** UI tests can't match API test confidence. Aim for behavioral coverage, then rely on gorilla testing for visual/UX verification.

### The Principle Applied to UI

Mock at the API layer (fetch calls, API client). Let UI framework internals (state, hooks, DOM updates) run for real. Test user interactions and their effects.

```
UI Code
┌─────────────────────────────────────────────────────┐
│  User Interaction (click, type, submit)             │ ← Simulate here
│         ↓                                           │
│  Component logic, state, framework internals        │ ← Runs for real
│         ↓                                           │
│  API calls (fetch, client library)                  │ ← Mock here
└─────────────────────────────────────────────────────┘
```

### HTML/JS (No Framework)

For plain HTML with JavaScript, use jsdom to load templates and test behavior:

```typescript
import { JSDOM } from "jsdom";

describe("Prompt Editor", () => {
  let dom: JSDOM;
  let fetchMock: vi.Mock;

  beforeEach(async () => {
    dom = await JSDOM.fromFile("src/prompt-editor.html", { runScripts: "dangerously" });
    fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => ({ id: "new_id" }) }));
    dom.window.fetch = fetchMock;
  });

  // TC-3: Submit valid form creates prompt
  test("submitting form calls POST /api/prompts", async () => {
    const doc = dom.window.document;
    doc.getElementById("slug").value = "new-prompt";
    doc.getElementById("name").value = "New Prompt";
    doc.getElementById("prompt-form").dispatchEvent(new dom.window.Event("submit"));

    await new Promise((r) => setTimeout(r, 50));

    expect(fetchMock).toHaveBeenCalledWith("/api/prompts", expect.objectContaining({ method: "POST" }));
  });
});
```

### React / Component Frameworks

Same principle — mock API layer, let framework run for real:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock API layer, NOT hooks or components
vi.mock("@/api/promptApi");

describe("PromptList", () => {
  // TC-7: displays prompts when loaded
  test("renders prompt list from API", async () => {
    mockPromptApi.getAll.mockResolvedValue([{ id: "1", name: "Prompt 1" }]);

    render(<PromptList />);

    await waitFor(() => {
      expect(screen.getByText("Prompt 1")).toBeInTheDocument();
    });
  });

  // TC-8: shows error on failure
  test("displays error when API fails", async () => {
    mockPromptApi.getAll.mockRejectedValue(new Error("Failed"));

    render(<PromptList />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### E2E for Critical Paths (Playwright)

E2E tests serve as wide integration for UI — verify the full deployed stack works:

```typescript
test("user can create and view prompt", async ({ page }) => {
  await page.goto("/prompts");
  await page.click('[data-testid="new-prompt-button"]');
  await page.fill('[data-testid="slug-input"]', "e2e-test");
  await page.fill('[data-testid="name-input"]', "E2E Test");
  await page.click('[data-testid="submit-button"]');

  await expect(page).toHaveURL(/\/prompts\/e2e-test/);
  await expect(page.getByText("E2E Test")).toBeVisible();
});
```

Run locally and post-CD, not on CI.

### UI Testing Limitations

**Acknowledge the gap:** UI testing cannot match API testing confidence. Visual correctness, UX polish, interaction feel — not verifiable programmatically.

Plan for more gorilla testing. Plan for iterative polish. The GORILLA phase exists partly for this.

---

## CLI Testing

For CLI tools, the entry point is the command handler. The same service mock principle applies: test at the entry point, exercise internal modules through it, mock only at external boundaries (filesystem, network, child processes).

### The Principle Applied to CLI

```
CLI Code
┌─────────────────────────────────────────────────────┐
│  Command handler (yargs, commander, etc.)           │ ← Test here
│         ↓                                           │
│  Internal orchestration (executors, managers)        │ ← Exercised, not mocked
│         ↓                                           │
│  Pure algorithms (parsing, transforming)             │ ← Can test directly (no mocks needed)
│         ↓                                           │
│  Filesystem / network / child processes             │ ← Mock here
└─────────────────────────────────────────────────────┘
```

| Layer | Mock? | Why |
|-------|-------|-----|
| Command handler | Test here | Entry point |
| Internal orchestration (executors, managers) | Don't mock | Exercise through command |
| Pure algorithms (no IO) | Can test directly | No mocking needed, supplemental coverage |
| Filesystem / network / child processes | Mock | External boundary |

### Correct Structure

```
tests/
├── commands/              # Entry point tests (primary coverage)
│   ├── edit-command.test.ts    # Full edit flow, mocks filesystem
│   ├── clone-command.test.ts   # Full clone flow, mocks filesystem
│   └── list-command.test.ts    # Full list flow, mocks filesystem
└── algorithms/            # Pure function tests (supplemental)
    └── tool-call-remover.test.ts  # No mocks, edge case coverage
```

### Anti-Pattern

```
tests/
├── edit-operation-executor.test.ts  # ❌ Internal module with mocked fs
├── backup-manager.test.ts           # ❌ Internal module with mocked fs
├── tool-call-remover.test.ts        # ✓ Pure algorithm, ok
└── edit-command.test.ts             # ✓ Entry point, ok
```

The anti-pattern tests internal modules in isolation with mocked dependencies. This hides integration bugs between your own components — exactly what service mocks avoid. An agent seeing API and UI examples ("test the route handler," "test the component") will pattern-match to "test the executor, test the manager" unless given explicit CLI guidance.

---

## Convex Testing

Convex functions are serverless handlers. Same service mock principle — mock external boundaries, test the function directly:

```typescript
describe("withApiKeyAuth wrapper", () => {
  beforeEach(() => {
    process.env.CONVEX_API_KEY = "test_key";
  });

  test("validates API key and calls handler", async () => {
    const handler = vi.fn(async (ctx, args) => ({ userId: args.userId }));
    const wrapped = withApiKeyAuth(handler);

    const result = await wrapped({}, { apiKey: "test_key", userId: "user_1" });

    expect(result.userId).toBe("user_1");
    expect(handler).toHaveBeenCalled();
  });

  test("rejects invalid API key", async () => {
    const wrapped = withApiKeyAuth(vi.fn());

    await expect(wrapped({}, { apiKey: "wrong", userId: "user_1" })).rejects.toThrow("Invalid");
  });
});
```

---

## TC Traceability

Every test must trace to a Test Condition from the Epic. This is the Confidence Chain in action.

### In Test Code

```typescript
describe("POST /api/prompts", () => {
  // TC-1: requires authentication
  test("returns 401 without auth token", async () => { ... });

  // TC-2: validates slug format
  test("returns 400 with invalid slug", async () => { ... });
});
```

### In Test Plan

| TC ID | Test File | Test Name | Status |
|-------|-----------|-----------|--------|
| TC-1 | createPrompts.test.ts | returns 401 without auth token | Passing |
| TC-2 | createPrompts.test.ts | returns 400 with invalid slug | Passing |

**Rules:**
- TC ID in comment or test name
- Every TC from spec must have at least one test
- Can't write a test? TC is too vague — return to spec

---

## Anti-Patterns

### Asserting on NotImplementedError

```typescript
// ❌ Passes before AND after implementation
it("throws not implemented", () => {
  expect(() => createPrompt(data)).toThrow(NotImplementedError);
});

// ✅ Tests actual behavior
it("creates prompt and returns ID", async () => {
  const result = await createPrompt(data);
  expect(result.id).toBeDefined();
});
```

### Over-Mocking

```typescript
// ❌ Mocking your own code hides bugs
vi.mock("../hooks/useFeature");
vi.mock("../components/FeatureList");

// ✅ Mock only external boundaries
vi.mock("../api/featureApi");
```

### Testing Implementation Details

```typescript
// ❌ Internal state
expect(component.state.isLoading).toBe(true);

// ✅ Observable behavior
expect(screen.getByTestId("loading")).toBeInTheDocument();
```

---

## Test Organization

```
tests/
├── service/           # Service mock tests (primary)
│   ├── api/
│   │   └── prompts.test.ts
│   └── ui/
│       └── prompt-editor.test.ts
├── integration/       # Wide integration tests
│   ├── api.test.ts
│   └── ui.test.ts
└── fixtures/
    └── prompts.ts
```

Track running totals across stories. Previous tests must keep passing — regression = stop and fix.
