---
name: ls-story-tech
description: Add technical implementation sections to functional stories. Tech Lead maps ACs to implementation targets, test strategies, and verification criteria. Validates via consumer gate.
---

# Story Technical Enrichment

**Purpose:** Add technical implementation sections to functional stories. The Tech Lead takes stories with full acceptance criteria and enriches them with implementation targets, test mapping, verification criteria, and deviation tracking.

The output is a complete story -- functional sections authored by the BA/SM, technical sections authored by the Tech Lead. Two distinct halves, different owners, different sign-off authorities. The PO accepts from the functional half. The Tech Lead signs off from the technical half. The engineer serves both.

---

## Role: Tech Lead as Enricher and Validator

The Tech Lead operates in two capacities during this phase.

**As validator:** Before adding technical sections, verify that functional stories are complete and coherent. Can you identify implementation targets for every AC? Do stories align with the tech design's module boundaries? Are there functional gaps that would block technical enrichment?

If issues found, return to BA/SM for revision. Don't enrich incomplete stories.

**As enricher:** Once validated, add technical sections below the functional Definition of Done. These sections describe *what* to implement and *how to verify* -- not step-by-step instructions for *how* to implement. The engineer brings judgment and plan mode to the "how."

---

## Inputs

Technical enrichment draws from three sources:

| Source | What It Provides |
|--------|-----------------|
| **Functional stories** | Scope boundaries, ACs, TCs, error paths, functional DoD |
| **Tech Design** | Architecture, interfaces, module boundaries, TC-to-test mapping, verification scripts |
| **Epic** | Functional requirements, data contracts, user flows |

The functional stories tell you *which* ACs are in scope for each story. The tech design tells you *how* those ACs map to modules, interfaces, and tests. The epic provides the broader functional context when stories need clarification.

---

## The Technical Sections

Below the functional Definition of Done, add these sections. Together they form the technical half of the story.

### Architecture Context

Brief orientation -- what modules, components, or subsystems this story touches. Not a repeat of the tech design; a focused extract relevant to this story's scope. Enough for an engineer to know where to look before reading the full tech design.

```markdown
## Technical Implementation

### Architecture Context

This story covers the session creation route and Convex persistence layer.
Key modules: `src/routes/sessions.ts`, `src/services/session.service.ts`,
`src/clients/convex.client.ts`.

The session creation flow follows: Route handler -> service orchestration ->
Convex persistence -> response formatting. See Tech Design Flow 1 for the
full sequence diagram.
```

### Interfaces & Contracts

The specific interfaces from the tech design that this story implements or consumes. Not all interfaces -- just the ones relevant to this story's ACs. Include enough detail that an engineer knows the contract without reading the entire tech design.

```markdown
### Interfaces & Contracts

**Creates:**
- `SessionService.create(params: CreateSessionParams): Promise<Session>`
- Route handler: `POST /sessions` -> 201 with session ID

**Consumes:**
- `ConvexClient.insertSession(session: SessionRecord): Promise<Id<"sessions">>`

**Types (from Story 0):**
- `CreateSessionParams`, `Session`, `SessionRecord`
```

### TC to Test Mapping

The critical traceability link. Every TC from this story's functional section maps to a test approach. This section is derived from the tech design's TC-to-test mapping table, filtered to this story's scope.

```markdown
### TC -> Test Mapping

| TC | Test File | Test Description | Approach |
|----|-----------|------------------|----------|
| TC-1.1a | sessions.test.ts | creates session with valid params | Service mock: mock Convex client, assert route returns 201 |
| TC-1.1b | sessions.test.ts | rejects invalid session params | Service mock: send malformed body, assert 400 |
| TC-1.2a | sessions.test.ts | returns session ID in response | Service mock: verify response shape |
```

Every TC must appear in this table. If a TC has no test mapping, either the TC is untestable (return to BA/SM) or the tech design is missing a test boundary (return to Tech Lead self-review).

### Risks & Constraints

Implementation risks specific to this story. Not a general risk register -- specific things that could go wrong or require extra care during implementation.

```markdown
### Risks & Constraints

- Convex client connection timeout: fail fast with 503, do not retry in the request path
- Session ID generation must be collision-resistant (use CUID2, not UUID v4)
- This story does NOT implement session expiry -- that's Story 3
```

### Spec Deviation Field

A required field that documents any divergence between what the tech design specifies and what the story actually implements. Most stories have no deviations -- the field is still required, explicitly empty.

```markdown
### Spec Deviation

None. Story implementation aligns with Tech Design sections 3.1 and 3.2.
```

Or when deviations exist:

```markdown
### Spec Deviation

- Tech Design specifies Redis caching for session lookups. Deferred to Story 3
  per dependency sequencing. Session reads in this story go directly to Convex.
- Tech Design Flow 1 shows auth middleware. Auth is not in scope for Story 1;
  added in Story 2. Route is unprotected in this story.
```

Spec deviation is not a failure -- it's a transparency mechanism. The engineer and verifier need to know where this story's implementation intentionally differs from the tech design, and why.

### Technical Definition of Done

Concrete verification steps. Not "make sure it works" -- specific commands and expectations.

```markdown
## Technical Checklist

- [ ] All TCs have passing tests
- [ ] TypeScript compiles clean (`bun run typecheck`)
- [ ] Lint/format passes (`bun run lint && bun run format:check`)
- [ ] No regressions on prior stories (`bun test`)
- [ ] Verification: `bun run verify`
- [ ] Spec deviations documented (if any)
```

---

## Story Contract Requirements

Every story that completes technical enrichment must satisfy four non-negotiable requirements. These are the quality gate for this phase.

**1. TC to test mapping present.** Every TC in the story's functional section has a corresponding entry in the TC-to-test mapping table. Exception: Story 0 has no TCs (it's foundation setup), so it has no TC mapping. Story 0 gets simplified technical sections instead (see below).

**2. Technical DoD present.** The technical checklist includes specific verification commands and regression expectations. Not "tests pass" -- which tests, which commands, what counts as passing.

**3. Spec deviation field present.** Every story has a spec deviation field, even when empty. An empty field means "I checked and there are no deviations." A missing field means "I didn't check."

**4. Technical sections describe targets, not steps.** The Architecture Context names modules and flows. The Interfaces section names contracts. Neither prescribes the implementation sequence. The engineer decides how to get there -- the story describes where "there" is.

---

## Story 0: Technical Enrichment

Story 0 is foundation setup -- types, fixtures, error classes, project config. It has no TCs from the epic because it delivers no user-facing functionality. Technical enrichment for Story 0 is simplified:

```markdown
## Technical Implementation

### Architecture Context

Foundation setup for [feature name]. Creates type definitions, error classes,
test fixtures, and project configuration that all subsequent stories depend on.

### Types to Create

- `CreateSessionParams` (from Tech Design Low Altitude)
- `Session`, `SessionRecord` (from Tech Design Low Altitude)
- `SessionError` extends `AppError` (from Tech Design error contract)

### Config to Validate

- Test runner configured and passing empty suite
- Path aliases resolving
- Environment variables documented in `.env.example`

### Spec Deviation

None.

## Technical Checklist

- [ ] All type definitions from tech design created
- [ ] Error classes available
- [ ] Test fixtures match data contracts
- [ ] TypeScript compiles clean
- [ ] Project config validated
```

No TC-to-test mapping (no TCs). No Interfaces & Contracts section (types are the deliverable, not consumers of interfaces). The technical enrichment is lighter because the story's scope is lighter.

---

## The Consumer Gate

The ultimate validation for technically enriched stories: **Could an engineer implement from this story without asking clarifying questions?**

This is not a rhetorical question. Apply it literally:

- Does the story tell the engineer which modules to create or modify?
- Does the TC-to-test mapping tell them what tests to write?
- Does the technical DoD tell them how to verify their work?
- Does the spec deviation field tell them where this story intentionally diverges from the tech design?
- Are there ambiguities that would force the engineer to choose between interpretations?

If the answer to the last question is "yes," the story needs more detail in the technical sections. If the engineer would need to read the full tech design to understand what to build, the Architecture Context is too thin. If the engineer would need to derive test approaches from scratch, the TC-to-test mapping is incomplete.

The consumer gate is the quality bar. Stories that pass it are ready for implementation.

---

## Coherence Check Against Tech Design

After enriching all stories, verify completeness against the tech design:

**Interface coverage:** Every interface defined in the tech design's Low Altitude section should appear in at least one story's Interfaces & Contracts section. An interface with no story assignment is either dead code in the design or a gap in the story breakdown.

**Module coverage:** Every module from the tech design's Module Responsibility Matrix should appear in at least one story's Architecture Context. A module with no story is either unnecessary or missing from the sharding.

**Test mapping coverage:** The union of all stories' TC-to-test mapping tables should cover every TC from the epic. Compare against the coverage gate table from the functional story sharding phase.

Build a cross-story coverage summary:

| Tech Design Element | Type | Story | Notes |
|---|---|---|---|
| SessionService | Module | Story 1, Story 2 | Created in S1, extended in S2 |
| ConvexClient | Module | Story 1 | |
| AuthMiddleware | Module | Story 2 | |
| Session type | Interface | Story 0 | Foundation |
| ... | ... | ... | ... |

Gaps in this table are blockers. Every element in the tech design should have a home.

---

## Common Failure Modes

**Steps masquerading as targets.** The technical section says "1. Create the route file. 2. Add the handler function. 3. Wire to the service." This prescribes implementation sequence. Instead: "Route handler at POST /sessions delegates to SessionService.create(). Returns 201 with session ID." The engineer decides the sequence.

**Missing TC mappings.** The functional section has 8 TCs but the mapping table has 5 entries. Three TCs have no test approach. This either means the tech design doesn't cover them (design gap) or the enrichment was hasty (enrichment gap). Either way, the story isn't ready.

**Vague DoD.** "Tests pass" is not a technical DoD. Which verification command? What does "pass" mean -- zero failures, or zero failures in this story's test files? Does "no regressions" mean running the full suite or just prior stories? Specificity prevents ambiguity during verification.

**Rubber-stamped spec deviation.** Every story says "None." without evidence of checking. The spec deviation field exists to force the Tech Lead to compare each story against the tech design and explicitly document alignment or divergence. If every story is "None." with no reference to which tech design sections were checked, the field is being rubber-stamped rather than used.

**Over-prescribing Story 0.** Story 0 doesn't need TC-to-test mapping because it has no TCs. Adding artificial "test the types compile" TCs to Story 0 creates busy work. The exit criteria are simpler: types exist, fixtures exist, config works, it compiles.

---

## Output: Complete Stories

After technical enrichment, each story contains:

**Functional half (BA/SM authored, PO accepts):**
- Objective, Scope, Dependencies
- Acceptance Criteria with full TCs
- Error Paths
- Definition of Done (functional)

**Technical half (Tech Lead authored, Tech Lead signs off):**
- Architecture Context
- Interfaces & Contracts
- TC to Test Mapping
- Risks & Constraints
- Spec Deviation
- Technical Checklist

These complete stories are the sole implementation artifact. Engineers receive them, form an implementation plan, and execute. No prompt packs, no orchestration scripts, no intermediate artifacts between the story and the code.

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

1. **TC-to-test mapping present** -- every TC mapped to a test approach
2. **Technical DoD present** -- specific verification commands
3. **Spec deviation field present** -- even when empty
4. **Targets, not steps** -- technical sections describe what, not how

Consumer gate: could an engineer implement from this story without clarifying questions?

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
| Tech Design | Tech Lead self-review | BA/SM (needs it for story sharding) + Tech Lead (needs it for technical sections) |
| Functional Stories | BA/SM self-review | Tech Lead (needs them for technical enrichment) |
| Complete Stories | Tech Lead self-review | Engineer (needs them for implementation) |

### Why This Works

1. **Author review** -- Catches obvious issues, forces author to re-read
2. **Consumer review** -- Downstream consumer knows what they need from the artifact
3. **Different model** -- Different strengths catch different issues. Use adversarial/diverse perspectives for complementary coverage.
4. **Fresh context** -- No negotiation baggage, reads artifact cold

### The Key Pattern: Author + Downstream Consumer

If the Tech Lead can't build a design from the epic -> spec isn't ready.
If the BA/SM can't shard stories from tech design -> design isn't ready.
If the Tech Lead can't add technical sections to stories -> stories aren't ready.
If the Engineer can't implement from complete stories -> stories aren't ready.

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

### Before Story Sharding

- [ ] Tech Design complete (all altitudes: system context, modules, interfaces)
- [ ] Tech Lead self-review done (completeness, richness, writing quality, readiness)
- [ ] Model validation complete (different model for diverse perspective)
- [ ] All issues addressed (Critical, Major, and Minor)
- [ ] Validation rounds complete (no substantive changes remaining)
- [ ] TC -> Test mapping complete (every TC from epic maps to a test)
- [ ] BA/SM validated: can shard stories from this
- [ ] Human reviewed structure and coverage

### Before Implementation

- [ ] Functional stories complete (all ACs/TCs assigned, integration path traced)
- [ ] Technical enrichment complete (all four story contract requirements met)
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

## Verification Prompt

# Story Technical Enrichment Verification Prompt

Use this prompt template to have an agent critically review technically enriched stories before handing off to Implementation (Phase 5).

---

## Prompt Template

**Critical Review: [Feature Name] Story Technical Enrichment**

You are reviewing technically enriched stories for [brief description]. This is Phase 4b (Story Technical Enrichment) of a Liminal Spec pipeline. The downstream consumer is an engineer who needs to implement from these stories using TDD discipline and plan mode.

**Step 1: Load liminal-spec Skill Context**

Read these files to understand the methodology and evaluation criteria:

1. **Core methodology:** `~/.claude/skills/liminal-spec/SKILL.md`
2. **Story technical enrichment guidance:** the Story Technical Enrichment section inside `~/.claude/skills/liminal-spec/SKILL.md`
3. **Implementation guidance:** the Implementation section inside `~/.claude/skills/liminal-spec/SKILL.md`

**Step 2: Review These Files**

1. **Stories (primary):** `[path to stories directory]`
2. **Tech Design (for alignment):** `[path to tech-design.md]`
3. **Epic (for AC/TC completeness):** `[path to epic.md]`

**Step 3: Evaluation Criteria**

Assess each technically enriched story against these criteria:

1. **Story Contract Compliance**
   - Does every story have all four required elements? (TC-to-test mapping, technical DoD, spec deviation field, targets-not-steps)
   - Is Story 0 appropriately simplified (no TC mapping, types/config focus)?
   - Are technical sections below the functional DoD boundary?

2. **TC to Test Mapping Completeness**
   - Does every TC in the story's functional section have a corresponding entry in the TC-to-test mapping table?
   - Are test approaches appropriate for what's being verified (service mock vs integration, assertion strategy)?
   - Are test file names specific and consistent with the tech design?

3. **Interface Coverage**
   - Are all interfaces from the tech design's Low Altitude section assigned to at least one story's Interfaces & Contracts section?
   - Are all modules from the tech design's Module Responsibility Matrix represented across story Architecture Context sections?
   - Any tech design interfaces with no story assignment?

4. **Targets vs Steps**
   - Do technical sections describe what to build (modules, interfaces, contracts) rather than how to build it (step-by-step instructions)?
   - Does the Architecture Context name modules and flows without prescribing implementation sequence?
   - Could an engineer reasonably choose a different implementation order and still satisfy the story?

5. **DoD Specificity**
   - Are verification commands concrete (`bun run verify`, not "run tests")?
   - Does the technical checklist include regression expectations?
   - Is spec deviation documentation included as a checklist item?

6. **Spec Deviation Accuracy**
   - Does the spec deviation field reference specific tech design sections that were checked?
   - When deviations exist, is the rationale clear and the scope bounded?
   - Are "None." entries credible (do they appear to reflect actual checking, not rubber-stamping)?

7. **Consumer Gate**
   - Could an engineer implement from this story without asking clarifying questions?
   - Is the Architecture Context sufficient to orient an engineer in the codebase?
   - Is the TC-to-test mapping sufficient to write tests without deriving approaches from scratch?

**Step 4: Report Format**

Provide your review in this structure:

```
## Overall Assessment
[READY / NOT READY] for Implementation

## Strengths
[What the technical enrichment does well]

## Issues

### Critical (Must fix before Implementation)
[Issues that would block an engineer from implementing]

### Major (Should fix)
[Issues that would cause confusion or rework during implementation]

### Minor (Fix before handoff)
[Polish items -- address these too, not just blockers]

## Missing Elements
[Anything that should be present but isn't]

## Cross-Story Gaps
[Interface or module coverage gaps across the story set]

## Recommendations
[Specific fixes, in priority order]

## Questions for the Tech Lead
[Clarifying questions that would improve the technical sections]
```

Be thorough and critical. The goal is to catch issues before they surface during implementation, where they're more expensive to fix.

**Step 5: Cross-Story Coverage Table**

As part of your review, produce a coverage table mapping tech design elements to stories:

```
| Tech Design Element | Type | Assigned Story | Coverage Notes |
|---|---|---|---|
| SessionService | Module | Story 1, Story 2 | Created in S1, extended in S2 |
| AuthMiddleware | Module | Story 2 | |
| Session type | Interface | Story 0 | Foundation |
| TC-1.1a | Test Mapping | Story 1 | Service mock approach |
| TC-2.1a | Test Mapping | Story 2 | Missing test file assignment |
```

This table makes gaps immediately visible. If a tech design element has no story assignment, or a TC has no test mapping, flag it.

---

## Usage Notes

- Run this with a verification-oriented model (detail-oriented models recommended for thoroughness)
- Can also run with multiple agents in parallel for diverse perspectives
- Compare the cross-story coverage table against the epic's AC/TC table for full chain coverage
- Critical and Major issues should be addressed before Implementation handoff
- The engineer will also validate implicitly during implementation -- if they can't implement from the story, it goes back
