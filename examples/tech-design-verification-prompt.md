# Tech Design Verification Prompt

Use this prompt template to have an agent critically review a Tech Design before handing off to Story Sharding (Phase 4).

---

## Prompt Template

**Critical Review: [Feature Name] Tech Design**

You are reviewing a Tech Design document for [brief description]. This is Phase 3 (Tech Design) of a Liminal Spec pipeline. The downstream consumer of this document is an Orchestrator who needs to derive executable stories and self-contained prompt packs from it.

**Step 1: Load liminal-spec Skill Context**

Read these files to understand the methodology and evaluation criteria:

1. **Core methodology:** `~/.claude/skills/liminal-spec/SKILL.md`
2. **Tech design guidance:** `~/.claude/skills/liminal-spec/references/tech-design.md`
3. **Tech design template:** `~/.claude/skills/liminal-spec/templates/tech-design.template.md`
4. **Testing reference:** `~/.claude/skills/liminal-spec/references/testing.md`
5. **Writing style:** `~/.claude/skills/liminal-spec/references/writing-style.md`

**Step 2: Review These Files**

1. **Tech Design (primary):** `[path to tech-design.md]`
2. **Feature Spec (for alignment):** `[path to feature-spec.md]`
3. **Codebase (for feasibility):** `[path to relevant source directories]`

**Important Boundary:** Story Sharding (Phase 4) follows Tech Design. The design defines architecture and interfaces — it does not need to specify prompt structure, story execution order, or agent coordination. If you identify orchestration concerns, note them as recommendations for the Orchestrator, not as design blockers.

**Step 3: Evaluation Criteria**

Assess the tech design against these criteria:

1. **Feature Spec Alignment**
   - Does every AC from the feature spec have a home in the module responsibility matrix?
   - Are data contracts from the spec reflected in interface definitions?
   - Do sequence diagrams cover all flows from the spec?
   - Were Tech Design Questions from the feature spec answered?
   - Any scope drift — things designed that weren't in the spec, or spec items missing from the design?

2. **TC → Test Mapping Completeness**
   - Does every TC from the feature spec map to a specific test file and test description?
   - Are test approaches appropriate for what's being verified (mock setup, assertion strategy)?
   - Are there TCs that can't be mapped? If so, is the TC untestable (spec issue) or is a test boundary missing (design issue)?

3. **Interface Completeness**
   - Are all types fully defined (not `any`, not `TODO`)?
   - Do hook/service return types cover all states (loading, error, success, empty)?
   - Are API function signatures complete with parameter types and return types?
   - Do component props / entry point parameters cover all interactions shown in sequence diagrams?

4. **Module Boundary Clarity**
   - Is it unambiguous which module owns each responsibility?
   - Is the mock boundary clearly identified (which modules get mocked in tests)?
   - Are there modules in the file tree that don't appear in the responsibility matrix, or vice versa?
   - Are dependencies between modules explicit?

5. **Altitude Coverage (The Spiral)**
   - Does High Altitude establish system context, external systems, and data flow?
   - Does Medium Altitude define module architecture with AC mapping and flow-by-flow design?
   - Does Low Altitude provide copy-paste ready interface definitions?
   - Are there redundant connections between altitudes (concepts appearing at multiple levels)?
   - Could someone enter at any section and navigate to related content?

6. **Chunk / Work Breakdown**
   - Is Chunk 0 (infrastructure) explicitly defined with types, fixtures, and error classes?
   - Does each subsequent chunk map to a coherent vertical slice of functionality?
   - Are chunk dependencies clear (what must complete before what)?
   - Are test count estimates provided per chunk?
   - Do running totals cascade correctly?

7. **Mock Boundary Correctness**
   - Are mocks at external boundaries (network, DB, filesystem), not internal module boundaries?
   - Does the testing strategy section explicitly state what gets mocked and what doesn't?
   - Are error response shapes defined for mock setup?

8. **Agent Readiness (Skeleton Phase)**
   - Are file paths exact and complete (not placeholder patterns)?
   - Are stub signatures copy-paste ready with `NotImplementedError` throws?
   - Could a fresh agent create the skeleton from this document alone, without asking questions?
   - Are test file names and test descriptions specific enough for TDD Red phase?

9. **Writing Quality**
   - Is the Context section substantive (3+ paragraphs establishing rich background)?
   - Is there more prose than tables in explanatory sections?
   - Are diagrams introduced with prose context, not orphaned?
   - Do sequence diagrams include AC annotations?

**Step 4: Report Format**

Provide your review in this structure:

```
## Overall Assessment
[READY / NOT READY] for Story Sharding

## Strengths
[What the design does well]

## Issues

### Critical (Must fix before Story Sharding)
[Issues that would prevent an Orchestrator from deriving stories]

### Major (Should fix)
[Issues that would cause confusion or rework during execution]

### Minor (Fix before handoff)
[Polish items — address these too, not just blockers]

## Missing Elements
[Anything that should be present but isn't]

## Spec Alignment Gaps
[ACs or TCs from the feature spec not reflected in the design]

## Recommendations
[Specific fixes, in priority order]

## Questions for the Tech Lead
[Clarifying questions that would improve the design]
```

Be thorough and critical. The goal is to catch issues before they compound into bad stories and broken prompts.

**Step 5: TC → Test Traceability Table**

As part of your review, produce a traceability table mapping every TC from the feature spec to its test in the design:

```
| TC | Test File | Test Description | Coverage Notes |
|----|-----------|------------------|----------------|
| TC-1.1a | Feature.test.tsx | shows loading during fetch | Covered |
| TC-1.2a | Feature.test.tsx | displays error on fetch failure | Missing retry assertion |
| TC-2.1a | — | — | No test mapped |
```

This table makes gaps immediately visible. If a TC has no test mapped, or the test description doesn't adequately cover the TC, flag it.

---

## Usage Notes

- Run this with a verification-oriented model (GPT 5x recommended for thoroughness and precision)
- Can also run with multiple agents in parallel for diverse perspectives
- Compare the TC → Test traceability table against the feature spec's AC → TC table for full chain coverage
- Critical and Major issues should be addressed before Story Sharding handoff
- The Orchestrator will also validate implicitly during Phase 4 — if they can't derive stories, the design goes back
