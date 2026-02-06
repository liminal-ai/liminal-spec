# Product Research (Optional)

**Purpose:** Transform vision into a Product Requirements Document (PRD) that scopes multiple features.

**This phase is often skipped.** If you already know what feature you need, go straight to Feature Specification. Use this phase when you need to:
- Explore product direction before committing to features
- Document multiple related features in one initiative
- Create alignment artifacts for stakeholders

## When to Use Product Research

**Use when:**
- Starting a new product or major initiative
- Multiple features need to be scoped together
- Stakeholder alignment documentation required
- You're not sure what features you actually need

**Skip when:**
- You know the feature you want
- Single feature with clear scope
- "Just build X" situations

Most SDD work **skips this phase entirely** and goes straight to Feature Specification with "here's the feature I need."

---

## PRD Structure

```markdown
# Product Requirements Document: [Initiative Name]

## Vision
What problem are we solving? Why now?

## User Personas
Who are we building for? What are their goals?

## Feature Overview
High-level list of features in this initiative.

### Feature 1: [Name]
**Persona:** Who uses this
**Summary:** One paragraph description
**Key Flows:** Bullet list of main user journeys
**High-Level ACs:** Major acceptance criteria (not detailed)
**Priority:** Must-have / Should-have / Nice-to-have

### Feature 2: [Name]
...

## Architectural Considerations
Any cross-cutting technical concerns.

## Out of Scope
What we're explicitly NOT doing.

## Success Metrics
How we'll know this worked.
```

---

## PRD vs Feature Spec

| PRD | Feature Spec |
|-----|--------------|
| Multiple features | Single feature |
| High-level ACs | Detailed ACs with TCs |
| Explores scope | Defines scope precisely |
| Stakeholder alignment | Implementation guidance |
| Optional | Required for SDD |

The PRD sketches features. The Feature Spec (Phase 2) elaborates one feature fully.

---

## Handoff to Feature Specification

For each feature in the PRD that's ready to build:

1. Extract the feature section
2. Expand into full Feature Spec (Phase 2)
3. PRD becomes reference context, not source of truth

The Feature Spec supersedes the PRD for implementation details. PRD remains useful for "why are we building this" context.

---

## BMAD and External Product Tools

**BMAD (or similar deep product research tools) is a separate workflow, not integrated into SDD.**

For deep product research and ideation — user research, market analysis, competitive landscape, strategy — use dedicated product tools before SDD.

SDD's PO phase is **lightweight**:
- Single agent
- Product Brief → PRD
- Often skipped entirely

If you need extensive product discovery:
1. Do that work separately (BMAD, interviews, research)
2. Bring results into SDD as requirements
3. Start SDD at PO or BA phase

**SDD picks up when you have requirements.** It doesn't do deep product discovery.
