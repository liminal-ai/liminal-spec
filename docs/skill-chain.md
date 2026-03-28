# Liminal Spec — Skill Chain Reference

Internal developer documentation. Not user-facing, not composed into builds. This document captures what each skill in the chain is for, what it produces, what consumes its output, and what qualities that output must have for the downstream link to succeed.

The pipeline is a dependency chain. Each skill's output is the next skill's input. Weak output at any link forces the human back into the loop to compensate — and the further upstream the weakness, the more it multiplies downstream.

---

## ls-prd

### What it is

A batch of compressed proto-epics. The name says "PRD" but the function is closer to: the human's intensive front-loaded product investment that enables automated expansion of 3-8 epics with progressively less human involvement. Together with the technical architecture document produced by `ls-arch`, these two artifacts represent the human's full front-loaded investment (1-2 hours combined) before the automated pipeline takes over.

### What it produces

- **PRD document**: Product context (vision, user profile, problem statement, principles, scope, NFRs) + feature sections, each containing user scenarios and rolled-up acceptance criteria + sequencing and milestones + cross-cutting decisions

### Who consumes it

- **ls-epic** (or an agent running ls-epic via ls-team-spec): Each feature section expands into a full epic with line-level ACs, TCs, data contracts, and story breakdown
- **ls-arch**: The PRD's product scope, feature boundaries, and cross-cutting product decisions inform the tech architecture
- **The human**: Uses sequencing and milestones to plan delivery rhythm and decide epic priority

### What the consumer needs to succeed

Each feature section must be rich enough that an epic-writing agent can expand it into a complete epic — flows, line-level ACs, TCs, scope boundaries — without needing to ask the human foundational questions about what the user does or what the feature accomplishes.

Specifically:

- **Scenarios**: The user situations and workflows covered by this feature, at enough detail that the epic writer decomposes them into flows rather than inventing flows from scratch
- **Rolled-up acceptance criteria**: Structured under their scenarios, specific enough that expanding to line-level ACs is decomposition, not invention. The confidence chain (AC → TC → Test → Implementation) starts here — these rolled-up ACs are the seed material. The PRD writer should think one layer down (what would the line-level ACs be?) and then compress back up
- **Scope boundaries**: Tight enough per feature that agents don't scope-creep individual epics. Clear in/out with pointers to where out-of-scope items are handled
### Quality signal

The ratio of refinement questions to foundational questions during epic expansion. Refinement questions are healthy — edge cases, interaction effects, scope judgment calls at the line level. Foundational questions ("what does the user actually do here?", "what's this feature supposed to accomplish?") mean the PRD didn't do its job.

### What it settles vs. what it leaves open

**Settles**: Product vision, user profiles, problem framing, feature scope boundaries, user scenarios per feature, rolled-up acceptance criteria, epic sequencing, milestones, product-level cross-cutting decisions

**Leaves open for ls-arch**: Architecture thesis, core stack, system shape, boundaries and flows, cross-cutting technical decisions, constraints that shape epics

**Leaves open for ls-epic**: Line-level acceptance criteria, test conditions, data contracts at system boundaries, story breakdown with AC mapping, flow-level detail within scenarios

**Leaves open for ls-tech-design**: Module decomposition, interface definitions, test mapping, implementation sequences, epic-scoped dependency/version grounding, verification scripts

---

## ls-arch

### What it is

The technical architecture document — the human's front-loaded technical investment that settles foundational decisions across 3-8 epics. Companion to the PRD. The PRD establishes what to build and why; the tech arch establishes what technical world it gets built in.

The north star: does the tech arch reduce the human's involvement in each downstream tech design to refinement-level engagement? Without a tech arch, the human participates in foundational technical decisions for every epic's tech design — stack choices, system shape, boundary design, auth model, error conventions. With a good tech arch, those decisions are inherited and the human's engagement shifts to epic-specific implementation questions.

### What it produces

- **Technical Architecture document**: Architecture thesis, core stack with research-grounded version choices, system shape, boundaries and flows, cross-cutting technical decisions (choice/rationale/consequence), constraints that shape epics, open questions for tech design

### Who consumes it

- **ls-tech-design** (primary): Inherits system context, stack decisions, cross-cutting patterns, and boundary design. The tech design starts from where the tech arch left off rather than re-deriving foundational decisions for each epic.
- **ls-epic** (indirectly): Technical constraints and system boundaries inform feature scoping and data contract decisions during epic writing
- **The human**: Uses it to validate that the technical foundation supports the product scope

### What the consumer needs to succeed

The tech design writer for any individual epic must be able to inherit the technical world — system shape, stack, boundaries, cross-cutting decisions — without needing to ask the human foundational technical questions. Every decision must carry rationale (what was decided, why, what downstream must respect) so tech designers understand the reasoning well enough to either follow it or flag a legitimate deviation.

Specifically:

- **Research-grounded stack decisions**: Every stack and technology choice must be grounded in current research, not training data. Models have a strong bias toward making firm stack decisions based on the comfort of their training corpus — recommending what they've seen most rather than what's currently best. This bias is strongest on exactly the high-level decisions the tech arch makes and it cascades through every downstream epic. Document the research alongside decisions — not just "Fastify 5" but "Fastify 5 — confirmed current stable, v5 required for [reason], checked [date]."
- **Multi-epic stack decisions vs. epic-scoped decisions**: The tech arch settles decisions that constrain multiple epics — changing one ripples across the whole product. Runtime, framework, frontend approach, data layer, auth, deployment model. Feature-specific library choices (adapters, parsers, connectors) belong in tech design. The test: would changing this decision require rework in other epics? If yes, tech arch. If no, tech design.
- **Cross-cutting decisions with rationale**: The rationale is what prevents re-litigation. A tech design that sees "Vanilla JS, not React" without knowing why might introduce React for "just this one component."
- **System boundaries at sufficient depth**: The tech arch typically covers 50k-20k ft depending on project complexity. There is expected overlap with tech design (25-30k ft down to ground level). The overlap band is variable — a project with complex boundaries might have a tech arch that goes to 20k on boundary design, a simpler project might stay at 35k. The tech design meets the tech arch wherever it stops and extends deeper.

### Quality signal

The same foundational-vs-refinement distinction as the PRD, applied to technical decisions. Foundational technical questions during tech design mean the tech arch didn't do its job: "What database are we using?", "What's the auth model?", "Is this a monolith or services?" Refinement technical questions are healthy and expected: "Should this feature use WebSocket or polling?", "Which Zod-Fastify adapter fits best?", "Should this module split into two files?"

### What it settles vs. what it leaves open

**Settles**: Architecture thesis, core stack (researched and versioned), system shape, major boundaries and communication patterns, cross-cutting technical decisions with rationale, constraints that affect epic scoping

**Leaves open for ls-epic**: Functional requirements, line-level ACs, TCs, data contracts (though boundary contracts in the tech arch inform these), story breakdown

**Leaves open for ls-tech-design**: Module decomposition, interface definitions, test mapping, implementation sequences, epic-scoped dependency choices, verification scripts. The tech design inherits the settled architecture and extends it to implementation depth.

### Living document, not decree

Downstream work regularly surfaces new facts that reveal the need to realign upstream decisions. When a tech design discovers a tech arch decision needs revision — whether through deeper dependency research, implementation reality, or evolved understanding — proceed with the better approach, document the deviation and rationale, and surface it upstream for backfill. The tech arch is the starting position for technical decisions, not an inviolable source of truth. Common sense and fresh appraisal of the problem space based on new knowledge, not artificial adherence to upstream documents.

---

## ls-epic

*Section pending — will be added when ls-epic is reviewed for deeper objective clarity beyond its current documented purpose.*

---

## ls-tech-design

### What it is

The downstream technical consumer of both the epic and (when it exists) the tech architecture document. Dual role: validates the epic is implementation-ready, then produces the architecture, interfaces, and test mapping that drive implementation. The tech design is where functional requirements meet implementation reality.

### What it produces

- **Tech design document(s)**: System context, module architecture, flow-by-flow design with sequence diagrams, interface definitions, dependency grounding, verification scripts, work breakdown with chunks
- **Test plan**: TC-to-test mapping, mock strategy, fixtures, chunk breakdown with test counts

Output is either 2 docs (index + test plan) or 4 docs (index + two domain companions + test plan). Never 3.

### Who consumes it

- **ls-publish-epic** (via BA/SM): Uses the chunk breakdown and tech design section references to shard the epic into individual stories with technical context
- **Implementation agents** (ls-team-impl, ls-team-impl-cc): Engineers or agents implement from published stories that carry tech design context — interfaces, test mappings, verification scripts
- **The human**: Validates that the design is buildable and that the chunk breakdown supports their delivery plan

### What the consumer needs to succeed

The BA/SM must be able to shard stories from the chunk breakdown. The Tech Lead must be able to add story-level technical sections from the design. The implementing engineer or agent must be able to build from published stories without reading the full tech design.

Specifically:

- **TC-to-test mapping**: Every TC from the epic maps to a specific test file and test description. This is the confidence chain made concrete — AC → TC → Test → Implementation. Gaps here mean untested requirements.
- **Interface definitions**: Copy-paste ready. Types, method signatures, component props. These become the skeleton stubs that implementation starts from.
- **Chunk breakdown with tech design section references**: Each chunk identifies which tech design sections are relevant to it. This directly supports story publishing — the references help select which tech design content goes into each story's technical section.
- **Verification scripts**: Defined before implementation begins. red-verify, verify, green-verify, verify-all. Stories reference these consistently.
- **Non-TC decided tests**: Edge cases, defensive tests, collision tests identified during design that aren't 1:1 with a TC. Must be assigned to chunks and carried forward into stories so they aren't lost.

### When a tech architecture document exists

The tech arch is an optional but high-value input. When it exists, the tech design inherits from it rather than re-deriving foundational decisions:

- **System context**: Starts from the tech arch's system shape and boundaries rather than establishing them from scratch. The tech design extends to implementation depth.
- **Stack decisions**: Core stack is inherited. The tech design grounds epic-scoped dependencies (feature-specific libraries, adapters, connectors) through its own research. It does not re-research settled stack decisions unless something during epic-scoped research surfaces an inconsistency.
- **Cross-cutting decisions**: Inherited. The tech design respects them unless implementation reality demands deviation — in which case, document the deviation, proceed with the better approach, and surface it for upstream backfill.
- **Altitude overlap**: The tech arch covers 50k-20k ft. The tech design covers 25-30k down to ground level. There is expected overlap where the tech design inherits and grounds itself in what the tech arch established, then extends deeper. The overlap band is variable — the tech design meets the tech arch wherever it stopped.

When no tech arch exists, the tech design derives all of this itself. The tech arch reduces human re-engagement during tech design; it doesn't gate it.

### Deviation handling

Upstream documents (PRD, tech arch, epic) are the starting position, not inviolable sources of truth. When the tech design discovers something needs to change — a stack choice that doesn't work for this epic's domain, a boundary that should be drawn differently, an AC that's ambiguous under implementation scrutiny — proceed with the better approach, document the deviation with rationale in the Issues Found table, and surface it upstream for backfill. Don't block progress on upstream approval. The orchestrator tracks the backfill task and the human reviews it.

### Quality signal

The BA/SM can shard stories from the design without asking clarifying questions about chunk boundaries or AC coverage. The Tech Lead can add story-level technical sections without asking clarifying questions about interfaces, test approaches, or verification. The implementing engineer can plan their work from published stories alone.

### What it settles vs. what it leaves open

**Settles**: Module decomposition, interface definitions (copy-paste ready), TC-to-test mapping, mock strategy, chunk breakdown with dependencies, verification scripts, epic-scoped dependency choices (researched and grounded), flow-by-flow design connecting ACs to implementation

**Leaves open for ls-publish-epic**: Story sharding decisions (which ACs group into which stories), story sequencing, business-friendly epic formatting

**Leaves open for implementation**: The actual code. The tech design provides the skeleton, the test contracts, and the verification gates. Implementation fills in the stubs and makes the tests pass.

---

*Sections for ls-publish-epic, lss-story, lss-tech, ls-team-spec, ls-team-impl, ls-team-impl-cc will be added as those skills are reviewed and updated.*
