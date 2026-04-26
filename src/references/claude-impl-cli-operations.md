# Claude Impl CLI Operations

This guide explains the public CLI from the orchestrator's perspective. The CLI handles one bounded operation at a time and returns a structured envelope that the orchestrator records in `team-impl-log.md`.

Use `node bin/ls-impl-cli.cjs ...` as the portable invocation form across macOS, Linux, and Windows.

## Command Map

| Command | Use It When | Outcome States | What To Do Next |
|---|---|---|---|
| `inspect` | You need to confirm the spec-pack layout, tech-design shape, story inventory, and insert presence. | `ready`, `needs-user-decision`, `blocked` | Record the layout and continue to the reading journey or pause for a user decision. |
| `preflight` | The reading journey is complete and `impl-run.config.json` exists. | `ready`, `needs-user-decision`, `blocked` | Record the validated configuration and gate choices before story work. |
| `story-implement` | A story is ready to start. | `ready-for-verification`, `needs-followup-fix`, `needs-human-ruling`, `blocked` | Record the continuation handle, then route to `story-self-review`, `story-continue`, or human escalation based on the returned outcome. |
| `story-continue` | The active retained implementor session should continue with bounded follow-up work. | `ready-for-verification`, `needs-followup-fix`, `needs-human-ruling`, `blocked` | Continue the same story session only when the continuation handle matches, then route to `story-self-review` or further follow-up work. |
| `story-self-review` | The retained implementor session should run explicit same-session self-review passes. | `ready-for-verification`, `needs-followup-fix`, `needs-human-ruling`, `blocked` | Use the reviewed result to decide whether to verify, continue the implementor, or escalate. |
| `story-verify` | The retained verifier session should start or continue for one story. | `pass`, `revise`, `block`, `needs-human-ruling` | Route fixes or move toward acceptance. |
| `quick-fix` | A small, bounded fix should run without restarting the full implementor workflow. | `ready-for-verification`, `needs-more-routing`, `blocked` | Re-verify or route a larger follow-up path. |
| `epic-cleanup` | Approved cleanup-only fixes should run before epic verification. | `cleaned`, `needs-more-cleanup`, `blocked` | Review the cleanup result before epic verification continues. |
| `epic-verify` | All stories are accepted and cleanup is complete. | `pass`, `revise`, `block` | Gather the verifier batch for synthesis. |
| `epic-synthesize` | Epic verifier results are available and need consolidation. | `ready-for-closeout`, `needs-fixes`, `needs-more-verification`, `blocked` | Run the final orchestrator-owned gate or route more work. |

## Routing Signals

- Run `story-self-review` after a clean `story-implement` or `story-continue` result before launching `story-verify`.
- If `story-implement`, `story-continue`, or `story-self-review` returns `needs-human-ruling`, keep the surfaced uncertainty explicit and pause for an orchestrator or human routing decision.
- If the retained verifier and implementor still disagree materially, keep both the verifier evidence and implementor response visible, route to retained verifier follow-up or human escalation, and do not pretend the disagreement is already resolved.
- Use `story-verify` initial mode to start the retained verifier session, then use follow-up mode with the explicit verifier continuation handle plus the full implementor response to drive convergence.
- Use `quick-fix` only for small mechanical corrections. Pass a plain-language task description and do not impose a story-aware structured result contract on that handoff.
- Review the categorized cleanup batch with the human before dispatching `epic-cleanup`.
- cleanup review remains outside the CLI.
- Run `epic-verify` before final closeout.
- There is no direct closeout path from accepted stories.
- Do not skip epic verification.
- Do not treat epic verification as optional.

## IO Contract

- With `--json`, stdout must contain exactly one JSON envelope.
- Fresh provider-backed operations first return a strict provider payload that the CLI validates; the CLI then adds identity fields and persists the final envelope under `artifacts/`.
- The same envelope is persisted under `<spec-pack-root>/artifacts/`.
- Story operations persist under `artifacts/<story-id>/`; quick-fix persists under top-level `artifacts/quick-fix/` because it is story-agnostic.
- `stderr` is for progress or debugging only; it is not the routing source of truth.
- Provider-backed operations also write diagnostic runtime artifacts beside the result envelope:
  - `progress/<artifact-base>.status.json` for the latest pollable snapshot
  - `progress/<artifact-base>.progress.jsonl` for append-only lifecycle events
  - `streams/<artifact-base>.stdout.log` and `.stderr.log` for raw provider output
- Poll in this order when a long-running operation is still active:
  - read `status.json`
  - compare `updatedAt` and `lastOutputAt`
  - tail the stream logs when you need more detail
- Progress artifacts are observational only. Use the final JSON envelope for routing, acceptance, and recovery decisions.

## Runtime Progress

- The runtime progress surface is CLI-owned and provider-agnostic. The same polling model works whether the secondary harness is Codex, Claude Code, or Copilot.
- `status.json` is the primary wake-up target because it gives the current phase, timestamps, provider, cwd, timeout, and artifact paths in one place.
- `progress.jsonl` is the lifecycle history for the current operation.
- Treat these timing bands as reporting guidance only:
  - `healthy` — output or lifecycle update within 5 minutes
  - `slow` — no output for 5 to 15 minutes
  - `suspected-stall` — no output for 15+ minutes
  - `hard-stall` — no output for 30+ minutes
- These labels do not change CLI routing by themselves. They exist so the orchestrator can explain the current state without guessing.

## Ownership Boundary

The final story gate and final epic gate remain orchestrator-owned. The CLI can report readiness, verification findings, and cleanup outcomes, but it does not accept stories or close the epic by itself.
The final epic gate stays outside the CLI even when synthesis reports `ready-for-closeout`.
