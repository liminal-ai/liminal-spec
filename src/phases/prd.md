# Product Requirements Document

**Purpose:** Produce compressed proto-epics across 3-8 features — the upstream product artifact that seeds automated epic expansion through the full Liminal Spec pipeline. The companion technical architecture document is produced separately by `ls-arch`.

Each feature section is a higher-altitude echo of an epic: user scenarios, numbered acceptance criteria ranges, and scope boundaries — structured so that an epic-writing agent can expand each one into a full epic (line-level ACs, TCs, data contracts, story breakdown) without the human needing to re-engage at the same depth. The human's intensive involvement is front-loaded here. Everything downstream builds from what this document settles.

---

## On Load

This skill produces a **PRD** — product context, features as scenario-driven proto-epics, sequencing, and milestones. Each feature section must be rich enough that downstream agents can produce full epic specs from it with minimal human re-engagement.

The companion **Technical Architecture document** is produced separately by `ls-arch`. For new products, run both — the PRD establishes what to build and why, the tech arch establishes what technical world it gets built in. Epic boundaries depend on technical seams, and architecture choices depend on product scope, so these two documents inform each other.

If the user provides requirements, a brief, prior research, or context about what they want to build — use that as the starting input. If they don't have that, interview them: What are you building? Who is it for? What problem does it solve? What's the rough scope? What technical constraints exist? Get enough to start the conversation — you don't need everything upfront, but you need enough to avoid writing fiction. The intake bar is about when to begin shaping, not when the output is ready. The output bar is the consumer test: each feature section must survive downstream epic expansion without foundational questions.

---

## Altitude

The PRD operates at a specific altitude. Understanding where it sits prevents both over-specifying (doing ls-epic's job) and under-specifying (producing a vague wishlist).

**PRD altitude (50,000 ft → 30,000 ft):**
- Product vision and problem grounding
- User profiles with mental models
- Feature scope boundaries (in/out)
- User scenarios per feature (the user situations and workflows, not step-level flows)
- Numbered rolled-up acceptance criteria ranges organized under scenarios
- Architecture summary (system shape, stack, boundaries — not implementation)
- Epic sequencing with milestones
- Cross-cutting decisions that constrain downstream work

**What the PRD does NOT contain** (these belong downstream):
- Line-level acceptance criteria with individual TC coverage (ls-epic)
- Test conditions (ls-epic)
- Data contracts / API shapes (ls-epic)
- Story breakdowns with AC mapping (ls-epic)
- Implementation architecture, module design, interfaces (ls-tech-design)
- Feature-specific library choices, directory structures, database schemas (ls-tech-design)
  (Core stack choices — frameworks, runtimes, data layers — belong in the architecture summary or the tech arch document produced by ls-arch)

### The Rolled-Up AC Boundary

The hardest boundary to hold is between rolled-up ACs and line-level ACs. A three-way contrast:

**Too vague** (not decomposable — the epic writer has to invent the behavior):
> "The user can manage workspaces."

**Just right** (rolled-up — specific enough to decompose, general enough to leave room):
> "AC-1: The user can save the current root as a workspace. Saved workspaces persist across sessions, show the full path on hover, and can be removed. The workspace list updates immediately on add or remove."

**Too detailed** (line-level — this belongs in ls-epic):
> "AC-1.3: Workspace entries display the full filesystem path as a tooltip on mouse hover with a 200ms delay. AC-1.4: Removing a workspace triggers a confirmation dialog before deletion."

The PRD uses the middle form. Each rolled-up AC is numbered and anchored to a scenario, covering a coherent cluster of behavior that ls-epic will later decompose into individual line-level ACs with test conditions.

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

If a Tech Architecture document exists or will be produced by `ls-arch`, this section is a concise summary with a pointer to the full document.

Content:
- System shape (monolith, client-server, services, etc.)
- Who owns what (server owns filesystem, client owns rendering, etc.)
- Core stack choices
- Deployment model
- Key constraints that affect feature scoping

This section answers: "What technical world are we building in?" It does not answer: "How do we build each part?" — that's tech design.

---

## Feature Sections (The Body)

Each feature maps to one downstream epic. A PRD typically contains 3-8 features/epics. If you're above 8, consider whether some features should be grouped or deferred.

Feature sections are higher-altitude epics — same structural DNA, different altitude. Where an epic organizes around detailed flows with line-level ACs and TCs, a feature section organizes around user scenarios with numbered rolled-up AC ranges. The structure mirrors the epic so that downstream expansion is decomposition, not invention.

### Choosing Feature Boundaries

Each feature maps to one downstream epic. The boundary between features is one of the highest-leverage decisions in the PRD — bad boundaries produce awkward epics that are either too broad to manage or too tangled to implement independently.

**Good feature boundaries share these traits:**
- **User workflow boundary** — different user situation, different context, or a natural pause point in the user's work
- **System capability boundary** — one coherent domain (read vs write, one data surface, one integration)
- **Delivery boundary** — can ship independently and reach a feedback point without other features completing first
- **Manageable epic scope** — 2-4 scenarios, roughly 5-15 rolled-up ACs. If a feature has 5+ scenarios or would need 20+ ACs, it's probably two features

**Signs a feature should be split:**
- Multiple distinct user profiles or contexts within one feature
- Scenarios that don't share data, state, or user context with each other
- The feature can't ship without another feature also shipping (entanglement, not dependency)

**Signs features should be merged:**
- Two features that share all scenarios and differ only in scope depth
- A feature so small it would produce a 1-2 story epic with minimal ACs

Don't over-optimize boundaries upfront. Get them roughly right, then refine as scenarios and ACs surface natural seams during drafting.

### Feature Section Structure

```
## Feature N: [Name]

### Feature Overview
What the user can do after this feature ships. Why it matters in the sequence —
what it builds on, what it enables. 1-3 sentences of positioning, then the
capability description.

### Scope

#### In Scope
- Concrete capability
- Concrete capability

#### Out of Scope
- Excluded capability (which feature handles it, or "not planned")

### Scenarios

#### Scenario 1: [Name — the user situation]
Prose description of this user scenario — when it applies, what the user is
trying to accomplish, what the system does in response. High-level steps if
the scenario is sequential, but broader than epic-level flow steps.

**AC-1:** [Rolled-up criterion covering a coherent cluster of behavior]
**AC-2:** [Another rolled-up criterion under this scenario]

#### Scenario 2: [Name]
[Same pattern]

**AC-3:** [Criterion]
**AC-4:** [Criterion]

### Reference Pointers (optional)
Pointers to mockups, wireframes, or reference material if available.
```

### The Confidence Chain Starts Here

Rolled-up ACs in the PRD are the seed material for the full confidence chain: AC → TC → Test → Implementation. Each rolled-up AC will be decomposed by the epic writer into line-level ACs, each with test conditions, each mapping to tests, each driving implementation.

This means the quality of the rolled-up ACs directly determines the quality of everything downstream. Thin, vague criteria force the epic writer to invent behavior the PRD should have established. Strong criteria give the epic writer material to decompose rather than create.

**The drafting discipline:** Think one layer down. For each rolled-up AC, consider what the line-level ACs would be. Then compress back up into the rolled-up form. This produces criteria that are specific enough to decompose but general enough to leave room for the epic phase. Writing directly at the rolled-up level without thinking through the decomposition tends to produce vague, untestable criteria.

### Writing Good Feature Sections

**Feature Overview** opens with why this feature exists at this point in the sequence — positioning, not description. Then describes what the user can do. "This feature is the foundation — after it ships, the app is usable for daily reading. The user opens any markdown file and sees clean rendered content with working links, code highlighting, and basic navigation."

**Scope** prevents scope creep. In-scope items should be specific enough to argue about. "Mermaid diagram rendering (local, no remote services)" is good. "Rich content support" is too vague. Every out-of-scope item should say where it's handled if planned elsewhere. "Mermaid editing (not planned)" vs "Code syntax highlighting (Feature 3)."

**Scenarios** are the core of the feature section. Each scenario describes a user situation — when the user encounters it, what they're trying to accomplish, and what happens. Scenarios are broader than epic-level flows: a single scenario here might expand into 2-3 flows in the epic. Name scenarios after the user situation ("First-time file browsing," "Returning to a saved workspace") not after system operations ("File rendering pipeline," "Workspace persistence layer").

**Rolled-up ACs** are numbered and anchored under their scenarios. Each AC covers a coherent cluster of related behavior. They should be:
- Specific enough that the epic writer can decompose into line-level ACs without inventing behavior
- General enough that the epic writer has room to define precise TCs
- Written as user-observable behavior, not implementation statements
- Comprehensive enough that the feature's scope is clear from reading the AC ranges alone

### Example: A Good Feature Section

```markdown
## Feature 2: Workspace Management

### Feature Overview

After the foundation is usable for individual file reading, users need a way
to organize their work across multiple projects. This feature lets users save
filesystem roots as named workspaces and switch between them. It is the
transition from "file viewer" to "daily-use tool."

### Scope

#### In Scope
- Save the current root directory as a named workspace
- List, switch between, and remove saved workspaces
- Workspace state persists across application restarts
- Show full filesystem path for each workspace on hover

#### Out of Scope
- Workspace sharing or export (not planned)
- Per-workspace settings or configuration (Feature 5)
- Workspace search or filtering (Feature 4, if workspace count warrants it)

### Scenarios

#### Scenario 1: Saving and Switching Workspaces

The user has been browsing files in a project directory and wants to bookmark
it for quick return. They save the current root as a workspace, then later
switch to a different saved workspace and back.

**AC-1:** The user can save the current root as a named workspace. The
workspace list updates immediately. Duplicate names for different paths are
prevented. The workspace entry shows the short name and displays the full
filesystem path on hover.

**AC-2:** The user can switch between saved workspaces. Switching loads the
selected workspace's root directory and restores the file tree to that root.
The previously active workspace remains in the list.

#### Scenario 2: Managing the Workspace List

The user has accumulated several workspaces and needs to clean up. They
remove workspaces they no longer use and verify the list reflects the changes.

**AC-3:** The user can remove a saved workspace. Removal is immediate and
the list updates without requiring a refresh. Removing the currently active
workspace returns to the default root or prompts for a new selection.

#### Scenario 3: Persistence Across Sessions

The user closes the application and reopens it. Their saved workspaces are
still available, and the last active workspace is restored.

**AC-4:** Saved workspaces persist across application restarts. On launch,
the application restores the workspace list and re-opens the last active
workspace. If the last active workspace's path no longer exists, the
application shows the workspace list with an indicator that the path is
unavailable.
```

This example shows the target altitude. Each scenario describes a user situation. Each AC covers a cluster of behavior that the epic writer will decompose — AC-1 alone might expand into 3-4 line-level ACs with TCs for naming validation, duplicate prevention, hover display, and list update behavior. But the PRD doesn't go there. It establishes what happens; the epic establishes exactly how to verify it.

### Common Feature Section Failures

**Feature wishlist:** A list of capabilities with no user grounding, no scenarios, and no sequencing rationale. Every feature should trace to the user profile and problem statement. If you can't describe who does what and when, the feature isn't ready to write.

**Thin scenarios that force invention:** Scenarios that name the situation but don't describe what happens. "The user manages workspaces" is a label, not a scenario. The epic writer needs enough behavioral detail to decompose — not invent — the flows and ACs.

**Vague ACs:** "Handles errors appropriately" or "Supports common formats." These aren't decomposable. Be specific about which errors, which formats, what the user sees.

**Premature precision:** Individual line-level ACs with TC-like specificity. If you're writing "AC-1.3: Workspace entries display the full filesystem path as a tooltip on mouse hover with a 200ms delay," you've crossed into ls-epic territory. Pull back to the rolled-up form: a cluster of related behavior under one numbered AC.

**Missing out-of-scope:** If the in-scope list is clear but out-of-scope is empty, either the feature has no boundaries or you haven't thought about them. Both are problems.

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

If a tech architecture document exists or will be produced by `ls-arch`, technical cross-cutting decisions (auth model, error handling, testing philosophy) go there instead. The PRD's cross-cutting section covers product and design decisions; the tech arch's covers technical ones.

Each decision should have enough rationale that a downstream epic writer understands not just what was decided, but why — so they don't accidentally undermine it.

### Future Directions (if applicable)

Things that aren't v1 scope but inform architecture and design decisions. Include them so downstream architects can leave room without building for them.

Be explicit: "These are future directions, not v1 scope. They inform architectural decisions but do not gate the initial feature set."

### Relationship to Downstream Specs

A brief note explaining how this PRD feeds into the spec pipeline. Each feature section maps to one epic. The PRD defines *what* and *why*. The epics define *exactly what* with traceability. The tech designs define *how*.

---

## Validation Before Handoff

### Consumer Test (Critical)

Read each feature section as an epic-writing agent would. For each feature, ask: could I expand this into a full epic — flows, line-level ACs, TCs, scope boundaries — without needing to ask the human foundational questions?

**Foundational questions** mean the PRD failed: "What does the user actually do here?", "What's this feature supposed to accomplish?", "What scenarios does this cover?"

**Refinement questions** are healthy and expected: "Should this edge case be in scope?", "How should these two scenarios interact?", "What's the right error behavior when X happens?"

If a feature section would force foundational questions during epic expansion, it isn't ready.

### Structural Checklist

Before handing to the epic pipeline:

- [ ] User Profile grounds every feature (trace the connection)
- [ ] Problem Statement justifies the product (not just the features)
- [ ] Each feature has Feature Overview, Scope, and Scenarios with numbered ACs
- [ ] Scenarios describe user situations with enough behavioral detail to decompose into epic flows
- [ ] Rolled-up ACs are numbered, anchored under scenarios, and specific enough to decompose without invention
- [ ] No line-level ACs, TCs, or data contracts (those belong in ls-epic)
- [ ] Epic sequencing has rationale, not just an ordered list
- [ ] Milestones define feedback-gated delivery phases
- [ ] NFRs are surfaced (not deferred to "later")
- [ ] Architecture summary establishes the technical world without crossing into tech design
- [ ] Cross-cutting decisions are documented so epics don't re-litigate them
- [ ] Out-of-scope items point to where they're handled if planned
- [ ] Future directions are clearly marked as non-v1

**Self-review:**
- Read the feature sections as an epic writer would. Can you expand each feature into a full epic from the scenarios and ACs? If you'd need to ask foundational questions, the feature section isn't ready. If you'd only need refinement questions, it's doing its job.

---

## PRD Template

Use the following template when producing a PRD.

---

### Template Start

```markdown
# [Product Name] — Product Requirements Document

## Status

This PRD defines the product direction, feature scope, and epic sequencing for
[product name]. Each feature section is a compressed proto-epic: user scenarios,
numbered rolled-up acceptance criteria, and scope boundaries — structured for
downstream expansion into full epics with line-level ACs, TCs, and story
breakdowns.

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

### Feature Overview

[What the user can do after this feature ships. Why it matters in the sequence —
what it builds on, what it enables.]

### Scope

#### In Scope

- [Concrete capability]
- [Concrete capability]

#### Out of Scope

- [Excluded capability] ([which feature handles it, or "not planned"])

### Scenarios

#### Scenario 1: [User situation name]

[Prose description of this user scenario — when it applies, what the user is
trying to accomplish, what the system does. High-level steps if sequential.]

**AC-1:** [Rolled-up criterion covering a coherent cluster of behavior.
Specific enough to decompose into line-level ACs, general enough to leave
room for TCs.]

**AC-2:** [Another rolled-up criterion under this scenario.]

#### Scenario 2: [User situation name]

[Same pattern]

**AC-3:** [Criterion]

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
- [ ] Each feature has Feature Overview, Scope, and Scenarios with numbered ACs
- [ ] Scenarios describe user situations with enough detail to decompose into epic flows
- [ ] Rolled-up ACs are decomposable without the epic writer inventing behavior
- [ ] No line-level ACs, TCs, or data contracts
- [ ] Out-of-scope items point to where they're handled if planned
- [ ] Milestones define feedback-gated phases
- [ ] NFRs surfaced
- [ ] Architecture summary establishes technical world
- [ ] Cross-cutting decisions documented
- [ ] Epic sequencing has rationale
- [ ] Consumer test: each feature section can be expanded into a full epic
  without foundational questions about user intent or feature purpose
```

### Template End
