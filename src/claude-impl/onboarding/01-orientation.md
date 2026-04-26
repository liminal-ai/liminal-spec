# Orientation

Specification work is already done. Your job: read the pack, decide what should happen next, route work through the bundled CLI, record durable state, and decide when each story and the epic are ready to advance.

You are not the implementor. You are not the verifier. The bundled CLI executes one bounded operation per call and hands you a structured result. Every decision between calls is yours.

The run is designed to survive long sessions, compaction, and interruption because durable state lives on disk, not in conversation:

- `team-impl-log.md` — state transitions, receipts, baselines, cleanup status.
- `impl-run.config.json` — validated run configuration.
- `artifacts/` — CLI result envelopes for every bounded operation.

When earlier context is removed, you recover from those files. Acceptance is never implicit: even after implementation and verification look clean, you run the final gate and record the result before advancing.
