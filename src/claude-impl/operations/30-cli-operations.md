# CLI Operations

The bundled CLI performs one bounded operation per call and returns a structured result envelope. See `operations/33-artifact-contracts.md` for the envelope shape. This file documents each of the ten public operations and the routing matrix that maps outcomes to your next action.

For fresh provider-backed operations, the model emits a strict provider payload first. The CLI validates that payload, adds identity and envelope fields, then persists the final result envelope under `artifacts/`.

Use `node bin/ls-impl-cli.cjs ...` as the portable invocation form. Direct execution of `bin/ls-impl-cli.cjs ...` may work on Unix-like systems when the packaged artifact has executable permissions, but `node ...` works consistently across platforms.

## Public operations

- `inspect` — validate spec-pack structure
- `preflight` — validate run config, check harness availability, confirm readiness
- `story-implement` — start story implementation (initial retained implementor pass)
- `story-continue` — continue a retained implementor session with bounded follow-up work
- `story-self-review` — run explicit same-session self-review passes against the retained implementor session
- `story-verify` — start or continue the retained verifier session for one story
- `quick-fix` — run a narrow, bounded correction
- `epic-cleanup` — apply cleanup-only corrections before epic verification
- `epic-verify` — run fresh epic-level verification
- `epic-synthesize` — verify and consolidate epic-level findings

## Routing matrix

Every envelope has a `status` and an `outcome`. Together they determine your next action and the CLI's exit code.

| Outcome | Status | Exit | Next action |
|---|---|---:|---|
| `ready` | `ok` | 0 | Proceed to the next setup step |
| `ready-for-verification` | `ok` | 0 | Run verification or the next bounded step |
| `pass` | `ok` | 0 | Evaluate for acceptance or next stage |
| `cleaned` | `ok` | 0 | Move into epic verification |
| `ready-for-closeout` | `ok` | 0 | Run the final orchestrator-owned gate |
| `needs-user-decision` | `needs-user-decision` | 2 | Pause and request user clarification |
| `needs-followup-fix` | `ok` | 2 | Route same-session follow-up (see `phases/21-verification-and-fix-routing.md`) |
| `needs-human-ruling` | `needs-user-decision` | 2 | Pause for user ruling; keep the surfaced uncertainty explicit |
| `revise` | `ok` | 2 | Route a fix and rerun verification |
| `needs-more-routing` | `ok` | 2 | Select another bounded correction path |
| `needs-more-cleanup` | `ok` | 2 | Continue the cleanup cycle |
| `needs-fixes` | `ok` | 2 | Route fixes before closeout |
| `needs-more-verification` | `ok` | 2 | Launch additional verification or synthesis |
| `block` | `blocked` | 3 | Stop; inspect blocker details in the envelope |
| (schema/parse/runtime failure) | `error` | 1 | Treat as CLI failure, not a workflow outcome |

Exit code is a coarse signal; `status` and `outcome` are the source of truth for routing.

## Operation reference

### `inspect`

Validates spec-pack structure and returns layout information. First call at the start of stage 2.

```bash
node bin/ls-impl-cli.cjs inspect --spec-pack-root <path> --json
```

Returns: spec-pack root, tech-design shape (`two-file` | `four-file`), artifact paths, ordered story inventory, prompt-insert presence, any blockers.

Outcomes: `ready`, `needs-user-decision`, `blocked`.

### `preflight`

Validates `impl-run.config.json`, checks harness availability, confirms prompt-asset readiness, surfaces discovered gates. Exit criterion for initialization.

```bash
node bin/ls-impl-cli.cjs preflight --spec-pack-root <path> [--config <path>] [--story-gate <cmd>] [--epic-gate <cmd>] --json
```

Explicit `--story-gate` and `--epic-gate` flags outrank the precedence-order discovery described in `setup/12-run-setup.md`.

When gates are discovered automatically, record the selected story and epic gate sources in the log. If the envelope includes gate-discovery rationale, also record the candidate gates considered and why the selected gates won.

Outcomes: `ready`, `needs-user-decision`, `blocked`.

### `story-implement`

Launches the retained implementor for one story. Runs the initial implementation pass only. Returns a structured implementor result and a continuation handle.

```bash
node bin/ls-impl-cli.cjs story-implement --spec-pack-root <path> --story-id <story-id> [--config <path>] --json
```

Outcomes: `ready-for-verification`, `needs-followup-fix`, `needs-human-ruling`, `blocked`.

### `story-continue`

Continues the retained implementor session for the same story. Runs one bounded follow-up implementor pass only. Required inputs include the continuation handle (provider and session id) from the most recent implementor result for that story.

```bash
node bin/ls-impl-cli.cjs story-continue --spec-pack-root <path> --story-id <story-id> --provider <provider> --session-id <id> (--followup-file <path> | --followup-text <text>) [--config <path>] --json
```

If the continuation handle has gone stale, the CLI returns `blocked` with `CONTINUATION_HANDLE_INVALID`; fall back to a fresh `story-implement`.

Outcomes: `ready-for-verification`, `needs-followup-fix`, `needs-human-ruling`, `blocked`.

### `story-self-review`

Runs explicit same-session self-review passes against the retained implementor session for the same story. Required inputs include the continuation handle (provider and session id) from the most recent implementor result or follow-up implementor result for that story. By default it uses the configured `self_review.passes` count; `--passes` can override it for the current call only.

```bash
node bin/ls-impl-cli.cjs story-self-review --spec-pack-root <path> --story-id <story-id> --provider <provider> --session-id <id> [--passes <1..5>] [--config <path>] --json
```

If the continuation handle has gone stale, the CLI returns `blocked` with `CONTINUATION_HANDLE_INVALID`; fall back to a fresh `story-implement`.

Outcomes: `ready-for-verification`, `needs-followup-fix`, `needs-human-ruling`, `blocked`.

### `story-verify`

Starts or continues the retained verifier session for one story.

Initial verifier pass:

```bash
node bin/ls-impl-cli.cjs story-verify --spec-pack-root <path> --story-id <story-id> [--orchestrator-context-file <path> | --orchestrator-context-text <text>] [--config <path>] --json
```

Follow-up verifier pass:

```bash
node bin/ls-impl-cli.cjs story-verify --spec-pack-root <path> --story-id <story-id> --provider <provider> --session-id <id> (--response-file <path> | --response-text <text>) [--orchestrator-context-file <path> | --orchestrator-context-text <text>] [--config <path>] --json
```

Initial mode starts a fresh verifier session and returns a continuation handle. Follow-up mode resumes the retained verifier session with the full implementor response plus optional orchestrator framing. If the continuation handle is stale, the CLI returns `blocked` with `CONTINUATION_HANDLE_INVALID`; the orchestrator decides whether to start a fresh verifier pass.

Outcomes: `pass`, `revise`, `block`, `needs-human-ruling`.

### `quick-fix`

Runs a narrow, bounded correction outside the story implementor flow. Story-agnostic; does not receive a reading journey.

```bash
node bin/ls-impl-cli.cjs quick-fix --spec-pack-root <path> (--request-file <path> | --request-text <text>) [--config <path>] --json
```

Pass the bounded fix description as text or file. The inner result payload is provider-native free-form output; only the outer envelope is a structured contract. Quick-fix is story-agnostic and writes artifacts under `artifacts/quick-fix/`, not under an individual story directory.

Outcomes: `ready-for-verification`, `needs-more-routing`, `blocked`.

### `epic-cleanup`

Runs the approved cleanup batch before epic verification. Uses the `quick_fixer` role configuration from `impl-run.config.json`.

```bash
node bin/ls-impl-cli.cjs epic-cleanup --spec-pack-root <path> --cleanup-batch <path> [--config <path>] --json
```

Outcomes: `cleaned`, `needs-more-cleanup`, `blocked`.

### `epic-verify`

Launches the epic-level verifier batch. Fresh sessions.

```bash
node bin/ls-impl-cli.cjs epic-verify --spec-pack-root <path> [--config <path>] --json
```

Outcomes: `pass`, `revise`, `block`.

### `epic-synthesize`

Runs synthesis across epic verifier reports. Synthesis independently verifies the reported issues rather than merging them.

```bash
node bin/ls-impl-cli.cjs epic-synthesize --spec-pack-root <path> --verifier-report <path> --verifier-report <path> [--config <path>] --json
```

Pass each `epic-verify` result artifact via `--verifier-report`.

Outcomes: `ready-for-closeout`, `needs-fixes`, `needs-more-verification`, `blocked`.

## Runtime Progress

- Provider-backed operations also write diagnostic runtime artifacts beside the result envelope:
  - `progress/<artifact-base>.status.json` for the latest pollable snapshot
  - `progress/<artifact-base>.progress.jsonl` for append-only lifecycle events
  - `streams/<artifact-base>.stdout.log` and `.stderr.log` for raw provider output
- Poll in this order when a long-running operation is still active:
  - read `status.json`
  - compare `updatedAt` and `lastOutputAt`
  - tail the stream logs when you need more detail
- The runtime progress surface is CLI-owned and provider-agnostic. The same polling model works whether the secondary harness is Codex, Claude Code, or Copilot.
- Treat these timing bands as reporting guidance only:
  - `healthy` — output or lifecycle update within 5 minutes
  - `slow` — no output for 5 to 15 minutes
  - `suspected-stall` — no output for 15+ minutes
  - `hard-stall` — no output for 30+ minutes
- Progress artifacts are observational only. Use the final JSON envelope for routing, acceptance, and recovery decisions.

## Error codes

When `status` is `error` or `blocked`, the `errors` array carries stable codes for programmatic routing:

- `INVALID_SPEC_PACK` — spec-pack layout failed validation
- `INVALID_RUN_CONFIG` — `impl-run.config.json` failed schema validation
- `VERIFICATION_GATE_UNRESOLVED` — gate discovery did not yield an unambiguous command
- `PROVIDER_UNAVAILABLE` — a requested secondary harness is not available
- `PROVIDER_OUTPUT_INVALID` — a provider returned output the adapter could not parse
- `CONTINUATION_HANDLE_INVALID` — the provider/session id in `story-continue`, `story-self-review`, or follow-up `story-verify` is stale or unknown
- `PROMPT_ASSET_MISSING` — a required embedded prompt asset is missing
- `PROMPT_INSERT_INVALID` — a public insert file is malformed or unreadable

## Ownership boundary

- The CLI reports readiness, findings, and outcome states.
- The CLI does not accept stories, close epics, or decide recovery strategy.
- You decide what happens between calls.
