---
name: liminal-spec
description: |
  Spec-driven development for agentic coding. SDLC-phased pipeline with context isolation
  and artifact handoff. Use when building features with detailed requirements, complex
  integrations, or multi-agent coordination. Liminal Spec either runs full or not at all —
  no "lite" versions.
---

<!-- ON LOAD: Present the following to the user exactly when this skill is invoked. -->
<!-- This is the user-facing greeting. Display it verbatim, then wait for the user to respond. -->

## On Load

When this skill is invoked, present the following to the user and wait for their response:

---

# Liminal Spec

A spec-driven development system for features with detailed requirements and complex integrations. Runs a rigorous, phased approach from specification through implementation — each phase produces an artifact the next phase reads cold. The traceability chain (requirement → test condition → test → code) means when tests go green, you have high confidence the implementation actually matches the spec.

## The Phases

| Phase | Entry | Exit | Start Here If... |
|-------|-------|------|-------------------|
| **1. Product Research** | Vision, idea | PRD | You need to explore product direction first |
| **2. Feature Specification** | Requirements or direct need | Feature Spec | **Most common entry point.** You know what you want to build |
| **3. Tech Design** | Feature Spec | Tech Design | You have a complete spec ready for architecture |
| **4. Story Sharding** | Spec + Design | Stories + Prompt Packs | Design is done, ready to break into executable work |
| **5. Execution** | Stories + Prompts | Verified code | Stories are sharded, ready to implement |

Most work starts at **Phase 2**. Tell me what you want to build and which phase you're starting from.

## When to Use

- New features with multiple components or integration points
- Complex business logic where requirements need precision
- Multi-agent builds where context isolation matters

Not for: quick bug fixes, single-file changes, spikes, or emergency patches. Either run the full methodology or use a lighter workflow.

---

<!-- END ON LOAD -->

→ For the full methodology and reference material, read on.

---

## The Two Dimensions

Liminal Spec operates on two dimensions that nest together:

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

The spec author produces a complete specification: User Profile, Feature Overview, User Flows with co-located Acceptance Criteria and Test Conditions, Data Contracts, Scope Boundaries, and a recommended Story Breakdown.

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

**Model guidance:** Opus 4.6 typically orchestrates and drafts prompts. When writing prompts, specify the target execution model so prompts include appropriate guidance.

→ Reference: `references/story-sharding.md`
→ Reference: `references/story-prompts.md` — Prompt structure and self-contained prompt writing
→ Reference: `references/prompting-opus-4.6.md` — Orchestration and prompt drafting

### Phase 5: Execution

Execute stories using the Story Execution Cycle. The same Orchestrator from Phase 4 drives this phase, calling on a Senior Engineer (fresh context) to execute each prompt.

The Senior Engineer doesn't orchestrate or document — they receive a self-contained prompt and execute it. The Orchestrator handles coordination, verification, and iteration.

**Execution pipeline:** Stories flow through validation → fix → execute → verify. Multiple stories can be in flight: while Story N executes, Story N+1 validates. This parallelism maximizes throughput.

**Model guidance:**
- **Implementation:** Claude Code subagent is the typical choice. Fallback: Opus 4.6 with TDD/service-mocks/contract-first context.
- **Finicky implementation or difficult debugging:** GPT 5x or GPT 5x Codex (via Codex CLI or Copilot) for detailed, disciplined execution.
- **Verification/code review:** GPT 5x or GPT 5x Codex — catches what builders miss.

→ Reference: `references/implementation.md`
→ Reference: `references/phase-execution.md`
→ Reference: `references/execution-orchestration.md` — Agent coordination, dual-validator pattern, parallel pipeline
→ Reference: `references/prompting-gpt-5x.md` — Verification and detailed implementation

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
- **Expansion ratios** — Each phase needs room to expand the prior artifact
- **Debuggable handoffs** — You can read exactly what was passed

→ Deep dive: `references/context-economics.md`
---

## The Confidence Chain

Every line of code traces back through a chain:

```
AC (requirement) → TC (test condition) → Test (code) → Implementation
```

**Validation rule:** Can't write a TC? The AC is too vague. Can't write a test? The TC is too vague.

This chain is what makes the methodology traceable. When something breaks, you can trace from the failing test back to the TC, back to the AC, back to the requirement.

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

**Different models catch different issues.** Use adversarial/diverse perspectives: Opus for gestalt, GPT 5x for detail and precision. When validators disagree on data contract completeness, defer to GPT 5x — it has consistently been more accurate on contract specifics.

**Dual-validator pattern:** For story/prompt validation, launch two validators with different cognitive profiles in parallel. Consolidate findings, fix blockers, then re-validate with the same validator session.

→ Details: `references/execution-orchestration.md`

### Verification Checkpoints

Before each phase transition, verify readiness:

**Before Tech Design:**
- [ ] Feature Spec complete (all ACs have TCs)
- [ ] BA self-review done
- [ ] Model validation complete (different model for diverse perspective)
- [ ] All issues addressed (Critical, Major, and Minor)
- [ ] Validation rounds complete (no substantive changes remaining)
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
| **Orchestration** | Opus 4.6 | Gestalt thinking, manages complexity |
| **Story sharding** | Opus 4.6 | Understands scope, breaks work coherently |
| **Prompt drafting** | Opus 4.6 | Captures intent, writes for other models |
| **Spec/design writing** | Opus 4.6 | Narrative flow, functional-technical weaving |
| **Implementation** | Claude Code / Opus 4.6 | TDD discipline, service mocks |
| **Finicky implementation** | GPT 5x / 5x Codex | Precise, disciplined, less drift |
| **Difficult debugging** | GPT 5x / 5x Codex | Methodical, catches details |
| **Verification** | GPT 5x / 5x Codex | Thorough, catches what builders miss |
| **Code review** | GPT 5x / 5x Codex | Thorough, checks against spec |

### Typical Flow

1. **Opus 4.6** orchestrates, shards stories, drafts prompts
2. **Claude Code subagent** (or Opus with TDD context) executes implementation
3. **GPT 5x** verifies artifacts and reviews code

### Access Methods

- **Opus 4.6:** Claude Code, API, Clawdbot subagents
- **GPT 5x:** Codex CLI (`codex exec`), GitHub Copilot, API
- **GPT 5x Codex:** Codex CLI with `-m gpt-5.2-codex`

→ Reference: `references/prompting-opus-4.6.md`
→ Reference: `references/prompting-gpt-5x.md`

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
3. `references/prompting-opus-4.6.md` (for drafting prompts)
### Phase 5: Execution
1. `references/implementation.md`
2. `references/phase-execution.md`
3. `references/execution-orchestration.md` (agent coordination, dual-validator, pipeline)
4. `references/prompting-gpt-5x.md` (for verification)
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
- `references/prompting-opus-4.6.md` — Orchestration, prompt drafting
- `references/prompting-gpt-5x.md` — Verification, detailed implementation

**Conceptual:**
- `references/context-economics.md` — Why context isolation works
- `references/writing-style.md` — Documentation principles
- `references/terminology.md` — Glossary

**Templates:**
- `templates/tech-design.template.md` — Phase 3 artifact template

**Examples:**
- `examples/feature-verification-prompt.md` — Ready-to-use prompt for Phase 2→3 spec validation
