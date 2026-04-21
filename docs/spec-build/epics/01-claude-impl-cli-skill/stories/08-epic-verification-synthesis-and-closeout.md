# Story 8: Epic Verification, Synthesis, and Closeout

### Summary
<!-- Jira: Summary field -->
Materialize cleanup work, run epic-level verification and synthesis, and keep the final epic gate with the orchestrator before closeout.

### Description
<!-- Jira: Description field -->

**User Profile**

- **Primary User:** A Claude Code orchestration agent operating on behalf of a senior engineer or tech lead
- **Context:** Running a completed spec pack through a disciplined implementation workflow without relying on conversation memory or ad hoc orchestration
- **Mental Model:** "I load a finished spec pack, confirm the environment and options, launch the right workflow through the CLI, and supervise implementation and verification until the epic is complete."
- **Key Constraint:** Claude Code is always available. GPT model lanes depend on whether Codex CLI or Copilot CLI is available in the local environment.

**Objective**

After all stories are accepted, compile deferred and accepted-risk items into a cleanup artifact, review and execute the approved cleanup batch, run fresh epic-level verification, run mandatory synthesis, and leave the final epic gate with the orchestrator before closeout.

**In Scope**

- Pre-epic cleanup artifact and cleanup review flow
- Cleanup execution and verified cleaned state
- Epic verifier batch
- Mandatory epic synthesis
- Orchestrator-owned final epic gate

**Out of Scope**

- Story implementation
- Story verification and quick-fix loops
- Initial run setup and provider default resolution

**Dependencies**

- Story 7 complete
- All prior stories accepted
- Cleanup artifact materialized from prior story cycles

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-7.1:** Deferred and accepted-risk items are materialized before epic verification

- **TC-7.1a: Cleanup list compiled**
  - Given: All story-level work is complete
  - When: The run transitions toward epic verification
  - Then: Deferred and accepted-risk items from prior story cycles are compiled into a durable cleanup artifact

**AC-7.2:** Cleanup is reviewed before dispatch

- **TC-7.2a: Human review of cleanup batch**
  - Given: A cleanup artifact has been compiled
  - When: The orchestrator prepares to dispatch cleanup work
  - Then: The orchestrator reviews the categorized cleanup batch with the human before dispatching it

**AC-7.3:** Epic verification starts from the cleaned state rather than skipping outstanding tracked items

- **TC-7.3a: Cleanup before epic verification**
  - Given: The cleanup phase has produced approved fixes
  - When: The run proceeds to epic verification
  - Then: The orchestrator verifies the cleanup result before launching epic-level verification

**AC-8.1:** Epic-level verification is mandatory for every run

- **TC-8.1a: Multi-story epic**
  - Given: All stories in a multi-story epic are accepted
  - When: The implementation run reaches epic closeout
  - Then: The skill requires epic-level verification before final closeout
- **TC-8.1b: No skip path**
  - Given: The implementation run reaches epic closeout
  - When: The orchestrator is deciding next steps
  - Then: The skill does not treat epic-level verification as optional
- **TC-8.1c: Epic-level mock and shim audit**
  - Given: Epic-level verification is running
  - When: Epic verifiers review the implemented system
  - Then: They check for remaining inappropriate mocks, shims, placeholders, or fake adapters on production paths and report them explicitly

**AC-8.2:** Epic synthesis is mandatory for every run

- **TC-8.2a: Mandatory synthesis**
  - Given: Epic verifier reports have been collected
  - When: The epic verification workflow proceeds
  - Then: The orchestrator launches the synthesis workflow every run

**AC-8.3:** Epic synthesis is more than report merging

- **TC-8.3a: Synthesizer verifies reported issues**
  - Given: Epic verifier reports contain findings
  - When: The synthesis workflow runs
  - Then: The synthesizer independently checks and categorizes the reported issues before returning its result

**AC-8.4:** The orchestrator runs final epic verification commands itself

- **TC-8.4a: Final epic gate owned by orchestrator**
  - Given: Epic verification and synthesis are complete
  - When: The run is ready for final closeout
  - Then: The orchestrator runs the final epic acceptance gate itself rather than relying only on verifier and synthesizer reports

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant Data Contracts**

#### CLI Operations

| Operation | Purpose | Required Inputs | Expected Outputs | Outcome States |
|-----------|---------|-----------------|------------------|----------------|
| Launch pre-epic cleanup | Resolve deferred and accepted-risk items before epic verification | cleanup batch artifact, selected fix workflow, working directory | cleanup result and updated verification state | cleaned, needs-more-cleanup, blocked |
| Launch epic verifiers | Run epic-level verification | epic folder context, verifier configs, working directory | array of structured epic verifier results | pass, revise, block |
| Launch epic synthesis | Synthesize epic verification results | epic verifier reports, synthesis config, working directory | synthesized epic result | ready-for-closeout, needs-fixes, needs-more-verification, blocked |

#### Epic Cleanup Result

| Field | Description |
|-------|-------------|
| cleanup batch path | The reviewed cleanup artifact used for the cleanup run |
| files changed | Files changed during cleanup execution |
| change summary | Short description of cleanup corrections applied |
| gates run | Checks executed for the cleanup run |
| unresolved concerns | Cleanup items or risks that remain open |
| recommended next step | Whether the orchestrator should proceed, continue cleanup, or pause |
| outcome | `cleaned`, `needs-more-cleanup`, or `blocked` |

#### Epic Verifier Result

| Field | Description |
|-------|-------------|
| provider id | Provider/runtime used for the epic verifier |
| reviewer label | Distinguishes reviewers in the epic batch |
| cross-story findings | Integration and consistency findings |
| architecture findings | End-to-end architecture issues |
| epic AC/TC coverage assessment | Compliance and completeness findings |
| mock or shim audit findings | Remaining inappropriate mocks, shims, placeholders, or fake adapters on production paths |
| non-blocking and blocking findings | Categorized issues |
| unresolved items | Evidence gaps or uncertain claims |
| gate result | Result of the epic verification checks run by that verifier |

#### Epic Synthesis Result

| Field | Description |
|-------|-------------|
| confirmed issues | Findings the synthesizer validated |
| disputed or unconfirmed issues | Findings not validated cleanly |
| readiness assessment | Whether the epic appears ready for closeout |
| recommended next step | Additional fixes, additional verification, or closeout discussion |

#### Implementation Log Requirements Relevant to Closeout

The log must record:

- pre-epic-cleanup status
- epic-verification and synthesis status
- artifact paths used by the run
- enough state for the orchestrator to resume after interruption without reconstructing the run from conversation context

**Relevant Tech Design Sections**

- `tech-design-skill-process.md` -> Flow 3: Orchestrator State Ownership, Flow 4: Process Playbook and Command Routing
- `tech-design-cli-runtime.md` -> Flow 4: Epic Cleanup, Verification, and Synthesis, Epic Cleanup Result, Epic Verifier Result, Epic Synthesis Result, Artifact Persistence Layout
- `test-plan.md` -> cleanup, epic verifier, synthesis, CLI guide, and CLI IO contract suites

*See the tech design document for full architecture, implementation targets, and test mapping.*

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- Deferred and accepted-risk items are materialized before epic verification
- Cleanup review remains orchestrator/human owned before dispatch
- Epic verifier and synthesizer workflows both run before closeout
- Final epic gate remains orchestrator-owned
- Cleanup, epic verification, and synthesis artifacts are persisted for durable recovery and review
