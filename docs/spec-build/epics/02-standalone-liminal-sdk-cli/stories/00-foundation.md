# Story 0: Foundation

### Summary
<!-- Jira: Summary field -->

Move the bundled runtime into `packages/ls-cli/`, replace the Bun-coupled toolchain with a portable Node + Vitest stack, and re-establish test parity without changing runtime behavior.

### Description
<!-- Jira: Description field -->

**User Profile:** Liminal Spec maintainer publishing the implementation runtime as a reusable npm package

**Objective:** Establish the standalone package boundary, portable toolchain, and verification baseline that every later story depends on.

**Scope In:**
- Create a dedicated package directory with `src/`, `tests/`, `package.json`, `tsconfig.json`, and Vitest configuration
- Migrate tests from `bun:test` to Vitest
- Define `red-verify`, `verify`, `green-verify`, and `verify-all`
- Build portable JavaScript and `.d.ts` outputs
- Prove Story 0 parity against the existing bundled runtime suite

**Scope Out:**
- Intentional runtime behavior changes
- Contract hardening and regression fixes from later stories
- Skill migration to the published package

**Dependencies:**
- Existing `processes/impl-cli/` source and test suite remain available as the parity baseline
- Portable build pipeline selected for the new package

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-1.1:** The runtime source lives in a single dedicated package directory containing `src/`, `tests/`, `package.json`, build configuration, and verification scripts.

- **TC-1.1a:** Package directory layout
  - Given: The repository at the end of this story
  - When: A reviewer inspects the package directory
  - Then: `src/`, `tests/`, `package.json`, `tsconfig.json`, and a Vitest configuration file are all present
- **TC-1.1b:** Existing bundled runtime untouched
  - Given: The repository before and after this story
  - When: A reviewer compares `processes/impl-cli/` and `processes/codex-impl/` source between the two states
  - Then: No file in either directory has been modified

**AC-1.2:** Vitest replaces `bun:test` as the test runner across the new package.

- **TC-1.2a:** No `bun:test` imports remain
  - Given: The new package source tree
  - When: A grep is run for `bun:test`
  - Then: No matches are found in `src/` or `tests/`
- **TC-1.2b:** Vitest config exists and tests run under it
  - Given: The new package
  - When: The Vitest test command is invoked
  - Then: The full test suite runs to completion without runner-level errors

**AC-1.3:** The package defines verification scripts at the four standard tiers.

- **TC-1.3a:** Verification tiers defined
  - Given: The new `package.json`
  - When: A reviewer inspects the `scripts` block
  - Then: `red-verify`, `verify`, `green-verify`, and `verify-all` scripts are all defined
- **TC-1.3b:** Each tier composes correctly
  - Given: The verification scripts
  - When: Each tier is invoked in a clean checkout
  - Then: `red-verify` runs format, lint, and typecheck; `verify` adds the test suite; `green-verify` adds a test-immutability guard; `verify-all` adds the integration and end-to-end suites or a clear placeholder notice

**AC-1.4:** The new package builds to portable JavaScript and TypeScript declaration files.

- **TC-1.4a:** Build output produced
  - Given: A clean package
  - When: The build command is invoked
  - Then: A `dist/` directory is produced containing JavaScript and `.d.ts` files for both the CLI bin entry and the SDK entry
- **TC-1.4b:** Build output runs under Node
  - Given: A built `dist/`
  - When: The CLI bin is invoked through Node directly
  - Then: It prints help text or runs the requested subcommand without runtime errors

**AC-1.5:** The new package's test suite reaches behavioral parity with the existing bundled runtime suite at the migration's exit point. Later stories intentionally change tested behavior through hardening and regression fixes; this AC covers Story 0's exit state only.

- **TC-1.5a:** Equivalent test count and outcomes at migration exit
  - Given: The existing bundled runtime tests and the new package tests at the conclusion of Story 0, before any hardening or regression-fix work has begun
  - When: Both suites are executed
  - Then: Every test in the bundled suite has a corresponding test in the new suite, and both suites produce equivalent pass/fail outcomes for the operations they share
- **TC-1.5b:** Intentional divergence allowed in later stories
  - Given: The new package after Story 3's hardening and regression fixes have been applied
  - When: A reviewer compares the new suite against the bundled suite
  - Then: Divergences are permitted where Story 3 explicitly changed behavior; each divergence is traceable to an AC in Flow 4

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant boundary contracts**

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

**Package Distribution Surface**

| Concern | Specification |
|---------|---------------|
| Bin entry | One bin entry mapped to the CLI's compiled entry point |
| SDK default export | Operation functions, result types, and error classes as named exports |
| Subpath exports | Distinct entries for the SDK and any auxiliary surfaces (contracts/types) so consumers can import contracts without pulling in operations |
| Type emission | `.d.ts` files generated for both the bin entry point and every public SDK export |
| Files allowlist | `dist/`, `README`, `LICENSE`, `CHANGELOG`; no source, tests, or fixtures shipped |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- [ ] `packages/ls-cli/` exists with the expected baseline structure
- [ ] No `bun:test` imports remain in the new package
- [ ] All four verification tiers are defined and runnable
- [ ] Build emits portable JS and `.d.ts` files
- [ ] Story 0 parity against the bundled runtime suite is documented
- [ ] No file under `processes/impl-cli/` or `processes/codex-impl/` was modified
