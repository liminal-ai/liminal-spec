# Story 5: Fix Routing and Quick Fix

### Summary
<!-- Jira: Summary field -->
Support bounded quick-fix execution and preserve unresolved-fix routing instead of hiding uncertainty.

### Description
<!-- Jira: Description field -->

**User Profile**

- **Primary User:** A Claude Code orchestration agent operating on behalf of a senior engineer or tech lead
- **Context:** Running a completed spec pack through a disciplined implementation workflow without relying on conversation memory or ad hoc orchestration
- **Mental Model:** "I load a finished spec pack, confirm the environment and options, launch the right workflow through the CLI, and supervise implementation and verification until the epic is complete."
- **Key Constraint:** Claude Code is always available. GPT model lanes depend on whether Codex CLI or Copilot CLI is available in the local environment.

**Objective**

Turn review and self-review output into clean routing behavior. Small, well-bounded fixes should go through a first-class quick-fix workflow. Uncertain fixes or verifier disagreements should stay visible to the orchestrator rather than being silently flattened into false certainty.

**In Scope**

- Quick-fix workflow as a first-class bounded correction path
- Preservation of implementor uncertainty
- Preservation of verifier disagreement
- Clear routing signals for orchestrator follow-up

**Out of Scope**

- Dual verifier launch itself
- Story acceptance and progression
- Epic-level cleanup or closeout

**Dependencies**

- Story 4 complete
- Verifier results or implementor self-review findings available

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-5.3:** Quick fixer is a first-class correction workflow

- **TC-5.3a: Quick-fix routing**
  - Given: The orchestrator identifies a small, clearly bounded correction
  - When: It chooses the quick-fix path
  - Then: The skill provides a narrow quick-fix contract rather than sending the issue through full story re-implementation
- **TC-5.3b: Quick-fix contract remains explicit**
  - Given: The quick fixer is used
  - When: The workflow is launched
  - Then: The quick-fix handoff still uses a defined contract even though it is lighter than full implementor prompting

**AC-5.4:** Unresolved or uncertain fixes are routed by the orchestrator rather than hidden

- **TC-5.4a: Implementor uncertainty**
  - Given: The implementor or self-review finds an issue but is not confident in the best change
  - When: The structured result is returned
  - Then: The issue is surfaced to the orchestrator for a routing decision
- **TC-5.4b: Verifier disagreement**
  - Given: Two story verifiers disagree materially on whether a finding is real or blocking
  - When: The orchestrator reviews the results
  - Then: The skill supports fresh follow-up verification or human escalation rather than pretending the disagreement is resolved

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant Data Contracts**

#### CLI Operations

| Operation | Purpose | Required Inputs | Expected Outputs | Outcome States |
|-----------|---------|-----------------|------------------|----------------|
| Continue story implementor | Continue the retained implementor session | provider id, session id, follow-up prompt contract | continued implementor result | ready-for-verification, needs-followup-fix, needs-human-ruling, blocked |
| Launch quick fixer | Run a bounded correction workflow | fix request, affected scope, role config | structured quick-fix result | ready-for-verification, needs-more-routing, blocked |

#### Quick Fix Request

| Field | Description |
|-------|-------------|
| prompt/request text | The main bounded fix request |
| affected scope | Optional target files, file list, or narrow area of change |
| working directory | Project directory where the fix runs |
| provider/model override | Optional override when the orchestrator wants a non-default quick-fix lane |
| acceptance hint | Optional gate command, validation hint, or expected outcome |

#### Quick Fix Result

| Field | Description |
|-------|-------------|
| provider id | Provider/runtime used for the quick fix |
| files changed | Files added, modified, or deleted |
| change summary | Short description of the fix applied |
| gates run | Any checks the quick fixer ran, if applicable |
| unresolved concerns | Anything the quick fixer did not close confidently |
| recommended next step | Return to verification, additional routing, or human review |

#### Implementor Result Fields Relevant to Routing

| Field | Description |
|-------|-------------|
| self-review findings surfaced | Uncertain or unresolved issues sent back to the orchestrator |
| open questions | Blocking uncertainties |
| recommended next step | Orchestrator routing recommendation |

**Relevant Tech Design Sections**

- `tech-design-cli-runtime.md` -> Flow 3: Story Verification and Quick Fix, Quick Fix Result Contract, `story-continue` Resolution Rules
- `tech-design-skill-process.md` -> Flow 4: Process Playbook and Command Routing
- `test-plan.md` -> quick-fix, verifier disagreement, CLI IO, and security guardrail suites

*See the tech design document for full architecture, implementation targets, and test mapping.*

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- Quick-fix execution is available as a bounded path distinct from full re-implementation
- Uncertain implementor findings are surfaced rather than auto-fixed
- Verifier disagreements remain visible for orchestrator or human adjudication
- Quick-fix results are explicit enough to support safe re-verification
