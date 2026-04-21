# Test Plan: ls-claude-impl

## Purpose

This plan maps every TC from the `ls-claude-impl` epic to a concrete test surface. The feature spans both content and runtime, so the test plan does too. Some requirements are verified through packaged skill-content tests because the skill is the source of process truth. Others are verified through CLI command-entrypoint tests because the CLI is the execution surface. Together they cover the full chain:

```text
Epic AC -> TC -> skill/runtime test -> implementation
```

The main testing principle is the same one used elsewhere in the methodology: test at public seams. For this feature the public seams are:

- packaged skill files
- CLI command entrypoints
- provider adapter boundaries
- bundled runtime artifact

Some requirements in this feature are intentionally **process-contract only** rather than runtime-enforced. Those are validated through skill-content and CLI-guide tests because the orchestrator, not the CLI, owns that behavior. Wherever a requirement is covered that way, the coverage note should be read as “documentation/process contract,” not “hard runtime enforcement.”

## Testing Strategy

### Test Pyramid for This Feature

```text
         /\
        /  \  Manual verification
       /----\  - load skill, follow setup, run packaged CLI on fixture spec pack
      /      \
     /--------\  Command-entrypoint tests
    /          \  - inspect, preflight, story-implement, story-verify, quick-fix,
   /------------\    epic-cleanup, epic-verify, epic-synthesize
  /              \
 /----------------\  Schema / prompt assembly / provider adapter tests
/                  \  - config parsing, result contracts, asset embedding, adapter rules
```

### Critical Mocking Rule

**Mock only external boundaries.**

For this feature that means:

| Boundary | Mock? | Why |
|---|---|---|
| provider CLIs (`claude`, `codex`, `copilot`) | Yes | external process boundary |
| auth / environment availability checks | Yes | external machine state |
| filesystem fixture content | No | spec-pack resolution is core behavior and should run on real temp dirs |
| prompt assembly internals | No | that is feature logic, not a boundary |
| command routing modules | No | command entrypoints should exercise internal orchestration for real |

The command tests should run against real fixture directories on disk and real command handlers. Only process spawning and harness availability should be mocked or faked.

### Fixture Strategy

Create reusable fixture spec packs under `processes/impl-cli/tests/fixtures/`:

| Fixture | Purpose |
|---|---|
| `spec-pack-two-file/` | valid pack with `epic.md`, `tech-design.md`, `test-plan.md`, `stories/` |
| `spec-pack-four-file/` | valid pack with two `tech-design-*.md` companions |
| `spec-pack-missing-artifact/` | failure paths for `inspect` |
| `spec-pack-stories-md/` | invalid `stories.md` layout |
| `spec-pack-with-inserts/` | valid pack with both public insert files |
| `spec-pack-existing-log/` | recovery / resume flow |
| `provider-bin/` | fake `claude`, `codex`, `copilot` executables for availability and invocation tests |

The provider-bin fixtures should let tests simulate:

- binary present / absent
- authenticated / unauthenticated behavior
- structured result with session IDs
- resume behavior

Additional fixtures should cover:

- ambiguous story filenames for story-order tests
- malformed provider JSON outputs
- oversized prompt insert files
- mismatched story/session continuation handles

## TC → Test Mapping

### `scripts/__tests__/claude-impl-skill.test.ts`

Skill-content and reference-doc tests. These are primarily **process-contract only** checks. They verify that the packaged skill surface actually teaches the orchestrator the intended process.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-1.3a | `scripts/__tests__/claude-impl-skill.test.ts` | startup instructions create a new-run path when `team-impl-log.md` is absent | skill-surface contract |
| TC-1.3b | `scripts/__tests__/claude-impl-skill.test.ts` | startup instructions resume an existing run when `team-impl-log.md` is present | skill-surface contract |
| TC-1.6a | `scripts/__tests__/claude-impl-skill.test.ts` | setup guidance requires verification-gate discovery before implementation | skill-surface contract |
| TC-1.6b | `scripts/__tests__/claude-impl-skill.test.ts` | setup guidance pauses when gate policy is ambiguous | skill-surface contract |
| TC-2.4a | `scripts/__tests__/claude-impl-skill.test.ts`, `processes/impl-cli/tests/preflight-command.test.ts` | validated run configuration is recorded by the orchestrator after preflight | doc + runtime coverage |
| TC-6.1a | `scripts/__tests__/claude-impl-skill.test.ts` | process playbook requires a pre-acceptance receipt with evidence, gates, and risks | skill-surface contract |
| TC-6.2a | `scripts/__tests__/claude-impl-skill.test.ts` | story progression guidance uses committed codebase, story order, and log state | skill-surface contract |
| TC-6.2b | `scripts/__tests__/claude-impl-skill.test.ts` | process playbook blocks acceptance on test-count regression | skill-surface contract |
| TC-6.3a | `scripts/__tests__/claude-impl-skill.test.ts` | recovery guidance resumes from disk artifacts after interruption | skill-surface contract |
| TC-6.3b | `scripts/__tests__/claude-impl-skill.test.ts` | recovery guidance does not rely on prior conversation context | skill-surface contract |
| TC-7.1a | `scripts/__tests__/claude-impl-skill.test.ts`, `processes/impl-cli/tests/epic-cleanup-command.test.ts` | cleanup artifact is required before epic verification begins | doc + runtime coverage |
| TC-7.2a | `scripts/__tests__/claude-impl-skill.test.ts`, `processes/impl-cli/tests/cli-operations-doc.test.ts` | cleanup batch requires human review before dispatch | doc coverage in both skill and CLI guide |
| TC-7.3a | `scripts/__tests__/claude-impl-skill.test.ts`, `processes/impl-cli/tests/cli-operations-doc.test.ts` | epic verification starts only from a verified cleanup state | process-contract coverage |
| TC-8.1a | `scripts/__tests__/claude-impl-skill.test.ts`, `processes/impl-cli/tests/cli-operations-doc.test.ts` | epic verification is mandatory for multi-story completion | doc coverage in skill and CLI guide |
| TC-8.1b | `scripts/__tests__/claude-impl-skill.test.ts`, `processes/impl-cli/tests/cli-operations-doc.test.ts` | no skip path exists for epic verification | doc coverage in skill and CLI guide |
| TC-8.2a | `scripts/__tests__/claude-impl-skill.test.ts`, `processes/impl-cli/tests/epic-synthesize-command.test.ts` | synthesis is mandatory after epic verifier results exist | doc + runtime coverage |
| TC-8.4a | `scripts/__tests__/claude-impl-skill.test.ts`, `processes/impl-cli/tests/cli-operations-doc.test.ts` | final epic gate remains orchestrator-owned | doc coverage in skill and CLI guide |

### `processes/impl-cli/tests/inspect-command.test.ts`

`inspect` command tests using real fixture directories.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-1.1a | `processes/impl-cli/tests/inspect-command.test.ts` | accepts valid two-file tech-design layout | primary runtime coverage |
| TC-1.1b | `processes/impl-cli/tests/inspect-command.test.ts` | accepts valid four-file tech-design layout | primary runtime coverage |
| TC-1.1c | `processes/impl-cli/tests/inspect-command.test.ts` | rejects `stories.md` in place of `stories/` | primary runtime coverage |
| TC-1.1d | `processes/impl-cli/tests/inspect-command.test.ts` | rejects missing required artifact with named blocker | primary runtime coverage |
| TC-1.2a | `processes/impl-cli/tests/inspect-command.test.ts` | identifies two-file tech-design shape | primary runtime coverage |
| TC-1.2b | `processes/impl-cli/tests/inspect-command.test.ts` | identifies four-file tech-design shape and companions, and rejects invalid companion counts/patterns | primary runtime coverage |
| TC-1.4a | `processes/impl-cli/tests/inspect-command.test.ts` | reports both public insert files when present | primary runtime coverage |
| TC-1.4b | `processes/impl-cli/tests/inspect-command.test.ts` | allows absent insert files without failure | primary runtime coverage |
| TC-1.5a | `processes/impl-cli/tests/inspect-command.test.ts`, `processes/impl-cli/tests/story-order.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | returns full story inventory and deterministic order before implementation begins | runtime + skill coverage |

### `processes/impl-cli/tests/preflight-command.test.ts`

`preflight` command tests using a valid fixture spec pack plus run-config fixtures.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-1.6a | `processes/impl-cli/tests/preflight-command.test.ts`, `processes/impl-cli/tests/gate-discovery.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | preflight carries discovered gate expectations into readiness output | runtime + skill coverage |
| TC-1.6b | `processes/impl-cli/tests/preflight-command.test.ts`, `processes/impl-cli/tests/gate-discovery.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | ambiguous gate policy returns `needs-user-decision` | runtime + skill coverage |
| TC-2.1a | `processes/impl-cli/tests/preflight-command.test.ts` | primary harness availability is always checked | primary runtime coverage |
| TC-2.2a | `processes/impl-cli/tests/preflight-command.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | Codex-backed roles validate successfully when Codex is available, while the skill docs define Codex as the preferred default | runtime + process-contract coverage |
| TC-2.2b | `processes/impl-cli/tests/preflight-command.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | Copilot-backed fresh-session roles validate successfully when selected, while the skill docs define Copilot as the fallback for eligible fresh-session roles | runtime + process-contract coverage |
| TC-2.2c | `processes/impl-cli/tests/preflight-command.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | roles using `secondary_harness: "none"` pass with primary harness only, while the skill docs define the Claude-only degraded path | runtime + process-contract coverage |
| TC-2.4a | `processes/impl-cli/tests/preflight-command.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | preflight returns validated config for orchestrator logging | runtime + skill coverage |

### `processes/impl-cli/tests/gate-discovery.test.ts`

Gate-discovery precedence tests.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-1.6a | `processes/impl-cli/tests/gate-discovery.test.ts` | explicit or discovered gate configuration is returned with source metadata | precedence contract coverage |
| TC-1.6b | `processes/impl-cli/tests/gate-discovery.test.ts` | unresolved gate ambiguity returns `needs-user-decision` | precedence contract coverage |

### `processes/impl-cli/tests/story-order.test.ts`

Story-order extraction tests.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-1.5a | `processes/impl-cli/tests/story-order.test.ts` | numeric prefix ordering, lexical fallback, and ambiguity handling are deterministic | ordering algorithm coverage |

### `processes/impl-cli/tests/config-schema.test.ts`

Schema tests for `impl-run.config.json`.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-2.3a | `processes/impl-cli/tests/config-schema.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | validates authored Codex-backed story implementor config while the skill docs define the preferred default | runtime + process-contract coverage |
| TC-2.3b | `processes/impl-cli/tests/config-schema.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | validates authored Claude-only story implementor fallback via `secondary_harness: "none"` while the skill docs define the fallback rule | runtime + process-contract coverage |
| TC-2.3c | `processes/impl-cli/tests/config-schema.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | validates authored mixed verifier pair config while the skill docs define the preferred pair | runtime + process-contract coverage |
| TC-2.3d | `processes/impl-cli/tests/config-schema.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | validates authored Claude-only verifier pair config while the skill docs define the degraded mode | runtime + process-contract coverage |
| TC-2.3e | `processes/impl-cli/tests/config-schema.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | validates authored epic verifier array plus synthesizer config while the skill docs define the preferred defaults | runtime + process-contract coverage |

### `processes/impl-cli/tests/prompt-assembly.test.ts`

Prompt-system tests using embedded asset fixtures and optional public insert files.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-3.1a | `processes/impl-cli/tests/prompt-assembly.test.ts` | story implementor prompt uses base prompt + required snippets + reading journey | primary runtime coverage |
| TC-3.1b | `processes/impl-cli/tests/prompt-assembly.test.ts` | story verifier prompt uses verifier base + required snippets + evidence-focused reading journey | primary runtime coverage |
| TC-3.2a | `processes/impl-cli/tests/prompt-assembly.test.ts` | implementor insert file is included every time when present | primary runtime coverage |
| TC-3.2b | `processes/impl-cli/tests/prompt-assembly.test.ts` | implementor insert omission is non-fatal when absent | primary runtime coverage |
| TC-3.3a | `processes/impl-cli/tests/prompt-assembly.test.ts` | verifier insert file is included for each verifier prompt | primary runtime coverage |
| TC-3.3b | `processes/impl-cli/tests/prompt-assembly.test.ts` | verifier insert omission is non-fatal when absent | primary runtime coverage |
| TC-3.4a | `processes/impl-cli/tests/prompt-assembly.test.ts` | implementor reading journey includes story, full tech-design set, and bounded reflection instructions | primary runtime coverage |
| TC-3.4b | `processes/impl-cli/tests/prompt-assembly.test.ts` | verifier reading journey includes evidence-oriented reading instructions | primary runtime coverage |
| TC-3.4c | `processes/impl-cli/tests/prompt-assembly.test.ts` | quick-fix prompt stays narrow and does not inject the full story reread | primary runtime coverage |
| TC-4.3b | `processes/impl-cli/tests/prompt-assembly.test.ts` | self-review prompt changes by pass number instead of repeating unchanged | primary runtime coverage |

### `processes/impl-cli/tests/prompt-asset-contract.test.ts`

Prompt-asset content-contract tests. These verify required headings/placeholders inside prompt files, not just that assets were included.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-3.1a | `processes/impl-cli/tests/prompt-asset-contract.test.ts` | story implementor prompt contains role, artifact reading order, self-review behavior, and result contract placeholders | prompt content-contract coverage |
| TC-3.1b | `processes/impl-cli/tests/prompt-asset-contract.test.ts` | story verifier prompt contains evidence rules, severity enum, AC/TC checks, and routing placeholders | prompt content-contract coverage |
| TC-3.4c | `processes/impl-cli/tests/prompt-asset-contract.test.ts` | quick-fix prompt stays free of any story-aware structured contract or reading-journey requirements | prompt content-contract coverage |
| TC-8.1c | `processes/impl-cli/tests/prompt-asset-contract.test.ts` | epic verifier prompt contains cross-story and production-path mock/shim audit requirements | prompt content-contract coverage |
| TC-8.3a | `processes/impl-cli/tests/prompt-asset-contract.test.ts` | epic synthesizer prompt contains confirmed vs disputed issue categories | prompt content-contract coverage |

### `processes/impl-cli/tests/story-implement-command.test.ts`

Implementation operation tests using fake provider adapters.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-4.1a | `processes/impl-cli/tests/story-implement-command.test.ts` | `story-implement` accepts documented inputs and returns a structured implementation result | primary runtime coverage |
| TC-4.2b | `processes/impl-cli/tests/story-implement-command.test.ts` | implementation result includes continuation/session handle for later use | primary runtime coverage |
| TC-4.3a | `processes/impl-cli/tests/story-implement-command.test.ts` | self-review runs the configured number of passes unless a blocking stop occurs | primary runtime coverage |
| TC-4.4a | `processes/impl-cli/tests/story-implement-command.test.ts` | clear local self-review fixes are applied automatically | primary runtime coverage |
| TC-4.4b | `processes/impl-cli/tests/story-implement-command.test.ts` | uncertain fixes are surfaced to the orchestrator instead of auto-applied | primary runtime coverage |
| TC-4.5a | `processes/impl-cli/tests/story-implement-command.test.ts`, `processes/impl-cli/tests/result-contracts.test.ts` | implementor result includes identity, plan, changed files, tests, gates, self-review, questions, deviations, next step | runtime + schema coverage |
| TC-5.4a | `processes/impl-cli/tests/story-implement-command.test.ts` | implementor uncertainty remains visible in the returned result | primary runtime coverage |

### `processes/impl-cli/tests/provider-adapter.test.ts`

Provider adapter tests with fake `claude`, `codex`, and `copilot` executables in `PATH`.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-4.2a | `processes/impl-cli/tests/provider-adapter.test.ts` | self-review continuation reuses the same implementor provider session | primary runtime coverage |
| TC-5.1b | `processes/impl-cli/tests/provider-adapter.test.ts` | re-verification launches fresh verifier sessions instead of reusing prior verifier sessions | primary runtime coverage |

### `processes/impl-cli/tests/story-verify-command.test.ts`

Verifier-batch tests using fake provider outputs and comparison fixtures.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-5.1a | `processes/impl-cli/tests/story-verify-command.test.ts` | `story-verify` launches two verifiers by default | primary runtime coverage |
| TC-5.2b | `processes/impl-cli/tests/story-verify-command.test.ts` | verifier result preserves additional observations that are not formal findings | primary runtime coverage |
| TC-5.2c | `processes/impl-cli/tests/story-verify-command.test.ts` | verifier result includes explicit mock/shim audit findings for integration-facing stories | primary runtime coverage |
| TC-5.4b | `processes/impl-cli/tests/story-verify-command.test.ts` | material verifier disagreement remains visible for orchestrator routing | primary runtime coverage |

### `processes/impl-cli/tests/quick-fix-command.test.ts`

Quick-fix operation tests with narrow scope fixtures.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-5.3a | `processes/impl-cli/tests/quick-fix-command.test.ts` | quick fix runs as a bounded correction path without full re-implementation | primary runtime coverage |
| TC-5.3b | `processes/impl-cli/tests/quick-fix-command.test.ts`, `processes/impl-cli/tests/result-contracts.test.ts` | quick-fix keeps the outer envelope contract while allowing an unstructured provider payload | runtime + schema coverage |

### `processes/impl-cli/tests/result-contracts.test.ts`

Schema-level tests for structured output contracts.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-4.5a | `processes/impl-cli/tests/result-contracts.test.ts`, `processes/impl-cli/tests/story-implement-command.test.ts` | command results use a shared envelope plus an implementor-specific payload | schema + command coverage |
| TC-5.2a | `processes/impl-cli/tests/result-contracts.test.ts` | story verifier result requires identity, findings, requirement coverage, gates, and routing guidance | primary runtime coverage |
| TC-7.1a | `processes/impl-cli/tests/result-contracts.test.ts`, `processes/impl-cli/tests/epic-cleanup-command.test.ts` | cleanup result contract is durable and machine-readable | schema + command coverage |
| TC-8.3a | `processes/impl-cli/tests/result-contracts.test.ts`, `processes/impl-cli/tests/epic-synthesize-command.test.ts` | synthesis result distinguishes confirmed vs unconfirmed issues | schema + command coverage |

### `processes/impl-cli/tests/cli-io-contract.test.ts`

CLI IO-contract tests for stdout, stderr, and persisted envelope behavior.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-4.1a | `processes/impl-cli/tests/cli-io-contract.test.ts` | `--json` emits exactly one envelope object on stdout | runtime contract coverage |
| TC-4.5a | `processes/impl-cli/tests/cli-io-contract.test.ts` | persisted artifact JSON matches the emitted stdout envelope | runtime contract coverage |
| TC-7.1a | `processes/impl-cli/tests/cli-io-contract.test.ts` | cleanup command writes a persisted result envelope under the cleanup artifact root | runtime contract coverage |

### `processes/impl-cli/tests/cli-operations-doc.test.ts`

Public command-guide tests. These are also **process-contract only** checks. They keep the orchestrator-facing CLI reference aligned with intended process ownership.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-5.5a | `processes/impl-cli/tests/cli-operations-doc.test.ts` | CLI operation guide states that the final story gate is orchestrator-owned | documentation contract |
| TC-7.2a | `processes/impl-cli/tests/cli-operations-doc.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | CLI guide preserves cleanup-review-before-dispatch rule | documentation contract |
| TC-8.1a | `processes/impl-cli/tests/cli-operations-doc.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | command guide requires epic verification before closeout | documentation contract |
| TC-8.1b | `processes/impl-cli/tests/cli-operations-doc.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | command guide exposes no skip path for epic verification | documentation contract |
| TC-8.4a | `processes/impl-cli/tests/cli-operations-doc.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | command guide states final epic gate is orchestrator-owned | documentation contract |

### `processes/impl-cli/tests/log-template-contract.test.ts`

Log-template contract tests for the orchestrator-owned recovery surface.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-1.3a | `processes/impl-cli/tests/log-template-contract.test.ts` | required log headings and state markers remain aligned with the documented template | process-contract coverage |
| TC-6.3a | `processes/impl-cli/tests/log-template-contract.test.ts` | continuation handle, receipts, and cleanup sections remain present for recovery | process-contract coverage |

### `processes/impl-cli/tests/security-guardrails.test.ts`

Guardrail tests for path, cwd, timeout, and artifact safety.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-1.1d | `processes/impl-cli/tests/security-guardrails.test.ts` | spec-pack root outside a git repo is rejected | runtime guardrail coverage |
| TC-1.4b | `processes/impl-cli/tests/security-guardrails.test.ts` | unreadable prompt insert returns `PROMPT_INSERT_INVALID` | runtime guardrail coverage |
| TC-4.2b | `processes/impl-cli/tests/security-guardrails.test.ts` | mismatched story/session continuation input is rejected | runtime guardrail coverage |
| TC-4.5a | `processes/impl-cli/tests/security-guardrails.test.ts` | provider timeout returns stable blocked/error envelope | runtime guardrail coverage |
| TC-5.2a | `processes/impl-cli/tests/security-guardrails.test.ts` | malformed provider output returns `PROVIDER_OUTPUT_INVALID` | runtime guardrail coverage |
| TC-7.1a | `processes/impl-cli/tests/security-guardrails.test.ts` | persisted artifacts redact obvious bearer/auth strings | runtime guardrail coverage |

### `processes/impl-cli/tests/epic-cleanup-command.test.ts`

Cleanup operation tests with cleanup-batch fixtures.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-7.1a | `processes/impl-cli/tests/epic-cleanup-command.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | cleanup command consumes a durable cleanup artifact before epic verification | command + skill coverage |
| TC-7.3a | `processes/impl-cli/tests/cli-operations-doc.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | epic verification only proceeds after cleanup has produced a verified result | process-contract coverage |

### `processes/impl-cli/tests/epic-verify-command.test.ts`

Epic verifier batch tests with cross-story fixtures.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-8.1c | `processes/impl-cli/tests/epic-verify-command.test.ts` | epic verifier results include mock/shim audit findings on production paths | primary runtime coverage |

### `processes/impl-cli/tests/epic-synthesize-command.test.ts`

Epic synthesis tests with overlapping and conflicting verifier findings.

| TC | Test File | Test Description | Coverage Notes |
|---|---|---|---|
| TC-8.2a | `processes/impl-cli/tests/epic-synthesize-command.test.ts`, `scripts/__tests__/claude-impl-skill.test.ts` | synthesis command is part of every epic closeout path | runtime + skill coverage |
| TC-8.3a | `processes/impl-cli/tests/epic-synthesize-command.test.ts`, `processes/impl-cli/tests/result-contracts.test.ts` | synthesis verifies and categorizes findings rather than merging blindly | runtime + schema coverage |

## Non-TC Decided Tests

These tests are important even though they are not 1:1 with epic TCs.

| Test | Why It Matters |
|---|---|
| invalid config rejects duplicate epic verifier labels | protects log/report clarity |
| `story-continue` rejects mismatched story/session handle | prevents continuation drift |
| provider adapters do not use “latest session by cwd” fallback | avoids accidental resume of the wrong session |
| prompt assets are embedded into the generated runtime bundle | protects packaged-skill portability |
| build output includes `bin/ls-impl-cli.cjs` in packaged skill | protects distribution correctness |
| packaged CLI `--help` works under Node after bundling | protects Node-compatible distribution target |
| malformed provider output returns machine-readable CLI error | protects the provider parsing boundary |
| ambiguous story ordering returns `needs-user-decision` | protects deterministic progression |
| oversized prompt insert is rejected | protects prompt-surface trust boundary |
| preflight rejects mismatched story/session continuation input | protects recovery integrity |
| spec-pack root outside git repo is rejected | protects root trust boundary |
| provider timeout maps to stable blocked/error result | protects subprocess reliability |
| persisted stdout/stderr artifacts redact obvious secrets | protects durable artifact safety |
| unreadable prompt insert returns `PROMPT_INSERT_INVALID` | protects insert-path handling |
| log-template validation stays aligned with parser assumptions | protects orchestrator recovery surface |

## Manual Verification Checklist

After TDD Green for the final chunk, run a manual smoke on a fixture spec pack:

1. Build the skill pack.
2. Confirm the packaged skill contains:
   - `SKILL.md`
   - all four reference files
   - `bin/ls-impl-cli.cjs`
3. Run:
   - `node dist/skills/ls-claude-impl/bin/ls-impl-cli.cjs --help`
   - `node dist/skills/ls-claude-impl/bin/ls-impl-cli.cjs inspect --spec-pack-root <fixture>`
   - `node dist/skills/ls-claude-impl/bin/ls-impl-cli.cjs preflight --spec-pack-root <fixture>`
4. Verify inspect returns story order and insert status.
5. Verify preflight returns validated config and provider readiness notes.
6. Load the built skill in a local Claude Code session and confirm the startup flow points to the reading journey after setup.

## Work Breakdown and Test Counts

### Story 0: Foundation

**Scope:** config schema, result contracts, bundled runtime smoke, generated asset embedding  
**Relevant sections:** Run Configuration Contract, Result Contracts, Packaging  
**Minimum owned tests:** 23

| Test File | Minimum Tests |
|---|---:|
| `processes/impl-cli/tests/config-schema.test.ts` | 8 |
| `processes/impl-cli/tests/result-contracts.test.ts` | 8 |
| `processes/impl-cli/tests/cli-io-contract.test.ts` | 3 |
| `processes/impl-cli/tests/packaged-cli-smoke.test.ts` | 4 |

### Story 1: Skill Surface

**Scope:** `SKILL.md`, progressive disclosure references, pack integration  
**Relevant sections:** Skill Surface Layout, Flow 1, Flow 2, Flow 3  
**Minimum owned tests:** 22

| Test File | Minimum Tests |
|---|---:|
| `scripts/__tests__/claude-impl-build.test.ts` | 4 |
| `scripts/__tests__/claude-impl-skill.test.ts` | 16 |
| `processes/impl-cli/tests/log-template-contract.test.ts` | 2 |

### Story 2: Inspect and Preflight

**Scope:** spec-pack resolution, insert detection, run-config validation, provider availability  
**Relevant sections:** Flow 1: Inspect and Preflight  
**Minimum owned tests:** 32

| Test File | Minimum Tests |
|---|---:|
| `processes/impl-cli/tests/inspect-command.test.ts` | 9 |
| `processes/impl-cli/tests/preflight-command.test.ts` | 8 |
| `processes/impl-cli/tests/gate-discovery.test.ts` | 2 |
| `processes/impl-cli/tests/story-order.test.ts` | 1 |
| `processes/impl-cli/tests/provider-adapter.test.ts` | 6 |
| `processes/impl-cli/tests/security-guardrails.test.ts` | 6 |

### Story 3: Prompt Assembly and Story Implementation

**Scope:** base prompts, snippets, public inserts, implementation launch, continuation, self-review  
**Relevant sections:** Prompt Asset System, Flow 2: Story Implementation and Continuation  
**Minimum owned tests:** 26

| Test File | Minimum Tests |
|---|---:|
| `processes/impl-cli/tests/prompt-assembly.test.ts` | 10 |
| `processes/impl-cli/tests/prompt-asset-contract.test.ts` | 5 |
| `processes/impl-cli/tests/story-implement-command.test.ts` | 8 |
| `processes/impl-cli/tests/story-continue-command.test.ts` | 3 |

### Story 4: Story Verification and Quick Fix

**Scope:** verifier batches, quick-fix workflow, process ownership docs  
**Relevant sections:** Flow 3: Story Verification and Quick Fix  
**Minimum owned tests:** 14

| Test File | Minimum Tests |
|---|---:|
| `processes/impl-cli/tests/story-verify-command.test.ts` | 6 |
| `processes/impl-cli/tests/quick-fix-command.test.ts` | 3 |
| `processes/impl-cli/tests/cli-operations-doc.test.ts` | 5 |

### Story 5: Cleanup, Epic Verification, and Closeout

**Scope:** cleanup batch, epic verifier batch, synthesis, final packaged smoke refinements  
**Relevant sections:** Flow 4: Epic Cleanup, Verification, and Synthesis  
**Minimum owned tests:** 8

| Test File | Minimum Tests |
|---|---:|
| `processes/impl-cli/tests/epic-cleanup-command.test.ts` | 2 |
| `processes/impl-cli/tests/epic-verify-command.test.ts` | 3 |
| `processes/impl-cli/tests/epic-synthesize-command.test.ts` | 3 |

## Related Sections

- Cross-cutting architecture and dependency decisions: `tech-design.md`
- Skill surface and orchestrator-owned state: `tech-design-skill-process.md`
- CLI runtime contracts, adapters, and packaging: `tech-design-cli-runtime.md`
