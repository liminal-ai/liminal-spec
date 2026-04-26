# Artifact Contracts

The durable operating surface for the run:

- `team-impl-log.md` — the run's narrative and state record
- `impl-run.config.json` — validated run configuration (authoring covered in `operations/31-provider-resolution.md`)
- `artifacts/` — CLI result envelopes persisted per bounded operation

This file pins the structure of the log, story receipts, CLI result envelopes, and the `artifacts/` directory. Use these shapes when you write to the log or read result artifacts so a fresh session can recover the run from disk without guessing.

## `team-impl-log.md`

The log is markdown so both you and a reviewer can read it. Its headings are fixed contract; prose beneath them may expand.

### Required sections

```markdown
# Team Implementation Log

## Run Overview
- State: <state>
- Spec Pack Root: <absolute path>
- Current Story: <story id or "none">
- Current Phase: <phase or "none">

## Run Configuration
- Primary Harness: claude-code
- Story Implementor: <harness> / <model> / <reasoning_effort>
- Quick Fixer: <harness> / <model> / <reasoning_effort>
- Story Verifier: <harness> / <model> / <reasoning_effort>
- Self Review Passes: <n>
- Epic Verifier 1: <harness> / <model> / <reasoning_effort>
- Epic Verifier 2: <harness> / <model> / <reasoning_effort>
- Epic Synthesizer: <harness> / <model> / <reasoning_effort>
- Degraded Diversity: <true|false>

## Verification Gates
- Story Gate: <command>
- Story Gate Source: <source>
- Epic Gate: <command>
- Epic Gate Source: <source>
- Gate Discovery Rationale: <candidate gates and selection rationale, if provided>

## Story Sequence
- <ordered list of story ids>

## Current Continuation Handles
- Story Implementor:
  - Story: <story id>
  - Provider: <provider>
  - Session ID: <id>
  - Result Artifact: <path>
- Story Verifier:
  - Story: <story id>
  - Provider: <provider>
  - Session ID: <id>
  - Result Artifact: <path>

## Story Receipts
<one subsection per accepted story; see Story Receipt below>

## Cumulative Baselines
- Baseline Before Current Story: <n>
- Expected After Current Story: <n>
- Latest Actual Total: <n>

## Cleanup / Epic Verification
- Cleanup Artifact: <path or "none">
- Cleanup Status: <not-started|in-progress|cleaned>
- Epic Verification Status: <not-started|in-progress|pass|revise|block>
- Synthesis Status: <not-started|in-progress|ready-for-closeout|needs-fixes|needs-more-verification>
- Final Gate Status: <not-run|pass|fail>

## Open Risks / Accepted Risks
- <list or "none">
```

### Allowed `State` values

- `SETUP`
- `BETWEEN_STORIES`
- `STORY_ACTIVE`
- `PRE_EPIC_VERIFY`
- `EPIC_VERIFY_ACTIVE`
- `COMPLETE`
- `FAILED`

### Allowed `Current Phase` values

Under `STORY_ACTIVE`:

- `implement`
- `self-review`
- `verify`
- `fix-routing`
- `gate`
- `accept`

Under `EPIC_VERIFY_ACTIVE`:

- `cleanup-compile`
- `cleanup-review`
- `cleanup-dispatch`
- `cleanup-verify`
- `epic-verify`
- `epic-synthesize`
- `epic-gate`

All other states record `Current Phase: none`.

## Story Receipt

Each accepted story gets a subsection under `## Story Receipts`:

```markdown
### <story-id>
- Story Title: <title>
- Implementor Evidence: <artifact path>
- Verifier Evidence:
  - <artifact path>
- Story Gate: <command> — <pass|fail>
- Dispositions:
  - <finding id>: <fixed|accepted-risk|defer>
- Open Risks:
  - <list or "none">
- Baseline Before: <n>
- Baseline After: <n>
```

A receipt is complete when every listed field has a value. A story is not accepted until the receipt is complete AND the commit has landed.

## Result Envelope

Every bounded operation returns a JSON envelope on stdout and persists the same envelope under `artifacts/`. Expected shape:

```json
{
  "command": "story-implement",
  "version": 1,
  "status": "ok" | "needs-user-decision" | "blocked" | "error",
  "outcome": "<operation-specific, e.g. ready-for-verification>",
  "result": { /* operation-specific payload */ },
  "errors": [],
  "warnings": [],
  "artifacts": [
    { "kind": "result-envelope", "path": "artifacts/03-story-implementor-workflow/001-implementor.json" }
  ],
  "startedAt": "2026-04-22T10:12:34Z",
  "finishedAt": "2026-04-22T10:17:02Z"
}
```

`status` and `outcome` together determine routing. See `operations/30-cli-operations.md` for the routing matrix across all bounded operations.

## `artifacts/` directory layout

```
<spec-pack-root>/artifacts/
├── <story-id>/
│   ├── 001-implementor.json
│   ├── progress/
│   │   ├── 001-implementor.status.json
│   │   └── 001-implementor.progress.jsonl
│   ├── streams/
│   │   ├── 001-implementor.stdout.log
│   │   └── 001-implementor.stderr.log
│   ├── 002-self-review-pass-1.json
│   ├── 003-self-review-pass-2.json
│   ├── 004-self-review-pass-3.json
│   ├── 005-self-review-batch.json
│   ├── 006-verify.json
│   └── 007-verify.json
├── quick-fix/
│   ├── 001-quick-fix.json
│   ├── progress/
│   │   ├── 001-quick-fix.status.json
│   │   └── 001-quick-fix.progress.jsonl
│   └── streams/
│       ├── 001-quick-fix.stdout.log
│       └── 001-quick-fix.stderr.log
├── cleanup/
│   ├── cleanup-batch.md
│   └── 001-cleanup-result.json
└── epic/
    ├── 001-epic-verifier-batch.json
    └── 002-epic-synthesis.json
```

Files under each story directory are numbered sequentially in the order the CLI wrote them. `story-self-review` writes one pass artifact per requested pass plus a final batch envelope; skipped passes still leave explicit pass artifacts so numbering and recovery stay deterministic. `story-verify` writes one retained-verifier artifact per verifier pass, whether initial or follow-up. `quick-fix/`, `cleanup/`, and `epic/` follow the same numbering within their scope. `quick-fix/` is top-level because quick-fix is story-agnostic by contract. `cleanup-batch.md` is the orchestrator-authored input for `epic-cleanup`; every other file is a CLI-written result envelope or CLI-written pass artifact.

## Runtime Progress Artifacts

Provider-backed operations also write diagnostic runtime artifacts derived from the result envelope path:

- `progress/<artifact-base>.status.json` — latest pollable snapshot
- `progress/<artifact-base>.progress.jsonl` — append-only lifecycle history
- `streams/<artifact-base>.stdout.log` and `.stderr.log` — raw provider output

The progress surface is observational only. It helps the orchestrator report liveness, current phase, and whether output is still flowing, but it does not replace the final JSON envelope for routing or acceptance.

## Rules

- Artifacts on disk are the source of truth for what each bounded operation returned. The log references them by path; it does not duplicate their contents.
- Poll `status.json` first when a long-running operation is active. Use `updatedAt`, `lastOutputAt`, and the stream logs to describe current progress without guessing.
- Write a receipt for every accepted story; no story advances without one.
- Update `Current Phase` as you move through story-cycle and cleanup steps. Recovery uses it to locate the last completed checkpoint.
- Record `Story Gate Source` and `Epic Gate Source` at setup; do not silently change gate commands mid-run.
- Compare `Baseline After` against `Baseline Before` on every story; a drop indicates regression and blocks acceptance.
- A story is not accepted until its receipt is complete AND the commit has landed.
