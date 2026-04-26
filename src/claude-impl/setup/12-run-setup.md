# Run Setup

Structural discovery and content reading are complete. Now establish durable run state: log, configuration, gates, preflight.

## 1. Check for existing state (resume or create)

Look for `team-impl-log.md` at the spec-pack root.

- **If it exists**, you are resuming a previous run. Read the log to establish the recorded `State`, `Current Story`, and `Current Phase`, then switch to `phases/22-recovery-and-resume.md` for state-based routing and replay rules. Do not re-run the steps below on a resumed run.
- **If it does not exist**, you are starting a new run. Create `team-impl-log.md` with `State: SETUP` and the spec-pack root recorded. Continue with the steps below.

Missing prior chat or tool-call context is a normal recovery case, not a blocker. Trust the log and the `artifacts/` directory over memory of prior turns.

## 2. Author `impl-run.config.json`

If the file is absent, author it using the default-resolution algorithm in `operations/31-provider-resolution.md`. The algorithm depends on which secondary harnesses are available locally (Codex, Copilot, or neither); apply it deterministically rather than improvising.

If the file is present, validate it by reading it; do not rewrite an existing run's role configuration unless the user has asked for a change. `preflight` may persist resolved `verification_gates` into the file so later CLI commands use the same gates without rediscovery. Treat that gate persistence as an expected CLI side effect and record it in `team-impl-log.md`.

## 3. Discover verification gates

Find the story gate and the epic gate in this precedence order:

1. explicit CLI flags supplied for this run
2. entries in `impl-run.config.json` (if the run uses them)
3. package scripts (the `scripts` section in `package.json` or the equivalent in the project's build manifest)
4. project policy docs (`CLAUDE.md`, `AGENTS.md`, `README.md`, related process files)
5. CI configuration

If gate policy remains ambiguous after all five sources, pause for a user decision. Record which source each gate came from.

When package scripts or policy files expose multiple plausible gates, preserve the selection rationale in the log if the `preflight` envelope provides it. At minimum, record the selected command and source; when available, also record the candidate commands considered and why the selected gate won (for example, stricter story gate vs. full epic gate).

## 4. Run `preflight`

```bash
node bin/ls-impl-cli.cjs preflight --spec-pack-root <path> --json
```

Preflight validates `impl-run.config.json`, checks harness availability, confirms prompt-asset readiness, and surfaces discovered gates. Route on its outcome:

- **`ready`** — proceed.
- **`needs-user-decision`** — pause, surface the reason, wait for direction.
- **`blocked`** — stop. Inspect `blockers` in the result envelope and resolve the underlying condition before retrying.

## 5. Record the outcome in `team-impl-log.md`

Write the following into the log (see `operations/33-artifact-contracts.md` for the full section template):

- validated `impl-run.config.json` snapshot (harness selections, role models, self-review passes)
- provider and harness availability matrix
- resolved story gate and epic gate commands, with the source for each
- gate-discovery rationale when present (candidate gates considered and why the selected gates won)
- active role defaults for this run
- any degraded-diversity condition
- spec-pack shape (two-file or four-file) and prompt-insert presence

Also transcribe the run-critical notes you captured during onboarding and spec-pack reading, so the operating essentials survive compaction.

## Exit

`preflight` returned `ready`. `team-impl-log.md` holds the validated configuration, the gate decisions, and the transcribed retained notes. `impl-run.config.json` is validated and on disk. You are in stage 3 (story cycle); proceed to `phases/20-story-cycle.md`.
