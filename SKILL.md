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

| Phase | Entry Artifact | Exit Artifact | Work | Who |
|-------|---------------|---------------|------|-----|
| **1. Product Research** | Vision, idea | PRD | Ideation, product brief, PRD | PO / Product |
| **2. Feature Specification** | PRD or direct need | Feature Spec | Nail down requirements (ACs, TCs, flows) | BA |
| **3. Tech Design** | Feature Spec | Tech Design doc(s) | Architecture, interfaces, test mapping | Tech Lead |
| **4. Story Sharding** | Spec + Design | Stories + Prompts | Break into stories, draft execution prompts | Orchestrator |
| **5. Execution** | Stories + Prompts | Verified code | Execute prompts, verify, iterate | Orchestrator + Engineer |

### Phase 1: Product Research & Planning (Optional)

**Often skipped.** If you already know the feature you want, go straight to Phase 2 with "here's what I need." Use Phase 1 when you need to explore product direction or document multiple related features.

→ Reference: `references/product-owner.md`

### Phase 2: Feature Specification

**The linchpin.** This is where requirements become precise. The Feature Spec gets the most scrutiny because errors here cascade everywhere.

The BA produces a complete specification: User Profile, User Flows, Acceptance Criteria (ACs), Test Conditions (TCs), Data Contracts, and Scope Boundaries. Approximately 300 lines that expand to ~2000 lines of tech design.

→ Reference: `references/business-analyst.md`
→ Reference: `references/writing-style.md` — Documentation principles for spec writing
→ Template: `templates/feature-spec.template.md`

### Phase 3: Tech Design

Transform the Feature Spec into implementable architecture. May produce one document or split based on complexity:
- Tech Design (core architecture, interfaces)
- Tech Design UI (if UI-heavy)
- Test Plan (if testing needs depth)

The Tech Lead validates the Feature Spec by confirming they can design from it. If they can't, the spec goes back to BA.

→ Reference: `references/tech-lead.md`
→ Reference: `references/writing-style.md` — Documentation principles for design writing
→ Reference: `references/testing.md` — Mock strategy, test architecture
→ Template: `templates/tech-design.template.md`

### Phase 4: Story Sharding + Prompt Drafting

Break the feature into executable stories. Draft prompts for each story phase.

**Special artifacts:**
- **Story 0:** Infrastructure setup — types, fixtures, error classes, stubs
- **Feature 0:** Stack standup — auth, connectivity, integrated skeleton with no product functionality (used when building on a new stack)

The Orchestrator (Scrum Master role) runs this phase and continues into Phase 5.

**Model guidance:** Opus 4.5 typically orchestrates and drafts prompts. When writing prompts, specify the target execution model so prompts include appropriate guidance.

→ Reference: `references/scrum-master.md`
→ Reference: `references/story-prompts.md` — Prompt structure and self-contained prompt writing
→ Reference: `references/prompting-opus-4.5.md` — Orchestration and prompt drafting

### Phase 5: Execution

Execute stories using the Story Execution Cycle. The same Orchestrator from Phase 4 drives this phase, calling on a Senior Engineer (fresh context) to execute each prompt.

The Engineer doesn't orchestrate or document — they receive a self-contained prompt and execute it. The Orchestrator handles coordination, verification, and iteration.

**Execution pipeline:** Stories flow through validation → fix → execute → verify. Multiple stories can be in flight: while Story N executes, Story N+1 validates. This parallelism maximizes throughput.

**Model guidance:**
- **Implementation:** Claude Code senior-engineer subagent is the typical choice. Fallback: Opus 4.5 with TDD/service-mocks/contract-first context.
- **Finicky implementation or difficult debugging:** GPT 5.2 or GPT 5.2 Codex (via Codex CLI or Copilot) for detailed, disciplined execution.
- **Verification/code review:** GPT 5.2 or GPT 5.2 Codex — pedantic, catches what builders miss.

→ Reference: `references/senior-engineer.md`
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
| Prompts | Orchestrator | Engineer + different model | Needs to execute |

**Different models catch different issues.** Use adversarial/diverse perspectives: Opus for gestalt, GPT-5.2 for pedantic detail.

**Dual-validator pattern:** For story/prompt validation, launch both Senior Engineer (Claude) and GPT-5.2 Codex in parallel. Consolidate findings, fix blockers, then re-validate with the same validator session.

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
2. **Claude Code senior-engineer** (or Opus with TDD context) executes implementation
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

## Writing Style: The Decadent Spiral

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
2. `references/product-owner.md`

### Phase 2: Feature Specification
1. This file (overview)
2. `references/business-analyst.md`
3. `references/writing-style.md`
4. `templates/feature-spec.template.md`

### Phase 3: Tech Design
1. `references/tech-lead.md`
2. `references/testing.md`
3. `references/writing-style.md`
4. `templates/tech-design.template.md`

### Phase 4: Story Sharding
1. `references/scrum-master.md`
2. `references/story-prompts.md`
3. `references/prompting-opus-4.5.md` (for drafting prompts)

### Phase 5: Execution
1. `references/senior-engineer.md`
2. `references/phase-execution.md`
3. `references/execution-orchestration.md` (agent coordination, dual-validator, pipeline)
4. `references/prompting-gpt-5.2.md` (for verification)

### Understanding the Why
1. `references/context-economics.md`
2. `references/verification.md`

### Resuming Work
1. `references/state-management.md`

---

## Full Reference List

**By Phase:**
- `references/product-owner.md` — Phase 1: Product Brief → PRD
- `references/business-analyst.md` — Phase 2: Feature Spec
- `references/tech-lead.md` — Phase 3: Tech Design
- `references/scrum-master.md` — Phase 4: Stories + Prompts
- `references/senior-engineer.md` — Phase 5: Execution

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
- `templates/feature-spec.template.md` — Phase 2 artifact template
- `templates/tech-design.template.md` — Phase 3 artifact template
