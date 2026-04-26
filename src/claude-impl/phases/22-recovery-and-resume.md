# Recovery and Resume

Recovery starts from durable files on disk, not from reconstructed conversation memory. When you arrive here — typically after `setup/12-run-setup.md` finds an existing `team-impl-log.md` — your job is to read the log's state, locate the last completed checkpoint, and return to the right phase file.

## Recovery surface

- `team-impl-log.md` — current `State`, `Current Story`, `Current Phase`, receipts, baselines, any active continuation handles.
- `impl-run.config.json` — validated configuration.
- `artifacts/` — CLI result artifacts persisted per bounded operation.

Missing prior chat or tool-call context is a normal recovery case, not a blocker. Trust the files.

## State-based routing

Read `State` from the log and route accordingly:

| State | Where to resume | Notes |
|---|---|---|
| `SETUP` | `setup/12-run-setup.md`, step 2 | Initialization was interrupted; continue authoring config and running preflight |
| `BETWEEN_STORIES` | `phases/20-story-cycle.md`, step 1 | Start the next story per the log's `Current Story` |
| `STORY_ACTIVE` | `phases/20-story-cycle.md`, sub-route by `Current Phase` (next table) | One story is mid-cycle; replay from the last completed checkpoint |
| `PRE_EPIC_VERIFY` | `phases/23-cleanup-and-closeout.md`, step 1 | All stories accepted; cleanup not yet started |
| `EPIC_VERIFY_ACTIVE` | `phases/23-cleanup-and-closeout.md`, sub-route by `Current Phase` (next table) | Cleanup, epic verifier batch, or synthesis mid-flight |
| `COMPLETE` | No action | Run is finished |
| `FAILED` | Escalate to user | Do not resume automatically; surface the recorded failure reason |

## `STORY_ACTIVE` sub-routing by `Current Phase`

| Current Phase | Check | Action |
|---|---|---|
| `implement` | Does an implementor result artifact exist for this story? | If yes → proceed to step 2 (self-review). If no → re-run step 1. |
| `self-review` | Does the self-review batch artifact exist for this story? | If yes → proceed to step 3 (verify). If no → run step 2 with the latest continuation handle. |
| `verify` | Do verifier result artifacts exist for the current round? | If yes → route findings or proceed to step 4 (story gate). If no → re-run step 3. |
| `fix-routing` | Is a follow-up operation in flight (pending implementor, self-review, quick-fix, or verify)? | Inspect `artifacts/` for the result; re-run if missing, continue routing if present. |
| `gate` | Was the story gate run and were baselines checked? | If yes → proceed to step 5. If no → run whichever check hasn't been done. |
| `accept` | Is the receipt complete and the commit made? | If yes → advance (update `Current Story` and `State`). If no → complete the missing items. |

## `EPIC_VERIFY_ACTIVE` sub-routing by `Current Phase`

| Current Phase | Check | Action |
|---|---|---|
| `cleanup-compile` | Does a cleanup artifact exist under `artifacts/cleanup/`? | If yes → proceed to user review. If no → re-compile. |
| `cleanup-review` | Has the user approved the batch? | If yes → proceed to dispatch. If no → re-present. |
| `cleanup-dispatch` | Does an `epic-cleanup` result artifact exist? | If yes → proceed to cleanup-verify. If no → re-run. |
| `cleanup-verify` | Was the story gate run on the cleaned state? | If yes → proceed to `epic-verify`. If no → run the gate. |
| `epic-verify` | Do `epic-verify` result artifacts exist? | If yes → proceed to synthesis. If no → re-run. |
| `epic-synthesize` | Does the synthesis result artifact exist? | If yes → proceed to the final epic gate. If no → re-run. |
| `epic-gate` | Was the epic gate run and its result recorded? | If yes → set `State: COMPLETE`. If no → run the gate. |

## Replay rules

- A step is **completed** only if its durable result artifact exists on disk. An in-flight step with no artifact is incomplete.
- Replay from the last completed checkpoint forward — do not re-run completed work.
- If the replay boundary is unclear (artifacts exist but the log was not updated, or vice versa), pause for user ruling.
- Continuation handles (provider + session-id) in the log may become stale; if `story-continue` fails, fall back to a fresh `story-implement`.

## Ownership during recovery

Recovery preserves the normal ownership model. The CLI does not decide recovery strategy between calls. You decide whether to resume, replay a checkpoint, reroute, or escalate.
