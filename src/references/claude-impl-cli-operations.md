# Claude Impl CLI Operations

This guide explains the public CLI from the orchestrator's perspective. The CLI handles one bounded operation at a time and returns a structured envelope that the orchestrator records in `team-impl-log.md`.

## Command Map

| Command | Use It When | Outcome States | What To Do Next |
|---|---|---|---|
| `inspect` | You need to confirm the spec-pack layout, tech-design shape, story inventory, and insert presence. | `ready`, `needs-user-decision`, `blocked` | Record the layout and continue to the reading journey or pause for a user decision. |
| `preflight` | The reading journey is complete and `impl-run.config.json` exists. | `ready`, `needs-user-decision`, `blocked` | Record the validated configuration and gate choices before story work. |
| `story-implement` | A story is ready to start. | `ready-for-verification`, `needs-followup-fix`, `needs-human-ruling`, `blocked` | Route verification or follow-up work based on the returned outcome. |
| `story-continue` | The active retained implementor session should continue. | `ready-for-verification`, `needs-followup-fix`, `needs-human-ruling`, `blocked` | Continue the same story session only when the continuation handle matches. |
| `story-verify` | Fresh verifiers should review one story. | `pass`, `revise`, `block` | Route fixes or move toward acceptance. |
| `quick-fix` | A small, bounded fix should run without restarting the full implementor workflow. | `ready-for-verification`, `needs-more-routing`, `blocked` | Re-verify or route a larger follow-up path. |
| `epic-cleanup` | Approved cleanup-only fixes should run before epic verification. | `cleaned`, `needs-more-cleanup`, `blocked` | Review the cleanup result before epic verification continues. |
| `epic-verify` | All stories are accepted and cleanup is complete. | `pass`, `revise`, `block` | Gather the verifier batch for synthesis. |
| `epic-synthesize` | Epic verifier results are available and need consolidation. | `ready-for-closeout`, `needs-fixes`, `needs-more-verification`, `blocked` | Run the final orchestrator-owned gate or route more work. |

## Routing Signals

- If `story-implement` returns `needs-human-ruling`, keep the surfaced uncertainty explicit and pause for an orchestrator or human routing decision.
- If verifier results disagree materially, keep both verifier results visible, route to fresh follow-up verification or human escalation, and do not pretend the disagreement is already resolved.
- Use `quick-fix` only for small mechanical corrections. Pass a plain-language task description and do not impose a story-aware structured result contract on that handoff.
- Review the categorized cleanup batch with the human before dispatching `epic-cleanup`.
- cleanup review remains outside the CLI.
- Run `epic-verify` before final closeout.
- There is no direct closeout path from accepted stories.
- Do not skip epic verification.
- Do not treat epic verification as optional.

## IO Contract

- With `--json`, stdout must contain exactly one JSON envelope.
- The same envelope is persisted under `<spec-pack-root>/artifacts/`.
- `stderr` is for progress or debugging only; it is not the routing source of truth.

## Ownership Boundary

The final story gate and final epic gate remain orchestrator-owned. The CLI can report readiness, verification findings, and cleanup outcomes, but it does not accept stories or close the epic by itself.
The final epic gate stays outside the CLI even when synthesis reports `ready-for-closeout`.
