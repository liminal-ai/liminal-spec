# Story 7: Resume and Recovery

### Summary
<!-- Jira: Summary field -->
Recover an implementation run from durable files on disk instead of relying on orchestration conversation context.

### Description
<!-- Jira: Description field -->

**User Profile**

- **Primary User:** A Claude Code orchestration agent operating on behalf of a senior engineer or tech lead
- **Context:** Running a completed spec pack through a disciplined implementation workflow without relying on conversation memory or ad hoc orchestration
- **Mental Model:** "I load a finished spec pack, confirm the environment and options, launch the right workflow through the CLI, and supervise implementation and verification until the epic is complete."
- **Key Constraint:** Claude Code is always available. GPT model lanes depend on whether Codex CLI or Copilot CLI is available in the local environment.

**Objective**

Let the orchestrator restart cleanly after interruption, compaction, or lost tool-call context by relying on `team-impl-log.md` and the durable result artifacts produced by prior CLI calls, plus any already-persisted run configuration for the same epic folder.

**In Scope**

- Resume from `team-impl-log.md`
- Resume using prior CLI result artifacts on disk
- Recovery without access to prior orchestration conversation context

**Out of Scope**

- Story acceptance
- Cleanup and epic verification
- New provider default resolution

**Dependencies**

- Story 6 complete
- Durable log, config, and command-result artifacts present on disk

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-6.3:** Recovery does not depend on preserving orchestration conversation context

- **TC-6.3a: Resume after interruption**
  - Given: The orchestrator session is interrupted after implementation work has started
  - When: The skill is loaded again in the same epic folder
  - Then: The orchestrator can resume from `team-impl-log.md` and the durable artifacts created by prior CLI calls
- **TC-6.3b: Resume after context stripping**
  - Given: Prior tool-call context is no longer present in the orchestration session
  - When: The run resumes
  - Then: The skill continues from files on disk rather than requiring the prior full conversation

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant Data Contracts**

#### Implementation Log Requirements

The log must record:

- current run state and overall run status
- story sequence, dependencies, and current progress across stories
- artifact paths used by the run
- enough state for the orchestrator to resume after interruption without reconstructing the run from conversation context

#### Implementor Result Fields Relevant to Continuation

| Field | Description |
|-------|-------------|
| provider id | Provider/runtime used for the implementor |
| session id | Identifier required to continue the same implementor session |
| story id and title | Story identity |
| recommended next step | Orchestrator routing recommendation |

**Relevant Tech Design Sections**

- `tech-design-skill-process.md` -> State Enum, `team-impl-log.md` Template, Durable Artifact Rules, Flow 3
- `tech-design-cli-runtime.md` -> Continuation Handle Contract, `story-continue` Resolution Rules, Artifact Persistence Layout
- `test-plan.md` -> log-template contract tests, security guardrail tests, CLI IO contract tests

*See the tech design document for full architecture, implementation targets, and test mapping.*

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- The orchestrator can resume from durable files on disk without prior conversation context
- Continuation/session identifiers are persisted and readable from recorded artifacts
- Recovery relies on `team-impl-log.md` and prior CLI result artifacts, plus any already-persisted run configuration for the same spec-pack root, rather than hidden runtime state
