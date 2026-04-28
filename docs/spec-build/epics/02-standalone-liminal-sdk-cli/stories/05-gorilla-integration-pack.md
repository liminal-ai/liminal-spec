# Story 5: Gorilla Integration Pack

### Summary
<!-- Jira: Summary field -->

Ship a real fixture spec pack, reset tooling, an agent-readable gorilla prompt, and an evidence template that exercise every operation against real data and applicable providers.

### Description
<!-- Jira: Description field -->

**User Profile:** Liminal Spec maintainer publishing the implementation runtime as a reusable npm package

**Objective:** Provide the release-verification layer that walks the actual package through real operations and catches drift classes that narrower automated tests miss.

**Scope In:**
- Realistic but small fixture spec pack in the source repository
- Target codebase for operations to mutate
- Reset tool for repeatable runs
- Gorilla prompt covering every operation
- Evidence template for agent-run reporting
- Demonstrated drift detection from an intentionally introduced mismatch

**Scope Out:**
- Shipping fixtures in the npm tarball
- Skill migration to use the package
- Any modification under `processes/impl-cli/` or `processes/codex-impl/`; work lands in `packages/ls-cli/` and supporting repo-root config/docs only

**Dependencies:**
- Story 4 captured-output and real-harness baseline
- Repository source tree available for committed gorilla artifacts

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-5.4:** A gorilla fixture spec pack exists in the package's source repository, sized to be realistic but small enough to run end-to-end in a reasonable time window. The fixture is a development and release-verification artifact; it lives in the repository source tree but is excluded from the published tarball through the files allowlist.

- **TC-5.4a:** Fixture present and complete in source
  - Given: The new package's source repository
  - When: A reviewer inspects the gorilla fixture directory
  - Then: It contains a valid spec pack — `epic.md`, a `tech-design.md` (and any companion docs), `test-plan.md`, and a small `stories/` directory — plus a target codebase for operations to act on
- **TC-5.4b:** Fixture excluded from published artifact
  - Given: A tarball produced by `npm pack`
  - When: The tarball contents are listed
  - Then: The gorilla fixture directory is not present in the tarball

**AC-5.5:** A reset tool restores the gorilla fixture to a clean state for re-runs.

- **TC-5.5a:** Reset returns fixture to baseline
  - Given: A gorilla fixture directory after one or more operation runs have mutated it
  - When: The reset tool runs
  - Then: The fixture directory matches its committed baseline state byte-for-byte

**AC-5.6:** The gorilla prompt instructs an agent to walk every operation in the package against the fixture, exercising each applicable provider.

- **TC-5.6a:** Coverage of operations
  - Given: The gorilla prompt
  - When: A reviewer inspects it against the operation inventory
  - Then: Every operation in the package's CLI surface has at least one explicit invocation in the prompt
- **TC-5.6b:** Coverage of providers
  - Given: The gorilla prompt
  - When: A reviewer inspects provider-invocation guidance
  - Then: Each applicable provider (Claude Code, Codex, Copilot) is exercised at least once for the operations that consume providers

**AC-5.7:** The gorilla evidence template structures the agent's report in a way a maintainer can read and act on without reconstructing context.

- **TC-5.7a:** Evidence template captures verification axes
  - Given: The gorilla evidence template
  - When: A reviewer inspects its sections
  - Then: It includes sections for each operation invoked, the envelope returned, the artifact verified, the continuation handle exercised (if applicable), and any divergence between expected and actual shape
- **TC-5.7b:** End-to-end run produces a valid evidence report
  - Given: An agent has completed a gorilla run following the prompt
  - When: The evidence report is parsed against the template
  - Then: All required sections are populated and the report flags any unexpected behavior the agent observed

**AC-5.8:** The gorilla pack catches the failure modes its design targets — mock-vs-real drift, format assumptions, ins/outs mismatches, and bad assumptions about persistence shape.

- **TC-5.8a:** Drift class detected
  - Given: A deliberately introduced parser drift (a mock that no longer matches the real provider output)
  - When: The gorilla run executes the operation that uses that parser
  - Then: The agent's evidence report flags the divergence

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant boundary contracts**

**Gorilla Artifact Contract**

| Artifact | Required Contents |
|----------|-------------------|
| Fixture spec pack | `epic.md`, `tech-design.md` and companions if present, `test-plan.md`, and a small `stories/` directory |
| Target codebase | Real data/code surface for operations to inspect or mutate |
| Reset tool | Restores fixture and target codebase to committed baseline state byte-for-byte |
| Gorilla prompt | Explicit invocation coverage for every CLI operation and each applicable provider |
| Evidence template | Structured sections for operation invoked, returned envelope, verified artifact, continuation-handle exercise, and divergence notes |

**Gorilla Coverage Expectations**

| Concern | Required Coverage |
|---------|-------------------|
| Operation coverage | Every CLI operation invoked at least once |
| Provider coverage | Each applicable provider exercised at least once for provider-consuming flows |
| Drift detection | At least one deliberately introduced drift case is detected and surfaced in evidence |
| Tarball boundary | Fixture remains in source only and is excluded from `npm pack` output |

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

**CliArtifactRef**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| kind | string | yes | Artifact kind (for example, `result-envelope`, `progress-snapshot`) |
| path | string | yes | Filesystem path to the persisted artifact |

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

- [ ] Gorilla fixture spec pack exists in source and is excluded from the tarball
- [ ] Reset tool restores the fixture to baseline
- [ ] Gorilla prompt covers every operation
- [ ] Provider coverage is explicit where applicable
- [ ] Evidence template is structured and parseable
- [ ] A deliberate drift case is detected by the gorilla flow
- [ ] No file under `processes/impl-cli/` or `processes/codex-impl/` was modified
