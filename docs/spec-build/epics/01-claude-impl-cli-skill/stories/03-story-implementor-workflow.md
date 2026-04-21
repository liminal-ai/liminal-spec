# Story 3: Story Implementor Workflow

### Summary
<!-- Jira: Summary field -->
Launch the retained story implementor, keep it in the same session across self-review, and return a structured implementor result with continuation details.

### Description
<!-- Jira: Description field -->

**User Profile**

- **Primary User:** A Claude Code orchestration agent operating on behalf of a senior engineer or tech lead
- **Context:** Running a completed spec pack through a disciplined implementation workflow without relying on conversation memory or ad hoc orchestration
- **Mental Model:** "I load a finished spec pack, confirm the environment and options, launch the right workflow through the CLI, and supervise implementation and verification until the epic is complete."
- **Key Constraint:** Claude Code is always available. GPT model lanes depend on whether Codex CLI or Copilot CLI is available in the local environment.

**Objective**

Execute one story implementation call through the CLI, keep the implementor in a retained session for that story, run evolving self-review passes inside the same session, apply only non-controversial fixes automatically, and return a structured result that the orchestrator can route and persist.

**In Scope**

- Story implementor launch through the CLI
- Retained-session continuity for implementor + self-review
- Three-pass self-review with evolving prompts
- Automatic application of non-controversial fixes only
- Structured implementor result with continuation/session fields

**Out of Scope**

- Fresh verifier batch execution
- Quick-fix workflow
- Story acceptance and progression
- Resume from interruption after the orchestrator session is lost

**Dependencies**

- Story 2 complete
- Prompt assembly and reading-journey contracts available
- Run config resolved and provider availability confirmed

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-4.1:** Story implementation is launched through a documented CLI contract

- **TC-4.1a: Implementor launch**
  - Given: The orchestrator is ready to start a story
  - When: It calls the story implementor CLI operation
  - Then: The CLI accepts the documented inputs, reads the specified spec-pack artifacts, and returns a structured implementation result

**AC-4.2:** The story implementor remains a retained session for the duration of the story workflow unless replaced

- **TC-4.2a: Same-session continuity**
  - Given: Story implementation completes successfully
  - When: Self-review begins
  - Then: Self-review runs in the same implementor session rather than a fresh session
- **TC-4.2b: Session continuation fields returned**
  - Given: The CLI finishes a story implementation call
  - When: It returns the structured result
  - Then: The result includes the provider identifier and session identifier required to continue that implementor session later

**AC-4.3:** Default self-review uses three passes with evolving prompts

- **TC-4.3a: Three self-review passes**
  - Given: A story implementation call reaches self-review
  - When: The CLI runs the default self-review cycle
  - Then: It runs three self-review passes unless the workflow stops early because of a blocking condition
- **TC-4.3b: Evolving self-review prompt**
  - Given: The CLI is running multiple self-review passes
  - When: It advances from one pass to the next
  - Then: Each pass adjusts the self-review prompt so the implementor does not repeat the same review request unchanged

**AC-4.4:** Self-review applies only non-controversial fixes automatically

- **TC-4.4a: Non-controversial fix**
  - Given: A self-review pass finds a clear and local correction with no meaningful design ambiguity
  - When: The implementor can fix it confidently
  - Then: The CLI allows that fix to be applied during the same story implementation call
- **TC-4.4b: Uncertain fix**
  - Given: A self-review pass finds a potential issue but the implementor is not confident the change is the right fix
  - When: The self-review cycle completes
  - Then: The issue is surfaced to the orchestrator for routing instead of being fixed automatically

**AC-4.5:** The implementor returns a structured report suitable for orchestration and later verification

- **TC-4.5a: Structured implementation result**
  - Given: Story implementation and self-review complete
  - When: The CLI returns the implementor result
  - Then: The result includes identity fields, planning summary, changed files, tests added or changed, gates run, self-review findings, open questions, any spec deviations, and a recommended next step

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant Data Contracts**

#### CLI Operations

| Operation | Purpose | Required Inputs | Expected Outputs | Outcome States |
|-----------|---------|-----------------|------------------|----------------|
| Launch story implementor | Start story implementation | story id, role config, prompt assembly inputs, working directory | structured implementor result, provider id, session id | ready-for-verification, needs-followup-fix, needs-human-ruling, blocked |
| Continue story implementor | Continue the retained implementor session | provider id, session id, follow-up prompt contract | continued implementor result | ready-for-verification, needs-followup-fix, needs-human-ruling, blocked |

#### Implementor Result

| Field | Description |
|-------|-------------|
| provider id | Provider/runtime used for the implementor |
| session id | Identifier required to continue the same implementor session |
| story id and title | Story identity |
| plan summary | ACs, TCs, non-TC tests, approach, likely failure modes |
| change inventory | Files changed and why |
| test summary | Tests added, modified, removed, and total count after story |
| test-count delta | Change in test total from the prior accepted story baseline |
| gates run and gate results | What was executed and what passed or failed |
| self-review findings fixed | Issues found and fixed during the self-review loop |
| self-review findings surfaced | Uncertain or unresolved issues sent back to the orchestrator |
| open questions | Blocking uncertainties |
| spec deviations | Any divergence from story, tech design, or test plan |
| recommended next step | Orchestrator routing recommendation |

**Relevant Tech Design Sections**

- `tech-design-cli-runtime.md` -> Flow 2: Story Implementation and Continuation, Continuation Handle Contract, Implementor Result Contract, Self-Review Rules, Provider Adapters
- `tech-design-skill-process.md` -> Flow 4: Process Playbook and Command Routing
- `test-plan.md` -> Prompt assembly, story implementor, provider adapter, and result-contract suites

*See the tech design document for full architecture, implementation targets, and test mapping.*

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- Story implementation launches through the public CLI contract
- Implementor self-review stays in the same session and uses evolving prompts
- Only non-controversial self-review fixes are auto-applied
- Uncertain fixes are surfaced instead of hidden
- Implementor result includes continuation/session identity and all routing fields needed by the orchestrator
