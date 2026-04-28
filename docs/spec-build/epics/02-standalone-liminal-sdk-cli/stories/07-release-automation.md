# Story 7: Release Automation

### Summary
<!-- Jira: Summary field -->

Automate tagged releases, enforce the three-layer publish gate, keep version markers in sync, and document the manual first-publish steps that stay outside the workflow.

### Description
<!-- Jira: Description field -->

**User Profile:** Liminal Spec maintainer publishing the implementation runtime as a reusable npm package

**Objective:** Move from a locally consumable package to a repeatable, gated release process that can publish safely to npm.

**Scope In:**
- Tag-triggered GitHub Actions release workflow
- Default CI, real-harness, and gorilla evidence publish gate
- Version and changelog sync
- First-publish runbook
- First published-artifact smoke check through `npx`

**Scope Out:**
- Automated npm token rotation or org setup
- Skill migration to use the published package
- Any modification under `processes/impl-cli/` or `processes/codex-impl/`; work lands in `packages/ls-cli/` and supporting repo-root config/docs only

**Dependencies:**
- Story 4 real-harness workflow
- Story 5 gorilla evidence process
- Story 6 distribution metadata and packed-artifact shape
- npm publish rights and GitHub secrets configured by the maintainer

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-6.4:** Version, changelog, and any version-marker files stay in sync.

- **TC-6.4a:** Version sync
  - Given: A release in preparation
  - When: A reviewer compares `package.json` version, the changelog's most recent entry, and any project-level version-marker file
  - Then: All three values are equal

**AC-6.5:** The release gate is explicit about which verification layers must be green before publish, given that the three layers (default CI, real-harness, gorilla) run on different cadences and surfaces.

The release gate composes three required green signals before any publish, dry-run or live. Default CI is enforced inside the release workflow. The real-harness suite is enforced inside the release workflow against the release candidate's commit. Gorilla evidence is enforced as a pre-tag check against committed evidence in the repository, because it is agent-driven and cannot run inside the workflow.

| Layer | Enforcement Point | Required Outcome |
|-------|-------------------|------------------|
| Default CI (mocks + parser-contract tests) | Release workflow step | Green |
| Real-harness automated suite (env-gated, all three providers) | Release workflow step (workflow sets the env flag explicitly for release runs) | Green |
| Gorilla evidence | Pre-tag check in the release workflow against committed evidence file in the repo at the release candidate's commit | Present, dated within the release window, and reporting no unresolved findings |

- **TC-6.5a:** Workflow triggers on tag
  - Given: A release tag pushed to the repository
  - When: GitHub Actions evaluates triggers
  - Then: The release workflow starts on the tag and not on regular pushes
- **TC-6.5b:** Default CI must be green for publish
  - Given: A release workflow run where the default CI test suite fails
  - When: The workflow evaluates its publish gate
  - Then: The publish step does not run; the workflow reports failure
- **TC-6.5c:** Real-harness suite must be green for publish
  - Given: A release workflow run where the real-harness suite fails for any provider
  - When: The workflow evaluates its publish gate
  - Then: The publish step does not run; the workflow reports failure
- **TC-6.5d:** Gorilla evidence required for publish
  - Given: A release workflow run where no gorilla evidence file is committed at the release candidate's commit, or the committed evidence reports unresolved findings, or its date falls outside the release window
  - When: The workflow evaluates its publish gate
  - Then: The publish step does not run; the workflow reports failure with a clear message naming the missing or stale evidence
- **TC-6.5e:** All gates green publishes the artifact
  - Given: A release workflow run with all three gates green
  - When: The publish step executes
  - Then: The artifact is published to npm with the version that matches the tag, or runs in dry-run mode for a flagged release

**AC-6.6:** A first-publish runbook documents the manual steps the workflow does not automate, including the gorilla pre-tag procedure that produces the evidence file the workflow gates on.

- **TC-6.6a:** Runbook present and complete
  - Given: The repository
  - When: A reviewer inspects the release runbook
  - Then: It documents npm token configuration, organization setup (if scoped), the gorilla pre-tag procedure (run the gorilla pack, commit evidence, then tag), the first `npm publish` rehearsal, and post-publish verification

**AC-6.7:** The first published artifact installs cleanly from npm and exercises one operation end to end.

- **TC-6.7a:** First-publish smoke
  - Given: The first published version on npm
  - When: A maintainer installs it through `npx` against a fresh fixture
  - Then: The CLI runs, produces a valid envelope, and persists the expected artifact

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant boundary contracts**

**Release Gate Contract**

| Layer | Enforced By | Required State |
|-------|-------------|----------------|
| Default CI | Release workflow | Green |
| Real-harness automated suite | Release workflow | Green |
| Gorilla evidence | Pre-tag repository state checked by release workflow | Present, fresh within release window, no unresolved findings |

**Package Distribution Surface**

| Concern | Specification |
|---------|---------------|
| Bin entry | One bin entry mapped to the CLI's compiled entry point |
| SDK default export | Operation functions, result types, and error classes as named exports |
| Subpath exports | Distinct entries for the SDK and any auxiliary surfaces (contracts/types) so consumers can import contracts without pulling in operations |
| Type emission | `.d.ts` files generated for both the bin entry point and every public SDK export |
| Files allowlist | `dist/`, `README`, `LICENSE`, `CHANGELOG`; no source, tests, or fixtures shipped |

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

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- [ ] Release workflow is tag-triggered and gated correctly
- [ ] Default CI, real-harness, and gorilla evidence gates are explicit
- [ ] Version, changelog, and version-marker values stay in sync
- [ ] First-publish runbook documents every manual step left outside automation
- [ ] First published artifact smoke path is defined and reviewable
- [ ] No file under `processes/impl-cli/` or `processes/codex-impl/` was modified
