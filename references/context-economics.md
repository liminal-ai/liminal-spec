# Context Economics

**Why Liminal Spec uses multiple agents with artifact handoff instead of one long conversation.**

## The Core Problem

AI agents have fundamental limitations:

| Problem | Description |
|---------|-------------|
| **Context rot** | Attention degrades as context grows |
| **Lost in the middle** | Middle of context gets less attention than start/end |
| **Tool result bloat** | Tool calls accumulate and dominate context |
| **Negotiation baggage** | Accumulated assumptions and back-and-forth clutter |
| **State tracking failures** | Agents lose track of decisions over long conversations |

## The Solution: Agents = Context Isolation

**"Agents" doesn't mean roleplay personas. It means fresh context with artifact handoff.**

```
Agent 1 (planning context)
    │
    └── Produces artifact (Feature Spec)
              │
              ▼
Agent 2 (fresh context)
    │
    ├── Reads artifact cold
    └── No negotiation history
              │
              └── Produces artifact (Tech Design)
                        │
                        ▼
Agent 3 (fresh context)
    ...
```

The artifact (document) IS the handoff. Not a summary. Not "see above." The complete document.

---

## Why This Works

### 1. No Negotiation Baggage

A fresh agent reads the artifact as-is. No "well, we discussed maybe doing it differently" or "I think earlier you said..." 

The artifact is the source of truth. The conversation that produced it is gone.

### 2. Expansion Ratios

Each phase expands the prior artifact:

| Input | Output | Ratio |
|-------|--------|-------|
| Requirements | Feature Spec | ~6x |
| Feature Spec | Tech Design | ~6-7x |
| Tech Design chunk | Story + Prompts (500 lines) | varies |

A single context trying to hold requirements + spec + design + implementation = bloat. Separate contexts give each phase room to breathe.

### 3. Planner ≠ Coder

**Planning context:** Exploratory, iterative, accumulates tool calls, can tolerate some rot.

**Execution context:** Precise, focused, fresh context per phase, cannot tolerate rot.

Don't make the context that explored 15 files and had 3 rounds of revision the same one that implements. The coder should receive clean, decided instructions.

### 4. Artifact as Interface

The artifact IS the handoff. Not a summary of what we discussed. Not "see the conversation above." The document itself contains everything needed.

This is why artifacts must be complete and self-contained:
- Feature spec includes all ACs and TCs
- Tech design includes all interfaces and test mapping
- Prompt pack includes all context needed for execution

---

## Practical Application

### Fresh Context per Phase

For execution phases (Skeleton, Red, Green), start fresh:

```
Phase 1 Prompt → Fresh Session → Execute → Complete
Phase 2 Prompt → Fresh Session → Execute → Complete
```

No accumulated exploration noise. Just prompt + execute.

### State Files for Recovery

When an agent session ends (compaction, crash, human break), state files enable recovery:

```
.sdd/state.json        # Project state
.sdd/feature-spec-state.md   # Feature spec session state
.sdd/tech-design-state.md    # Tech design session state
```

The next agent (or resumed agent) reads state, loads relevant artifacts, continues.

→ Details: `references/state-management.md`

### Long Session with Checkpoints

For planning phases (Feature Spec, Tech Design), use checkpoints:

```
Start Session
  │
  ├── Work on section 1
  ├── [Checkpoint: Update state file]
  │
  ├── Work on section 2  
  ├── [Checkpoint: Update state file]
  │
  ├── Context getting large...
  └── [Compact: Summarize, update state, continue fresh]
```

### Parallel Agent Sessions

For research or validation, spawn short-lived agents:

```
Main Session (orchestrator)
  │
  ├── Spawn: Research Agent → Returns findings
  ├── Spawn: Validation Agent → Returns issues
  │
  └── Continue with results (not with their full context)
```

Sub-agents have isolated context. They return findings, not their entire conversation.

---

## The Economics

| Approach | Tokens | Quality |
|----------|--------|---------|
| One long conversation | Accumulates to limit | Degrades over time |
| Agent pipeline with artifacts | Resets per phase | Consistent quality |

The "cost" of artifacts (writing them, reading them in new context) is paid back by:
- Higher quality execution
- Debuggable handoffs (you can read what was passed)
- Recovery capability (state files + artifacts)
- Parallelization potential

---

## Anti-Patterns

**❌ "Let me continue where we left off"**
If "where we left off" is buried in 100k tokens of conversation, the agent won't find it reliably. Use state files.

**❌ "Remember when we discussed X"**
If X matters, it should be in the artifact. If it's not in the artifact, the next agent won't know it.

**❌ "I'll just keep going in this context"**
Context rot is real. If you notice quality degrading, that's the signal to checkpoint and continue fresh.

**❌ "The spec is in the conversation above"**
Conversations are not artifacts. Extract the decisions into a document. That document is the artifact.

**❌ Treating agents as roleplay**
"Be the BA persona" is not the point. Fresh context with artifact handoff is the point. The "role" is just scope, not a character to play.
