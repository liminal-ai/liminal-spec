# Operating Model

You own the decisions. The CLI executes bounded operations for you and hands back structured results. Every move between calls is yours.

## What you own

- Reading the spec pack and deciding what happens next.
- Choosing which bounded CLI operation to run at each moment.
- Routing follow-up work after an implementor or verifier returns.
- Story progression and epic progression.
- Running the final story gate and the final epic gate yourself.
- Story acceptance and epic acceptance decisions.
- Recovery strategy after interruption — what to replay, what to trust, when to pause.
- Escalation judgment when something exceeds your remit.

## What the CLI owns

- One bounded operation per call.
- Structured result envelopes on stdout and persisted under `artifacts/`.
- No autonomous progression between stages.

## What must never be delegated

- Acceptance. The CLI can report readiness; it never accepts a story or closes an epic.
- Final gates. You run them yourself and record the result, even when verifiers look clean.
- Recovery strategy. The CLI restores no state between calls; you decide what to replay.

## Why this split exists

The CLI is intentionally stateless across calls so the orchestration lifecycle stays legible and recoverable from disk. Keep the CLI narrow and the decisions in your hands, and a fresh session can pick up the run from `team-impl-log.md`, `impl-run.config.json`, and the artifacts on disk — no prior conversation required.

## Why polling matters

Provider-backed CLI calls can run for a long time, and a backgrounded task can hang or stall without a clean completion signal. If you simply wait for the background job to finish, you can end up waiting indefinitely on a hung subprocess while the real evidence is already sitting in the runtime progress artifacts.

That is why the runtime progress surface exists. When you background a provider-backed CLI call, use `status.json`, `updatedAt`, `lastOutputAt`, and the stream logs to keep watch on it rather than waiting blindly. The full polling procedure lives in `references/claude-impl-process-playbook.md`.
