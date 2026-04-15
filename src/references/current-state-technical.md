# Current-State Technical Baseline Guide

Read this guide when drafting the **technical** side of the current-state baseline:

- `current-state-tech-design.md`

The main `SKILL.md` contains the truth model, workflow, and output checks. This guide narrows to how to write the current technical world future designs now inherit.

---

## Writing Register

Use the **rich, woven, tech-design-style register**:

- open with system context before details
- descend from current system context to surfaces, modules, sequences, and seams
- connect technical structure back to functional domains and user-visible behavior
- avoid flat inventories that name parts without explaining how they fit

This is not a speculative redesign. It is a current-state technical baseline.

### Keep

- current runtime surfaces
- current top-tier technical surfaces
- current module ownership
- current request/interaction sequences
- current public/internal boundary contracts
- current test seams and repo validation surfaces
- explicit notes about technical drift and legacy exceptions

### Cut

- redesign proposals masquerading as current truth
- file/folder inventories with no guidance
- deep internal helper trivia that does not change future design placement
- pure implementation minutiae with no architectural or onboarding value

### The Test

Could a fresh tech designer place the next work in the current technical world without re-deriving:

- the system shape
- the ownership seams
- the major contracts
- the verification and mock boundaries

If not, the technical baseline is too thin.

---

## Altitude

The technical baseline should feel like a current-state sibling of `ls-tech-design`, but at whole-system continuity altitude rather than feature-delivery altitude.

Start high:

- current system context
- external systems and entry points
- current technical surfaces

Then descend:

- module responsibility zones
- important runtime/request/interaction sequences
- contracts and seams
- current test and validation path

The failure mode is jumping straight into module lists with no system context.

---

## Technical Surfaces

Choose current top-tier technical surfaces the same way the current functional baseline chooses current domains:

- based on navigability
- based on stable ownership
- based on what future work will usually inherit
- based on what helps a human or agent know where to go first

Do not just restate runtime boundaries if the current system has stronger responsibility zones inside them.

Examples:

- runtime boundaries may be `client`, `server`, `worker`
- technical surfaces may be `workspace`, `documents`, `search`, `exports`, `integrations`

Sometimes they overlap. Sometimes they do not.

---

## Current Technical Baseline Structure

`current-state-tech-design.md` should usually contain:

- **Status and Evidence Scope**
- **Current System Context**
- **Top-Tier Technical Surfaces**
- **Current Stack and Version-Sensitive Decisions**
- **Module Responsibility Matrix**
- **Major Runtime / Request / Interaction Sequences**
- **Boundary Contracts**
- **Surface / Entrypoint / Platform Scope Notes**
- **Test Seams and Mock Boundaries**
- **Repo Validation Surfaces**
- **Known Technical Drift / Legacy Exceptions**

These sections should be navigable from multiple entry points:

- a designer entering at system context
- an implementer entering at a module matrix
- a verifier entering at test seams and validation surfaces

---

## Technical Truth Rules

- Current module ownership beats historical module plans
- Current runtime/config beats historical stack assumptions
- Current public contracts beat historical contract shapes when they differ in implementation
- Current test and CI surfaces beat historical expectations about how the project is validated
- Historical tech designs still matter for drift explanation and lineage

Do not silently "clean up" reality in the current-state technical baseline. If the system is awkward, say so precisely and put the awkwardness in `Known Technical Drift / Legacy Exceptions`.

---

## Module Responsibility Matrix

This is the technical equivalent of the functional domain map.

It should answer:

- what area owns what
- what domains it serves
- what future work should respect
- where current responsibility seams are real vs accidental

Good matrix rows:

- identify real ownership
- reflect current code structure
- help place future work
- mention legacy exceptions if they matter

Bad matrix rows:

- mirror every folder mechanically
- name modules without explaining ownership
- imply a cleaner architecture than the code actually has

---

## Sequences and Contracts

Use sequences for the current journeys future work will most likely touch:

- common request paths
- high-value interaction flows
- important cross-surface communication
- integration-critical flows

Use contracts for:

- external boundaries
- machine-readable error codes/shapes
- major request/response payloads
- important internal seams future designs must preserve

Do not document every internal call chain. Document the journeys and seams that matter for onboarding and extension.

### Surface / Entrypoint / Platform Scope

For important current behaviors, document:

- which surface produces them now
- which entrypoint produces them now
- whether the behavior is platform-bounded

This is especially important for:

- startup behavior
- pickers and dialogs
- save/reveal/open-external behavior
- packaging entrypaths
- desktop shell integrations

If a behavior is current only in Electron, or current only through a server-side macOS helper, say so directly.

---

## Test Seams and Validation Surfaces

The current-state technical baseline must make tests and repo validation part of the technical world, not an afterthought.

Document:

- where tests currently enter
- what boundaries are mocked
- what remains external
- which suites are standard vs deep
- what scripts or CI lanes the repo currently treats as standard

This is especially important when historical tech designs no longer match the current verification setup.

Also include repo-level workflow support surfaces when they materially affect implementation or QA, such as:

- QA approach docs
- install/build helpers
- generated policy/guidance files

---

## Technical Failure Modes

**Inventory with no guidance.**
Listing folders and libraries without teaching placement.

**Speculative redesign.**
Quietly documenting the architecture you wish existed.

**Codepath obsession.**
Going too deep into helpers and losing the current top-tier surfaces.

**No validation story.**
Omitting test seams, repo validation surfaces, and mock boundaries.

**Functional disconnect.**
Explaining mechanisms without showing what current domains or behaviors they support.

---

## Template

### Template D: `current-state-tech-design.md`

```markdown
# [Product Name] — Current Technical Baseline

## Status
[What repository state this represents.]

## Evidence Scope
[What code/tests/config/CI surfaces were reviewed.]

## Current System Context
[Current runtime surfaces, external systems, entry points.]

## Top-Tier Technical Surfaces

| Surface | Owns | Depends On | Future Work Should Respect |
|---------|------|------------|-----------------------------|
| [surface] | [ownership] | [deps] | [guidance] |

## Current Stack and Version-Sensitive Decisions

| Area | Current Choice | Evidence | Notes |
|------|----------------|----------|-------|
| [area] | [choice] | [file / command] | [note] |

## Module Responsibility Matrix

| Module / Area | Responsibility | Domain(s) Served | Notes |
|---------------|----------------|------------------|------|
| [module] | [what it owns] | [domain] | [note] |

## Major Runtime / Request / Interaction Sequences
- [Sequence]

## Boundary Contracts
- [Contract]

## Test Seams and Mock Boundaries
- [Where tests enter]
- [What stays external]

## Repo Validation Surfaces

| Surface | Evidence | Notes |
|---------|----------|-------|
| [surface] | [script / CI config / doc] | [note] |

## Known Technical Drift / Legacy Exceptions
- [Drift]
```
