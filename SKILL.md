---
name: sdd
description: |
  Spec-Driven Development for agentic coding. SDLC-phased pipeline with context isolation 
  and artifact handoff. Use when building features that need full traceability, 
  multi-agent coordination, or enterprise rigor. SDD either runs full or not at all — 
  no "lite" versions.
---

# SDD: Spec-Driven Development

SDD is a methodology for AI-assisted software development built on three ideas: **context isolation** (fresh agent contexts with artifact handoff), **artifact-driven phases** (each phase defined by what goes in and what comes out), and **verification gradient** (upstream work gets more scrutiny because errors compound downstream).

## When to Use SDD

**Use SDD for:**
- New features with multiple components or flows
- Complex integrations with external systems
- Clear requirements that can be broken into verifiable acceptance criteria

**Skip SDD for:**
- Bug fixes under 2 hours
- Single-file changes with obvious implementation
- Exploratory spikes or proof-of-concepts
- Emergency production fixes

**SDD is SDD.** If context can't support the full methodology, switch workflows entirely. No "SDD lite" — the rigor IS the point.

---

## Quickstart: Your First Feature

Already know what you want to build? Start here.

**1. Write the Feature Spec** (Phase 2 — most projects start here)

Load `references/feature-specification.md` and `references/writing-style.md`. Write a spec covering:
- **User Profile** — Who, context, mental model, key constraint
- **Feature Overview** — What they can do after that they can't do now
- **Scope** — In/out/assumptions
- **Flows with ACs and TCs** — Each flow groups its acceptance criteria, each AC groups its test conditions (Given/When/Then)
- **Data Contracts** — Typed shapes for APIs and responses
- **Recommended Story Breakdown** — Story 0 (infrastructure) + feature stories

Target: ~300 lines. Every AC testable, every AC has at least one TC.

**2. Validate** — Have a fresh agent read the spec and confirm they could design from it without asking questions. If they can't, fix the spec.

**3. Tech Design** (Phase 3) — Load `references/tech-design.md` and `templates/tech-design.template.md`. Transform the spec into architecture, interfaces, and test mapping (~2000 lines).

**4. Story Sharding** (Phase 4) — Load `references/story-sharding.md` and `references/story-prompts.md`. Break into stories, write self-contained prompt packs.

**5. Execute** (Phase 5) — Load `references/implementation.md` and `references/execution-orchestration.md`. Execute prompts in fresh agent contexts: Skeleton → TDD Red → TDD Green → Gorilla → Verify.

Each phase uses a **fresh context** that reads the previous phase's artifact cold. That's the core of SDD — context isolation with artifact handoff.

→ Read the rest of this file for the full methodology. The sections below explain *why* each piece works.

---

## The Two Dimensions

SDD operates on two dimensions that nest together:

**Macro: The Five Phases** — SDLC-oriented stages defined by artifact entry/exit. Each phase transforms one artifact into another. Phases are named by where they sit in the software lifecycle, not by who does the work.

**Micro: The Story Execution Cycle** — Within Phase 5 (Execution), each story follows Skeleton → TDD Red → TDD Green → Gorilla → Verify. This is the implementation rhythm.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5                   │
│  (PRD)     (Spec)    (Design)  (Stories)  (Execution)              │
│                                              ↓                      │
│                                   ┌─────────────────────┐          │
│                                   │ Per-Story Cycle:    │          │
│                                   │ Skeleton → Red →    │          │
│                                   │ Green → Gorilla →   │          │
│                                   │ Verify              │          │
│                                   └─────────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The Five Phases

Phases are defined by artifact boundaries — what you need going in, what you produce coming out. Agents attach to phases but don't define them.

| Phase | Entry Artifact | Exit Artifact | Work |
|-------|---------------|---------------|------|
| **1. Product Research** | Vision, idea | PRD | Ideation, product brief, PRD |
| **2. Feature Specification** | PRD or direct need | Feature Spec | Nail down requirements (ACs, TCs, flows) |
| **3. Tech Design** | Feature Spec | Tech Design doc(s) | Architecture, interfaces, test mapping |
| **4. Story Sharding** | Spec + Design | Stories + Prompts | Break into stories, draft execution prompts |
| **5. Execution** | Stories + Prompts | Verified code | Execute prompts, verify, iterate |

### Phase 1: Product Research & Planning (Optional)

**Often skipped.** If you already know the feature you want, go straight to Phase 2 with "here's what I need." Use Phase 1 when you need to explore product direction or document multiple related features.

→ Reference: `references/product-research.md`

### Phase 2: Feature Specification

**The linchpin.** This is where requirements become precise. The Feature Spec gets the most scrutiny because errors here cascade everywhere.

The spec author produces a complete specification: User Profile, Feature Overview, User Flows with co-located Acceptance Criteria and Test Conditions, Data Contracts, Scope Boundaries, and a recommended Story Breakdown. Approximately 300 lines that expand to ~2000 lines of tech design.

→ Reference: `references/feature-specification.md` — Feature spec creation, structure, and template
→ Reference: `references/writing-style.md` — Documentation principles for spec writing

### Phase 3: Tech Design

Transform the Feature Spec into implementable architecture. May produce one document or split based on complexity:
- Tech Design (core architecture, interfaces)
- Tech Design UI (if UI-heavy)
- Test Plan (if testing needs depth)

The Tech Lead validates the Feature Spec by confirming they can design from it. If they can't, the spec goes back for revision.

→ Reference: `references/tech-design.md`
→ Reference: `references/writing-style.md` — Documentation principles for design writing
→ Reference: `references/testing.md` — Mock strategy, test architecture
→ Template: `templates/tech-design.template.md`

### Phase 4: Story Sharding + Prompt Drafting

Break the feature into executable stories. Draft prompts for each story phase.

**Special artifacts:**
- **Story 0:** Infrastructure setup — types, fixtures, error classes, stubs
- **Feature 0:** Stack standup — auth, connectivity, integrated skeleton with no product functionality (used when building on a new stack)

The Orchestrator runs this phase and continues into Phase 5.

**Model guidance:** Opus 4.5 typically orchestrates and drafts prompts. When writing prompts, specify the target execution model so prompts include appropriate guidance.

→ Reference: `references/story-sharding.md`
→ Reference: `references/story-prompts.md` — Prompt structure and self-contained prompt writing
→ Reference: `references/prompting-opus-4.5.md` — Orchestration and prompt drafting

### Phase 5: Execution

Execute stories using the Story Execution Cycle. The same Orchestrator from Phase 4 drives this phase, calling on a Senior Engineer (fresh context) to execute each prompt.

The Senior Engineer doesn't orchestrate or document — they receive a self-contained prompt and execute it. The Orchestrator handles coordination, verification, and iteration.

**Execution pipeline:** Stories flow through validation → fix → execute → verify. Multiple stories can be in flight: while Story N executes, Story N+1 validates. This parallelism maximizes throughput.

**Model guidance:**
- **Implementation:** Claude Code subagent is the typical choice. Fallback: Opus 4.5 with TDD/service-mocks/contract-first context.
- **Finicky implementation or difficult debugging:** GPT 5.2 or GPT 5.2 Codex (via Codex CLI or Copilot) for detailed, disciplined execution.
- **Verification/code review:** GPT 5.2 or GPT 5.2 Codex — pedantic, catches what builders miss.

→ Reference: `references/implementation.md`
→ Reference: `references/phase-execution.md`
→ Reference: `references/execution-orchestration.md` — Agent coordination, dual-validator pattern, parallel pipeline
→ Reference: `references/prompting-gpt-5.2.md` — Verification and detailed implementation

---

## Core Concept: Context Isolation

**"Agents" means fresh context with artifact handoff. Not roleplay.**

Each phase gets a clean context. No accumulated assumptions, no negotiation baggage, no conversation history. The artifact (document) IS the handoff.

```
Phase N (context)
    └── Produces artifact (e.g., Feature Spec)
              ↓
Phase N+1 (fresh context)
    ├── Reads artifact cold
    └── No negotiation history
              └── Produces next artifact
```

**Why this matters:**
- **No negotiation baggage** — Fresh context reads artifact as-is
- **Token efficiency** — Clean context vs bloated history
- **Expansion ratios** — Each phase needs room (300 lines → 2000 lines)
- **Debuggable handoffs** — You can read exactly what was passed

→ Deep dive: `references/context-economics.md`
---

## The Confidence Chain

Every line of code traces back through a chain:

```
AC (requirement) → TC (test condition) → Test (code) → Implementation
```

**Validation rule:** Can't write a TC? The AC is too vague. Can't write a test? The TC is too vague.

This chain is what makes SDD traceable. When something breaks, you can trace from the failing test back to the TC, back to the AC, back to the requirement.

---

## The Verification Model

**Upstream gets more scrutiny.** Errors in the Feature Spec cascade through every downstream phase. Errors in implementation are localized.

```
Feature Spec:  ████████████████████ Every line (human reads all)
Tech Design:   █████████████░░░░░░░ Detailed review
Stories:       ████████░░░░░░░░░░░░ Key things + shape
Prompts:       ██████░░░░░░░░░░░░░░ Shape + intuition  
Implementation:████░░░░░░░░░░░░░░░░ Spot checks + tests
```

### Multi-Agent Validation Pattern

Each artifact gets validated by its downstream consumer — the agent who needs to use it:

| Artifact | Author | Validated By | Why They Validate |
|----------|--------|--------------|-------------------|
| Feature Spec | BA | Tech Lead | Needs it for design |
| Tech Design | Tech Lead | Orchestrator | Needs it for stories |
| Prompts | Orchestrator | Senior Engineer + different model | Needs to execute |

**Different models catch different issues.** Use adversarial/diverse perspectives: Opus for gestalt, GPT-5.2 for pedantic detail.

**Dual-validator pattern:** For story/prompt validation, launch two validators with different cognitive profiles in parallel. Consolidate findings, fix blockers, then re-validate with the same validator session.

→ Details: `references/execution-orchestration.md`

### Verification Checkpoints

Before each phase transition, verify readiness:

**Before Tech Design:**
- [ ] Feature Spec complete (all ACs have TCs)
- [ ] BA self-review done
- [ ] Tech Lead validated: "I can design from this"
- [ ] Human reviewed every line

**Before Story Sharding:**
- [ ] Tech Design complete
- [ ] TC-to-test mapping complete
- [ ] Orchestrator validated: "I can derive stories"

**Before Execution:**
- [ ] Stories and prompts complete
- [ ] Prompts are self-contained
- [ ] Different model reviewed prompts

→ Details: `references/verification.md`

### Orchestration (Quick Nav)

- **Phase transition gates:** see `### Verification Checkpoints` above.
- **Prompt packs (Phase 4):** `references/story-sharding.md` and `references/story-prompts.md`.
- **Execution pipeline (Phase 5):** Validate → Fix → Execute → Verify. Each story flows through this pipeline; validation can run ahead while the previous story executes.
- **Per-story cycle / done criteria:** `references/phase-execution.md`.
- **Agent coordination patterns:** `references/execution-orchestration.md` — dual-validator template, agent selection table, session management, parallel pipeline details, checklist.

---

## Model Selection

Different models excel at different tasks. Use the right model for the job.

| Task | Recommended Model | Why |
|------|-------------------|-----|
| **Orchestration** | Opus 4.5 | Gestalt thinking, manages complexity |
| **Story sharding** | Opus 4.5 | Understands scope, breaks work coherently |
| **Prompt drafting** | Opus 4.5 | Captures intent, writes for other models |
| **Spec/design writing** | Opus 4.5 | Narrative flow, functional-technical weaving |
| **Implementation** | Claude Code / Opus 4.5 | TDD discipline, service mocks |
| **Finicky implementation** | GPT 5.2 / 5.2 Codex | Precise, disciplined, less drift |
| **Difficult debugging** | GPT 5.2 / 5.2 Codex | Methodical, catches details |
| **Verification** | GPT 5.2 / 5.2 Codex | Pedantic, catches what builders miss |
| **Code review** | GPT 5.2 / 5.2 Codex | Thorough, checks against spec |

### Typical Flow

1. **Opus 4.5** orchestrates, shards stories, drafts prompts
2. **Claude Code subagent** (or Opus with TDD context) executes implementation
3. **GPT 5.2** verifies artifacts and reviews code

### Access Methods

- **Opus 4.5:** Claude Code, API, Clawdbot subagents
- **GPT 5.2:** Codex CLI (`codex exec`), GitHub Copilot, API
- **GPT 5.2 Codex:** Codex CLI with `-m gpt-5.2-codex`

→ Reference: `references/prompting-opus-4.5.md`
→ Reference: `references/prompting-gpt-5.2.md`

---

## Story Execution Cycle

Within Phase 5, each story follows this rhythm:

```
SKELETON → TDD RED → TDD GREEN → GORILLA → VERIFY
```

| Phase | Do | Exit |
|-------|------|------|
| **Skeleton** | Stubs throwing `NotImplementedError` | Compiles, structure reviewed |
| **TDD Red** | Tests assert behavior, ERROR on stubs | All TCs covered |
| **TDD Green** | Implement until tests pass | All green |
| **Gorilla** | Human ad hoc testing | "Feels right" |
| **Verify** | Full suite + types + lint | Ship ready |

### Why Gorilla Testing?

After TDD Green, before formal verification. Unstructured, interactive, catches "feels wrong." Run the feature, try weird inputs, click in unexpected order.

**Gorilla testing legitimizes ad hoc work within the structured process.** TDD ensures correctness against spec. Gorilla catches what specs miss.

→ Details: `references/phase-execution.md`
→ Orchestration: `references/execution-orchestration.md` — How to coordinate agents through the cycle

---

## Writing Style: Progressive Depth

Documentation fails when it's flat — lists of equal-weight items, uniform depth everywhere. Good documentation operates in three dimensions: **hierarchy** (sections), **network** (cross-references), and **narrative** (temporal/causal flow).

LLMs trained on narrative text. Conform to that substrate and relationships arrive "for free." Fight it with flat bullets and you waste tokens.

### Altitude and Descent

Documentation exists at altitudes: PRD (25k ft) → Tech Design (15k ft) → Phase Spec (10k ft) → Code (1k ft). Each level answers questions raised by the level above. **Don't jump altitudes** — bridge them smoothly.

### Branches and Leaves

Prose paragraphs establish **branches** (context, importance). Bullets hang **leaves** (specifics). Diagrams are **landmarks**. Flat bullets without a branch force every item to compete equally.

### The Internal Check

Before writing the next section:
1. What question is the reader asking right now?
2. Am I listing leaves without a branch?
3. Is the functional thread still visible?
4. Have I earned this complexity progressively?

→ Deep dive: `references/writing-style.md`

---

## Testing Rules

1. **Mock at API boundary**, not hooks — preserves real integration path
2. **Assert behavior**, not `NotImplementedError` — tests must verify outcomes
3. **Test entry points**, not internal helpers — test what users touch

→ Details: `references/testing.md`

---

## Progressive Disclosure — What to Load When

### Phase 1: Product Research (if used)
1. This file (overview)
2. `references/product-research.md`

### Phase 2: Feature Specification
1. This file (overview)
2. `references/feature-specification.md`
3. `references/writing-style.md`
4. `examples/feature-verification-prompt.md` (for spec validation before handoff)

### Phase 3: Tech Design
1. `references/tech-design.md`
2. `references/testing.md`
3. `references/writing-style.md`
4. `templates/tech-design.template.md`

### Phase 4: Story Sharding
1. `references/story-sharding.md`
2. `references/story-prompts.md`
3. `references/prompting-opus-4.5.md` (for drafting prompts)
### Phase 5: Execution
1. `references/implementation.md`
2. `references/phase-execution.md`
3. `references/execution-orchestration.md` (agent coordination, dual-validator, pipeline)
4. `references/prompting-gpt-5.2.md` (for verification)
### Understanding the Why
1. `references/context-economics.md`
2. `references/verification.md`
3. `references/terminology.md` (glossary, when terms are unclear)

### Resuming Work
1. `references/state-management.md`

---

## Full Reference List

**By Phase:**
- `references/product-research.md` — Phase 1: Product Brief → PRD
- `references/feature-specification.md` — Phase 2: Feature Spec (creation, structure, template)
- `references/tech-design.md` — Phase 3: Tech Design
- `references/story-sharding.md` — Phase 4: Stories + Prompts
- `references/implementation.md` — Phase 5: Execution

**Process & Patterns:**
- `references/phase-execution.md` — Story execution cycle details
- `references/execution-orchestration.md` — Agent coordination, dual-validator, parallel pipeline
- `references/verification.md` — Multi-agent validation patterns
- `references/testing.md` — Mock strategies, test patterns
- `references/story-prompts.md` — Writing self-contained prompts
- `references/state-management.md` — Project state, recovery

**Model Prompting:**
- `references/prompting-opus-4.5.md` — Orchestration, prompt drafting
- `references/prompting-gpt-5.2.md` — Verification, detailed implementation

**Conceptual:**
- `references/context-economics.md` — Why context isolation works
- `references/writing-style.md` — Documentation principles
- `references/terminology.md` — Glossary

**Templates:**
- `templates/tech-design.template.md` — Phase 3 artifact template

**Examples:**
- `examples/feature-verification-prompt.md` — Ready-to-use prompt for Phase 2→3 spec validation
