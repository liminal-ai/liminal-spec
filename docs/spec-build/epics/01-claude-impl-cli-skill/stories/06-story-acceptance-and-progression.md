# Story 6: Story Acceptance and Progression

### Summary
<!-- Jira: Summary field -->
Keep final story acceptance with the orchestrator and record durable receipts, baselines, and progression state before moving to the next story.

### Description
<!-- Jira: Description field -->

**User Profile**

- **Primary User:** A Claude Code orchestration agent operating on behalf of a senior engineer or tech lead
- **Context:** Running a completed spec pack through a disciplined implementation workflow without relying on conversation memory or ad hoc orchestration
- **Mental Model:** "I load a finished spec pack, confirm the environment and options, launch the right workflow through the CLI, and supervise implementation and verification until the epic is complete."
- **Key Constraint:** Claude Code is always available. GPT model lanes depend on whether Codex CLI or Copilot CLI is available in the local environment.

**Objective**

Preserve the orchestrator’s control over final story acceptance. Once implementation and verification are complete, the orchestrator must run the final story gate itself, record a durable receipt with evidence and dispositions, compare cumulative test baselines, and only then progress to the next story.

**In Scope**

- Orchestrator-owned final story gate
- Pre-acceptance receipt in `team-impl-log.md`
- Cumulative progression based on durable evidence
- Test-count regression protection

**Out of Scope**

- Resume after interruption
- Cleanup and epic verification
- Provider execution details

**Dependencies**

- Story 5 complete
- Implementor and verifier results available

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-5.5:** The orchestrator runs the final story acceptance gate itself

- **TC-5.5a: Story gate owned by orchestrator**
  - Given: Story implementation and verification appear complete
  - When: The story is ready for acceptance
  - Then: The orchestrator runs the final story acceptance gate itself rather than relying only on verifier evidence

**AC-6.1:** Story acceptance requires explicit recorded evidence

- **TC-6.1a: Pre-acceptance receipt**
  - Given: A story is ready for acceptance
  - When: The orchestrator completes the acceptance decision
  - Then: `team-impl-log.md` records the implementation evidence, verification evidence, gate results, dispositions, and open risks for that story

**AC-6.2:** Story progression uses cumulative evidence rather than ad hoc memory

- **TC-6.2a: Cumulative progression**
  - Given: One story has been accepted
  - When: The orchestrator prepares to start the next story
  - Then: The skill uses the committed codebase, the story order, the log, and recorded cumulative expectations to guide the transition
- **TC-6.2b: Test-count regression check**
  - Given: One story has been accepted and a later story is ready for acceptance
  - When: The orchestrator compares the current test total to the prior accepted baseline
  - Then: A lower-than-expected test total is treated as a regression that blocks acceptance until resolved

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant Data Contracts**

#### Implementation Log Requirements

The log must record:

- current run state and overall run status
- active provider/model choices and verification-gate configuration
- story sequence, dependencies, and current progress across stories
- artifact paths used by the run
- story-level checkpoints with evidence references, gate results, commit outcomes, and open items
- cumulative test progression and regression-relevant baseline information

#### Implementor Result Fields Used in Receipts

| Field | Description |
|-------|-------------|
| provider id | Provider/runtime used for the implementor |
| story id and title | Story identity |
| change inventory | Files changed and why |
| test summary | Tests added, modified, removed, and total count after story |
| gates run and gate results | What was executed and what passed or failed |
| self-review findings fixed | Issues found and fixed during the self-review loop |
| self-review findings surfaced | Uncertain or unresolved issues sent back to the orchestrator |
| spec deviations | Any divergence from story, tech design, or test plan |
| recommended next step | Orchestrator routing recommendation |

#### Story Verifier Result Fields Used in Receipts

| Field | Description |
|-------|-------------|
| verifier label | Distinguishes verifier instances in the same batch |
| findings | Structured findings with severity and evidence |
| gates run and gate results | What checks were executed |
| recommended next step | `pass`, `revise`, or `block` |
| open questions | Unsettled issues |

**Relevant Tech Design Sections**

- `tech-design-skill-process.md` -> Story Receipt Contract, `team-impl-log.md`, Flow 3 and Flow 4
- `tech-design.md` -> Verification Scripts, Canonical Gate Mapping
- `test-plan.md` -> skill/process contract tests, log-template tests, CLI IO contract tests

*See the tech design document for full architecture, implementation targets, and test mapping.*

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- The final story gate remains orchestrator-owned
- Each accepted story gets a receipt with evidence, gate results, dispositions, and open risks
- Story-to-story progression uses logged baselines and story order rather than memory
- Test-count regression blocks progression until resolved
