---
name: ls-research
description: Explore product direction and produce a PRD before feature scoping. Use when requirements are unclear, scope spans multiple features, or stakeholder alignment is needed.
---

# Product Research

**Purpose:** Transform a vision or rough idea into a Product Requirements Document (PRD) that scopes one or more features.

This phase is optional. Most work starts at Phase 2 (Epic) when the feature is already known.

Use Product Research when you need to:
- Explore product direction before committing to implementation.
- Align multiple stakeholders on what to build next.
- Scope several related features under one initiative.

Skip Product Research when:
- The feature is already defined.
- Scope is narrow and clear.
- You can go directly into a detailed Epic.

---

## Inputs and Outputs

| Item | Description |
|------|-------------|
| Input | Vision, problem statement, opportunity, or initiative idea |
| Output | PRD with feature candidates, scope boundaries, and success metrics |

The PRD is directional context. It informs Phase 2 but does not replace a detailed Epic.

---

## Workflow

### 1. Frame the Problem

Establish why this initiative exists:
- What user/business problem are we solving?
- Why now?
- What happens if we do nothing?

### 2. Define Users and Context

Identify the primary users and their working context:
- Primary persona(s)
- Current workflow and pain points
- Operational constraints

### 3. Draft Feature Candidates

Propose candidate features that solve the problem:
- Feature name
- Persona served
- High-level behavior
- Priority (must/should/nice)

### 4. Set Scope Boundaries

Make boundaries explicit:
- In scope
- Out of scope
- Assumptions and dependencies
- Key risks and open questions

### 5. Define Success Metrics

Specify measurable outcomes:
- User outcomes
- Business outcomes
- Operational/quality outcomes

### 6. Produce the PRD

Package the work into a single PRD artifact that can be reviewed and handed into Phase 2.

---

## PRD Template

```markdown
# Product Requirements Document: [Initiative Name]

## Vision
What problem are we solving? Why now?

## User Personas
Who are we building for? What are their goals and constraints?

## Initiative Scope

### In Scope
- [Capability/area]
- [Capability/area]

### Out of Scope
- [Excluded capability]
- [Future phase item]

## Feature Overview

### Feature 1: [Name]
**Persona:** [Who uses this]
**Summary:** [One paragraph]
**Key Flows:** [Bullets]
**High-Level ACs:** [Bullets]
**Priority:** Must-have | Should-have | Nice-to-have

### Feature 2: [Name]
...

## Architectural/Operational Considerations
Cross-cutting constraints, integration points, compliance, performance, security.

## Success Metrics
How we know this initiative worked.

## Risks and Open Questions
What could derail delivery and what must be resolved before implementation.
```

---

## PRD vs Epic

| PRD (Phase 1) | Epic (Phase 2) |
|---------------|----------------|
| Multi-feature initiative context | Single feature implementation contract |
| High-level acceptance outcomes | Detailed ACs + test conditions |
| Product alignment artifact | Engineering-ready requirements artifact |
| Directional | Traceable and testable |

---

## Handoff to Phase 2 (Epic)

For each feature selected for implementation:
1. Extract the feature from the PRD.
2. Expand it into a full Epic with AC/TC traceability.
3. Treat the Epic as the implementation source of truth.

The PRD remains context for "why"; the Epic governs "what must be built."

---

## Guidance for This Session

When running this phase:
- Ask enough questions to disambiguate goals, users, and boundaries.
- Keep recommendations concrete and prioritized.
- Call out assumptions explicitly.
- End with a complete PRD draft, ready for review.

If the user already has a clearly defined feature, recommend skipping to Phase 2 (`/ls-epic`).

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

## Reference: State Management

# State Management

Liminal Spec uses state files to maintain continuity across sessions and agents.

## Project State File

Location: `.sdd/state.json`

```json
{
  "project": "feature-name",
  "currentPhase": "tech-design",
  "status": "in-progress",
  "artifacts": {
    "functionalSpec": {
      "path": "./specs/feature.spec.md",
      "status": "complete",
      "acCount": 24,
      "tcCount": 89
    },
    "techDesign": {
      "path": "./specs/feature.tech-design.md",
      "status": "in-progress"
    },
    "workPlan": {
      "totalStories": 5,
      "completedStories": 0
    }
  },
  "testState": {
    "totalTests": 0,
    "passing": 0
  }
}
```

## State Transitions

```
NEW → SPEC_IN_PROGRESS → SPEC_COMPLETE →
DESIGN_IN_PROGRESS → DESIGN_COMPLETE →
BUILD_IN_PROGRESS → STORY_N_COMPLETE → ... →
BUILD_COMPLETE → VERIFIED
```

## Agent State Files

Each long-context agent maintains session state:

- `.sdd/product-research-state.md` — Product research (if used)
- `.sdd/epic-state.md` — Epic
- `.sdd/tech-design-state.md` — Tech design
- `.sdd/publish-epic-state.md` — Publish epic / story creation

### Agent State Structure

```markdown
# [Agent] State

## Current Work
- [What I'm doing]
- [Where I left off]

## Decisions Made
- [Key decisions this session]

## Open Questions
- [Unresolved items]

## Next Steps
- [What to do on resume]
```

## State Update Rules

### Update Before Compacts
When context window is filling:
1. Write current state to file
2. Note exact stopping point
3. Include any pending decisions

### Update After Major Milestones
- AC batch complete
- TC coverage complete
- Story complete
- Artifact complete

### Update on Interruption
If work is interrupted:
1. Save immediately
2. Note incomplete work
3. List what needs finishing

## Recovery Process

### After Session Reset

1. Read project state file
2. Determine current phase
3. Read agent-specific state
4. Load relevant artifacts
5. Resume from documented point

### After Context Compression

1. Check for summary quality
2. Read state files immediately
3. Verify understanding against artifacts
4. Continue or ask for clarification

## Artifact Handoffs

**Artifacts are the handoff mechanism.** No conversation state transfers between agents.

| From | To | Artifact |
|------|-----|----------|
| Product Research | Epic | PRD (if used) |
| Epic | Tech Design | Epic |
| Tech Design | Publish Epic | Tech Design doc |
| Publish Epic | Implementation | Business Epic + Story File |
| Implementation | Verification | Implementation + Test Results |

**Rule:** If it's not in an artifact, it doesn't exist for the next agent.

This is the core principle of context isolation. The artifact IS the handoff.

---

## Reference: Liminal Spec Terminology

# Liminal Spec Terminology

## Methodology

| Term | Definition |
|------|------------|
| **Liminal Spec** | Spec-driven development methodology. Full rigor or don't use it -- no "lite" versions. |
| **Confidence Chain** | AC -> TC -> Test -> Code. Every line traces back to a requirement. |
| **Context Isolation** | Using fresh agent contexts with artifact handoff instead of long conversations. NOT roleplay. |
| **Artifact** | A document that captures decisions and serves as handoff between agents. |
| **Verification Gradient** | Upstream artifacts get more scrutiny. Feature spec most, implementation least. |

## Phases (as Context Roles)

| Term | Definition |
|------|------------|
| **Agent** | A fresh context session that receives artifacts and produces artifacts. Means context isolation, not roleplay personas. |
| **Product Research** | Optional phase. Vision/idea -> PRD. Often skipped. |
| **Epic** | Creates Epic from requirements. The linchpin -- most scrutiny here. |
| **Tech Design** | Creates Tech Design from Epic. Validates spec as downstream consumer. |
| **Publish Epic** | Phase 4. Transforms detailed epic into two handoff-ready artifacts: a PO-friendly business epic and a developer story file with full AC/TC detail and Jira section markers. |
| **Verification** | Validates artifacts and implementation. Different model for rigor -- thoroughness is the point. |

## Artifacts

| Term | Definition |
|------|------------|
| **PRD** | Product Requirements Document. Multiple features sketched at high level. |
| **Epic** | Complete specification for one feature. ACs, TCs, data contracts, scope. |
| **Tech Design** | Architecture, interfaces, test mapping, work plan. Expands significantly from the epic. |
| **Story** | A discrete, independently executable vertical slice with functional sections (BA/SM) and technical implementation sections (Tech Lead). The sole implementation artifact. |
| **Story Contract** | Four non-negotiable requirements for technically enriched stories: TC-to-test mapping, technical DoD, spec deviation field, targets not steps. |

## Epic Hierarchy

| Term | Definition |
|------|------------|
| **User Profile** | Who the feature is for and their mental model. |
| **Feature Overview** | What the user can do after this feature ships that they can't do today. Follows User Profile. |
| **User Flow** | A sequence of steps through the feature. |
| **AC (Acceptance Criteria)** | A testable requirement. "The system shall..." |
| **TC (Test Condition)** | Verifiable condition for an AC. Formats: Given/When/Then for behavioral checks, numbered sequential steps, or input/output comparison tables. |
| **Data Contract** | TypeScript interface defining data shapes. |
| **Non-Functional Requirement (NFR)** | Cross-cutting constraint (performance, security, observability) that affects how things are built. Becomes Tech Design constraints, not TCs. Optional section. |

## Execution

| Term | Definition |
|------|------------|
| **Story 0** | Foundation (Infrastructure) story. Types, fixtures, error classes, test utilities, and project config. Minimal or no TDD cycle. Always first. |
| **Feature 0** | Stack standup story for new stacks. Auth, connectivity, integrated skeleton with no product functionality. |
| **Skeleton Phase** | Create stubs that throw NotImplementedError. Structure without logic. |
| **TDD Red Phase** | Write tests asserting behavior. Tests ERROR because stubs throw. |
| **TDD Green Phase** | Implement to make tests pass. |
| **Gorilla Testing** | Human-in-loop ad hoc testing after Green. Catches "feels wrong." Legitimizes unstructured work. |
| **Verify Phase** | Formal verification: full test suite, types, lint. |
| **NotImplementedError** | Custom error thrown by stubs. Signals "not yet implemented." |
| **Consumer Gate** | Can an engineer implement from this story without asking clarifying questions? The quality bar for technically enriched stories. |

## Quality Patterns

| Term | Definition |
|------|------------|
| **Downstream Consumer** | The agent who uses an artifact validates it (Tech Lead validates Epic). |
| **Multi-Agent Validation** | Author self-review + downstream consumer review + different model review. |
| **Dual-Validator Pattern** | Launching two validators in parallel with different cognitive profiles (builder + detail-oriented) for complementary coverage. Optional pattern for high-stakes validation. |
| **Running Total** | Cumulative test count across stories. Previous tests must keep passing. |
| **Service Mocks** | In-process tests at public entry points that mock only at external boundaries. The primary test layer -- where TDD lives. |
| **Wide Integration Tests** | Few, slower tests against deployed environment. Verify wiring and configuration. Run locally and post-CD, not on CI. |
| **Progressive Depth** | Documentation style: revisit concepts from multiple angles with increasing depth. Creates redundant connections across functional/technical perspectives so readers can enter at any point. |

## Context Management

| Term | Definition |
|------|------------|
| **Context Rot** | Degradation of agent attention as context grows. |
| **Expansion Ratio** | How much an artifact expands when the next phase elaborates it. |
| **Planner/Coder Split** | Planning context (exploratory) vs execution context (precise). |
| **State File** | JSON/Markdown files tracking project and agent state for recovery. |
| **Checkpoint** | Saving state mid-session before compaction or break. |
| **Artifact as Interface** | The document IS the handoff. No "remember when we discussed..." |

## Anti-Patterns

| Term | Definition |
|------|------------|
| **Testing NotImplementedError** | Writing tests that assert the error instead of behavior. Defeats TDD. |
| **Hook Mocking** | Mocking hooks instead of API boundary. Hides integration bugs. |
| **Negotiation Baggage** | Accumulated assumptions from long conversations that a fresh agent wouldn't know. |
| **Spec Drift** | When implementation diverges from spec without updating the spec. |
| **Agent as Roleplay** | Treating agents as personas instead of context isolation mechanism. |
