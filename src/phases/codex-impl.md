# Codex Implementation Orchestration

**Purpose:** Run a full spec-pack implementation process through a scripted Codex-first runtime.

This skill is not the runtime anymore. The skill is a thin operator shell that resolves the runtime, starts or resumes the scripted process, reads status, and only intervenes when the process is blocked or complete.

---

## Startup Orientation

Tell the user, briefly:

- this is a scripted Codex-first implementation process
- the process is owned by a local CLI outer loop, not by a live agent graph
- stories run one at a time with automatic fix loops and final feature verification
- every primitive leaves durable process artifacts on disk

Keep the orientation short. It should feel like a startup screen, not a lecture.

---

## Runtime Model

The scripted process owns:
- lifecycle
- polling
- retries
- artifact harvesting
- fix loops
- commits
- final feature verification

Process-working state lives beside the spec pack:

```text
<spec-pack-root>/.processes/codex-impl/
  process-state.json
  phase-ledger.json
  process-log.md
  escalation-log.md
```

Human-facing artifacts stay in the existing spec-pack surface:
- `story-verification/...`
- `feature-verification/...`
- fix batch markdown files
- verification bundles

---

## Primitive Set

The first version is hardcoded and Codex-specific.

Story primitives:
- `codex54-xhigh-story-implement`
- `codex54-xhigh-story-verify-primary`
- `gpt53-codex-high-story-verify-secondary`
- `codex54-xhigh-story-synthesize`
- `codex54-xhigh-story-fix-batch`

Feature primitives:
- `codex54-xhigh-feature-verify-primary`
- `gpt53-codex-high-feature-verify-secondary`
- `codex54-xhigh-feature-synthesize`

The runner launches Codex directly with:
- `codex exec --json`
- prompt file as stdin
- `stdout.jsonl` capture
- `stderr.log` capture
- structured `status.json` output

No nested teammate process owns long-running Codex work.

---

## On Load

### 0. Resolve The Runtime

Resolve the runtime in this order:

1. **Repo-local development path**

If the current checkout contains:

- `processes/codex-impl/cli.ts`
- `package.json` script `codex-impl:process`

use:

```bash
bun run codex-impl:process -- <command> --spec-pack-root <path>
```

2. **Installed packaged runtime**

Prefer:

```text
~/.codex/skills/ls-codex-impl/bin/codex-impl-process
```

Then:

```text
~/.codex/tools/codex-impl/codex-impl-process
```

Fallback:

```text
~/.agents/skills/ls-codex-impl/bin/codex-impl-process
```

Then:

```text
~/.agents/tools/codex-impl/codex-impl-process
```

If no valid runtime exists, stop immediately and tell the user the skill pack runtime is missing or not installed correctly.

### 1. Resolve The Spec Pack Root

Ask for `spec-pack-root` only if it cannot be inferred from local context.

The first version assumes a canonical spec-pack layout:
- `epic.md`
- `tech-design.md`
- `tech-design-*.md` companions if present
- `test-plan.md`
- `stories/`
- `stories/coverage.md` if present

### 2. Determine Whether To Start Or Resume

If this file exists:

```text
<spec-pack-root>/.processes/codex-impl/process-state.json
```

resume the process:

```bash
[resolved runtime] resume --spec-pack-root <path>
```

Otherwise start a new process:

```bash
[resolved runtime] start --spec-pack-root <path>
```

### 3. Report Concise Status

After starting or resuming, run:

```bash
[resolved runtime] status --spec-pack-root <path>
```

Report only the high-signal fields:
- overall process status
- current story
- current step
- active primitive
- last completed primitive
- current blocker, if any

---

## Control Contract

These invariants remain non-negotiable:

1. No story acceptance without fresh dual verification.
2. No unresolved finding without explicit disposition.
3. No silent degradation.
4. No orchestrator-authored code.

The policy belongs to the scripted process, not to a live in-memory worker graph.

---

## When To Intervene

Do not manually narrate or manage worker lifecycle.

Intervene only when the process status is:
- `WAITING_USER`
- `COMPLETE`
- `FAILED`

If the process is `WAITING_USER`, inspect:
- `.processes/codex-impl/process-log.md`
- `.processes/codex-impl/escalation-log.md`
- the latest visible verification or fix-batch artifacts

Then explain the real block concisely and ask the human only for the specific decision that is actually needed.

If the process is `COMPLETE`, report completion concisely and summarize:
- final feature gate result
- final commit outcome
- any non-blocking residuals still recorded by the process

---

## What To Stop Doing

Do not:
- spawn long-lived Codex worker graphs manually
- hold the orchestration loop in agent memory
- manage async wait/retry logic in prose
- act as if the skill itself is the runtime

The runtime is the local scripted process runner. The skill is the operator shell around it.
