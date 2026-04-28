# Story 4: Real-Harness Integration Tests + Captured-Output Contract Tests

### Summary
<!-- Jira: Summary field -->

Add captured real-provider fixtures, parser-contract tests, and an env-gated real-provider integration suite that exercises the highest-drift scenarios.

### Description
<!-- Jira: Description field -->

**User Profile:** Liminal Spec maintainer publishing the implementation runtime as a reusable npm package

**Objective:** Catch mock-versus-real drift before release by testing captured outputs on default CI and exercising real provider CLIs in a gated workflow.

**Scope In:**
- Captured real-provider output fixtures
- Parser-level contract tests on default CI
- Env-gated real-provider integration suite
- Smoke, resume, structured-output, and stall coverage across Claude Code, Codex, and Copilot

**Scope Out:**
- Gorilla prompt, reset tool, and evidence template
- Publish workflow and tag-gated release logic
- Any modification under `processes/impl-cli/` or `processes/codex-impl/`; work lands in `packages/ls-cli/` and supporting repo-root config/docs only

**Dependencies:**
- Story 3 canonical contracts and regression fixes
- Real provider binaries available in the integration environment

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-5.1:** An automated integration test suite drives real provider CLIs across the scenarios that most often surface drift.

- **TC-5.1a:** Smoke per provider
  - Given: A spec pack and a working provider binary (Claude Code, Codex, or Copilot)
  - When: The smoke test invokes a basic operation under that provider
  - Then: The operation completes, returns a valid envelope, and produces the expected artifact
- **TC-5.1b:** Resume per provider
  - Given: An operation that produced a continuation handle
  - When: A subsequent operation invokes resume with that handle
  - Then: The provider continues the prior session and produces a valid envelope
- **TC-5.1c:** Structured-output parsing per provider
  - Given: A real provider run that produces structured output
  - When: The package parses the provider's stdout
  - Then: The parsed payload matches the schema and is forwarded to the SDK return value unchanged
- **TC-5.1d:** Stall and silence detection per provider
  - Given: A provider configured to produce no output for longer than the configured silence timeout
  - When: The package is invoked
  - Then: The package classifies the run as stalled, terminates the subprocess cleanly, and returns a `PROVIDER_STALLED` error

**AC-5.2:** The automated integration suite is gated by an environment flag and never runs on default CI runs.

- **TC-5.2a:** Default CI run skips the suite
  - Given: A default CI workflow run with no integration env flag set
  - When: The test command runs
  - Then: The integration suite is skipped and reports as such; no real provider is invoked
- **TC-5.2b:** Opt-in workflow runs the suite
  - Given: A separate CI workflow with the integration env flag set
  - When: The test command runs
  - Then: The integration suite executes against real providers and reports per-provider results

**AC-5.3:** Parser-level contract tests fed by captured real provider output run on every default CI run.

- **TC-5.3a:** Captured-output contract tests on default CI
  - Given: The default CI workflow
  - When: The test command runs
  - Then: Captured-output contract tests execute against the parser using the committed fixture samples and pass without invoking real providers
- **TC-5.3b:** Drift detection
  - Given: A change to the parser that breaks compatibility with a real captured sample
  - When: The default CI workflow runs
  - Then: The contract test fails with a clear diff between expected and actual parsed shape

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant boundary contracts**

**Integration Coverage Matrix**

| Layer | Runtime Surface | Required Scope |
|-------|-----------------|----------------|
| Parser-contract tests | Default CI | Captured real-provider samples parsed without invoking real providers |
| Real-harness integration suite | Env-gated workflow | Smoke, resume, structured-output, and stall scenarios across Claude Code, Codex, and Copilot |

**Captured Fixture Provenance Contract**

| Field | Requirement |
|-------|-------------|
| Provider | Fixture identifies which real provider produced the captured output |
| Command/scenario | Fixture identifies the command or scenario class it represents |
| Capture date | Fixture provenance records when the sample was captured |
| Usage | Fixture is committed and consumed by parser-contract tests on default CI |

**Integration Workflow Gate**

| Condition | Expected Behavior |
|-----------|-------------------|
| Integration env flag absent | Real-provider suite is skipped |
| Integration env flag present in dedicated workflow | Real-provider suite executes and reports per-provider results |

**CLI Output Envelope**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| command | string | yes | Name of the command that produced the envelope |
| version | integer | yes | Envelope schema version; consumers branch on this |
| status | enum | yes | One of `ok`, `needs-user-decision`, `blocked`, `error` |
| outcome | string | yes | Command-specific outcome string for human display |
| result | object | no | Command-specific structured result; absent on hard failure |
| errors | array of CliError | yes | Empty when status is `ok` |
| warnings | array of string | yes | Non-fatal messages; may be empty |
| artifacts | array of CliArtifactRef | yes | Persisted artifact paths; may be empty |
| startedAt | ISO 8601 UTC | yes | Timestamp when the command began execution |
| finishedAt | ISO 8601 UTC | yes | Timestamp when the envelope was finalized |

**CliError**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | yes | Stable error code from the package's error taxonomy |
| message | string | yes | Human-readable summary |
| detail | string | no | Optional context detail; not parsed by callers |

**Operation Inventory**

| Operation | Purpose | Continuation Handle |
|-----------|---------|---------------------|
| inspect | Validate spec pack and return inventory | no |
| preflight | Resolve provider availability and verification gates | no |
| epic-synthesize | Generate or refresh epic-level synthesis output | no |
| epic-verify | Run epic-level verification | no |
| epic-cleanup | Run pre-epic-verification cleanup | no |
| quick-fix | Apply a one-shot fix | no |
| story-implement | Implement a single story | yes |
| story-continue | Resume implementation from a continuation handle | yes |
| story-self-review | Run N self-review passes on a story | yes |
| story-verify | Run story-level verification | no |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- [ ] Captured real-provider fixtures are committed with provenance
- [ ] Parser-contract tests run on default CI
- [ ] Real-provider integration suite is env-gated
- [ ] Smoke, resume, structured-output, and stall scenarios are covered
- [ ] Per-provider results are visible from the integration workflow
- [ ] No file under `processes/impl-cli/` or `processes/codex-impl/` was modified
