# Cleanup and Closeout

Stage 5 runs once, after all stories are accepted. You compile deferred items into a cleanup batch, review with the user, dispatch the approved fixes, verify the cleaned state, then run epic verification, synthesis, and the final epic gate. No skip paths.

| Step | State | Current Phase |
|---|---|---|
| Enter from `phases/20-story-cycle.md` | `PRE_EPIC_VERIFY` | — |
| 1 — Compile cleanup batch | `EPIC_VERIFY_ACTIVE` | `cleanup-compile` |
| 2 — Review with user | `EPIC_VERIFY_ACTIVE` | `cleanup-review` |
| 3 — Dispatch cleanup | `EPIC_VERIFY_ACTIVE` | `cleanup-dispatch` |
| 4 — Verify cleanup result | `EPIC_VERIFY_ACTIVE` | `cleanup-verify` |
| 5 — Run epic verification | `EPIC_VERIFY_ACTIVE` | `epic-verify` |
| 6 — Run epic synthesis | `EPIC_VERIFY_ACTIVE` | `epic-synthesize` |
| 7 — Run final epic gate | `EPIC_VERIFY_ACTIVE` | `epic-gate` |
| Complete | `COMPLETE` | — |

## 1. Compile the cleanup batch

Walk the story receipts in `team-impl-log.md` and extract every item with a `defer` or `accepted-risk` disposition. Write them into a cleanup artifact (a markdown file under `artifacts/cleanup/`). Include all items, even small ones — do not filter on severity.

## 2. Review with the user

Present the categorized cleanup batch to the user. Do not dispatch without review. The user decides which items to fix, accept, or defer permanently.

## 3. Dispatch approved cleanup items

```bash
bin/ls-impl-cli.cjs epic-cleanup --spec-pack-root <path> --cleanup-batch <artifact-path> --json
```

Route on the outcome:

- **`cleaned`** — proceed to step 4.
- **`needs-more-cleanup`** — update the batch with remaining items, dispatch again.
- **`blocked`** — inspect blockers, resolve, retry.

## 4. Verify the cleanup result

Run the story gate yourself to confirm the cleaned state still passes. If it fails, route the failure through `21-verification-and-fix-routing.md` before continuing.

## 5. Run epic verification

```bash
bin/ls-impl-cli.cjs epic-verify --spec-pack-root <path> --json
```

Route on the outcome:

- **`pass`** — proceed to step 6.
- **`revise`** — consult `21-verification-and-fix-routing.md`; rerun verification after fixes.
- **`block`** — inspect blockers, resolve, retry.

Epic verification is mandatory for every multi-story epic. There is no skip path.

## 6. Run epic synthesis

```bash
bin/ls-impl-cli.cjs epic-synthesize --spec-pack-root <path> --verifier-report <path> --verifier-report <path> --json
```

Pass each `epic-verify` result artifact as a `--verifier-report` flag. Synthesis independently verifies and consolidates the verifier findings rather than merging them blindly.

Route on the outcome:

- **`ready-for-closeout`** — proceed to step 7.
- **`needs-fixes`** — consult `21-verification-and-fix-routing.md`.
- **`needs-more-verification`** — return to step 5 after addressing the synthesizer's concerns.
- **`blocked`** — inspect blockers, resolve, retry.

Synthesis is mandatory once verifier reports exist. There is no skip path.

## 7. Run the final epic gate

The CLI does not close epics. You do. Run the epic gate command recorded in `team-impl-log.md`:

- Passes cleanly — record the result, set `State` to `COMPLETE`, and notify the user that the run is complete.
- Fails — route the failure through `21-verification-and-fix-routing.md`; do not close the epic on a failing gate.

## Exit

Final epic gate passed, log updated to `State: COMPLETE`. The run is finished.
