# Story 6: Package Distribution Surface

### Summary
<!-- Jira: Summary field -->

Define the published package shape by wiring exports, bin, files allowlist, and type emission, then prove the packed artifact is consumable.

### Description
<!-- Jira: Description field -->

**User Profile:** Liminal Spec maintainer publishing the implementation runtime as a reusable npm package

**Objective:** Make the built artifact installable and importable in the exact shape consumers will receive from the registry.

**Scope In:**
- `package.json` distribution metadata
- Exports map and bin entry
- Files allowlist
- Type emission
- Pack-and-install smoke verification

**Scope Out:**
- Tag-triggered release workflow
- npm token rotation and repo secret setup
- Any modification under `processes/impl-cli/` or `processes/codex-impl/`; work lands in `packages/ls-cli/` and supporting repo-root config/docs only

**Dependencies:**
- Stories 1 and 2 for SDK and CLI public surfaces
- Story 0 build pipeline

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-6.1:** The package's distribution metadata declares correct exports, bin, files allowlist, and type emission.

- **TC-6.1a:** Distribution metadata complete
  - Given: The new `package.json`
  - When: A reviewer inspects it
  - Then: It declares `name`, `version`, `bin`, `exports` (with separate subpaths for the SDK entry and any auxiliary surfaces such as contracts/types), `files` allowlist, and `types` correctly

**AC-6.2:** A pack-and-install smoke verification proves the built artifact is consumable.

- **TC-6.2a:** Pack and install
  - Given: The package after `npm pack`
  - When: The resulting tarball is installed into a fresh sandbox project
  - Then: The CLI bin is on the sandbox's `PATH`, the SDK is importable from the sandbox, and a basic operation runs end to end against a fixture
- **TC-6.2b:** No accidental file inclusion
  - Given: The tarball
  - When: Its contents are listed
  - Then: Only files matching the documented `files` allowlist are present; no test files, fixtures, or development artifacts are shipped

**AC-6.3:** TypeScript types are emitted and importable by consumers.

- **TC-6.3a:** Types importable
  - Given: A TypeScript consumer that imports the SDK
  - When: The consumer references SDK types
  - Then: The types resolve without `@ts-ignore` or manual declaration files, and the public-surface types are documented through TSDoc comments

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant boundary contracts**

**Distribution Ownership**

| Concern | Story 6 Ownership |
|---------|-------------------|
| `package.json` metadata completeness | Yes |
| Exports/bin/files/types release shape | Yes |
| Fresh sandbox install/import proof | Yes |
| Tarball contents audit | Yes |
| Minimum CLI `npx` smoke | Already established in Story 2, revalidated here as part of the packed artifact |

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

- [ ] Distribution metadata is complete and accurate
- [ ] Packed artifact installs into a fresh sandbox
- [ ] CLI and SDK both work from the packed artifact
- [ ] Files allowlist excludes tests, fixtures, and dev-only assets
- [ ] Public TypeScript types resolve cleanly for consumers
- [ ] No file under `processes/impl-cli/` or `processes/codex-impl/` was modified
