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

+---------------------+---------------------------+-------------------------------------------------------+
|        Phase        |           Skill           |                   Start Here If...                    |
+---------------------+---------------------------+-------------------------------------------------------+
| 1. Product Research | /ls-research              | You need to explore direction before defining a       |
|                     |                           | feature                                               |
+---------------------+---------------------------+-------------------------------------------------------+
| 2. Epic             | /ls-epic                  | Most common entry point. You know what you want to   |
|                     |                           | build                                                 |
+---------------------+---------------------------+-------------------------------------------------------+
| 3. Tech Design      | /ls-tech-design           | You have a complete epic ready for architecture       |
+---------------------+---------------------------+-------------------------------------------------------+
| 4. Publish Epic     | /ls-publish-epic          | Epic done, ready for individual story files            |
|                     |                           | (+ optional business epic) with Jira markers           |
+---------------------+---------------------------+-------------------------------------------------------+

Most work starts at **Phase 2**. Tell me what you are building and which phase you are starting from.

## Simple Pipeline (Story-Sized Work)

For focused changes that don't warrant the full pipeline -- a single capability, a contained feature addition, a focused change. Same rigor, fewer phases.

+---------------------+---------------------------+-------------------------------------------------------+
|        Phase        |           Skill           |                   Start Here If...                    |
+---------------------+---------------------------+-------------------------------------------------------+
| S1. Simple Story    | /lss-story                | You have story-sized work and want epic-quality ACs   |
+---------------------+---------------------------+-------------------------------------------------------+
| S2. Simple Tech     | /lss-tech                 | You have a functional story ready for inline tech     |
|                     |                           | design + enrichment                                   |
+---------------------+---------------------------+-------------------------------------------------------+

Use the simple pipeline when scope is 1-2 flows and ~5-15 ACs. If scope grows beyond that, escalate to the full pipeline.

## Team Orchestration

For orchestrating spec creation or implementation with agent teams in tmux. The orchestrator spawns teammates, manages drafters/verifiers/Codex subagents, routes verification, and makes judgment calls.

+---------------------+---------------------------+-------------------------------------------------------+
|        Phase        |           Skill           |                   Start Here If...                    |
+---------------------+---------------------------+-------------------------------------------------------+
| Team Spec           | /ls-team-spec             | You want to orchestrate the full spec pipeline        |
|                     |                           | with Codex-fenced agent teams in tmux                 |
+---------------------+---------------------------+-------------------------------------------------------+
| Team Implementation | /ls-team-impl             | You have complete stories and want to orchestrate     |
|                     |                           | agent team implementation in tmux                     |
+---------------------+---------------------------+-------------------------------------------------------+
| Team Impl (CLI)     | /ls-team-impl-c           | You have complete stories and want to orchestrate     |
|                     |                           | agent teams with Codex or Copilot CLI in tmux         |
+---------------------+---------------------------+-------------------------------------------------------+
| Subagent Impl (CC)  | /ls-subagent-impl-cc      | You have complete stories and want to orchestrate     |
|                     |                           | Claude Code subagent implementation with staged TDD   |
+---------------------+---------------------------+-------------------------------------------------------+

## When to Use

**Full pipeline** (ls-*):
- New features with multiple components or integration points.
- Complex business logic where requirements need precision.
- Multi-agent builds where context isolation matters.

**Simple pipeline** (lss-*):
- Focused changes with clear scope (one capability, one story).
- Feature additions that don't require multi-story sequencing.
- Work where full epic/tech-design/sharding overhead isn't justified.

**Neither pipeline:**
Not for quick bug fixes, single-file tweaks, spikes, or emergency patches.

## How It Works

Tell me what you want to build and where you are in the process. I will route to the correct skill.

Based on the user's response, invoke the appropriate skill:
- Phase 1 (Product Research) -> use Skill tool: "liminal-spec:ls-research"
- Phase 2 (Epic) -> use Skill tool: "liminal-spec:ls-epic"
- Phase 3 (Tech Design) -> use Skill tool: "liminal-spec:ls-tech-design"
- Phase 4 (Publish Epic) -> use Skill tool: "liminal-spec:ls-publish-epic"
- Simple Story (focused change) -> use Skill tool: "liminal-spec:lss-story"
- Simple Tech (enrich simple story) -> use Skill tool: "liminal-spec:lss-tech"
- Team spec (orchestrate full spec pipeline with agent teams in tmux) -> use Skill tool: "liminal-spec:ls-team-spec"
- Team implementation (orchestrate agent team implementation in tmux) -> use Skill tool: "liminal-spec:ls-team-impl"
- Team implementation with CLI (orchestrate agent teams with Codex or Copilot CLI in tmux) -> use Skill tool: "liminal-spec:ls-team-impl-c"
- Subagent implementation with Claude Code (orchestrate Claude Code subagents with staged TDD) -> use Skill tool: "liminal-spec:ls-subagent-impl-cc"

If the user is unclear about phase:
- Need product exploration or stakeholder alignment first? -> Phase 1
- Have feature requirements but need a complete implementation-ready spec? -> Phase 2
- Have a complete epic and need architecture/interfaces? -> Phase 3
- Have a complete epic and need individual story files for handoff (+ optional business epic)? -> Phase 4
- Have a focused change (one story, not a full epic)? -> Simple Story
- Have a functional story from lss-story ready for tech enrichment? -> Simple Tech
- Want to orchestrate the full spec pipeline (epic through stories) with agent teams? -> Team Spec
- Have complete stories and want to orchestrate implementation with agent teams in tmux? -> Team Implementation
- Have complete stories and want to orchestrate with agent teams using Codex or Copilot CLI? -> Team Impl (CLI)
