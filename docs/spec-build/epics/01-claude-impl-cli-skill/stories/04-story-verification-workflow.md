# Story 4: Story Verification Workflow

### Summary
<!-- Jira: Summary field -->
Launch two fresh story verifiers by default and return structured, evidence-bound verifier reports for orchestrator comparison.

### Description
<!-- Jira: Description field -->

**User Profile**

- **Primary User:** A Claude Code orchestration agent operating on behalf of a senior engineer or tech lead
- **Context:** Running a completed spec pack through a disciplined implementation workflow without relying on conversation memory or ad hoc orchestration
- **Mental Model:** "I load a finished spec pack, confirm the environment and options, launch the right workflow through the CLI, and supervise implementation and verification until the epic is complete."
- **Key Constraint:** Claude Code is always available. GPT model lanes depend on whether Codex CLI or Copilot CLI is available in the local environment.

**Objective**

Provide fresh, evidence-bound story verification that is independent from the retained implementor session. The verifier batch must return enough structure for the orchestrator to compare findings, identify gaps, and decide whether the story passes, needs revision, or is blocked.

**In Scope**

- Dual fresh verifier launch by default
- Fresh-session re-verification behavior
- Structured verifier reports with findings, coverage, gate results, and mock/shim audits

**Out of Scope**

- Quick-fix execution
- Same-session implementor continuation
- Story acceptance and progression
- Epic-level verification and synthesis

**Dependencies**

- Story 3 complete
- Implementor result and changed code/test surfaces available for review

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-5.1:** Story verification defaults to two fresh verifiers

- **TC-5.1a: Default dual verification**
  - Given: The orchestrator launches story verification with no verifier-count override
  - When: The CLI runs the workflow
  - Then: The CLI launches two fresh verifier runs
- **TC-5.1b: Fresh verifier sessions**
  - Given: Story verification has already run once for the story
  - When: Re-verification is needed
  - Then: The next verifier run uses fresh verifier sessions rather than reusing prior verifier sessions

**AC-5.2:** Each story verifier returns a structured, evidence-bound report

- **TC-5.2a: Verifier report contract**
  - Given: A story verifier finishes its review
  - When: The CLI returns the verifier result
  - Then: The result includes identity fields, artifacts-read information, findings, requirement coverage, gate results, recommended next step, and routing guidance
- **TC-5.2b: Additional observations surfaced**
  - Given: A story verifier notices observations that do not rise to the level of formal findings
  - When: The CLI returns the verifier result
  - Then: The result includes those additional observations rather than dropping them silently
- **TC-5.2c: Mock and shim audit**
  - Given: A story verifier reviews implementation that claims to satisfy an integration-facing story
  - When: The verifier evaluates the story result
  - Then: The verifier checks for inappropriate mocks, shims, placeholders, or fake adapters that allow tests to pass without exercising the intended implementation path and reports them explicitly

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant Data Contracts**

#### Story Verifier Role

| Role | Primary Use | Default | Fallback | Session Shape |
|------|-------------|---------|----------|---------------|
| Story verifier | Fresh story review | Default pair: `gpt-5.4 extra high` plus Claude Sonnet high when GPT lanes are available | Claude-only verifier pair when GPT lanes are unavailable | Fresh session per verifier run |

#### CLI Operation: Launch Story Verifiers

| Operation | Purpose | Required Inputs | Expected Outputs | Outcome States |
|-----------|---------|-----------------|------------------|----------------|
| Launch story verifiers | Run story verification | story id, verifier configs, prompt assembly inputs, working directory | array of structured verifier results | pass, revise, block |

#### Story Verifier Result

| Field | Description |
|-------|-------------|
| provider id | Provider/runtime used for the verifier |
| verifier label | Distinguishes verifier instances in the same batch |
| story id and title | Story identity |
| artifacts read | What the verifier actually read |
| review scope summary | What the verifier focused on |
| findings | Structured findings with severity and evidence |
| verified and unverified ACs/TCs | Requirement coverage outcome |
| gates run and gate results | What checks were executed |
| mock or shim audit findings | Any inappropriate mocks, shims, placeholders, or fake adapters found during verification |
| recommended next step | `pass`, `revise`, or `block` |
| recommended fix scope | Same-session implementor, quick fix, fresh fix path, or human ruling |
| open questions | Unsettled issues |
| additional observations | What else the verifier noticed but did not include as a formal finding |

**Relevant Tech Design Sections**

- `tech-design-cli-runtime.md` -> Flow 3: Story Verification and Quick Fix, Story Verifier Result Contract, Provider Adapters
- `tech-design-skill-process.md` -> Flow 4: Process Playbook and Command Routing
- `test-plan.md` -> story verifier, provider adapter, result contract, prompt asset contract, and security guardrail suites

*See the tech design document for full architecture, implementation targets, and test mapping.*

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- Story verification launches two fresh verifier sessions by default
- Re-verification does not reuse previous verifier sessions
- Verifier results include evidence-bound findings, requirement coverage, gate results, and routing guidance
- Mock/shim audit behavior is explicit for integration-facing stories
