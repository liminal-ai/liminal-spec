# Story 1: SDK Programmatic Surface

### Summary
<!-- Jira: Summary field -->

Expose every runtime operation as a typed SDK function with an explicit public export surface and no CLI-shell behavior in the call path.

### Description
<!-- Jira: Description field -->

**User Profile:** Liminal Spec maintainer publishing the implementation runtime as a reusable npm package

**Objective:** Turn the operation inventory into a programmatic API that future consumers can import directly without invoking the CLI binary.

**Scope In:**
- One SDK function per CLI operation
- Explicit public exports
- Typed input and return shapes
- No `process.exit`, stdout writes, or shell concerns in SDK call paths
- Dependency-injection points for filesystem and subprocess boundaries

**Scope Out:**
- CLI argument parsing and exit code mapping
- Release packaging and publish automation
- Any modification under `processes/impl-cli/` or `processes/codex-impl/`; work lands in `packages/ls-cli/` and supporting repo-root config/docs only

**Dependencies:**
- Story 0 package structure and toolchain
- Current operation inventory preserved as the source of truth

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-2.1:** Every operation in the current CLI inventory is exposed as a programmatic function in the SDK.

- **TC-2.1a:** Operation parity with CLI
  - Given: The list of CLI commands (`inspect`, `preflight`, `epic-synthesize`, `epic-verify`, `epic-cleanup`, `quick-fix`, `story-implement`, `story-continue`, `story-self-review`, `story-verify`)
  - When: A reviewer inspects the SDK public surface
  - Then: Each command has a corresponding programmatic function whose name maps clearly to the command name

**AC-2.2:** The SDK declares an explicit public export surface; no operation is exported by accident.

- **TC-2.2a:** Public exports enumerated
  - Given: The package
  - When: A reviewer inspects the SDK entry point
  - Then: A single index file declares the public exports, and any module not reachable from this index is internal
- **TC-2.2b:** Exports map declares SDK entry
  - Given: The `package.json`
  - When: A reviewer inspects the `exports` field
  - Then: The SDK entry has its own subpath export distinct from the CLI bin

**AC-2.3:** Each SDK function has a typed input shape and a typed return shape.

- **TC-2.3a:** Inputs and outputs typed
  - Given: Any SDK function
  - When: A consumer imports it under TypeScript
  - Then: The function signature accepts a typed input object and returns a typed result envelope, with no `any` or `unknown` in the public signature

**AC-2.4:** SDK functions can be called without invoking any CLI shell concern.

- **TC-2.4a:** No process.exit in SDK call paths
  - Given: An SDK function call
  - When: The function executes, succeeds, fails, or is blocked
  - Then: The function returns the envelope to the caller and never calls `process.exit`, never writes to `stdout`, and never throws on a structured failure
- **TC-2.4b:** SDK callable from a script
  - Given: A small Node script that imports the SDK and calls one operation
  - When: The script runs against a fixture spec pack
  - Then: The operation completes and returns a valid envelope without spawning the CLI binary

**AC-2.5:** The SDK accepts dependency-injection points where external boundaries matter.

- **TC-2.5a:** Filesystem and subprocess injection
  - Given: An SDK function that touches the filesystem or spawns a provider
  - When: A consumer provides an alternate filesystem or subprocess implementation through the function's options
  - Then: The function uses the provided implementation in place of the default, and the operation runs without touching the real filesystem or spawning a real subprocess

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant boundary contracts**

**SDK Surface Expectations**

| Operation | SDK Function Shape | Return Contract | Notes |
|-----------|--------------------|-----------------|-------|
| inspect | One exported function mapped clearly from command name | Typed result envelope | No continuation handle |
| preflight | One exported function mapped clearly from command name | Typed result envelope | No continuation handle |
| epic-synthesize | One exported function mapped clearly from command name | Typed result envelope | No continuation handle |
| epic-verify | One exported function mapped clearly from command name | Typed result envelope | No continuation handle |
| epic-cleanup | One exported function mapped clearly from command name | Typed result envelope | No continuation handle |
| quick-fix | One exported function mapped clearly from command name | Typed result envelope | No continuation handle |
| story-implement | One exported function mapped clearly from command name | Typed result envelope | Produces continuation-capable result |
| story-continue | One exported function mapped clearly from command name | Typed result envelope | Consumes continuation-capable input |
| story-self-review | One exported function mapped clearly from command name | Typed result envelope | Produces continuation-capable result |
| story-verify | One exported function mapped clearly from command name | Typed result envelope | No continuation handle |

**Dependency-Injection Boundaries**

| Boundary | Requirement |
|----------|-------------|
| Filesystem | SDK caller can substitute a filesystem implementation where an operation reads or writes package-managed files |
| Subprocess/provider spawn | SDK caller can substitute the subprocess implementation where an operation invokes a provider |
| Shell concerns | No SDK function performs argument parsing, exit-code mapping, `process.exit`, or stdout writes |

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

- [ ] Every CLI operation has a corresponding SDK function
- [ ] SDK exports are explicit and reviewable from one index entry point
- [ ] Public signatures are typed end to end
- [ ] SDK paths contain no `process.exit` or stdout writes
- [ ] Filesystem and subprocess DI points are implemented and exercised in tests
- [ ] No file under `processes/impl-cli/` or `processes/codex-impl/` was modified
