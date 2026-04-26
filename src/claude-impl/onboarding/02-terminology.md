# Terminology

These are the primitives and process terms used throughout this skill. Read once to set the vocabulary; re-consult later if any term slips.

## Spec pack

**Spec pack** — The bundle of files for one epic that you implement. Your input. It contains the **epic** (built with the `ls-epic` skill), the **tech design** (built with the `ls-tech-design` skill), and the **stories** (produced by the `ls-publish-epic` skill, which shards the epic into individual story files).

**Epic** — The functional source of truth: user profile, flows, acceptance criteria (ACs), test conditions (TCs), scope, data contracts. Describes what the feature does, not how.

**Tech design** — The implementation design derived from the epic: module responsibilities, interfaces, work breakdown. Comes in two shapes — **two-file** (`tech-design.md` + `test-plan.md`) or **four-file** (`tech-design.md` + two companion tech-design files + `test-plan.md`).

**Test plan** — The TC-to-test mapping and mock strategy. Tells you which tests satisfy which test conditions.

**Story** — One sharded slice of the epic, in `stories/`. Traces back to the epic's ACs/TCs. Implemented in order.

**Public prompt insert** — Optional per-run customization file at the spec-pack root: `custom-story-impl-prompt-insert.md` or `custom-story-verifier-prompt-insert.md`. Injected into role prompts when present. Non-blocking when absent.

## Roles

**Orchestrator** — You. Read the pack, decide routing, launch CLI operations, run gates, record state, accept work.

**Implementor** — Role the CLI dispatches for story implementation. Retained per story (same session across follow-up fixes within a story).

**Verifier** — Role the CLI dispatches for story verification. Retained per story; the initial verifier pass starts a session and follow-up verifier passes resume that same session until convergence or a user ruling.

**Quick fixer** — Role the CLI dispatches for small bounded corrections that don't justify a full implementor restart. Story-agnostic; receives a plain-language task description, no reading journey.

**Epic verifier** — Role the CLI dispatches for full-epic verification at closeout. Fresh session.

**Epic synthesizer** — Role the CLI dispatches to independently verify and consolidate epic-level findings into a single synthesis report.

## System layers

**Bundled CLI** (`ls-impl-cli`) — The runtime shipped inside this skill at `bin/ls-impl-cli.cjs`. Executes one bounded operation per call and returns a structured result. Stateless across calls.

**Bounded operation** — One discrete CLI call. The public set: `inspect`, `preflight`, `story-implement`, `story-continue`, `story-self-review`, `story-verify`, `quick-fix`, `epic-cleanup`, `epic-verify`, `epic-synthesize`.

**Provider** — The underlying CLI the bundled CLI invokes to run a role's prompt: Codex, Copilot, or Claude Code.

**Primary harness** — Claude Code. Always available; you run inside it.

**Secondary harness** — Optional provider the CLI invokes for GPT-backed roles: `codex`, `copilot`, or `none` (meaning "use the primary harness"). Configured per role in `impl-run.config.json`.

**Role defaults** — Default harness + model + reasoning-effort per role, resolved deterministically at initialization based on which secondary harnesses are available.

**Self-review pass** — A same-session review iteration after an initial or follow-up implementor pass. Dispatched through `story-self-review`. Defaults to 3 passes with evolving prompts.

**Degraded-diversity condition** — Recorded when no GPT-capable secondary harness is available and all roles fall back to Claude-only. Verifier diversity is weaker in this mode.

## Durable artifacts

**`team-impl-log.md`** — The run's durable narrative record. Holds state transitions, story sequence, receipts, cumulative baselines, gate decisions, cleanup status, open risks. Your recovery surface.

**`impl-run.config.json`** — The machine-readable run configuration. Declares primary/secondary harnesses, role models, self-review passes. Validated by `preflight`.

**`artifacts/`** — Directory at the spec-pack root where the CLI persists result envelopes. One subdirectory per story, plus `cleanup/` and `epic/`.

**Result envelope** — The structured JSON every bounded operation returns: command, status, outcome, result, errors, warnings, artifacts, timestamps. Emitted on stdout and persisted under `artifacts/`.

**Receipt** — The pre-acceptance record you write into `team-impl-log.md` before accepting a story: implementor evidence, verifier evidence, gate result, dispositions for each finding, open risks, baseline before/after.

**Cumulative baseline** — The running total of tests in the project, updated after each story. A lower total after a later story indicates regression.

**Cleanup artifact** — A markdown file you compile at stage 5 listing deferred and accepted-risk items carried from earlier stories. Reviewed with the human before dispatch.

## Actions

**Gate** — A project-specific verification command you run yourself before accepting work. Typically combines typecheck + lint + full test suite. Discovered at initialization. **Story gate** runs before story acceptance; **epic gate** runs before epic closeout.

**Preflight** — CLI operation that validates `impl-run.config.json`, checks harness availability, confirms readiness. Exit criterion for initialization.

**Inspect** — CLI operation that resolves the spec-pack root, validates layout, returns story inventory and insert presence. First runtime check during initialization.

**Precedence order (gate discovery)** — The sources the CLI checks to find gate commands, in order: explicit CLI flags → `impl-run.config.json` entries → package scripts → project policy docs → CI config. If all fail to yield an unambiguous gate, pause for a user decision.

**Replay** — In recovery: re-running a bounded operation whose durable artifact is missing or invalidated. You decide what to replay from what exists on disk.

**Fix routing** — After verification returns findings, deciding where fixes go: `story-continue` (same-session implementor), `quick-fix` (bounded correction), fresh implementor (extensive rework), or human escalation.

**Fresh session** — A new provider invocation with no prior context. The first verifier pass for a story is fresh; follow-up verifier passes reuse that retained verifier session unless the continuation handle goes stale.

**Disposition** — The resolved status of a verification finding: `fixed`, `accepted-risk`, or `defer`. Recorded in the receipt before story acceptance.
