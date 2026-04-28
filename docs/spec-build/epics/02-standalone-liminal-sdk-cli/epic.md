# Epic: ls-cli Standalone Package

This epic defines the requirements for extracting the implementation runtime currently bundled inside `ls-claude-impl` into a standalone, publishable package. The package exposes both a programmatic SDK surface and a CLI invocation surface backed by the same operations. It serves as the source of truth for the technical design work.

The new package is built and published in parallel with the existing bundled runtime. The skills that consume the runtime (`ls-claude-impl`, `ls-codex-impl`) are not migrated in this epic. Migration happens after the package is published and the gorilla integration pack confirms operations work end to end against real providers.

---

## User Profile

**Primary User:** Liminal Spec maintainer publishing the implementation runtime as a reusable npm package
**Context:** The runtime currently lives inside `processes/impl-cli/` and is bundled into `ls-claude-impl` skill source. It has grown to a size where bundling no longer scales, has known contract and concurrency edges, and will soon need to be consumed by a separate web application as well as by skills.
**Mental Model:** "I have a runtime that orchestrates LLM-driven story implementation. I want to ship it as one product — a CLI that anyone can `npx`, plus an SDK any consumer can import — with the contract and concurrency edges fixed and integration coverage that catches mock-vs-real drift before release."
**Key Constraint:** The published package must coexist with the existing bundled runtime without breaking it. Consumer migration is post-epic. No skill or CLI in `processes/` is modified during this work.

---

## Feature Overview

`ls-cli` is the standalone, publishable runtime that exposes the operation primitives currently delivered through `processes/impl-cli/`. The package ships two consumption surfaces backed by the same operations: a CLI binary callable through `npx ls-cli ...`, and a programmatic SDK importable through `ls-cli/sdk` (or equivalent). Both surfaces produce the same structured envelope and persist the same artifacts.

The package replaces the current bundled runtime as the long-term home of the operations. After this epic ships, callers can install one package and call the same operations whether they orchestrate from a Claude Code skill, a Codex skill, a web application, or a script. The runtime's contract surface is versioned; its persistence is atomic and concurrency-safe; its integration with real providers is exercised by both an automated harness suite and an agent-driven gorilla pack designed to catch mock-versus-reality drift before each release.

### Workflow Summary

- **[Package Layout and Toolchain Migration](#1-package-layout-and-toolchain-migration)** — Move the runtime source into a standalone package, replace the Bun-coupled toolchain with a portable Node + Vitest stack, and re-establish parity with the existing test suite. AC: `1.1-1.5`
- **[SDK Programmatic Surface](#2-sdk-programmatic-surface)** — Expose every operation as a typed programmatic function, declare an explicit public export surface, and make the SDK callable without invoking the CLI shell. AC: `2.1-2.5`
- **[CLI Invocation Surface](#3-cli-invocation-surface)** — Provide a thin CLI binary that wraps the SDK, preserves the existing envelope contract, maps process exit codes deterministically, and runs through `npx`. AC: `3.1-3.5`
- **[Runtime Contract Hardening](#4-runtime-contract-hardening)** — Version the public envelope and persisted state, replace string-matched error detection with a typed error taxonomy, derive payload schemas from canonical contracts, make artifact and progress writes atomic and concurrency-safe, filter subprocess environment inheritance through an allowlist, and fix the two known regressions surfaced during code review. AC: `4.1-4.8`
- **[Integration Verification](#5-integration-verification)** — Add an env-gated automated test suite that drives real provider CLIs across smoke, resume, structured-output, and stall scenarios; back it with parser-level contract tests fed by captured real provider output; and ship an agent-driven gorilla pack with a real fixture spec pack, a reset tool, an instruction prompt, and an evidence template that exercises every operation against real data. AC: `5.1-5.8`
- **[Distribution and Release](#6-distribution-and-release)** — Define the package distribution surface (exports, bin, files allowlist, type emission), prove it through pack-and-install smoke verification, and wire a tag-triggered GitHub Actions release workflow with version, changelog, and runbook discipline for first publish. AC: `6.1-6.7`

---

## Scope

### In Scope

This epic delivers a published, hardened standalone package. It covers:

- Extraction of the runtime source from `processes/impl-cli/` into a new package directory at `packages/ls-cli/` (or equivalent)
- Migration off the Bun-coupled test runner and shim onto Vitest plus a portable build pipeline
- An explicit programmatic SDK surface for every operation in the current CLI inventory
- A thin CLI binary that wraps the SDK and preserves the existing structured envelope contract
- A stable error taxonomy with typed error classes that replace string-matched detection in the existing code
- Versioned envelope and persisted-state schemas
- Payload schemas derived from the canonical result-contract schemas, eliminating the current three-layer drift risk
- Atomic writes for artifacts, progress, and status files
- Concurrency-safe artifact-index reservation
- Subprocess environment inheritance filtered through an allowlist
- Fixes for two regressions identified in pre-epic code review: Codex retained-session reuse missing a session id on first execution, and preflight regressing the binary-present / auth-unknown fallback for Codex
- An env-gated automated integration test suite covering Claude Code, Codex, and Copilot across smoke, resume, structured-output, and stall scenarios
- Parser-level contract tests fed by captured real provider output, defending against mock-versus-reality drift at the parser layer before integration tests run
- A gorilla integration pack — fixture spec pack, reset/refresh tool, agent-readable instruction prompt, and evidence template — committed to the repository source tree as a development and release-verification artifact, excluded from the published tarball
- Package distribution surface: `package.json` exports map, bin entry, files allowlist, type emission
- Pack-and-install smoke verification of the built artifact
- A tag-triggered GitHub Actions release workflow that builds, validates, and publishes (or dry-runs) to the npm registry
- Runbook documentation for manual npm token rotation and first-publish steps

### Out of Scope

- Migration of `ls-claude-impl` or `ls-codex-impl` skills to call the new published package (deferred to post-epic work)
- Removal or modification of `processes/impl-cli/` or `processes/codex-impl/` source (left in place; new package coexists alongside)
- The Codex outer-loop runtime in `processes/codex-impl/` (not consumed by the new package)
- Web application SDK consumer adoption (separate fast-follow epic)
- Final published package name selection — the working name is `ls-cli`, with the final scoped or unscoped name decided before first publish
- npm token rotation, npm organization setup, or GitHub repository secret configuration as automated work — these are documented as a runbook and executed manually
- Operation-level functional changes — operations behave the same after this epic as they do today, except where contract hardening explicitly redefines the public surface

### Assumptions

| ID | Assumption | Status | Owner | Notes |
|----|------------|--------|-------|-------|
| A1 | The final published package name is decided before first release tag | Unvalidated | Maintainer | Working name `ls-cli`; final form may be `ls-cli`, `liminal-spec`, or a scoped name like `@liminal-spec/cli` |
| A2 | The maintainer has npm publish rights for the chosen package name or scope | Unvalidated | Maintainer | Confirm before tagging the first release |
| A3 | GitHub Actions has the npm token and any other release secrets configured before tagging the first release | Unvalidated | Maintainer | Documented in the runbook |
| A4 | The existing `processes/impl-cli/` test suite represents the operational behavior the new package must preserve | Validated | Maintainer | Migration parity is measured against this suite |
| A5 | Real-harness integration tests run only when explicitly opted in via env flag, never on default CI runs | Validated | Maintainer | Avoids burning provider budget on every pull request |

### Operational Defaults

| ID | Default | Status | Owner | Notes |
|----|---------|--------|-------|-------|
| D1 | Single-package layout with two entry points (CLI bin + SDK exports) rather than a multi-package workspace | Validated | Maintainer | Cheaper now; splittable into a workspace later if the SDK consumer surface grows |
| D2 | Default CI runs use mocks plus parser-contract tests; real-harness suite runs in a separate, gated workflow | Validated | Maintainer | Real harness is opt-in to control provider budget |
| D3 | Mock fixtures for external boundaries are derived from captured real provider output, not hand-written | Validated | Maintainer | Prevents the "first real run always fails" failure mode |
| D4 | Internal module boundaries are not mocked under any circumstance | Validated | Maintainer | Mocks only at external boundaries — process, network, filesystem |

---

## Flows & Requirements

### 1. Package Layout and Toolchain Migration

This flow establishes the package boundary that everything else hangs from. The runtime moves out of `processes/impl-cli/` and into a standalone package directory whose tests pass with Vitest under a portable Node + TypeScript toolchain. No operational behavior changes. The output of this flow is a package that builds, lints, type-checks, and passes its tests in the new layout — the same operations producing the same envelopes, but in a home suitable for publication.

The migration replaces several Bun-specific dependencies that don't carry forward to a published package: the Bun test runner, the `bun:test` shim, Bun-only build invocations. The replacement is a Vitest test suite, a portable build pipeline, and verification scripts at the four standard tiers (`red-verify`, `verify`, `green-verify`, `verify-all`).

1. Maintainer creates the new package directory and copies source files
2. Maintainer replaces toolchain configuration with the portable equivalents
3. Maintainer adapts test imports from `bun:test` to Vitest
4. Maintainer runs the verification suite and confirms parity with the existing bundled runtime
5. Maintainer commits the new package as the working source of operations

#### Acceptance Criteria

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

---

### 2. SDK Programmatic Surface

This flow exposes the operation inventory as a typed programmatic API. The CLI is the primary product; the SDK is the underlying programmable surface that the CLI shell wraps and that future consumers (the web application, third-party orchestrators, scripted callers) can import without invoking the CLI binary.

Each operation becomes a function with an explicit input shape, an explicit return shape, and no shell-layer concerns: no argument parsing, no exit codes, no stdout writes, no `process.exit`. The SDK accepts dependency-injection points where filesystem and subprocess matter, so consumers can provide fakes or alternate implementations for testing.

The SDK exports are explicit. Anything not enumerated in the public export surface is internal and may change without a major version bump.

#### Acceptance Criteria

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

---

### 3. CLI Invocation Surface

This flow delivers the CLI binary that wraps the SDK. Each command is a thin shell over its corresponding SDK function: parse arguments, call the SDK, render the envelope, map exit code, exit. No business logic lives in the command modules.

The CLI preserves the existing structured envelope contract. Every command, on every outcome, writes the same envelope to stdout (when `--json` is set) and persists the same envelope as a JSON artifact alongside the spec pack. The persisted envelope is the durable record; stdout is for the immediate caller.

The CLI binary is invokable through `npx` once the package is published, and through `node ./dist/bin/...` from a checked-out branch before publish.

#### Acceptance Criteria

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

---

### 4. Runtime Contract Hardening

This flow fixes the runtime edges that pre-epic code review identified. The motivation is durability: the package is about to become a public surface that consumers depend on, and the existing implementation has known contract drift, concurrency races, and string-matched error detection that will fail under real production load.

The hardening covers six independent edges and two known regressions. Each edge is addressed in a way that's testable in isolation and verifiable from outside the package.

#### Acceptance Criteria

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

---

### 5. Integration Verification

This flow delivers the verification that catches what unit tests can't: real provider behavior, real session lifecycles, real stdout shapes, real timing. It has two layers — an automated test suite that runs against real provider CLIs under env-gated conditions, and a gorilla integration pack that an agent walks through using a real fixture spec pack against real data directories.

The motivation is the failure mode the maintainer has hit repeatedly: mocks pass, then the first real orchestration run breaks because the mock shape didn't match reality. The defense is layered. A parser-level contract test runs captured real provider output through the same parser the mocks feed, so mock-shape and real-shape divergence fails fast before either suite runs. The automated harness exercises the operations against real providers across the scenarios most prone to drift. The gorilla pack is the final, agent-driven check that the operations work end to end on real data.

The automated suite is opt-in via env flag and runs in a separate workflow from the default CI. The gorilla pack is run before each release and after meaningful contract changes.

1. Maintainer captures real provider output for each scenario and commits the samples as fixtures
2. Maintainer adds parser-level contract tests that feed those samples through the parser and assert the parser's output
3. Maintainer adds an env-gated automated test suite that drives real provider CLIs across smoke, resume, structured-output, and stall scenarios
4. Maintainer constructs the gorilla fixture: a small but realistic spec pack and a target codebase for operations to act on
5. Maintainer writes the gorilla prompt and evidence template
6. Maintainer runs the gorilla pack and confirms the agent can complete the run

#### Acceptance Criteria

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

---

### 6. Distribution and Release

This flow gets the package from "passes its tests" to "installable through `npx` from the public registry, on a tag." It defines the package's distribution surface and the automation that ships it.

The distribution surface is what consumers see when they install the package: which files are included, which entry points are reachable, what types are emitted, what binaries are wired. The release automation is what the maintainer triggers: tag, push, watch the workflow, manually verify the registry artifact installs cleanly.

First-publish steps that need a maintainer in the loop — npm token rotation, organization setup, the very first `npm publish` itself — are documented as a runbook rather than wired into the workflow. This keeps the automation simple and the human-in-the-loop steps explicit.

#### Acceptance Criteria

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

---

## Data Contracts

These are the contracts the package exposes to its consumers. They are stack-neutral descriptions; concrete TypeScript types and Zod schemas belong in tech design.

### CLI Output Envelope

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

### CliError

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | yes | Stable error code from the package's error taxonomy |
| message | string | yes | Human-readable summary |
| detail | string | no | Optional context detail; not parsed by callers |

### CliArtifactRef

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| kind | string | yes | Artifact kind (for example, `result-envelope`, `progress-snapshot`) |
| path | string | yes | Filesystem path to the persisted artifact |

### Exit Code Mapping

| Status | Exit Code | Description |
|--------|-----------|-------------|
| ok | 0 | Operation succeeded |
| needs-user-decision | 2 | Resolution requires human input |
| blocked | 3 | Operation cannot proceed without action |
| error | 1 | Unexpected failure |

### Operation Inventory

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

### Package Distribution Surface

| Concern | Specification |
|---------|---------------|
| Bin entry | One bin entry mapped to the CLI's compiled entry point |
| SDK default export | Operation functions, result types, and error classes as named exports |
| Subpath exports | Distinct entries for the SDK and any auxiliary surfaces (contracts/types) so consumers can import contracts without pulling in operations |
| Type emission | `.d.ts` files generated for both the bin entry point and every public SDK export |
| Files allowlist | `dist/`, `README`, `LICENSE`, `CHANGELOG`; no source, tests, or fixtures shipped |

---

## Non-Functional Requirements

### Mock Discipline

Mocks live only at external boundaries — provider subprocesses, filesystem at the very edge, network calls. Internal module boundaries are not mocked under any circumstance, because mocking internal boundaries hides integration bugs between the package's own modules.

External-boundary mock fixtures are derived from captured real provider output. Hand-written mocks are not permitted, because hand-written mocks are the principal cause of the "first real run always fails" failure mode the package is being hardened against.

### Atomicity

Artifact, progress, and status writes use a temp-write-plus-rename pattern. A crash mid-write leaves either the prior version or the new version on disk, never a partial.

### Concurrency

Artifact-index reservation must be safe under concurrent invocation. Two CLI calls running simultaneously against the same spec pack must each receive a distinct index without overwriting each other.

### Subprocess Isolation

Provider subprocess environment inheritance is filtered through an allowlist. The full parent environment is not passed to provider subprocesses by default.

### Versioning Discipline

The package follows semantic versioning. Breaking changes to the CLI envelope, the SDK public surface, or the persisted-state shape require a major version bump.

### Real-Harness Cost Control

Real-harness integration tests are opt-in through an environment flag and run in a separate CI workflow from the default suite. The default CI suite never invokes real provider CLIs.

### Observability

Every operation persists a JSON envelope artifact alongside the spec pack. The persisted artifact is the durable record; stdout output is for the immediate caller. Status, progress, and error fields are stable enough to be consumed by external tooling.

---

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. **Single package versus minimal monorepo.** The default operational decision is single package with two entry points. Tech design should confirm that the eventual web application SDK consumer (fast-follow epic) does not force an early split, or document the trigger that would.
2. **Captured-output sample coverage.** What's the minimum set of real-provider output samples to commit as fixtures so that the parser-contract test layer catches drift broadly without becoming a maintenance burden? Per provider, per command, per scenario class?
3. **Gorilla agent runtime.** Should the gorilla pack be runnable by both Claude Code and Codex agents from day one, or run primarily under Claude Code with a parity check against Codex? What's the minimum viable runner shape?
4. **Verification gate composition.** What specific commands compose `red-verify`, `verify`, `green-verify`, and `verify-all` for this package given the Vitest-based test stack and the env-gated integration suite?
5. **Real-harness CI shape.** One workflow file with conditional gating, or two workflow files (default and integration)? What credential model gates the integration workflow?
6. **Atomic-write implementation.** Is a single shared utility sufficient (`writeAtomic(path, content)`), or does the progress snapshot need a different pattern (append-only with a manifest)?
7. **Concurrency safety implementation.** What's the artifact-index reservation strategy — `O_CREAT|O_EXCL` retry loop, or a directory-based lock? Either is fine; the design needs to commit to one.
8. **Error taxonomy boundaries.** What's the complete enumerated error code set, and which codes are reserved for future use? Defining this completely up front prevents ad hoc string codes leaking back in.
9. **Continuation handle persistence.** Are continuation handles purely opaque session-id tuples, or does the package retain durable state about handles between calls? Either choice is consistent; design needs to declare and justify.
10. **Type emission strategy.** Single rolled-up `.d.ts` per entry point, or per-source `.d.ts` files? Affects discoverability and bundle size for consumers.

---

## Recommended Story Breakdown

### Story 0: Foundation

Move the runtime source from `processes/impl-cli/` into `packages/ls-cli/`, replace the Bun-coupled toolchain with Vitest plus a portable Node + TypeScript build, define the four verification scripts, and confirm parity with the existing test suite. No operational behavior changes. Establishes shared infrastructure that every later story builds on.

**ACs covered:** AC-1.1 through AC-1.5

### Story 1: SDK Programmatic Surface

Expose every operation in the inventory as a typed programmatic function. Declare an explicit public export surface. Make the SDK callable without any CLI shell concern. Wire dependency-injection points for filesystem and subprocess so consumers can substitute fakes.

**ACs covered:** AC-2.1 through AC-2.5

### Story 2: CLI Invocation Surface

Wire the CLI binary as a thin shell over the SDK. Preserve the existing structured envelope contract. Map exit codes deterministically. Confirm the binary is runnable through both `node` and `npx` against a packed tarball.

**ACs covered:** AC-3.1 through AC-3.5

### Story 3: Runtime Contract Hardening

Version the envelope and persisted state. Introduce a typed error taxonomy and remove string-matched detection. Derive payload schemas from canonical contracts. Make writes atomic and artifact-index reservation concurrency-safe. Filter subprocess env inheritance through an allowlist. Fix the two known regressions.

Story 3 is the densest acceptance criteria block. If during sharding the AC count crosses ten, peel it into a separate "regressions" story rather than overloading.

**ACs covered:** AC-4.1 through AC-4.8

### Story 4: Real-Harness Integration Tests + Captured-Output Contract Tests

Capture real provider output samples for the scenarios most prone to drift and commit them as fixtures. Add parser-contract tests fed by those samples that run on default CI. Add an env-gated integration test suite that invokes real Claude Code, Codex, and Copilot binaries across smoke, resume, structured-output, and stall scenarios.

**ACs covered:** AC-5.1 through AC-5.3

### Story 5: Gorilla Integration Pack

Construct a small but realistic fixture spec pack and target codebase. Build the reset tool. Write the agent prompt covering every operation across each applicable provider. Define the evidence template. Run the gorilla pack end to end with a real agent and confirm it catches at least one deliberately introduced drift case.

**ACs covered:** AC-5.4 through AC-5.8

### Story 6: Package Distribution Surface

Declare the distribution metadata: exports, bin, files allowlist, type emission. Prove the published shape through pack-and-install smoke verification. Confirm types resolve under TypeScript without manual declaration files.

**ACs covered:** AC-6.1 through AC-6.3

### Story 7: Release Automation

Wire the GitHub Actions release workflow on tag push: build, verify, publish. Sync version across `package.json`, changelog, and version-marker files. Document the first-publish runbook for token rotation, organization setup, and the rehearsal publish. Run the workflow against a release candidate and confirm the published artifact installs cleanly through `npx`.

**ACs covered:** AC-6.4 through AC-6.7

---

## Dependencies

Technical dependencies:

- Vitest as the replacement test runner
- A portable build pipeline (tsup, tsc + rollup, or equivalent) for emitting JavaScript and `.d.ts`
- A working install of each real provider binary (Claude Code, Codex, Copilot) on the machine that runs the integration suite
- npm registry access for first publish

Process dependencies:

- Decision on the final published package name before tagging the first release (Assumption A1)
- npm publish rights configured for the chosen name or scope (Assumption A2)
- GitHub Actions secrets configured for the release workflow (Assumption A3)
- Pre-epic code review findings (Codex retained-session reuse, preflight binary-present/auth-unknown) confirmed against the new package's test suite

---

## Validation Checklist

- [ ] User Profile complete (Primary User, Context, Mental Model, Key Constraint)
- [ ] Feature Overview describes the after-state in plain description
- [ ] Six flows cover all paths and explicitly include error and edge cases
- [ ] Every AC is testable and specific
- [ ] Every AC has at least one TC
- [ ] TCs cover happy path, edge cases, and errors per AC
- [ ] Data contracts are fully specified at system boundaries (CLI envelope, exit codes, distribution surface)
- [ ] Scope boundaries are explicit (in scope, out of scope, assumptions, operational defaults)
- [ ] Story breakdown covers all ACs with no orphans
- [ ] Stories sequence logically (foundation first, surface before hardening, verification before release)
- [ ] Tech Design Questions captured for downstream design phase
- [ ] Self-review complete
- [ ] All validator issues addressed (Critical, Major, Minor)
- [ ] Validation rounds complete (no substantive changes remaining)
