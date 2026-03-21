# Product Requirements Document

**Purpose:** Shape product direction into a structured PRD with epic breakdown — the upstream artifact that feeds the full Liminal Spec pipeline.

A PRD defines what you're building, who it's for, and how the work decomposes into epics. It is the planning artifact: enough detail to scope, sequence, and prioritize the work, without crossing into the line-level precision that belongs in the epic phase. Feature sections are shaped like lightweight epics — user context, scope, and rolled-up acceptance criteria — but stop short of line-level ACs, test conditions, and data contracts.

This document is the upstream input for epic authoring. Downstream, `ls-epic` expands each feature section into a full epic with traceable ACs, TCs, contracts, and story breakdowns.

---

## On Load

This skill produces a **PRD**, a **Technical Architecture document**, or **both**.

These are grouped because product framing and architecture decisions often inform each other — epic boundaries depend on technical seams, and architecture choices depend on product scope. Ask the user what they need:

- **PRD only** — product context, features as lightweight epics, sequencing
- **Tech Architecture only** — core stack, system shape, major boundaries, key decisions
- **Both** (recommended for new products) — developed together, delivered as two distinct documents

If the user already has one of these, offer to use it to shape the other.

If the user provides requirements, a brief, prior research, or context about what they want to build — use that as the starting input. If they don't have that, interview them: What are you building? Who is it for? What problem does it solve? What's the rough scope? What technical constraints exist? Get enough to start shaping — you don't need everything upfront, but you need enough to avoid writing fiction.

---

## Altitude

The PRD operates at a specific altitude. Understanding where it sits prevents both over-specifying (doing ls-epic's job) and under-specifying (producing a vague wishlist).

**PRD altitude (50,000 ft → 30,000 ft):**
- Product vision and problem grounding
- User profiles with mental models
- Feature scope boundaries (in/out)
- Rolled-up acceptance criteria (prose paragraphs describing behavior, not numbered line-item ACs)
- Architecture summary (system shape, stack, boundaries — not implementation)
- Epic sequencing with milestones
- Cross-cutting decisions that constrain downstream work

**What the PRD does NOT contain** (these belong downstream):
- Line-level acceptance criteria (ls-epic)
- Test conditions (ls-epic)
- Data contracts / API shapes (ls-epic)
- Story breakdowns with AC mapping (ls-epic)
- Implementation architecture, module design, interfaces (ls-tech-design)
- Feature-specific library choices, directory structures, database schemas (ls-tech-design)
  (Core stack choices — frameworks, runtimes, data layers — belong in the architecture summary or tech arch document)

The hardest boundary to hold is between rolled-up ACs and line-level ACs. A rolled-up AC reads like: "The user can save the current root as a workspace. Saved workspaces persist across sessions, show the full path on hover, and can be removed." A line-level AC reads like: "AC-1.3: Workspace entries display the full filesystem path as a tooltip on mouse hover." The PRD uses the first form. ls-epic produces the second.

---

## Product Context

The product context is the framing that every downstream epic inherits. Write it once here; don't repeat it in each feature section.

### Product Vision

What this product is, what it does, and why it exists. Not a mission statement — a concrete description of the product and its place in the world. If it connects to other tools or a broader ecosystem, describe the relationships and clarify what's v1 scope vs future direction.

### User Profile

Same structure as the epic-level user profile, but scoped to the whole product:

- **Primary User:** Role and defining characteristic
- **Context:** When and why they reach for this product
- **Mental Model:** How they think about the task (in their words, not yours)
- **Key Constraint:** The environmental or technical reality that shapes the product
- **Secondary User** (if applicable): Other users who benefit but aren't the primary design target

The user profile grounds every feature section. If a feature doesn't trace back to something the primary user needs, question whether it belongs.

### Problem Statement

What's wrong today. What the user can't do, or can only do badly. Concrete, specific, not abstract. This is the "why" that justifies the product's existence.

### Product Principles

Design values that guide decisions throughout the product. Not generic ("user-friendly") — specific to this product's tradeoffs ("good defaults over configuration," "local-first," "keyboard-native"). These become the tiebreaker when feature decisions are ambiguous.

### Scope Boundary

Product-level in/out scope. What this release delivers and what it explicitly does not. This is different from per-feature scope — it's the product-wide boundary.

Include an **Assumptions** table for unvalidated beliefs the PRD depends on.

### Non-Functional Requirements

Cross-cutting constraints that apply across all features: responsiveness, startup time, memory behavior, reliability, security posture. These are product-level — individual features may override or refine them.

NFRs are easy to defer and expensive to discover late. Surface them here so architecture decisions account for them and epic writers know the constraints.

---

## Architecture Summary

A brief section in the PRD covering the system shape, stack, and deployment model. Enough to understand the technical context for scoping epics — not a full architecture document.

If the user is also producing a Tech Architecture document, this section is a concise summary with a pointer to the full document.

Content:
- System shape (monolith, client-server, services, etc.)
- Who owns what (server owns filesystem, client owns rendering, etc.)
- Core stack choices
- Deployment model
- Key constraints that affect feature scoping

This section answers: "What technical world are we building in?" It does not answer: "How do we build each part?" — that's tech design.

---

## Feature Sections (The Body)

Each feature maps to one downstream epic. A PRD typically contains 3-6 features/epics — enough to deliver meaningful product capability, scoped tightly enough that each epic is manageable. If you're at 8+, consider whether some features should be grouped or deferred. Feature sections are lightweight epics — same structural DNA, lower altitude.

### Feature Section Structure

```
## Feature N: [Name]

### Context
Why this feature matters in the sequence. What it builds on, what it enables.

### User Need
What the user wants to do that they can't do today (or can only do badly).

### In Scope
Concrete capabilities this feature delivers. Bullet list.

### Out of Scope
What's excluded, with pointers to which feature handles it if applicable.

### Rolled-Up Acceptance Criteria
Prose description of the expected behavior. Written as if describing the feature
to someone who will test it — specific enough to verify, general enough to leave
room for the epic phase to define precise ACs and TCs.

### Mockup/Reference Pointers (optional)
Pointers to mockups, wireframes, or reference material if available.
```

### Writing Good Feature Sections

**Context** should be 1-3 sentences explaining why this feature exists at this point in the sequence. "This is the foundation" or "After this, the app is usable daily" — positioning, not description.

**User Need** is the user's perspective, not the product's. "The user clicks a file and sees clean rendered markdown" not "The system renders markdown to HTML."

**In Scope** is a concrete list of capabilities. Each item should be specific enough that you could argue about whether it's done. "Mermaid diagram rendering (local, no remote services)" is good. "Rich content support" is too vague.

**Out of Scope** prevents scope creep. Every out-of-scope item should say where it's handled if it's planned elsewhere. "Mermaid editing (not planned)" vs "Code syntax highlighting (Epic 3)."

**Rolled-Up ACs** are the hardest section to get right. They should be:
- Specific enough that someone could test the behavior described
- General enough that the epic writer has room to decompose into precise ACs with TCs
- Written as user-observable behavior, not implementation statements
- Comprehensive enough that the epic scope is clear from reading them

A good rolled-up AC paragraph covers one flow or capability area. It reads naturally as prose, not as a bulleted checklist pretending to be prose.

### Common Feature Section Failures

**Feature wishlist:** A long list of capabilities with no user grounding, no scope boundary, and no sequencing rationale. Every feature should trace to the user profile and problem statement.

**Premature precision:** Numbered ACs with TC-like specificity. If you're writing "AC-1.3: Tooltip displays full path on hover with 200ms delay," you've crossed into ls-epic territory. Pull back to: "Workspace entries show the full path on hover."

**Vague scope:** "Handles errors appropriately" or "Supports common formats." These aren't testable even at the rolled-up level. Be specific about which errors, which formats.

**Missing out-of-scope:** If the feature's in-scope list is clear but out-of-scope is empty, either the feature has no boundaries or you haven't thought about them. Both are problems.

**Implementation leaking in:** "Uses React Query for caching" or "Stores state in SQLite." These are tech design decisions. The PRD says "Data is cached" and "State persists across sessions."

---

## Sequencing and Milestones

### Epic Sequencing

Show the dependency structure between features/epics. A simple text diagram works:

```
Epic 1: Foundation
    │
    ├──→ Epic 2: Core Capability
    │        │
    │        └──→ Epic 3: Enhanced Capability
    │
    └──→ Epic 4: Secondary Capability (can parallel Epic 2-3)
```

Include a brief rationale for the sequencing — why this order, where the parallelism opportunities are, and where the hard dependencies sit.

### Milestones

Map epics to milestones that represent feedback-gated phases. A milestone is a point where the product is usable enough to get real feedback.

| Milestone | After | What Exists | Feedback Point |
|-----------|-------|-------------|----------------|
| M1 | Epics 1+2 | [First usable state] | Yes — [what can be tested] |
| M2 | Epic 3 | [Enhanced state] | Yes — [what's new to test] |

Milestones matter because they define where to pause and validate assumptions before continuing. A PRD without milestones is a feature list — it has no delivery rhythm.

---

## Supporting Sections

### Cross-Cutting Decisions (if applicable)

Product-level decisions that affect multiple features. Content format conventions, UX design constraints, interaction patterns, naming conventions. These are product decisions that would otherwise get re-litigated in every epic. UX constraints are especially valuable here — toolbar layout, modal patterns, navigation conventions, and interaction standards that apply across the entire product.

If producing a tech architecture document, technical cross-cutting decisions (auth model, error handling, testing philosophy) go there instead. The PRD's cross-cutting section covers product and design decisions; the tech arch's covers technical ones.

Each decision should have enough rationale that a downstream epic writer understands not just what was decided, but why — so they don't accidentally undermine it.

### Future Directions (if applicable)

Things that aren't v1 scope but inform architecture and design decisions. Include them so downstream architects can leave room without building for them.

Be explicit: "These are future directions, not v1 scope. They inform architectural decisions but do not gate the initial feature set."

### Relationship to Downstream Specs

A brief note explaining how this PRD feeds into the spec pipeline. Each feature section maps to one epic. The PRD defines *what* and *why*. The epics define *exactly what* with traceability. The tech designs define *how*.

---

## Technical Architecture Document

If the user requested a tech architecture document (or both), produce it as a companion document. The tech architecture says **what technical world the epics must live inside.** It operates at 50,000 ft → 25,000 ft altitude — below the PRD's product framing but above tech design's implementation detail.

Without this document, epics get scoped against the wrong seams and tech designs re-litigate the same foundational decisions across every epic.

Use an advisory tone throughout — "recommended," "should," "the expected shape." The decisions are real and downstream should inherit them, but the rationale is what makes them stick. Models tend toward authoritative language by default; at this altitude, that creates an artificial sense of rigidity that discourages downstream designers from flagging legitimate exceptions.

### Architecture Thesis

One paragraph that captures the core architectural stance in plain language. This is the anchor for everything in the document. Example: "MD Viewer is a local-first client-server application. A single Fastify process serves both the API and static frontend. The server owns the filesystem; the client owns the interaction. Electron is an optional thin wrapper, not a core dependency."

If someone reads only this paragraph and nothing else, they should understand the system's fundamental shape.

### Core Stack

The decisions that constrain everything downstream. Not every dependency — the ones where the choice changes what patterns, APIs, and approaches are available.

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| Runtime | Node | 24 LTS | Long-term support, native fetch, stable ESM |
| Package manager | Bun | 1.3.9+ | Workspace support, fast installs |
| Web framework | Fastify | 5 | Local server, plugin ecosystem |
| Frontend | Vanilla HTML/CSS/JS | — | No build step for client, minimal dependencies |
| Styling | Tailwind | 4 | Utility-first, v4 CSS-native engine |
| Data layer | Convex | — | Reactive queries, serverless backend |
| Auth | WorkOS AuthKit | — | Enterprise SSO + social, hosted UI |
| Testing | Vitest | — | Bun-compatible, good mocking APIs |
| Lint + format | Biome | 2.x | Single tool, no ESLint + Prettier split |
| Build | tsc | — | Sufficient for SDK + CLI |
| CLI framework | citty | — | Lightweight, unjs ecosystem |
| Deployment | Docker + Fly.io | — | Container-based, easy preview environments |
| Cache/realtime | Redis | — | Session, drafts, pub/sub |

Not all categories apply to every project. Include what's relevant. The version matters when it changes available APIs or patterns (React 18 vs 19, Tailwind 3 vs 4, Node 22 vs 24).

### System Shape

What the system is, what the major runtime surfaces are, and who owns what:

- Is this a monolith, client-server, services + workers, plugin architecture?
- What are the major runtime boundaries?
- What talks to what?
- Where does state live?
- What is synchronous vs asynchronous?
- What is user-facing vs background?

This directly feeds the tech design's High Altitude (30,000 ft) System Context section. The tech arch establishes the world; the tech design places the epic's modules within it.

### Cross-Cutting Decisions

Decisions that affect multiple epics and would be expensive to reverse:

- Auth model and session management
- Error handling conventions
- State management approach
- Testing philosophy (TDD, mock strategy, integration approach)
- Extensibility posture (plugin system, hooks, or closed)
- Local vs cloud posture
- Security and trust model

Each decision needs:
- **The choice** — what was decided
- **The rationale** — why this and not the alternatives
- **The consequence** — what downstream work must respect

The rationale is what prevents re-litigation. A tech design that sees "Vanilla JS, not React" without knowing why might introduce React for "just this one component."

### Boundaries and Flows

Identify the major seams in the system and briefly sketch what crosses them. Not full API contracts — those belong in epics and tech design — but enough to understand the communication shape and the main request paths through the system.

Keep this light. A few boundaries with brief contract sketches (example endpoints, transport type) and a few key flows as 4-5 step sequences. The goal is orientation, not implementation — downstream writers need to know the seams and traffic paths, not the exact payloads.

### Constraints That Shape Epics

Technical realities that affect product scoping. "No runtime execution of stored scripts" changes what an epic about skill management can promise. "Local-first, no cloud dependencies" eliminates entire categories of solutions. These constraints should be visible to epic writers, not just tech designers.

### Open Questions for Tech Design

Questions that this document intentionally leaves open for the tech design phase. "Whether PDF export should use Playwright or a browser-print pipeline" is an implementation question that shouldn't be locked at the architecture level. Listing them explicitly prevents downstream designers from assuming the question was already settled.

### What Tech Architecture Does NOT Cover

- Implementation details for individual features (tech design)
- Module/component internal design (tech design)
- API contracts, interface definitions (tech design / epic)
- Database schemas, query patterns (tech design)
- Library-specific configuration (tech design)
- Test mapping, chunk plans, implementation sequences (tech design)

### Relationship to Downstream

Be explicit about the handoff:
- **What this document settles:** system shape, stack, boundaries, cross-cutting patterns, major decisions
- **What ls-epic settles:** functional requirements, ACs, TCs, data contracts, story breakdown
- **What ls-tech-design still decides:** module decomposition, interfaces, test mapping, implementation sequences

### Tech Architecture Template

```markdown
# [Product Name] — Technical Architecture

## Status

This document defines the technical architecture for [product name]. It
establishes the system shape, core stack, and foundational decisions that
all downstream epics and tech designs inherit.

---

## Architecture Thesis

[One paragraph: the core architectural stance in plain language. What the
system is, how it's shaped, who owns what. If someone reads only this,
they understand the fundamental shape.]

---

## Core Stack

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| Runtime | [choice] | [version] | [why] |
| Package manager | [choice] | [version] | [why] |
| Framework | [choice] | [version] | [why] |
| [continue as relevant] | | | |

---

## System Shape

[Major runtime surfaces, boundaries, ownership. What talks to what.
Where state lives. Sync vs async. User-facing vs background.]

---

## Boundaries and Flows

[Major seams with brief contract sketches. Key request paths as
short numbered sequences. Keep light — orientation, not implementation.]

---

## Cross-Cutting Decisions

### [Decision Area — e.g., Authentication]

**Choice:** [what was decided]
**Rationale:** [why]
**Consequence:** [what downstream work must respect]

### [Decision Area — e.g., Error Handling]

**Choice:** [what was decided]
**Rationale:** [why]
**Consequence:** [what downstream work must respect]

---

## Constraints That Shape Epics

- [Technical constraint and how it affects product scoping]
- [Another constraint]

---

## Open Questions for Tech Design

- [Question explicitly deferred to the tech design phase]
- [Another question]

---

## Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A1 | [Architecture-relevant assumption] | [Status] | [Notes] |

---

## Relationship to Downstream

- **This document settles:** [list]
- **Epic specs settle:** [list]
- **Tech design still decides:** [list]
```

---

## Validation Before Handoff

Before handing to the epic pipeline:

- [ ] User Profile grounds every feature (trace the connection)
- [ ] Problem Statement justifies the product (not just the features)
- [ ] Each feature has Context, User Need, In Scope, Out of Scope, and Rolled-Up ACs
- [ ] Rolled-Up ACs are specific enough to scope but general enough for epic expansion
- [ ] No line-level ACs, TCs, or data contracts (those belong in ls-epic)
- [ ] Epic sequencing has rationale, not just an ordered list
- [ ] Milestones define feedback-gated delivery phases
- [ ] NFRs are surfaced (not deferred to "later")
- [ ] Architecture summary establishes the technical world without crossing into tech design
- [ ] Cross-cutting decisions are documented so epics don't re-litigate them
- [ ] Out-of-scope items point to where they're handled if planned
- [ ] Future directions are clearly marked as non-v1

If producing a tech architecture document:
- [ ] Architecture thesis captures the system's fundamental shape in one paragraph
- [ ] Core stack table covers the decisions that constrain downstream work, with versions where they matter
- [ ] System shape establishes boundaries and ownership
- [ ] Boundaries and flows orient downstream writers on seams and request paths
- [ ] Cross-cutting decisions include choice, rationale, and consequence
- [ ] Constraints that affect epic scoping are explicit
- [ ] Open questions explicitly deferred to tech design (not left ambiguous)
- [ ] Relationship to downstream is clear (what this settles vs what epics and tech design settle)
- [ ] Stays at 50k-25k altitude (no module decomposition, interfaces, or test mapping)

**Self-review:**
- Read the feature sections as an epic writer would. Can you scope each epic from the rolled-up ACs? If not, the PRD isn't specific enough.
- Read the architecture summary as a tech lead would. Can you start designing without re-litigating foundational decisions? If not, the architecture isn't decisive enough.

---

## PRD Template

Use the following template when producing a PRD.

---

### Template Start

```markdown
# [Product Name] — Product Requirements Document

## Status

This PRD defines the product direction, feature scope, and epic sequencing for
[product name]. Feature sections are shaped like lightweight epics — user context,
scope, and rolled-up acceptance criteria — but stop short of line-level ACs and
test conditions. Those belong in the full epic specs that follow.

---

## Product Vision

[What this product is, what it does, why it exists. Concrete, not aspirational.
Include ecosystem context if applicable.]

---

## User Profile

**Primary User:** [Role and defining characteristic]
**Context:** [When and why they reach for this product]
**Mental Model:** "[How they think about the task — in their words]"
**Key Constraint:** [Environmental or technical reality]

---

## Problem Statement

[What's wrong today. Concrete, specific.]

---

## Product Principles

- **[Principle]**: [What it means for this product specifically]
- **[Principle]**: [What it means]

---

## Scope

### In Scope

[What this release delivers. Brief prose + bullet list of major capabilities.]

### Out of Scope

- [Product-level exclusion] ([reason or future reference])

### Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A1 | [Assumption] | [Unvalidated/Validated] | [Notes] |

---

## Non-Functional Requirements

[Cross-cutting constraints: responsiveness, startup, memory, reliability, security.
These apply across all features unless overridden.]

---

## Architecture Summary

[System shape, stack, deployment model, key boundaries.
Pointer to full tech architecture doc if applicable.]

---

## Milestones

| Milestone | After | What Exists | Feedback Point |
|-----------|-------|-------------|----------------|
| M1 | Epics N+M | [First usable state] | [What can be tested] |

---

## Feature 1: [Name]

### Context

[Why this feature matters at this point in the sequence.]

### User Need

[What the user wants to do.]

### In Scope

- [Capability]
- [Capability]

### Out of Scope

- [Excluded capability] ([which feature handles it, or "not planned"])

### Rolled-Up Acceptance Criteria

[Prose description of expected behavior. Specific enough to test against,
general enough for the epic phase to decompose into precise ACs and TCs.]

---

## Feature 2: [Name]

[Same structure as Feature 1]

---

## Cross-Cutting Decisions (if applicable)

[Product-level decisions affecting multiple features. Decision + rationale.]

---

## Future Directions (if applicable)

[Things that inform architecture but aren't v1 scope.]

---

## Recommended Epic Sequencing

[Dependency diagram + rationale]

---

## Relationship to Downstream Specs

This PRD is the upstream input for detailed epic specs. Each feature section
maps to one epic. The PRD defines *what* and *why*. The epics define *exactly
what* with traceability. The tech designs define *how*.

---

## Validation Checklist

- [ ] User Profile grounds every feature
- [ ] Problem Statement justifies the product
- [ ] Each feature has Context, User Need, Scope, and Rolled-Up ACs
- [ ] Rolled-Up ACs are specific enough to scope, general enough for epic expansion
- [ ] No line-level ACs, TCs, or data contracts
- [ ] Out-of-scope items point to where they're handled if planned
- [ ] Milestones define feedback-gated phases
- [ ] NFRs surfaced
- [ ] Architecture summary establishes technical world
- [ ] Cross-cutting decisions documented
- [ ] Epic sequencing has rationale
```

### Template End
