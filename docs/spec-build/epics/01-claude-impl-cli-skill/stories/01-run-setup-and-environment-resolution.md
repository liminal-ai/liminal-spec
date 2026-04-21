# Story 1: Run Setup and Environment Resolution

### Summary
<!-- Jira: Summary field -->
Discover story order, verification gates, and the active provider/model defaults so the orchestrator can start the run with a validated configuration.

### Description
<!-- Jira: Description field -->

**User Profile**

- **Primary User:** A Claude Code orchestration agent operating on behalf of a senior engineer or tech lead
- **Context:** Running a completed spec pack through a disciplined implementation workflow without relying on conversation memory or ad hoc orchestration
- **Mental Model:** "I load a finished spec pack, confirm the environment and options, launch the right workflow through the CLI, and supervise implementation and verification until the epic is complete."
- **Key Constraint:** Claude Code is always available. GPT model lanes depend on whether Codex CLI or Copilot CLI is available in the local environment.

**Objective**

Complete the remaining setup work after Story 0 by reading all story files, discovering story and epic verification gates, resolving available provider lanes, applying deterministic role defaults, and recording the resolved run configuration in the durable log.

**In Scope**

- Full story inventory and recorded story order
- Verification-gate discovery and ambiguity handling
- Provider availability checks
- Role-specific model/harness defaults and degraded fallback behavior
- Recording the resolved run configuration in `team-impl-log.md`

**Out of Scope**

- Prompt assembly
- Public insert application
- Story implementation or verification execution
- Recovery after implementation has started

**Dependencies**

- Story 0 complete
- Completed spec-pack artifacts present and recognized

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-1.5:** The orchestrator reads all stories before starting implementation

- **TC-1.5a: Full story inventory**
  - Given: The epic folder contains multiple story files in `stories/`
  - When: The skill performs run initialization
  - Then: The orchestrator reads all stories and records the story order before Story 0 or Story 1 begins

**AC-1.6:** The skill discovers and records the verification gates before implementation starts

- **TC-1.6a: Gates discovered from project policy**
  - Given: The project exposes verification commands through policy docs, scripts, or CI configuration
  - When: The skill initializes the run
  - Then: The orchestrator identifies the story and epic verification gates and records them in `team-impl-log.md`
- **TC-1.6b: Gate policy ambiguous**
  - Given: Project policy does not clearly identify the required verification gate
  - When: The skill initializes the run
  - Then: The orchestrator pauses to resolve the ambiguity before starting story implementation

**AC-2.1:** Claude-only lanes are always available to the orchestrator

- **TC-2.1a: Claude baseline**
  - Given: The orchestrator is a Claude Code agent
  - When: The skill resolves available lanes
  - Then: Claude model lanes are always included in the available role options

**AC-2.2:** Codex CLI is the preferred GPT provider when available

- **TC-2.2a: Codex available**
  - Given: Codex CLI is available
  - When: The skill resolves provider options
  - Then: GPT model defaults for eligible roles are assigned to Codex-backed lanes
- **TC-2.2b: Codex unavailable, Copilot available**
  - Given: Codex CLI is unavailable and Copilot CLI is available
  - When: The skill resolves provider options
  - Then: GPT model defaults for eligible roles are assigned to Copilot-backed lanes
- **TC-2.2c: Neither Codex nor Copilot available**
  - Given: Neither GPT-capable CLI is available
  - When: The skill resolves provider options
  - Then: The skill switches the run to Claude-only defaults and records that change explicitly

**AC-2.3:** The skill defines role-specific available models, defaults, and fallback rules

- **TC-2.3a: Story implementor defaults**
  - Given: Codex CLI is available
  - When: The skill resolves story implementor defaults
  - Then: Story implementation defaults to Codex `gpt-5.4 high`
- **TC-2.3b: Story implementor Claude fallback**
  - Given: No GPT-capable CLI is available
  - When: The skill resolves story implementor defaults
  - Then: Story implementation defaults to Claude Sonnet high
- **TC-2.3c: Story verifier defaults**
  - Given: Codex CLI is available
  - When: The skill resolves story verifier defaults
  - Then: The default verifier pair is `gpt-5.4 extra high` plus Claude Sonnet high
- **TC-2.3d: Story verifier Claude-only fallback**
  - Given: No GPT-capable CLI is available
  - When: The skill resolves story verifier defaults
  - Then: The default verifier pair uses Claude-only verifier roles and records the weaker diversity condition
- **TC-2.3e: Epic verification defaults**
  - Given: GPT-capable lanes and Claude lanes are both available
  - When: The skill resolves epic-level verification defaults
  - Then: The epic verifier set and synthesizer default are selected from the defined allowed models and recorded in the run configuration

**AC-2.4:** The orchestrator records resolved role defaults in `team-impl-log.md`

- **TC-2.4a: Run configuration recorded**
  - Given: Provider and model resolution completed
  - When: The skill finishes environment setup
  - Then: `team-impl-log.md` records available providers, active defaults, and any degraded fallback conditions for the run

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant Data Contracts**

#### Role Model Matrix

| Role | Primary Use | Default | Fallback | Session Shape |
|------|-------------|---------|----------|---------------|
| Orchestrator | Run setup, routing, interpretation, final gates | Claude Code orchestration agent | none | Retained interactive session |
| Story implementor | Main story implementation | Codex `gpt-5.4 high` when Codex CLI is available | Copilot `gpt-5.4 high`, then Claude Sonnet high | Retained per-story session |
| Story verifier | Fresh story review | Default pair: `gpt-5.4 extra high` plus Claude Sonnet high when GPT lanes are available | Claude-only verifier pair when GPT lanes are unavailable | Fresh session per verifier run |
| Quick fixer | Small, bounded correction work | General-purpose quick-fix agent using run defaults | Any available lighter-weight lane allowed by the run | Fresh lightweight session |
| Epic verifier | Full-epic verification | Configured epic verifier set for the run | Claude-only epic verifier set when GPT lanes are unavailable | Fresh session per verifier run |
| Epic synthesizer | Verify and consolidate epic-level findings | Primary synthesis model for the run | Claude fallback synthesizer when GPT lanes are unavailable | Fresh one-shot session |

#### CLI Operation: Initialize / Inspect Run Context

| Operation | Purpose | Required Inputs | Expected Outputs | Outcome States |
|-----------|---------|-----------------|------------------|----------------|
| Initialize / inspect run context | Validate the spec pack and environment | epic folder path, optional explicit configuration | resolved spec-pack shape, provider availability, role defaults, detected inserts | ready, needs-user-decision, blocked |

#### Implementation Log Requirements

The log must record:

- active provider/model choices and verification-gate configuration
- story sequence, dependencies, and current progress across stories
- cumulative test progression and regression-relevant baseline information
- enough state for the orchestrator to resume after interruption without reconstructing the run from conversation context

**Relevant Tech Design Sections**

- `tech-design-skill-process.md` -> Default Resolution Algorithm, Verification Gate Discovery, Flow 1, Flow 2
- `tech-design-cli-runtime.md` -> Run Configuration Contract, Provider Availability Matrix, Flow 1: Inspect and Preflight, Verification Gate Resolution
- `tech-design.md` -> Canonical Gate Mapping, Work Breakdown Summary

*See the tech design document for full architecture, implementation targets, and test mapping.*

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- Story order is resolved and recorded before implementation begins
- Story and epic gate commands are discovered or an explicit user-decision pause is raised
- Role defaults are resolved deterministically from available providers
- Claude-only degraded mode is handled explicitly when no GPT lane exists
- `team-impl-log.md` records the resolved configuration and degraded-diversity state when applicable
