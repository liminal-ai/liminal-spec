# Story 2: CLI Invocation Surface

### Summary
<!-- Jira: Summary field -->

Build a thin CLI shell over the SDK that preserves the structured envelope contract, maps exit codes deterministically, and runs through both `node` and `npx`.

### Description
<!-- Jira: Description field -->

**User Profile:** Liminal Spec maintainer publishing the implementation runtime as a reusable npm package

**Objective:** Deliver the CLI-first surface of the package while keeping all business logic in the SDK.

**Scope In:**
- Complete subcommand inventory
- Thin command wrappers over SDK functions
- Deterministic exit-code mapping
- Stable JSON envelope on stdout and in persisted artifacts
- Runnable through `node` and `npx`

**Scope Out:**
- Runtime contract hardening beyond preserving the existing envelope behavior
- Release workflow automation
- Any modification under `processes/impl-cli/` or `processes/codex-impl/`; work lands in `packages/ls-cli/` and supporting repo-root config/docs only

**Dependencies:**
- Story 0 package baseline
- Story 1 SDK operations and public exports

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-3.1:** Every operation listed in the current CLI inventory is reachable through the new CLI binary.

- **TC-3.1a:** Subcommand inventory complete
  - Given: The new CLI binary
  - When: It is invoked with `--help`
  - Then: All ten operations appear as subcommands

**AC-3.2:** Each command module is a thin wrapper over its SDK function with no business logic.

- **TC-3.2a:** No business logic in commands
  - Given: A command module in the new package
  - When: A reviewer inspects its body
  - Then: The module parses arguments, invokes the SDK function, formats the envelope for output, maps the exit code, and does nothing else

**AC-3.3:** Process exit codes map deterministically from envelope status.

- **TC-3.3a:** Exit code mapping table

| Status | Exit Code | When |
|--------|-----------|------|
| ok | 0 | Operation succeeded |
| needs-user-decision | 2 | Resolution requires human input |
| blocked | 3 | Operation cannot proceed |
| error | 1 | Unexpected error |

  - Given: A command run that produces each status
  - When: The CLI exits
  - Then: The exit code matches the table above

**AC-3.4:** The CLI envelope contract is preserved across all commands.

- **TC-3.4a:** Envelope shape stable
  - Given: Any command run with `--json`
  - When: Stdout is parsed
  - Then: The output is a JSON envelope containing `command`, `version`, `status`, `outcome`, `result`, `errors`, `warnings`, `artifacts`, `startedAt`, and `finishedAt` fields
- **TC-3.4b:** Stdout matches persisted artifact
  - Given: A command run that succeeds or fails
  - When: The persisted JSON artifact is read from disk
  - Then: It equals the envelope written to stdout for that run

**AC-3.5:** The CLI binary is runnable through both `node` and `npx`.

- **TC-3.5a:** `node` invocation
  - Given: A built `dist/`
  - When: The CLI bin is invoked through `node ./dist/bin/...`
  - Then: Help text or the requested subcommand runs without error
- **TC-3.5b:** `npx` invocation against the packed artifact
  - Given: An `npm pack` tarball produced from the new package
  - When: The tarball is installed globally and invoked through `npx`
  - Then: The CLI runs the requested subcommand and produces the expected envelope
  - Note: This story proves the minimum viable packed-artifact CLI path only. Story 6 owns the full distribution surface hardening: files allowlist validation, SDK importability from a fresh sandbox project, and release-ready package metadata.

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant boundary contracts**

**CLI Command Ownership**

| Concern | Story 2 Ownership | Deferred to Story 6 |
|---------|-------------------|---------------------|
| Subcommand wiring | Complete | No |
| Thin wrapper behavior | Complete | No |
| Exit-code mapping | Complete | No |
| Envelope rendering/persistence parity | Complete | No |
| Minimum packed-artifact CLI smoke via `npx` | Complete | No |
| Release-ready exports map hardening | No | Complete |
| Files allowlist proof | No | Complete |
| Fresh sandbox SDK importability proof | No | Complete |

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

**Exit Code Mapping**

| Status | Exit Code | Description |
|--------|-----------|-------------|
| ok | 0 | Operation succeeded |
| needs-user-decision | 2 | Resolution requires human input |
| blocked | 3 | Operation cannot proceed without action |
| error | 1 | Unexpected failure |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- [ ] All ten operations are reachable through the CLI
- [ ] Command modules stay thin and shell-only
- [ ] Exit-code mapping matches the documented table
- [ ] JSON stdout and persisted artifact envelopes stay identical
- [ ] `node` and packed-`npx` invocation both work
- [ ] No file under `processes/impl-cli/` or `processes/codex-impl/` was modified
