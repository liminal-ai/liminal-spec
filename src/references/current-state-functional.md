# Current-State Functional Baseline Guide

Read this guide when drafting the **functional** side of the current-state baseline:

- `current-state.md` in compact mode
- `current-state-index.md` in pack mode
- `current-state-[domain].md` domain docs

The main `SKILL.md` contains the truth model, workflow, and output checks. This guide narrows to how to write functional current-state artifacts well.

---

## Writing Register

Use the **plain-description discipline** from `ls-epic`:

- describe what the system does now
- describe where capability boundaries sit now
- describe what is not present now
- describe key edge, error, cancel, and recovery behavior where it matters

Do not write like a historian, salesperson, or release-note generator.

### Keep

- current behavior
- current scope boundaries
- current contracts and invariants
- current extension seams
- short context that helps a fresh agent place future work

### Cut

- throat-clearing about how the system evolved unless drift context matters
- benefit language instead of behavior
- implementation internals that belong in the technical baseline
- exhaustive AC/TC explosion across the whole mature system

### The Test

For any sentence, ask:

- does this tell a fresh spec agent what the system currently does?
- does this tell them where new work belongs?

If not, cut or rewrite it.

---

## Altitude

The functional baseline lives **between PRD and Epic altitude**:

- broad enough to map the current system
- precise enough that a fresh spec agent does not need to replay all historical epics

### PRD-like breadth

- top-tier capability domains
- cross-domain flows
- major constraints
- read path

### Epic-like precision at critical seams

- current user-visible flow clusters
- subtle current behavior
- key edge/error/cancel/recovery behavior
- important boundary contracts and invariants

### What not to do

- Do not rewrite the entire product as one giant epic.
- Do not stay so high-level that the next agent still needs ten old epics to work safely.

---

## Choosing Compact vs Pack

### Use compact mode when:

- one functional artifact remains readable end-to-end
- the domain map is still small and coherent
- new work can usually be placed after reading one doc plus the technical baseline

### Use pack mode when:

- a fresh reader would need to scan too many unrelated capability areas
- the current system has several stable top-tier domains
- likely future work lands in different parts of the product that deserve separate onboarding surfaces

The question is not "How many epics exist?" The question is "How much unrelated terrain must a new reader cross before they know where new work belongs?"

---

## Choosing Current Domains

Current domains should be chosen for:

- user-facing coherence
- stable extension seams
- onboarding clarity
- reasonable document density
- useful alignment with the current technical world

Do not preserve historical epic boundaries just because they existed first.

Possible outcomes:

- multiple old epics now live in one current domain
- one old epic now spans multiple current domains
- one domain contains both Liminal-origin and non-Liminal-origin work

If multiple valid cuts exist, run a dimensional reasoning check and decide explicitly instead of defaulting to historical sequence.

---

## Index vs Domain Docs

### `current-state-index.md`

This is the orientation surface.

It should answer:

- what the product currently does
- what the primary domains are
- which cross-domain flows matter
- which constraints/invariants future work must respect
- what a fresh agent should read next

The index is not where you explain every domain in depth.

### `current-state-[domain].md`

This is the domain-level onboarding surface.

It should answer:

- what this domain does now
- what users can do here now
- what is in scope here now
- what is absent, deferred, or deprecated
- what the major current flows are
- what important seams and invariants future work must respect
- what adjacent domains new work will likely compose with

Each domain doc should feel like a self-contained orientation and extension guide for that part of the current system.

### Required Section Floor

Every compact baseline or domain-level functional doc must include:

- `Status`
- `Evidence Scope`
- `Overview`
- `Current User Outcomes`
- `In Scope Now`
- `Not Present / Deferred / Deprecated`
- `Major Current Flows`
- `Important Contracts / Invariants`
- `Read Next`
- `Adjacent Domains`
- `Extension Guidance`

Compact repos may keep sections short, but the section floor still applies.

---

## Precision Dial

Do not give every domain the same depth.

Go deeper when:

- the domain is a likely extension target
- the behavior is subtle or easy to regress
- public contracts matter
- historical specs and implementation drifted
- tests are weak and the current functional truth needs to be stated clearly

Stay lighter when:

- the domain is stable
- the current behavior is obvious
- orientation matters more than exhaustive detail

This is bespoke depth, not uniform density.

---

## Evidence Notes

Use evidence/confidence notes only where they help the next agent calibrate trust.

Good uses:

- behavior is inferred from code only
- current implementation drifted from old specs
- a capability appears partial or intentionally disabled
- historical intent is unclear

Bad uses:

- decorating every section with meta commentary
- repeating obvious statements about confidence where evidence is already strong

### Produced vs Supported vs Planned

Do not describe something as current end-to-end behavior just because:

- contracts exist
- fixtures and tests support it
- UI surfaces are ready for it
- historical docs planned for it

Use explicit wording for:

- `Currently produced`
- `Supported but not currently produced`
- `Planned, not current`

This distinction is mandatory where the difference matters to onboarding.

---

## Functional Failure Modes

**Historical replay.**
Organizing by prior epics instead of current domains.

**Capability inventory with no behavior.**
Lists of features that never show how the current system actually behaves.

**Mega-epic bloat.**
Trying to express the whole mature product at full AC/TC density.

**Implementation leakage.**
Explaining internal technical mechanisms instead of current user-visible behavior.

**Planned-state leakage.**
Blending accepted but unimplemented work into current truth.

---

## Templates

### Template A: `current-state.md`

```markdown
# [Product Name] — Current State Baseline

## Status
Baseline reflects repository state at [commit / branch / date].

## Evidence Scope
- Historical artifacts reviewed: [list]
- Codebase areas reviewed: [list]
- Tests / evidence reviewed: [list]
- Evidence limitations: [list]

## Read This First
1. [Section or file]
2. [Section or file]
3. [Section or file]

## System Overview
[What the product currently does now.]

## Top-Tier Capability Domains

| Domain | What Exists Now | Read Next |
|--------|------------------|-----------|
| [domain] | [summary] | [section or file] |

## Cross-Domain Flows
- [Flow spanning multiple domains]

## Current Constraints and Invariants
- [Constraint]
- [Invariant]

## Domain 1: [Name]

### Overview
[What this domain does now and how it fits.]

### Current User Outcomes
- [What users can do now]

### In Scope Now
- [Capability]

### Not Present / Deferred / Deprecated
- [Capability]

### Major Flows
- [Flow]

### Key Edge / Error / Cancel Behaviors
- [Behavior]

### Important Contracts / Invariants
- [Contract or invariant]

### Adjacent Domains / Extension Seams
- [Where future work likely connects]

### Evidence Notes
- [If needed]
```

### Template B: `current-state-index.md`

```markdown
# [Product Name] — Current State Index

## Status
[What repository state this represents.]

## Evidence Scope
[What evidence was reviewed and what was unavailable.]

## Read This First
1. [File / section]
2. [File / section]
3. [File / section]

## System Overview
[What the product currently does.]

## Top-Tier Capability Domains

| Domain | Summary | Read Next |
|--------|---------|-----------|
| [domain] | [summary] | `current-state-[domain].md` |

## Cross-Domain Flows
- [Flow]

## Current Constraints and Invariants
- [Constraint]

## Domain Reading Map

| If new work touches... | Read... |
|------------------------|---------|
| [area] | [domain doc + tech sections] |
```

### Template C: `current-state-[domain].md`

```markdown
# Current State Domain: [Domain Name]

## Overview
[What this domain does now and where it fits.]

## Current User Outcomes
- [Outcome]

## In Scope Now
- [Capability]

## Not Present / Deferred / Deprecated
- [Capability]

## Major Flows

### Flow 1: [Name]
[Current behavior summary.]

### Flow 2: [Name]
[Current behavior summary.]

## Key Edge / Error / Cancel Behaviors
- [Behavior]

## Important Boundary Contracts
- [Contract]

## Adjacent Domains and Extension Seams
- [Connection point]

## Evidence and Confidence Notes
- [Only where needed]
```
