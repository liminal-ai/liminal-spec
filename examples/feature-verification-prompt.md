# Feature Specification Verification Prompt

Use this prompt template to have an agent critically review a Feature Specification before handing off to Tech Design.

---

## Prompt Template

**Critical Review: [Feature Name] Feature Specification**

You are reviewing a Feature Specification for [brief description]. This is Phase 2 (Feature Specification) of an SDD pipeline.

**Step 1: Load liminal-spec Skill Context**

Read these files to understand the methodology and evaluation criteria:

1. **Core methodology:** `~/.claude/skills/liminal-spec/SKILL.md`
2. **Feature spec guidance:** `~/.claude/skills/liminal-spec/references/feature-specification.md`
3. **Writing style:** `~/.claude/skills/liminal-spec/references/writing-style.md`

**Step 2: Review These Files**

1. **Feature Spec (primary):** `[path to feature-spec.md]`
2. **Product Brief (for alignment):** `[path to product-brief.md]`
3. **Reference Implementation (if applicable):** `[path to similar existing code]`

**Step 3: Evaluation Criteria**

Assess the feature spec against these criteria:

1. **Functional vs Technical Balance**
   - Is the spec appropriately functional (what) rather than technical (how)?
   - Are technical details limited to contracts and constraints?
   - Are implementation decisions properly deferred to Tech Design?

2. **Completeness**
   - Does User Profile have all four fields (Primary User, Context, Mental Model, Key Constraint)?
   - Is there a Feature Overview describing what the user can do after that they can't do today?
   - Do User Flows cover all paths including error cases?
   - Does every AC have at least one TC?
   - Are scope boundaries explicit (In Scope, Out of Scope, Assumptions)?
   - Were Non-Functional Requirements considered (performance, security, observability)? If applicable, are they documented?

3. **Traceability**
   - Can you trace from User Profile → Flows → ACs → TCs?
   - Are TC IDs properly linked to ACs?

4. **Testability**
   - Can each AC be verified as true/false?
   - Are ACs specific (no "appropriate" or "properly")?
   - Do TCs have clear structure? (Given/When/Then for behavioral checks, numbered steps for sequential flows, tables for input/output comparisons)

5. **Alignment with Product Brief**
   - Does the feature spec deliver on the product brief's vision?
   - Is broader context reflected appropriately?

6. **Reference Implementation Consistency** (if applicable)
   - Does it follow proven patterns where applicable?
   - Similar ergonomics and conventions?

7. **Story Breakdown**
   - Is there a Recommended Story Breakdown section?
   - Does Story 0 (infrastructure) cover types, fixtures, and error classes?
   - Do Feature Stories (1-N) cover all ACs?
   - Do stories sequence logically (read before write, happy path before edge cases)?

8. **Tech Design Readiness**
   - Could a Tech Lead design from this spec without asking clarifying questions?
   - Are technical unknowns identified but appropriately scoped?
   - Are data contracts clear enough to implement against?

**Step 4: Report Format**

Provide your review in this structure:

```
## Overall Assessment
[READY / NOT READY] for Tech Design

## Strengths
[What the spec does well]

## Issues

### Critical (Must fix before Tech Design)
[Issues that would block a Tech Lead from designing]

### Major (Should fix)
[Issues that would cause confusion or rework]

### Minor (Nice to fix)
[Polish items, not blocking]

## Missing Elements
[Anything that should be present but isn't]

## Recommendations
[Specific fixes, in priority order]

## Questions for the BA
[Clarifying questions that would improve the spec]
```

Be thorough and critical. The goal is to catch issues before they compound downstream.

---

## Usage Notes

- Run this with a verification-oriented model (GPT 5.2 recommended for pedantic detail)
- Can also run with multiple agents in parallel for diverse perspectives
- Compare results across reviewers to find consensus issues vs edge cases
- Critical and Major issues should be addressed before Tech Design handoff
