# State Management

Liminal Spec uses state files to maintain continuity across sessions and agents.

## Project State File

Location: `.sdd/state.json`

```json
{
  "project": "feature-name",
  "currentPhase": "tech-design",
  "status": "in-progress",
  "artifacts": {
    "functionalSpec": {
      "path": "./specs/feature.spec.md",
      "status": "complete",
      "acCount": 24,
      "tcCount": 89
    },
    "techDesign": {
      "path": "./specs/feature.tech-design.md",
      "status": "in-progress"
    },
    "workPlan": {
      "totalStories": 5,
      "completedStories": 0
    }
  },
  "testState": {
    "totalTests": 0,
    "passing": 0
  }
}
```

## State Transitions

```
NEW → SPEC_IN_PROGRESS → SPEC_COMPLETE →
DESIGN_IN_PROGRESS → DESIGN_COMPLETE →
BUILD_IN_PROGRESS → STORY_N_COMPLETE → ... →
BUILD_COMPLETE → VERIFIED
```

## Agent State Files

Each long-context agent maintains session state:

- `.sdd/product-research-state.md` — Product research (if used)
- `.sdd/feature-spec-state.md` — Feature specification
- `.sdd/tech-design-state.md` — Tech design
- `.sdd/story-sharding-state.md` — Story sharding / orchestration

### Agent State Structure

```markdown
# [Agent] State

## Current Work
- [What I'm doing]
- [Where I left off]

## Decisions Made
- [Key decisions this session]

## Open Questions
- [Unresolved items]

## Next Steps
- [What to do on resume]
```

## State Update Rules

### Update Before Compacts
When context window is filling:
1. Write current state to file
2. Note exact stopping point
3. Include any pending decisions

### Update After Major Milestones
- AC batch complete
- TC coverage complete
- Story complete
- Artifact complete

### Update on Interruption
If work is interrupted:
1. Save immediately
2. Note incomplete work
3. List what needs finishing

## Recovery Process

### After Session Reset

1. Read project state file
2. Determine current phase
3. Read agent-specific state
4. Load relevant artifacts
5. Resume from documented point

### After Context Compression

1. Check for summary quality
2. Read state files immediately
3. Verify understanding against artifacts
4. Continue or ask for clarification

## Artifact Handoffs

**Artifacts are the handoff mechanism.** No conversation state transfers between agents.

| From | To | Artifact |
|------|-----|----------|
| Product Research | Feature Specification | PRD (if used) |
| Feature Specification | Tech Design | Feature Spec |
| Tech Design | Story Sharding | Tech Design doc |
| Story Sharding | Implementation | Story + Prompt Pack |
| Implementation | Verification | Implementation + Test Results |

**Rule:** If it's not in an artifact, it doesn't exist for the next agent.

This is the core principle of context isolation. The artifact IS the handoff.
