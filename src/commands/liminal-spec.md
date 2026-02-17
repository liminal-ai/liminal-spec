---
name: liminal-spec
description: |
  Spec-driven development for agentic coding. SDLC-phased pipeline with context isolation
  and artifact handoff. Use when building features with detailed requirements, complex
  integrations, or multi-agent coordination.
---

<!-- ON LOAD: Present the following to the user exactly when this command is invoked, then wait for their response. -->

# Liminal Spec

A spec-driven development system for features with detailed requirements and complex integrations. Runs a rigorous, phased approach from product direction through implementation, where each phase produces an artifact the next phase reads cold.

The traceability chain (requirement -> test condition -> test -> code) means that when tests go green, confidence is high that implementation actually matches intent.

## The Phases

┌─────────────────────┬───────────────────────────┬───────────────────────────────────────────────────────┐
│        Phase        │           Skill           │                   Start Here If...                    │
├─────────────────────┼───────────────────────────┼───────────────────────────────────────────────────────┤
│ 1. Product Research │ /ls-research              │ You need to explore direction before defining a       │
│                     │                           │ feature                                               │
├─────────────────────┼───────────────────────────┼───────────────────────────────────────────────────────┤
│ 2. Epic             │ /ls-epic                  │ Most common entry point. You know what you want to   │
│                     │                           │ build                                                 │
├─────────────────────┼───────────────────────────┼───────────────────────────────────────────────────────┤
│ 3. Tech Design      │ /ls-tech-design           │ You have a complete epic ready for architecture       │
├─────────────────────┼───────────────────────────┼───────────────────────────────────────────────────────┤
│ 4. Story Sharding   │ /ls-story                 │ Design is done, ready to break into executable work   │
├─────────────────────┼───────────────────────────┼───────────────────────────────────────────────────────┤
│ 5. Execution        │ /ls-impl                  │ Stories are sharded, ready to implement               │
└─────────────────────┴───────────────────────────┴───────────────────────────────────────────────────────┘

Most work starts at **Phase 2**. Tell me what you are building and which phase you are starting from.

## When to Use

- New features with multiple components or integration points.
- Complex business logic where requirements need precision.
- Multi-agent builds where context isolation matters.

Not for quick bug fixes, single-file tweaks, spikes, or emergency patches.

## How It Works

Tell me what you want to build and where you are in the process. I will route to the correct phase skill.

Based on the user's response, invoke the appropriate skill:
- Phase 1 (Product Research) -> use Skill tool: "liminal-spec:ls-research"
- Phase 2 (Epic) -> use Skill tool: "liminal-spec:ls-epic"
- Phase 3 (Tech Design) -> use Skill tool: "liminal-spec:ls-tech-design"
- Phase 4 (Story Sharding) -> use Skill tool: "liminal-spec:ls-story"
- Phase 5 (Execution) -> use Skill tool: "liminal-spec:ls-impl"

If the user is unclear about phase:
- Need product exploration or stakeholder alignment first? -> Phase 1
- Have feature requirements but need a complete implementation-ready spec? -> Phase 2
- Have a complete epic and need architecture/interfaces? -> Phase 3
- Have epic + design and need executable stories/prompts? -> Phase 4
- Have stories/prompts and need implementation + verification? -> Phase 5
