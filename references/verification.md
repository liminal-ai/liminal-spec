# Verification: The Scrutiny Gradient

**Upstream = more scrutiny. Errors compound downward.**

The feature spec gets the most attention because if it's on track, everything else follows. If it's off, everything downstream is off.

## The Gradient

```
Feature Spec:  ████████████████████ Every line
Tech Design:   █████████████░░░░░░░ Detailed review
Stories:       ████████░░░░░░░░░░░░ Key things + shape
Prompts:       ██████░░░░░░░░░░░░░░ Shape + intuition  
Implementation:████░░░░░░░░░░░░░░░░ Spot checks + tests
```

## Feature Spec Verification (MOST SCRUTINY)

This is the linchpin. Read and verify EVERY LINE.

### Verification Steps

1. **BA self-review** — Critical review of own work. Fresh eyes on what was just written.

2. **Tech Lead validation** — Fresh context. The Tech Lead validates the spec is properly laid out for tech design work:
   - Can I map every AC to implementation?
   - Are data contracts complete and realistic?
   - Are there technical constraints the BA missed?
   - Do flows make sense from implementation perspective?

3. **Additional model validation** — Another perspective (different model, different strengths):
   - Different model, different strengths
   - Adversarial/diverse perspectives catch different issues

4. **Fix all issues, not just blockers** — Severity tiers (Critical/Major/Minor) set fix priority order, not skip criteria. Address all issues before handoff. Minors at the spec level compound downstream — zero debt before code exists.

5. **Validation rounds** — Run validation until no substantive changes are introduced, typically 1-3 rounds. The Tech Lead also validates before designing — a built-in final gate. Number of rounds is at the user's discretion.

6. **Human review (CRITICAL)** — Read and parse EVERY LINE:
   - Can you explain why each AC matters?
   - No "AI wrote this and I didn't read it" items
   - This is the document that matters most

## Tech Design Verification

Still detailed review, but less line-by-line than feature spec.

### What to Check

- Structure matches methodology expectations
- TC-to-test mapping is complete
- Interface definitions are clear
- Phase breakdown makes sense
- No circular dependencies

### Who Validates

- **Tech Lead self-review** — Critical review of own work
- **Orchestrator validation** — Can I derive stories from this? Can I generate proper prompts?

## Story and Prompt Verification

Less line-by-line, more shape and intuition.

### What to Check

- Pick out key things to look for
- Intuitively judge the shape
- "Looks about right or not"
- Running test totals are accurate

### Prompt Validation (Multi-Agent)

Before giving prompts to the Senior Engineer:

1. **Orchestrator self-review** — Does the prompt have everything needed?
2. **Senior Engineer preview** — Can a fresh agent understand and execute?
3. **Different model review** — Different model reviews prompts against summary
4. **Cross-check with tech design** — Do prompts cover all chunks?

The Senior Engineer validates prompts by executing them. If they can't execute cleanly, the prompt isn't ready.

## Implementation Verification

Spot checks + automated tests.

### What to Check

- Tests pass (full suite)
- Types check clean
- Lint passes
- Spot check implementation against tech design
- Gorilla testing catches "feels wrong" moments

---

## Multi-Agent Validation Pattern

Liminal Spec uses this pattern throughout:

| Artifact | Author Reviews | Consumer Reviews |
|----------|---------------|------------------|
| Feature Spec | BA self-review | Tech Lead (needs it for design) |
| Tech Design | Tech Lead self-review | Orchestrator (needs it for stories) |
| Prompts | Orchestrator self-review | Senior Engineer + different model |

### Why This Works

1. **Author review** — Catches obvious issues, forces author to re-read
2. **Consumer review** — Downstream consumer knows what they need from the artifact
3. **Different model** — Different strengths catch different issues
4. **Fresh context** — No negotiation baggage, reads artifact cold

### The Key Pattern: Author + Downstream Consumer

If the Tech Lead can't build a design from the feature spec → spec isn't ready.
If the Orchestrator can't derive stories from tech design → design isn't ready.
If the Senior Engineer can't execute from prompt → prompt isn't ready.

**The downstream consumer is the ultimate validator.**

---

## Orchestration

**Opus orchestrates validation passes.** Launches subagents for:
- Self-reviews
- Downstream consumer validation
- Different model passes

### Challenge

Hard to prescribe exact orchestration in a skill. 

### Solution

This skill describes:
- **WHAT to validate** — Which artifacts, which aspects
- **WHEN to validate** — Checkpoints in the flow

Leaves flexible:
- **HOW to validate** — Which models, how many passes
- **Specific orchestration** — Based on your setup and preferences

---

## Checkpoints

### Before Tech Design

- [ ] Feature Spec complete
- [ ] BA self-review done
- [ ] Model validation complete
- [ ] All issues addressed (Critical, Major, and Minor)
- [ ] Validation rounds complete
- [ ] Tech Lead validated: can design from this
- [ ] Human reviewed every line

### Before Stories

- [ ] Tech Design complete (all altitudes: system context, modules, interfaces)
- [ ] Tech Lead self-review done (completeness, richness, writing quality, agent readiness)
- [ ] Model validation complete (different model for diverse perspective)
- [ ] All issues addressed (Critical, Major, and Minor)
- [ ] Validation rounds complete (no substantive changes remaining)
- [ ] TC → Test mapping complete (every TC from feature spec maps to a test)
- [ ] Orchestrator validated: can derive stories from this
- [ ] Human reviewed structure and coverage

### Before Execution

- [ ] Stories and prompts complete
- [ ] Orchestrator self-review done
- [ ] Senior Engineer validated: can execute from prompts
- [ ] Different model reviewed prompts

### Before Ship

- [ ] All tests pass
- [ ] Gorilla testing complete
- [ ] Verification checklist passes
- [ ] Human has seen it work
