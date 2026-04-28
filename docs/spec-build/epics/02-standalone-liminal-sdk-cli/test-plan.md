# Test Plan: ls-cli Standalone Package

This document holds the per-test-file TC mappings, mock strategy, fixture catalog, per-chunk test totals, and the test count reconciliation that the tech-design index references. It is the source consulted during TDD Red phase: open the listed test file, write the listed tests in the order they appear, write each test against the concrete setup/action/assert column.

The tech-design document carries the architecture decisions. This document carries the test-level operationalization.

---

## TC → Test Mapping

Every TC in the epic maps to a test in this section. The TC ID appears in the test name or as a leading comment so traceability is visible from the test code alone. Tests are grouped by file because that's the unit a developer opens during implementation.

### Flow 1: Toolchain Migration

#### `tests/foundation.test.ts`

Structural tests for the package directory and configuration. No production code paths involved.

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.1a | TC-1.1a: package directory contains the required entries | Read `packages/ls-cli/` | List children | `src/`, `tests/`, `package.json`, `tsconfig.json`, `vitest.config.ts` are all present |
| TC-1.1b | TC-1.1b: existing bundled runtime untouched | Capture file SHA list of `processes/impl-cli/` and `processes/codex-impl/` from baseline branch | Recompute SHAs after epic work | All file SHAs match the baseline |
| TC-1.2a | TC-1.2a: no bun:test imports remain | Walk `src/` and `tests/` | Grep for `from 'bun:test'` and `from "bun:test"` | Zero matches |
| TC-1.3a | TC-1.3a: package.json declares all four verification scripts | Read `package.json` | Inspect `scripts` block | `red-verify`, `verify`, `green-verify`, `verify-all` keys all present |
| TC-1.4a | TC-1.4a: build output produced | Run `npm run build` in a clean checkout | Inspect `dist/` | `dist/bin/ls-cli.js`, `dist/sdk/index.js`, and matching `.d.ts` files all present |

#### `tests/verification-scripts.test.ts`

Behavioral tests for each verification tier's composition.

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.3b | TC-1.3b: red-verify runs format/lint/typecheck/capture | Stub child commands with spies | Invoke `npm run red-verify` | Each sub-command spawned in order; capture-test-baseline runs last |
| TC-1.3b (cont.) | TC-1.3b: verify adds the test suite | Stub child commands | Invoke `npm run verify` | red-verify steps + Vitest invocation observed |
| TC-1.3b (cont.) | TC-1.3b: green-verify adds the immutability guard | Stub child commands; ensure baseline manifest exists | Invoke `npm run green-verify` | verify steps + guard-no-test-changes invocation observed |
| TC-1.3b (cont.) | TC-1.3b: verify-all adds the integration project | Set LS_CLI_INTEGRATION=1; stub Vitest | Invoke `npm run verify-all` | verify steps + Vitest with `--project integration` observed |

#### `tests/build-output.test.ts`

CLI bin smoke against the freshly built output.

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.4b | TC-1.4b: built CLI runs under Node | Run `npm run build` in a temp working copy | Spawn `node dist/bin/ls-cli.js --help` | Exit code 0; stdout includes the subcommand list |

#### `tests/parity.test.ts`

Migration parity check at Story 0 exit only.

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.5a | TC-1.5a: equivalent test count and outcomes at migration exit | Capture test count and pass/fail summary from `processes/impl-cli/` baseline; capture same from `packages/ls-cli/` at Story 0 exit | Compare summaries | Test counts equal; pass/fail summaries equal |
| TC-1.5b | TC-1.5b: intentional divergence allowed in later stories | At Story 3 exit, list divergences from baseline | Inspect each divergence | Each traces to an AC in Flow 4 |

---

### Flow 2: SDK Programmatic Surface

#### `tests/sdk/surface.test.ts`

Public-export-surface tests.

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-2.1a | TC-2.1a: every CLI command has a corresponding SDK function | Read CLI command inventory from `src/bin/ls-cli.ts` | Read public exports from `src/sdk/index.ts` | Every command name maps to a function name in the SDK; ten matches total |
| TC-2.2a | TC-2.2a: public exports are explicit | Walk `src/sdk/index.ts` re-exports | Cross-reference against module reachability from index | No module is reachable from the index that isn't intended; no module not reachable is referenced as public |
| TC-2.2b | TC-2.2b: package.json exports declare distinct subpaths | Read `package.json.exports` | Inspect subpaths | `.` (or `./`), `./sdk`, `./sdk/contracts`, `./sdk/errors` all declared; bin entry distinct |
| TC-2.3a | TC-2.3a: SDK function signatures are typed | Run `tsc --noEmit` against `src/sdk/index.ts` reachable types | Inspect emitted declarations | No `any` or `unknown` in any public function's input or return type |

#### `tests/sdk/operations.test.ts`

SDK function behavior tests with mocked filesystem and subprocess.

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-2.4a | TC-2.4a: SDK never calls process.exit | Spy on `process.exit`; render fixture spec pack | Invoke each SDK function for each terminal status (ok/blocked/error/needs-user-decision) | `process.exit` never called; envelope returned to caller |
| TC-2.4b | TC-2.4b: SDK callable from a script | Build dist; install package locally; run a small Node script importing from `ls-cli/sdk` | Script calls `inspect({ specPackRoot })` against fixture | Script terminates with valid envelope and exit 0 |
| TC-2.5a | TC-2.5a: dependency-injection adapters are honored | Provide `fs` and `spawn` adapters that record calls | Invoke an SDK operation that touches both | Adapter calls captured; default fs and child_process not invoked |

#### `tests/sdk/per-operation/*.test.ts`

Per-operation envelope-shape tests (ten files, one per operation). Non-TC defensive tests asserting the result envelope matches the documented shape under happy-path and error inputs. These are listed in §Non-TC Decided Tests below.

---

### Flow 3: CLI Invocation Surface

#### `tests/command/help.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.1a | TC-3.1a: --help lists all ten subcommands | Build CLI bin | Spawn `node dist/bin/ls-cli.js --help` | Stdout names each of the ten operations |

#### `tests/command/structure.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.2a | TC-3.2a: command modules are thin wrappers | Read each `src/cli/commands/*.ts` source | Inspect each module's body | Module composed of arg parse + SDK call + envelope render + exit-code map; no business logic between the SDK call return and the envelope render |

#### `tests/command/exit-codes.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.3a | TC-3.3a: exit codes map deterministically | Stub SDK to return each status | Invoke command and capture `process.exitCode` | `ok` → 0, `error` → 1, `needs-user-decision` → 2, `blocked` → 3 |

#### `tests/command/envelope.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.4a | TC-3.4a: stdout envelope shape stable | Run any command with `--json` against fixture | Capture stdout | JSON parses; contains `command`, `version: 1`, `status`, `outcome`, `errors`, `warnings`, `artifacts`, `startedAt`, `finishedAt` |
| TC-3.4b | TC-3.4b: stdout matches persisted artifact | Run any command with `--json` and an artifact path | Read persisted artifact JSON | Equals stdout envelope byte-for-byte |

#### `tests/command/invocation.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.5a | TC-3.5a: node invocation works | Build dist | Spawn `node dist/bin/ls-cli.js inspect --spec-pack-root ./fixture --json` | Exit 0; stdout envelope valid |

#### `tests/command/pack-and-install-smoke.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.5b | TC-3.5b: npx invocation against packed tarball | Run `npm pack`; install resulting tarball into a fresh temp project; symlink fixture | Invoke `npx ls-cli inspect --spec-pack-root ./fixture --json` | Exit 0; envelope valid |

---

### Flow 4: Runtime Contract Hardening

#### `tests/sdk/envelope.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.1a | TC-4.1a: every envelope carries version 1 | Run each command; collect envelopes | Inspect `version` field | Every envelope `version === 1` |

#### `tests/infra/persisted-state.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.1b | TC-4.1b: persisted state files carry version markers | Run any operation that writes run-config consumption, progress snapshot, status file | Read each persisted file | Each has a version marker at document root |

#### `tests/sdk/errors.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.2a | TC-4.2a: typed error classes for every failure path | Trigger each failure path with controlled inputs | Catch the error | `error instanceof ImplCliError === true`; `error.code` is a stable string from the taxonomy |

#### `tests/code-quality/no-string-error-detection.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.2b | TC-4.2b: no string-matched error detection in non-test code | Walk `src/` (excluding `tests/`) | Grep for branching against `error.message` substrings (`includes(`, `startsWith(`, regex literals matching message text) | Zero matches in branching logic |

#### `tests/core/schema-derivation.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.3a | TC-4.3a: provider-payload schemas derived from canonical | Read each provider-payload schema declaration | Inspect derivation form | Each is `canonical.omit(...)` or `canonical.pick(...)`; no standalone declaration |
| TC-4.3b | TC-4.3b: drift cannot occur silently | Mutate one canonical field locally; rebuild | Run `tsc --noEmit` and `vitest run` | Mutation surfaces as a build error or test failure, not a runtime fault |

#### `tests/infra/fs-atomic.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.4a | TC-4.4a: atomic-write behavior under simulated rename failure | Stub `fs.rename` to reject; pre-populate destination with prior content | Invoke `writeAtomic(path, newContent)` | `writeAtomic` throws `AtomicWriteError`; destination still contains prior content; no temp file remains in the directory |

#### `tests/infra/index-reservation.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.5a | TC-4.5a: concurrent reservations receive distinct indexes | Set up empty artifacts directory | Call `nextArtifactPath` from two concurrent promises with the same name | Each resolves to a distinct index path; both placeholder files exist; neither overwrites the other |

#### `tests/infra/env-allowlist.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.6a | TC-4.6a: env allowlist filters parent env | Construct synthetic parent env with `PATH`, `HOME`, `NODE_OPTIONS`, `AWS_SECRET_ACCESS_KEY`, `CUSTOM_LEAK` | Invoke `filterEnv(parent, { GITHUB_TOKEN: 'override' })` | Result contains `PATH`, `HOME`, `GITHUB_TOKEN`; does not contain `NODE_OPTIONS`, `AWS_SECRET_ACCESS_KEY`, `CUSTOM_LEAK` |

#### `tests/sdk/codex-resume.test.ts` (uses mock-codex shim, runs on default CI)

This file lives under `tests/sdk/` and runs on every default CI execution. It is intentionally outside `tests/integration/` because the integration project is env-gated to `LS_CLI_INTEGRATION=1` and only runs with real provider binaries. AC-4.7a is a regression-prevention test that must run on every PR — placing it in the always-run sdk suite ensures it does.

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.7a | TC-4.7a: Codex retained-session reuse | Use mock-codex shim that emits a captured fixture; story-implement returns `sessionId` | Story-continue with the captured `sessionId` | Mock invoked with `exec resume <sessionId>`; subsequent envelope echoes the same `sessionId` |

#### `tests/sdk/preflight.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.7b | TC-4.7b: preflight returns ready when binary present and auth unknown | Stub Codex binary as present; stub auth probe to return "unknown" | Invoke `preflight` | Envelope `status === 'ok'`; canonical `result.status === 'ready'`; `result.providerMatrix` has Codex with `tier: 'auth-unknown'`; `result.notes` (or the matching harness's `notes`) records the degraded fallback rationale |

#### `tests/code-quality/no-internal-mocks.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.8a | TC-4.8a: no mocks target internal modules | Walk `tests/` for mock declarations (`vi.mock`, `vi.spyOn` on imports) | Cross-reference targeted modules | Every targeted module is a Node builtin: `node:fs`, `node:fs/promises`, or `node:child_process`. No mock targets any path under `src/`. Provider behavior is substituted via the SpawnAdapter DI hook from AC-2.5 (a `spawn` function injected at the SDK boundary), not by mocking `src/core/provider-adapters/*`. |

#### `tests/parser-contract/fixtures.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.8b | TC-4.8b: external mock fixtures sourced from captured real output | Walk `tests/parser-contract/fixtures/` | Read each fixture's leading comment | Provenance comment present (provider, command, capture date); date parsable; no fixture missing provenance |

---

### Flow 5: Integration Verification

#### `tests/parser-contract/{claude-code,codex,copilot}.test.ts` — three files

Each provider's parser-contract suite runs every captured fixture through the corresponding parser and asserts the parsed output against an inline snapshot.

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.3a | TC-5.3a: captured-output contract tests run on default CI | Read each `tests/parser-contract/fixtures/<provider>/<scenario>.txt` | Invoke `parse<Provider>...(stdout)` | Parsed payload matches inline snapshot; assertion runs on default CI workflow |
| TC-5.3b | TC-5.3b: drift detection produces clear diff | Modify the parser locally to drop a field | Run the parser-contract test against an unchanged fixture | Test fails with a snapshot diff naming the missing field |

#### `tests/integration/smoke.test.ts` (env-gated)

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.1a | TC-5.1a per provider: smoke completes | `LS_CLI_INTEGRATION=1`; provider binary on PATH | Invoke a basic operation under each provider in turn | Each returns valid envelope with `status === 'ok'` and produces the expected artifact |

#### `tests/integration/resume.test.ts` (env-gated)

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.1b | TC-5.1b per provider: resume with continuation handle | `LS_CLI_INTEGRATION=1`; first call produced a `continuation` | Story-continue with the captured handle | Each returns a valid envelope; the resumed run's `continuation.sessionId` matches the original |

#### `tests/integration/structured-output.test.ts` (env-gated)

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.1c | TC-5.1c per provider: structured-output parses and forwards | `LS_CLI_INTEGRATION=1`; run an operation that produces structured payload | Capture the parsed payload | Payload matches expected schema; envelope `result` contains the parsed payload unmodified |

#### `tests/integration/stall.test.ts` (env-gated)

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.1d | TC-5.1d per provider: stall detection terminates and surfaces | `LS_CLI_INTEGRATION=1`; configure provider to produce no output for longer than the silence window | Invoke the operation | Provider subprocess terminated cleanly (no zombie); envelope `errors[0].code === 'PROVIDER_STALLED'`; status `blocked` |

#### `tests/integration/gating.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.2a | TC-5.2a: integration suite skipped without env flag | `LS_CLI_INTEGRATION` unset | Run `vitest run --project integration` | Suite reports skipped (or zero tests run); no provider invoked |
| TC-5.2b | TC-5.2b: integration suite runs with env flag | `LS_CLI_INTEGRATION=1`; provider binaries available | Run `vitest run --project integration` | All four scenario files execute and report per-provider results |

#### `tests/gorilla/fixture.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.4a | TC-5.4a: fixture present and complete | Read `gorilla/fixture-spec-pack/` | List required artifacts | `epic.md`, `tech-design.md`, `test-plan.md`, `stories/` directory with at least one story, `target-codebase/` directory all present |

#### `tests/gorilla/distribution.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.4b | TC-5.4b: fixture excluded from published tarball | Run `npm pack` | List tarball contents | No path under `gorilla/` appears in the listing |

#### `tests/gorilla/reset.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.5a | TC-5.5a: reset returns fixture to baseline | Snapshot fixture state pre-mutation; mutate fixture (write/delete a few files) | Run `gorilla/reset.ts` | Fixture state matches snapshot byte-for-byte |

#### `tests/gorilla/prompt-coverage.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.6a | TC-5.6a: prompt covers every operation | Read `gorilla/prompt.md` | Match operation names | All ten operations from the inventory mentioned at least once |
| TC-5.6b | TC-5.6b: prompt covers each provider for provider-consuming operations | Read `gorilla/prompt.md` | Match provider names | Claude Code, Codex, Copilot each mentioned at least once for the operations that consume providers |

#### `tests/gorilla/template.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.7a | TC-5.7a: evidence template captures required axes | Read `gorilla/evidence-template.md` | Match section headings | Sections present for: operation, envelope, artifact, continuation handle, divergences |
| TC-5.7b | TC-5.7b: end-to-end run produces valid evidence | Use a sample populated evidence report (committed as fixture) | Parse against the template | All required sections populated; report flags any unexpected behaviors observed |

#### Manual: TC-5.8a (deliberate-drift detection)

This is a manual pre-release verification, not an automated test. Documented in `gorilla/prompt.md` as a self-test of the gorilla pack. The procedure: introduce a parser change that breaks compatibility with one captured fixture, run the gorilla pack, confirm the agent's evidence report flags the divergence. Recorded as evidence in `gorilla/self-test-log.md`.

---

### Flow 6: Distribution and Release

#### `tests/dist/metadata.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-6.1a | TC-6.1a: distribution metadata complete | Read `package.json` | Inspect required fields | `name`, `version`, `bin`, `exports` (with `.`, `./sdk`, `./sdk/contracts`, `./sdk/errors` subpaths), `files` allowlist, `types` all declared correctly |

#### `tests/dist/pack-install.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-6.2a | TC-6.2a: pack and install round trip | Run `npm pack`; create a fresh sandbox project; install tarball | Run `npx ls-cli inspect ./fixture --json` from sandbox | Exit 0; envelope valid |
| TC-6.2b | TC-6.2b: tarball respects files allowlist | List tarball contents | Cross-reference against `files` allowlist | Only `dist/`, `README*`, `LICENSE*`, `CHANGELOG*` present; no `tests/`, `gorilla/`, `scripts/`, source files |

#### `tests/dist/types.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-6.3a | TC-6.3a: types resolve under TypeScript | Set up a TypeScript consumer project that imports SDK types | Run `tsc --noEmit` | No errors; no `@ts-ignore` or manual declarations needed |

#### `tests/dist/version-sync.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-6.4a | TC-6.4a: version sync | Read `package.json.version`, parse top-of-file CHANGELOG header, read any version-marker file | Compare values | All three values equal |

#### `tests/release/workflow.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-6.5a | TC-6.5a: workflow triggers on tag | Read `.github/workflows/release.yml` | Inspect `on:` block | Triggers include `push.tags`; does not include `push.branches: ['**']` |
| TC-6.5b | TC-6.5b: default-CI gate blocks publish on failure | Inspect release.yml jobs | Check job dependencies and conditions | Publish job depends on default-CI job; publish step has `if: success()` |
| TC-6.5c | TC-6.5c: integration gate blocks publish on failure | Inspect release.yml | Check integration job presence and gating | Publish job depends on integration job; publish step gated on integration success |
| TC-6.5d | TC-6.5d: gorilla evidence required for publish | Inspect release.yml | Check evidence-verification step | Step verifies `gorilla/evidence/<release-window>/*.md` exists at HEAD; checks date is within release window; fails with named-gate error message if absent or stale |
| TC-6.5e | TC-6.5e: all gates green publishes | Simulate a successful workflow run via dry-run mode | Run release workflow on a test tag | Publish runs; version on registry matches tag |

#### Manual / `tests/release/runbook.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-6.6a | TC-6.6a: runbook structural completeness | Read `packages/ls-cli/docs/release-runbook.md` | Parse section headings | Sections present for npm token configuration, organization setup, gorilla pre-tag procedure, first-publish rehearsal, post-publish verification |
| TC-6.7a | TC-6.7a: first-publish smoke | (manual) Install first published version through `npx`; run `inspect` against fresh fixture | Capture envelope | Exit 0; envelope valid; persisted artifact present |

---

## Mock Strategy

### The Critical Rule

**Mock at external boundaries only. Never mock internal modules.**

This rule is enforced by AC-4.8 and verified by `tests/code-quality/no-internal-mocks.test.ts`. Internal modules are mocked only by accident — every such accident is a test bug, not a feature.

### What Gets Mocked

| Layer | Mocked? | Notes |
|-------|---------|-------|
| Filesystem at temp-dir granularity | **No** | Tests create real temp directories under `os.tmpdir()`; fast, deterministic, exercises real `fs` behavior |
| `fs.rename` for atomic-write failure simulation | **Yes** (one test) | Single test in `tests/infra/fs-atomic.test.ts`; targeted external boundary mock for failure-injection |
| Provider subprocess (in unit/command/sdk tests) | **Yes** | Spawn boundary; mock-provider stub reads a captured fixture file and emits its content as stdout |
| Provider subprocess (in integration tests) | **No** | Real-harness suite spawns real provider binaries; env-gated |
| `child_process.spawn` (in env-allowlist test) | **Yes** (one test) | Single test in `tests/infra/env-allowlist.test.ts`; targeted to capture env passed to spawn |
| Internal workflow modules (`src/core/{story-implementor,story-verifier,epic-synthesizer,epic-verifier,epic-cleanup,quick-fix}.ts`) | **Never** | Forbidden; exercised through SDK function entry points |
| Internal SDK operations | **Never** | Forbidden; exercised through CLI commands |
| Internal infrastructure (`src/infra/*`) | **Never** | Forbidden; exercised through callers |
| Network | **Yes** if used | Not currently used by the package; if added, mock at the boundary |

### Captured-Output Fixtures Are Not Hand-Written Mocks

Provider subprocess mocks in unit/command/sdk tests use the captured-output fixtures from `tests/parser-contract/fixtures/<provider>/<scenario>.txt`. The mock-provider stub reads the requested fixture and pipes its content as the subprocess's stdout. This means: every "mock" of a provider is actually replaying real captured output. There are no hand-written mock outputs in the test suite.

The captured-output refresh procedure (per `scripts/capture-provider-output.ts`) re-records fixtures against current provider versions. The maintainer runs this on a cadence (per minor provider version bump, before each release if the prior fixture is older than 90 days, on every parser-contract test failure). This is documented in tech-design §Testing Strategy — Captured-Output Refresh Cadence.

---

## Fixtures

### Captured Provider Output

`tests/parser-contract/fixtures/<provider>/<scenario>.txt` — twelve files (3 providers × 4 scenarios). Each file's first line is a comment with provenance:

```
# Provider: codex
# Command: codex exec --output-format json -p '...'
# Captured: 2026-04-15
# Scenario: structured-output
# Fixture content follows ↓
{"type":"item.text","text":"...
```

The trailing content is exact captured stdout. Whitespace, ordering, and field shapes preserved as captured. Fixtures are committed to source control.

| Provider | Scenarios |
|----------|-----------|
| Claude Code | smoke, resume, structured-output, stall |
| Codex | smoke, resume, structured-output, stall |
| Copilot | smoke, resume, structured-output, stall |

### Workspace Builders

`tests/fixtures/workspaces.ts` — helper functions that create temp directories with controlled spec-pack content. Used by command tests, SDK tests, and unit tests.

| Helper | Purpose |
|--------|---------|
| `createMinimalSpecPack()` | epic.md + tech-design.md + test-plan.md + one story file; valid for inspect, preflight |
| `createSpecPackWithStories(n)` | Same plus `n` story files; valid for story workflows |
| `createSpecPackWithoutEpic()` | Triggers INVALID_SPEC_PACK; covers blocker paths |
| `createSpecPackWithCustomInsert(content)` | Adds `custom-story-impl-prompt-insert.md` at the configured path |
| `createSpecPackWithLargeInsert()` | Custom insert exceeding 64 KiB; triggers PROMPT_INSERT_INVALID |
| `withSpecPack(callback)` | Creates pack, runs callback, cleans up; resource-safe pattern |

### Mock Provider Stubs

`tests/fixtures/mock-providers.ts` — provides spawn-time stubs that emit captured fixture content as stdout for unit/command/sdk tests.

```typescript
// Test usage example
const codexStub = mockProvider({ provider: 'codex', scenario: 'structured-output' });
// codexStub returns a SpawnAdapter that, when invoked, emits the captured fixture as stdout.
const result = await storyImplement({ ..., spawn: codexStub });
```

The stubs do not invent output — they replay captured real output. Stub behavior is controlled by the `scenario` argument, which selects the captured fixture.

### Gorilla Fixture Spec Pack

`gorilla/fixture-spec-pack/` — a complete realistic spec pack used for end-to-end agent runs. Distinct from the unit-test workspace builders above. The fixture is committed to source but excluded from the published tarball via the `files` allowlist.

| Path | Contents |
|------|----------|
| `epic.md` | A small but realistic epic with ~3 flows and ~10 ACs |
| `tech-design.md` | Config A tech design for the epic |
| `test-plan.md` | Per-file TC mappings for the epic |
| `stories/00-foundation.md` through `stories/02-feature.md` | Three stories |
| `target-codebase/` | A small Node project (~10 source files) the operations operate on |

The fixture is reset between gorilla runs by `gorilla/reset.ts`, which restores the directory to its committed baseline state.

---

## Test File Organization

```
tests/
├── foundation.test.ts                    # Story 0 structural smoke
├── verification-scripts.test.ts          # Story 0 script composition
├── build-output.test.ts                  # Story 0 dist sanity
├── parity.test.ts                        # Story 0 baseline parity
├── sdk/
│   ├── surface.test.ts                   # Story 1 public surface
│   ├── operations.test.ts                # Story 1 SDK behavior
│   ├── envelope.test.ts                  # Story 3 envelope version
│   ├── errors.test.ts                    # Story 3 error taxonomy
│   ├── preflight.test.ts                 # Story 3 preflight regression
│   ├── codex-resume.test.ts              # Story 3 codex retained-session regression (mock-codex; default CI)
│   └── per-operation/                    # Story 1 envelope-shape per op
│       ├── inspect.test.ts
│       ├── preflight.test.ts
│       ├── epic-synthesize.test.ts
│       ├── epic-verify.test.ts
│       ├── epic-cleanup.test.ts
│       ├── quick-fix.test.ts
│       ├── story-implement.test.ts
│       ├── story-continue.test.ts
│       ├── story-self-review.test.ts
│       └── story-verify.test.ts
├── command/
│   ├── help.test.ts                      # Story 2
│   ├── structure.test.ts                 # Story 2
│   ├── exit-codes.test.ts                # Story 2
│   ├── envelope.test.ts                  # Story 2
│   ├── invocation.test.ts                # Story 2
│   └── pack-and-install-smoke.test.ts    # Story 2
├── core/
│   └── schema-derivation.test.ts         # Story 3
├── infra/
│   ├── fs-atomic.test.ts                 # Story 3
│   ├── env-allowlist.test.ts             # Story 3
│   ├── index-reservation.test.ts         # Story 3
│   └── persisted-state.test.ts           # Story 3
├── code-quality/
│   ├── no-string-error-detection.test.ts # Story 3
│   └── no-internal-mocks.test.ts         # Story 3
├── parser-contract/                       # Story 4 — runs on default CI
│   ├── claude-code.test.ts
│   ├── codex.test.ts
│   ├── copilot.test.ts
│   ├── fixtures.test.ts                  # Story 3 — provenance check
│   └── fixtures/
│       ├── claude-code/                  # 4 captured fixtures
│       ├── codex/                        # 4 captured fixtures
│       └── copilot/                      # 4 captured fixtures
├── integration/                           # Story 4 — env-gated, real provider binaries only
│   ├── smoke.test.ts
│   ├── resume.test.ts
│   ├── structured-output.test.ts
│   ├── stall.test.ts
│   └── gating.test.ts
├── gorilla/                               # Story 5
│   ├── fixture.test.ts
│   ├── distribution.test.ts
│   ├── reset.test.ts
│   ├── prompt-coverage.test.ts
│   └── template.test.ts
├── dist/                                  # Stories 6-7
│   ├── metadata.test.ts
│   ├── pack-install.test.ts
│   ├── types.test.ts
│   ├── version-sync.test.ts
│   └── subpath-imports.test.ts           # Non-TC defensive
├── release/                               # Story 7
│   ├── workflow.test.ts
│   └── runbook.test.ts
└── fixtures/
    ├── workspaces.ts
    └── mock-providers.ts
```

The `migrated/` test files from `processes/impl-cli/tests/` keep their existing structure under `tests/` rather than getting renamed into the new layout above. The new layout above describes the new tests added by this epic; migrated tests retain their existing organization.

---

## Per-Chunk Test Tables

Each chunk's test count is the sum of its file totals below. Running totals propagate forward.

### Chunk 0: Toolchain Migration

| Test File | New Tests | TCs Covered |
|-----------|-----------|-------------|
| `tests/foundation.test.ts` | 4 | TC-1.1a, TC-1.1b, TC-1.2a, TC-1.3a, TC-1.4a |
| `tests/verification-scripts.test.ts` | 4 | TC-1.3b (×4 sub-cases) |
| `tests/build-output.test.ts` | 1 | TC-1.4b |
| `tests/parity.test.ts` | 2 | TC-1.5a, TC-1.5b |
| Migrated tests | ~226 | (all from processes/impl-cli/tests/) |
| **Chunk 0 Total** | **~237** | |

Note: TC-1.1a covers four assertions in one test; TC-1.3a covers four script names in one test; testing the assertions in a single test counts as one test. Test count totals reflect Vitest test definitions, not assertion count.

### Chunk 1: SDK Programmatic Surface

| Test File | New Tests | TCs Covered |
|-----------|-----------|-------------|
| `tests/sdk/surface.test.ts` | 4 | TC-2.1a, TC-2.2a, TC-2.2b, TC-2.3a |
| `tests/sdk/operations.test.ts` | 3 | TC-2.4a, TC-2.4b, TC-2.5a |
| `tests/sdk/per-operation/*.test.ts` (10 files) | 10 | (non-TC envelope-shape; one test per operation) |
| **Chunk 1 Total** | **17** | |

### Chunk 2: CLI Invocation Surface

| Test File | New Tests | TCs Covered |
|-----------|-----------|-------------|
| `tests/command/help.test.ts` | 1 | TC-3.1a |
| `tests/command/structure.test.ts` | 1 | TC-3.2a |
| `tests/command/exit-codes.test.ts` | 4 | TC-3.3a (×4 status values) |
| `tests/command/envelope.test.ts` | 2 | TC-3.4a, TC-3.4b |
| `tests/command/invocation.test.ts` | 1 | TC-3.5a |
| `tests/command/pack-and-install-smoke.test.ts` | 1 | TC-3.5b |
| Help-text format / arg-parse error tests | 2 | (non-TC defensive) |
| **Chunk 2 Total** | **12** | |

### Chunk 3: Runtime Contract Hardening

| Test File | New Tests | TCs Covered |
|-----------|-----------|-------------|
| `tests/sdk/envelope.test.ts` | 1 | TC-4.1a |
| `tests/infra/persisted-state.test.ts` | 1 | TC-4.1b |
| `tests/sdk/errors.test.ts` | 1 | TC-4.2a |
| `tests/code-quality/no-string-error-detection.test.ts` | 1 | TC-4.2b |
| `tests/core/schema-derivation.test.ts` | 2 | TC-4.3a, TC-4.3b |
| `tests/infra/fs-atomic.test.ts` | 1 | TC-4.4a |
| `tests/infra/index-reservation.test.ts` | 1 | TC-4.5a |
| `tests/infra/env-allowlist.test.ts` | 1 | TC-4.6a |
| `tests/sdk/codex-resume.test.ts` | 1 | TC-4.7a |
| `tests/sdk/preflight.test.ts` | 1 | TC-4.7b |
| `tests/code-quality/no-internal-mocks.test.ts` | 1 | TC-4.8a |
| `tests/parser-contract/fixtures.test.ts` | 1 | TC-4.8b |
| Atomic-write concurrency-stress | 1 | (non-TC) |
| Index-reservation 3+ parallel | 1 | (non-TC) |
| Index-reservation retry-cap exhaustion | 1 | (non-TC) |
| Env allowlist with empty parent env | 1 | (non-TC) |
| Codex resume across multiple turns | 1 | (non-TC) |
| Preflight with degraded provider matrix | 1 | (non-TC) |
| Schema-derivation breaking-change check | 1 | (non-TC) |
| Atomic-write with concurrent writers to different paths | 1 | (non-TC) |
| Persisted-state version backward-compat read | 1 | (non-TC) |
| Quick-fix typed arg errors | 1 | (non-TC; replaces string-matched detection) |
| **Chunk 3 Total** | **23** | |

### Chunk 4: Real-Harness + Captured-Output Contract

| Test File | New Tests | TCs Covered |
|-----------|-----------|-------------|
| `tests/parser-contract/claude-code.test.ts` | 4 (one per scenario) | TC-5.3a, TC-5.3b |
| `tests/parser-contract/codex.test.ts` | 4 | TC-5.3a |
| `tests/parser-contract/copilot.test.ts` | 4 | TC-5.3a |
| `tests/integration/smoke.test.ts` | 3 (one per provider) | TC-5.1a |
| `tests/integration/resume.test.ts` | 3 | TC-5.1b |
| `tests/integration/structured-output.test.ts` | 3 | TC-5.1c |
| `tests/integration/stall.test.ts` | 3 | TC-5.1d |
| `tests/integration/gating.test.ts` | 2 | TC-5.2a, TC-5.2b |
| Cross-provider continuation-handle compatibility | 1 | (non-TC negative) |
| Silence-window edge — exactly at threshold | 1 | (non-TC) |
| **Chunk 4 Total** | **28** | |

### Chunk 5: Gorilla Integration Pack

| Test File | New Tests | TCs Covered |
|-----------|-----------|-------------|
| `tests/gorilla/fixture.test.ts` | 1 | TC-5.4a |
| `tests/gorilla/distribution.test.ts` | 1 | TC-5.4b |
| `tests/gorilla/reset.test.ts` | 1 | TC-5.5a |
| `tests/gorilla/prompt-coverage.test.ts` | 2 | TC-5.6a, TC-5.6b |
| `tests/gorilla/template.test.ts` | 2 | TC-5.7a, TC-5.7b |
| Reset idempotency | 1 | (non-TC) |
| Fixture validates with `inspect` operation | 1 | (non-TC) |
| **Chunk 5 Total** | **9** | |

Note: TC-5.8a is manual pre-release verification, not an automated test; not counted here.

### Chunk 6: Package Distribution Surface

| Test File | New Tests | TCs Covered |
|-----------|-----------|-------------|
| `tests/dist/metadata.test.ts` | 1 | TC-6.1a |
| `tests/dist/pack-install.test.ts` | 2 | TC-6.2a, TC-6.2b |
| `tests/dist/types.test.ts` | 1 | TC-6.3a |
| `tests/dist/subpath-imports.test.ts` | 3 | (non-TC: TS-import, JS-import, types-only-import) |
| **Chunk 6 Total** | **7** | |

### Chunk 7: Release Automation

| Test File | New Tests | TCs Covered |
|-----------|-----------|-------------|
| `tests/dist/version-sync.test.ts` | 1 | TC-6.4a |
| `tests/release/workflow.test.ts` | 5 | TC-6.5a, TC-6.5b, TC-6.5c, TC-6.5d, TC-6.5e |
| `tests/release/runbook.test.ts` | 1 | TC-6.6a |
| YAML lint (workflow files) | 1 | (non-TC) |
| First-publish smoke (manual) | — | TC-6.7a (manual; not automated) |
| **Chunk 7 Total** | **8** | |

---

## Non-TC Decided Tests

Tests beyond 1:1 TC coverage. These are defensive, edge-case, or stress tests that the design judges valuable but that don't trace to a specific TC. They are listed here so they're not lost during story enrichment.

### Chunk 1
- **Per-operation envelope-shape tests (10 files).** Each operation's SDK function returns an envelope matching `CliResultEnvelope<TResult>` for both happy-path and error inputs. Defends against accidental envelope-shape regressions in any operation.

### Chunk 2
- **Help-text formatting test.** Each command's `--help` output includes its description and a usage example.
- **Arg-parse error test.** Each command rejects unknown flags with a non-zero exit code and a clear error message.

### Chunk 3
- **Atomic-write concurrency-stress.** Multiple concurrent writes to the same path; assert one wins, others fail cleanly with `AtomicWriteError`.
- **Index-reservation 3+ parallel.** Stress-test the retry loop with three parallel reservations; assert all distinct.
- **Index-reservation retry-cap exhaustion.** Pre-fill artifacts directory with reserved placeholders to force retry-cap exhaustion; assert `IndexReservationError`.
- **Env allowlist with empty parent env.** Empty parent env; assert filter returns empty plus overrides.
- **Codex resume across multiple turns.** Three consecutive resume calls; each propagates the prior session id correctly.
- **Preflight with degraded provider matrix.** Mixed binary-present, binary-missing, auth-unknown across three providers; assert the result correctly reports each tier and overall ready/not-ready status.
- **Schema-derivation breaking-change check.** Modify a canonical schema and assert the build fails (compile-time guard).
- **Atomic-write with concurrent writers to different paths.** Stress-test independent writes; assert no cross-contamination.
- **Persisted-state version backward-compat read.** Write a v1 state file; assert the loader accepts it; assert a fictional v2 file would be rejected (forward-compat guard).
- **Quick-fix typed arg errors.** Invocations with missing/extra args produce typed errors, not string-matched detection.

### Chunk 4
- **Cross-provider continuation-handle compatibility (negative).** A handle from one provider is rejected by a different provider's resume call with `CONTINUATION_HANDLE_INVALID`.
- **Silence-window edge — exactly at threshold.** Provider produces output at exactly the silence-window boundary; assert it is not classified as stalled.

### Chunk 5
- **Reset idempotency.** Running `reset.ts` twice produces the same state; second run is a no-op.
- **Fixture validates with inspect.** Running `inspect` against the gorilla fixture returns a `ready` envelope; the fixture is itself a valid spec pack.

### Chunk 6
- **Subpath imports under TypeScript and JavaScript.** Import from `ls-cli/sdk`, `ls-cli/sdk/contracts`, `ls-cli/sdk/errors` from both a TS consumer and a JS consumer; both work.
- **Types-only import.** A consumer that imports `import type { CliResultEnvelope } from 'ls-cli/sdk/contracts'` produces no runtime cost (no JS emitted for the import).

### Chunk 7
- **YAML lint.** Workflow files pass `actionlint` (or equivalent) without warnings.

---

## Test Count Reconciliation

### Per-File and Per-Chunk Totals

| Chunk | New TC Tests | New Non-TC Tests | Migrated Tests | Chunk Total | Cumulative |
|-------|--------------|------------------|----------------|-------------|------------|
| 0 — Toolchain Migration | 11 | — | ~226 | ~237 | ~237 |
| 1 — SDK Surface | 7 | 10 | — | 17 | ~254 |
| 2 — CLI Surface | 10 | 2 | — | 12 | ~266 |
| 3 — Hardening | 13 | 10 | — | 23 | ~289 |
| 4 — Real-Harness | 16 | 2 | — | 28 | ~317 |
| 5 — Gorilla | 7 | 2 | — | 9 | ~326 |
| 6 — Distribution | 4 | 3 | — | 7 | ~333 |
| 7 — Release | 7 | 1 | — | 8 | ~341 |
| **Totals** | **75** | **30** | **~226** | **~341** | **~341** |

### Cross-Check

- Per-file totals in §Per-Chunk Test Tables sum to per-chunk totals here. ✓
- Per-chunk totals here sum to ~341 cumulative. ✓
- The tech-design index summary table (§Test Count Reconciliation in tech-design.md) reports the same per-chunk numbers. ✓
- This test plan is the source of truth for per-file totals; the tech-design index summary mirrors them. Any future change to per-file counts updates here first, then propagates to the index summary in a single mechanical pass.

### TC Coverage Completeness

| Flow | TC Count in Epic | TCs Mapped Here | Coverage |
|------|------------------|-----------------|----------|
| Flow 1 — Toolchain | 10 | 10 | Complete |
| Flow 2 — SDK | 7 | 7 | Complete |
| Flow 3 — CLI | 7 | 7 | Complete |
| Flow 4 — Hardening | 13 | 13 | Complete |
| Flow 5 — Integration | 16 | 15 + 1 manual | Complete (TC-5.8a is manual pre-release verification) |
| Flow 6 — Distribution & Release | 12 | 11 + 1 manual | Complete (TC-6.7a is manual post-publish smoke) |
| **Totals** | **65** | **63 automated + 2 manual** | **65/65 covered** |

Every TC from the epic has a home in this document. Two TCs are manual verification rather than automated tests; both are noted explicitly with their manual procedure.

---

## Exploratory QA Scenarios

After TDD Green, manual exploratory testing catches "it works but feels wrong" cases that automated tests don't surface. These scenarios are recommended pre-release and are documented here for the maintainer's reference.

1. **Run a full epic end-to-end via the gorilla pack.** Use the gorilla fixture; walk every operation in sequence; record evidence. Catches integration friction the automated suite misses.

2. **Run with a degraded provider matrix.** Configure the run-config so that one provider is `secondary_harness: 'none'` and the other two are present. Confirm the run completes with degraded-fallback notes in the envelope.

3. **Interrupt a long-running story-implement and resume.** Kill the process mid-execution. Run story-continue with the captured continuation handle. Confirm the resumed session continues from the prior state.

4. **Provider auth expiration mid-run.** Manually expire the provider auth token. Confirm the package surfaces `PROVIDER_UNAVAILABLE` cleanly, not a parse error or a timeout.

5. **Concurrent runs against the same spec pack.** Start two `inspect` operations simultaneously. Confirm both produce envelopes with distinct artifact indexes.

6. **Spec pack with all optional inserts present.** Custom story-impl insert, custom verifier insert, optional companion docs. Confirm inspect reports each as `present` and operations consume them.

7. **Spec pack on a network filesystem.** Mount the spec pack on an NFS share or similar. Confirm atomic writes and index reservations behave correctly across the network filesystem boundary.

8. **First-publish from a fresh maintainer machine.** Bootstrap the release workflow from a machine that hasn't published before. Confirm the runbook covers every required step.

9. **Release with stale gorilla evidence.** Tag a release with evidence dated 8 days old (outside the configured 7-day window). Confirm the workflow fails with the named-gate message.

10. **TypeScript consumer on Node 20.x and 22.x.** A consumer project running both Node major versions imports the SDK and exercises a few operations. Confirms the package's Node 20 LTS minimum holds and that no Node-22-only API leaked into the build.

These scenarios are not part of any automated suite and are not gated by any verification script. They live here as a maintainer's pre-release checklist.

---

## Related Documentation

- Epic: `docs/spec-build/epics/02-standalone-liminal-sdk-cli/epic.md`
- Tech Design: `docs/spec-build/epics/02-standalone-liminal-sdk-cli/tech-design.md`
- Existing implementation reference: `processes/impl-cli/tests/` (read-only during this epic; baseline for TC-1.5a parity)
