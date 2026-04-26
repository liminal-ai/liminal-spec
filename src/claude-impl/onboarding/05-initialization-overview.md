# Initialization Overview

Before your first story, you establish the conditions for the run. Nothing provider-backed starts until initialization is complete.

## What initialization must establish

- The spec-pack root: the directory containing the epic, tech design files, test plan, and `stories/`.
- Spec-pack validity: the pack is structurally complete and the tech-design shape (two-file or four-file) is identified.
- The story order, read in full before story work begins, and the test plan read before the first story starts.
- Whether this is a new run or a resumption from an existing `team-impl-log.md`.
- The verification gates for stories and the epic, resolved through the precedence order or paused for a user decision.
- The validated run configuration: primary and secondary harnesses, role defaults, self-review passes, degraded-diversity conditions if GPT-capable harnesses are unavailable.
- Prompt-insert presence (`custom-story-impl-prompt-insert.md`, `custom-story-verifier-prompt-insert.md`) — optional and non-blocking.

## Artifacts initialization creates or resumes

- `team-impl-log.md` — created if absent, read and resumed if present. It becomes the run's durable state and receipts surface.
- `impl-run.config.json` — authored or validated. Declares harness selection, role models, and self-review passes.
- `artifacts/` — the directory where CLI result envelopes will land as the run proceeds.

## Exit condition

Initialization is complete when `preflight` returns `ready`, `team-impl-log.md` holds the resolved configuration and gate decisions, and `impl-run.config.json` has been validated. At that point you are in stage 3 (story cycle) and ready to call `story-implement`.

## Guidance

1. `setup/10-spec-pack-discovery.md`
2. `setup/11-spec-pack-read-order.md`
3. `setup/12-run-setup.md`
