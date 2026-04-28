# Provider Resolution

This file teaches the default-resolution algorithm you use to author `impl-run.config.json` during setup. The algorithm is deterministic so two orchestrators facing the same local environment produce the same configuration.

## The primary harness

Claude Code is the primary harness for every run. It is always available because you run inside it. This value is fixed:

```json
{ "primary_harness": "claude-code" }
```

## Secondary harness probe

Check secondary harness availability in this order and stop at the first available:

1. Codex CLI — `codex --version`
2. Copilot CLI — `copilot --version`
3. Neither

The result selects which defaults table applies below. Record a degraded-diversity condition in `team-impl-log.md` when neither is available.

## Role defaults

Each role gets a `secondary_harness`, `model`, and `reasoning_effort`. The epic verifier rows (`epic_verifier_1`, `epic_verifier_2`) correspond to entries in the `epic_verifiers` array with labels `epic-verifier-1` and `epic-verifier-2`; all other rows are top-level config keys.

### Codex available

| Role | secondary_harness | model | reasoning_effort |
|------|---|---|---|
| `story_implementor` | `codex` | `gpt-5.4` | `high` |
| `quick_fixer` | `codex` | `gpt-5.4` | `high` |
| `story_verifier` | `codex` | `gpt-5.4` | `xhigh` |
| `epic_verifier_1` | `codex` | `gpt-5.4` | `xhigh` |
| `epic_verifier_2` | `none` | `claude-sonnet` | `high` |
| `epic_synthesizer` | `codex` | `gpt-5.4` | `xhigh` |

### Codex unavailable, Copilot available

Copilot is valid for both fresh-session and retained-session roles in v1.

| Role | secondary_harness | model | reasoning_effort |
|------|---|---|---|
| `story_implementor` | `copilot` | `gpt-5.4` | `high` |
| `quick_fixer` | `copilot` | `gpt-5.4` | `high` |
| `story_verifier` | `copilot` | `gpt-5.4` | `xhigh` |
| `epic_verifier_1` | `copilot` | `gpt-5.4` | `xhigh` |
| `epic_verifier_2` | `none` | `claude-sonnet` | `high` |
| `epic_synthesizer` | `copilot` | `gpt-5.4` | `xhigh` |

### Neither available

All roles fall back to the primary harness. Record the degraded-diversity condition.

| Role | secondary_harness | model | reasoning_effort |
|------|---|---|---|
| `story_implementor` | `none` | `claude-sonnet` | `high` |
| `quick_fixer` | `none` | `claude-sonnet` | `high` |
| `story_verifier` | `none` | `claude-sonnet` | `xhigh` |
| `epic_verifier_1` | `none` | `claude-sonnet` | `xhigh` |
| `epic_verifier_2` | `none` | `claude-sonnet` | `high` |
| `epic_synthesizer` | `none` | `claude-sonnet` | `xhigh` |

## Self-review passes

Defaults to 3. Do not change unless the user asks.

```json
{ "self_review": { "passes": 3 } }
```

## Full file shape

```json
{
  "version": 1,
  "primary_harness": "claude-code",
  "story_implementor": { "secondary_harness": "...", "model": "...", "reasoning_effort": "..." },
  "quick_fixer": { "secondary_harness": "...", "model": "...", "reasoning_effort": "..." },
  "story_verifier": { "secondary_harness": "...", "model": "...", "reasoning_effort": "..." },
  "self_review": { "passes": 3 },
  "timeouts": {
    "provider_startup_timeout_ms": 300000,
    "story_implementor_silence_timeout_ms": 600000,
    "story_self_review_silence_timeout_ms": 480000,
    "story_verifier_silence_timeout_ms": 360000,
    "quick_fixer_silence_timeout_ms": 300000,
    "epic_cleanup_silence_timeout_ms": 480000,
    "epic_verifier_silence_timeout_ms": 600000,
    "epic_synthesizer_silence_timeout_ms": 600000
  },
  "epic_verifiers": [
    { "label": "epic-verifier-1", "secondary_harness": "...", "model": "...", "reasoning_effort": "..." },
    { "label": "epic-verifier-2", "secondary_harness": "...", "model": "...", "reasoning_effort": "..." }
  ],
  "epic_synthesizer": { "secondary_harness": "...", "model": "...", "reasoning_effort": "..." }
}
```

Write this file at the spec-pack root with the appropriate table's values filled in. `preflight` will validate the contents.

## Where defaults are recorded

After `preflight` returns `ready`, the resolved config, provider and harness availability matrix, active role defaults, and any degraded-diversity condition go into `team-impl-log.md` as part of setup step 5.
