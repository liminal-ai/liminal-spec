# Changelog: v8-reworked vs v2-full

This document tracks what changed from v2-full to v8-reworked based on the brain dump from 2025-01-29.

## Summary of Key Changes

The brain dump clarified several concepts that v2-full either missed or didn't emphasize enough. The main themes:

1. **Agents = Context Isolation, Not Roleplay** — Made explicit throughout
2. **Verification Gradient** — Elevated to core concept with dedicated reference file
3. **Feature Spec Hierarchy** — User Profile → Flows → ACs → TCs cascade explained
4. **Decadent Spiral Writing** — Tech design writing style made explicit
5. **Multi-Agent Validation Pattern** — Author + downstream consumer + different model
6. **BMAD Clearly External** — SDD's PO is lightweight, BMAD is separate workflow
7. **Gorilla Testing** — Emphasized as legitimate phase, not afterthought

---

## SKILL.md Changes

### Added

- **"SDD is SDD"** section — No "lite" versions. Either full rigor or different workflow.
- **"Core Concept: Agents = Context Isolation"** — Dedicated section explaining this is about fresh context, not roleplay.
- **"Writing Style: The Decadent Spiral"** — Prominent section on tech design writing approach.
- **BMAD clarification** — Explicit note that BMAD is external, not integrated into SDD.
- **Expansion ratios** — "300-line feature spec → 2k lines tech design" made explicit.
- **Flexibility note** on verification — "Describes WHAT/WHEN, leaves HOW flexible"

### Changed

- **Description** — Added "SDD either runs full or not at all — no 'lite' versions."
- **Agent table** — Added output sizes (Feature Spec ~300 lines, Tech Design ~2k lines)
- **Story Execution Cycle** — Gorilla testing emphasized with explanation of why it exists
- **Verification Gradient** — Added "Flexibility" note about describing checkpoints vs prescribing orchestration
- **Multi-Agent Validation table** — Added "Consumer Reviews" column clarity

### Removed

- Nothing significant removed — v2-full had good structure

---

## New Reference File: verification.md

Created dedicated file for verification patterns. From brain dump:

> "The feature spec gets the most attention because: More on track here → everything else on track. More off here → everything downstream is off."

Covers:
- The scrutiny gradient with visual representation
- Feature Spec verification steps (self-review → Tech Lead → additional model → human)
- Multi-agent validation pattern (Author + Downstream Consumer table)
- Orchestration flexibility note
- Verification checkpoints for each phase transition

---

## business-analyst.md Changes

### Added

- **"Why this hierarchy matters"** — Explicit explanation of User Profile → Flows → ACs → TCs cascade
- **"The cascade"** — "You can't write a good TC without a clear AC..."
- **Self-review checkpoint** — Added to validation checklist
- **Downstream consumer pattern** — Tech Lead validates by confirming they can design from it
- **Output section** — Feature Spec ~300 lines, expands to ~2000 lines tech design

### Changed

- Reorganized to emphasize hierarchy first
- Each section now has "Why it matters" explanation
- Validation section split into self-review and human review

---

## tech-lead.md Changes

### Added

- **"Tech Design Writing Style: The Decadent Spiral"** — Major new section from brain dump
- **The Spiral Pattern** — Functional↔Technical, High↔Low, Back and forth, "Decadent"
- **"Why This Works"** — "Redundant connections — multiple paths through the material"
- **"Web of weights, not thin thread"** — Key metaphor from brain dump
- **Anti-pattern example** — "Thin Linear Design" vs "Decadent Spiral"
- **Self-review checkpoint** — "Is the spiral pattern present?"
- **Output section** — Tech Design ~2000 lines for 300-line spec

### Changed

- Renamed "Work Plan" section to "Chunking for Stories" for clarity
- Added "Chunk" terminology (aligns with brain dump)
- Validation emphasizes decadent spiral check

---

## scrum-master.md Changes

### Added

- **"Prompt Validation (Multi-Agent)"** — Major new section from brain dump
  - Self-review → SE preview → Different model review → Cross-check
  - Validation pattern diagram
  - Adversarial/diverse perspectives concept
- **"Key Point: Inline Content"** — Tech design content IN the prompt, not just referenced
- **"Impl vs Verifier Prompts"** section — Same material, different lens
- **"Iteration is Expected"** section — Multiple rounds is normal

### Changed

- Prompt structure now shows composable layers (Product → Project → Feature → Story → Task)
- Anti-patterns table updated with "See tech design for details" → inline
- Expanded orchestration section

---

## product-owner.md Changes

### Added

- **"BMAD and External Product Tools"** — Dedicated section making clear:
  - BMAD is separate workflow, not integrated
  - SDD's PO is lightweight (single agent, Product Brief → PRD)
  - "SDD picks up when you have requirements"

### Changed

- Made "often skipped" more prominent
- Added "Most SDD work skips PO entirely" statement

---

## context-economics.md Changes

### Added

- **"Treating agents as roleplay"** anti-pattern — "'Be the BA persona' is not the point"
- Clarified "Artifact as Interface" with emphasis on completeness

### Changed

- Opening reworded to emphasize "doesn't mean roleplay personas"
- Added explicit note about what "Agent" means in SDD

---

## senior-engineer.md Changes

### Added

- **Gorilla Testing section** — "Legitimizes unstructured exploration within structured process"
- **"The Prompt Pack is Your World"** section — Trust the prompt, references are for humans

### Changed

- Minor wording updates for consistency

---

## phase-execution.md Changes

### Added

- **Extended Gorilla Testing section** — "Why This Phase Exists"
  - "Legitimizes unstructured exploration"
  - "Not a failure of rigor — recognition that humans catch things automation doesn't"
- **TDD Red anti-pattern explanation** — Why testing NotImplementedError is dangerous

### Changed

- Minor wording updates for consistency

---

## terminology.md Changes

### Added

- **SDD definition** — "Full rigor or don't use it — no 'lite' versions"
- **Verification Gradient** term
- **Multi-Agent Validation** term
- **Decadent Spiral** term
- **Downstream Consumer** term
- **Artifact as Interface** term
- **SDD Lite** anti-pattern
- **Agent as Roleplay** anti-pattern

### Changed

- Agent definition now explicitly says "Means context isolation, not roleplay personas"
- BA definition adds "most scrutiny here"
- Verifier definition adds "pedantic is the point"

---

## story-prompts.md Changes

### Added

- **Composable prompt pack structure** — Shows layered summary approach
- **"Content IN the Prompt"** section — Don't require model to read other docs
- **"Impl vs Verifier Prompts"** section

### Changed

- Minor reorganization for clarity

---

## testing.md Changes

### Added

- **"Critical Rule: Assert Behavior, Not Errors"** — Elevated to prominent section
- **Explanation of why anti-pattern is dangerous**
- **Test count tracking** section

### Changed

- Minor updates for consistency

---

## state-management.md Changes

### Changed

- Minor wording updates only — v2-full was solid

---

## What Was Kept From v2-full

v2-full had good structure and captured many core concepts correctly:

- Overall agent pipeline
- Confidence chain (AC → TC → Test → Code)
- Phase execution cycle
- Mock at API boundary principle
- State management approach
- Progressive disclosure organization

The rework built on this foundation rather than replacing it.

---

## Key Brain Dump Insights Now Captured

From the brain dump inventory:

1. ✅ **Key principles** — SDD is SDD, no lite versions, no diagnostics filler, agents = context isolation
2. ✅ **Real agent flow** — PO (often skipped) → BA → Tech Lead → Scrum Master → Senior Engineer → Verifier
3. ✅ **Feature spec hierarchy** — User Profile → Flows → ACs → TCs, WHY each level matters
4. ✅ **Story execution cycle** — Skeleton → TDD Red → TDD Green → Gorilla Testing → Verification
5. ✅ **Prompt structure** — Composable packs, self-contained, layered summaries
6. ✅ **Context economics** — Expansion ratios, fresh context advantage, artifact as interface
7. ✅ **BMAD integration** — External, SDD picks up at BA (or PO if needed)
8. ✅ **Architecture standup** — Story 0 for infrastructure
9. ✅ **Verification gradient** — Upstream = more scrutiny, feature spec gets MOST attention
10. ✅ **Tech design writing** — Verbose, spiral/weave, functional↔technical, decadent redundancy
11. ✅ **Multi-agent validation** — Author + downstream consumer pattern

---

## Version Notes

- **v2-full**: Solid foundation, good structure, captured main concepts
- **v8-reworked**: Incorporates all brain dump insights, emphasizes key concepts that were implicit or understated
