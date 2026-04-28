# Story 3: Runtime Contract Hardening

### Summary
<!-- Jira: Summary field -->

Harden the public runtime surface by versioning contracts, replacing string-matched errors, deriving schemas from canonical contracts, making writes atomic and concurrency-safe, filtering subprocess environments, and fixing the two known regressions.

### Description
<!-- Jira: Description field -->

**User Profile:** Liminal Spec maintainer publishing the implementation runtime as a reusable npm package

**Objective:** Remove the contract-drift and runtime-safety edges that are acceptable in an internal bundled runtime but not in a published package.

**Scope In:**
- Envelope and persisted-state version markers
- Typed error taxonomy
- Canonical schema derivation
- Atomic writes for artifacts, progress, and status
- Concurrency-safe artifact-index reservation
- Subprocess env allowlist
- Fixes for Codex retained-session reuse and Codex preflight auth-unknown fallback

**Scope Out:**
- New user-facing operations
- Skill migration and outer-loop changes
- Any modification under `processes/impl-cli/` or `processes/codex-impl/`; work lands in `packages/ls-cli/` and supporting repo-root config/docs only

**Dependencies:**
- Story 1 SDK shape
- Story 2 CLI envelope preservation
- Canonical result contracts from the migrated runtime

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-4.1:** The CLI envelope and persisted-state files carry an explicit version marker that consumers can branch on.

- **TC-4.1a:** Envelope version field
  - Given: Any envelope written by any command
  - When: The envelope is parsed
  - Then: The `version` field is present and set to a numeric value, distinct from the implementation's package version
- **TC-4.1b:** Persisted state version markers
  - Given: Any persisted state file (run config, progress snapshot, status file)
  - When: The file is parsed
  - Then: A version marker field is present at the document root

**AC-4.2:** Errors surface as instances of a typed error taxonomy. String matching is not used to classify errors.

- **TC-4.2a:** Typed error classes
  - Given: Any failure path in the package
  - When: An error is propagated
  - Then: The error is an instance of a defined class in the package's error taxonomy with a stable `code` field
- **TC-4.2b:** No string-matched error detection
  - Given: The new package source
  - When: A reviewer searches for substring matching against error message text in non-test code
  - Then: No matches are found in branching logic; classification flows through `instanceof` or the `code` field only

**AC-4.3:** Provider-payload schemas are derived from the canonical result-contract schemas, not redeclared independently.

- **TC-4.3a:** Schemas derived, not redeclared
  - Given: The schemas for each role's provider payload
  - When: A reviewer inspects how each schema is defined
  - Then: Each is derived from the canonical result-contract schema through a documented transformation (omit, pick, extend), not declared standalone
- **TC-4.3b:** Drift cannot occur silently
  - Given: A change to a canonical result-contract schema field
  - When: The package builds
  - Then: The change is reflected automatically in every derived payload schema, and any breakage surfaces at build or test time, not at runtime

**AC-4.4:** Artifact, progress, and status writes are atomic. A crash mid-write leaves either the prior version or the new version, never a partial.

- **TC-4.4a:** Atomic write behavior
  - Given: A command run that writes an artifact
  - When: The write is interrupted (simulated by killing the process between the temp write and the final rename)
  - Then: The artifact path either contains the prior content or the new content — never a partial, malformed JSON

**AC-4.5:** Artifact-index reservation is concurrency-safe under simultaneous invocation.

- **TC-4.5a:** Concurrent reservation
  - Given: Two CLI commands invoked simultaneously against the same spec pack
  - When: Both reserve the next artifact index
  - Then: Each receives a distinct index and neither overwrites the other's artifact

**AC-4.6:** Subprocess environment inheritance is filtered through an allowlist rather than passing the entire parent environment.

- **TC-4.6a:** Env allowlist
  - Given: A provider subprocess spawned by the package
  - When: The subprocess's environment is captured
  - Then: Only the variables in the documented allowlist (and the caller-provided overrides) are present; other parent-process variables are not inherited

**AC-4.7:** The two known regressions identified in pre-epic review are fixed and covered by tests.

- **TC-4.7a:** Codex retained-session reuse
  - Given: A Codex story-implement call followed by a story-continue call referencing the prior session
  - When: The continue call executes
  - Then: The session id from the first execution is present in the call and the continuation succeeds
- **TC-4.7b:** Preflight binary-present, auth-unknown
  - Given: A preflight run where the Codex binary is present but no safe auth-status probe is available
  - When: Preflight completes
  - Then: The outcome is `ready` (binary-present, auth-unknown), not `blocked`

**AC-4.8:** Internal module boundaries are not mocked anywhere in the package's tests, and external-boundary mock fixtures are derived from captured real provider output rather than hand-written.

- **TC-4.8a:** No internal mocks
  - Given: The package's test suite
  - When: A reviewer inspects mock declarations
  - Then: All mocks target external boundaries (provider subprocess, filesystem at the very edge, network); no mock targets an internal module
- **TC-4.8b:** External mock fixtures sourced from captured real output
  - Given: The mock fixtures used by the test suite to simulate provider output
  - When: A reviewer inspects fixture provenance
  - Then: Each external-boundary fixture is a captured sample from a real provider run, with provenance documented (provider, command, capture date)
  - Note: Story 3 owns the rule and the consuming test shape. Story 4 creates and commits the captured real-provider fixtures that fully exercise this TC.

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant boundary contracts**

**Hardening Ownership**

| Concern | Required Contract |
|---------|-------------------|
| Envelope versioning | Every CLI envelope carries a numeric schema version distinct from package version |
| Persisted-state versioning | Run config, progress snapshot, and status file carry root-level version markers |
| Error taxonomy | Structured failures surface stable error codes through typed error classes |
| Schema derivation | Provider payload schemas derive from canonical result contracts rather than being redeclared |
| Atomicity | Artifact, progress, and status writes leave prior-or-new content only, never partial content |
| Concurrency safety | Simultaneous artifact-index reservation yields distinct indexes with no overwrite |
| Subprocess isolation | Provider subprocesses inherit only documented allowlist vars plus caller overrides |

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

**CliArtifactRef**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| kind | string | yes | Artifact kind (for example, `result-envelope`, `progress-snapshot`) |
| path | string | yes | Filesystem path to the persisted artifact |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- [ ] Envelope and persisted-state version markers are present and documented
- [ ] Typed error taxonomy replaces string-matched classification
- [ ] Provider payload schemas derive from canonical contracts
- [ ] Atomic write coverage exists for artifacts, progress, and status
- [ ] Concurrent artifact-index reservation is proven
- [ ] Subprocess env allowlist is documented and tested
- [ ] Both known regressions are fixed and covered
- [ ] Mock-discipline checks are present and passing
- [ ] No file under `processes/impl-cli/` or `processes/codex-impl/` was modified
