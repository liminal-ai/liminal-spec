# Story Cycle

Stage 3 runs once per story in order. For each story you launch implementation, run explicit self-review, review verification, route any follow-up, run the final story gate yourself, record a receipt, and advance. Repeat until every story is accepted.

Update `State` and `Current Phase` in `team-impl-log.md` as you move through the steps. Recovery uses these values to resume from the right place.

| Step | State | Current Phase |
|---|---|---|
| 1 — Launch implementation | `STORY_ACTIVE` | `implement` |
| 2 — Launch self-review | `STORY_ACTIVE` | `self-review` |
| 3 — Launch verification | `STORY_ACTIVE` | `verify` |
| Consulting `21-verification-and-fix-routing.md` | `STORY_ACTIVE` | `fix-routing` |
| 4–5 — Story gate + baseline check | `STORY_ACTIVE` | `gate` |
| 6 — Receipt and commit | `STORY_ACTIVE` | `accept` |
| Advance between stories | `BETWEEN_STORIES` | — |

## Confirm the active story

Before any work, confirm which story is active from the ordered story list in `team-impl-log.md`. At the start of a new story, confirm `Current Story` matches the story file you're about to implement.

When you background any provider-backed CLI call in this phase, start polling its runtime progress on a 5-minute cadence instead of waiting only on the background job notification. This avoids the failure mode where the orchestrator waits indefinitely on a hung task even though `status.json`, `updatedAt`, `lastOutputAt`, or the stream logs already show that something is wrong. Use `references/claude-impl-process-playbook.md` for the polling procedure.

## 1. Launch implementation

```bash
bin/ls-impl-cli.cjs story-implement --spec-pack-root <path> --story-id <story-id> --json
```

Route on the outcome:

- **`ready-for-verification`** — proceed to step 2 with the returned continuation handle.
- **`needs-followup-fix`** — consult `21-verification-and-fix-routing.md`.
- **`needs-human-ruling`** — surface to the user; do not auto-fix.
- **`blocked`** — inspect blockers, resolve, retry.

Record the implementor result artifact path.

## 2. Launch self-review

```bash
bin/ls-impl-cli.cjs story-self-review --spec-pack-root <path> --story-id <story-id> --provider <provider> --session-id <id> --json
```

Route on the outcome:

- **`ready-for-verification`** — proceed to step 3.
- **`needs-followup-fix`** — consult `21-verification-and-fix-routing.md`.
- **`needs-human-ruling`** — surface to the user; do not auto-fix.
- **`blocked`** — inspect blockers, resolve, retry.

Record the self-review batch artifact path.

## 3. Launch verification

Initial verifier pass:

```bash
node bin/ls-impl-cli.cjs story-verify --spec-pack-root <path> --story-id <story-id> --json
```

Follow-up verifier pass:

```bash
node bin/ls-impl-cli.cjs story-verify --spec-pack-root <path> --story-id <story-id> --provider <provider> --session-id <id> (--response-file <path> | --response-text <text>) [--orchestrator-context-file <path> | --orchestrator-context-text <text>] --json
```

Route on the outcome:

- **`pass`** — proceed to step 4.
- **`revise`** — consult `21-verification-and-fix-routing.md`; rerun verification after fixes.
- **`block`** — inspect blockers, resolve, retry.

The first verifier pass starts the retained verifier session for the story. Follow-up verifier passes resume that same session with the implementor's response and any orchestrator framing needed for convergence. Record the verifier result artifact path and the retained verifier continuation handle.

## 4. Run the final story gate

The CLI does not accept stories. You do. Run the story gate command recorded in `team-impl-log.md`:

- Passes cleanly — proceed to step 5.
- Fails — route the failure through `21-verification-and-fix-routing.md`; treat it as a finding, not a pause.

## 5. Compare cumulative baselines

Compare the current total test count to the prior accepted baseline (in the log). A count below expectation is a regression; block acceptance and investigate before proceeding.

## 6. Record the receipt and accept

Write a pre-acceptance receipt into `team-impl-log.md` with:

- story id and title
- implementor result artifact path
- verifier result artifact paths
- story gate command run and its result
- disposition (`fixed`, `accepted-risk`, or `defer`) for every unresolved finding
- open risks remaining after acceptance
- cumulative baseline before and after this story

Once the receipt is complete and every finding has a disposition, commit the story's changes. The commit is part of acceptance: until it lands, the story remains in `accept` phase and recovery will expect the commit before advancing.

## Advance

Update `Current Story` in the log:

- If more stories remain — set `Current Story` to the next story, `State` to `BETWEEN_STORIES`, and return to step 1.
- If this was the last story — set `State` to `PRE_EPIC_VERIFY` and proceed to `phases/23-cleanup-and-closeout.md`.
