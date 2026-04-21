# Claude Implementation

Use `ls-claude-impl` when a completed spec pack already exists and Claude Code needs a disciplined implementation workflow with a bundled bounded-operation CLI.

## Startup Orientation

Resolve the spec-pack root before reading deeply. The minimum v1 layout is:

- `epic.md`
- `tech-design.md`
- `test-plan.md`
- `stories/`

Run `bin/ls-impl-cli.cjs inspect --spec-pack-root <path> --json` as the first runtime check. Capture the returned tech-design shape, required artifacts, story inventory, and insert status before you move on to run configuration or provider-backed work.

Read every story file in `stories/` in order before starting Story 0 or Story 1. Do not begin implementation from a partial story read.

## Initialization Steps

1. Confirm the spec-pack root and run `inspect`.
2. If `team-impl-log.md` is absent, create `team-impl-log.md` and initialize the run in `SETUP`.
3. If `team-impl-log.md` already exists, read it first and resume from the recorded state.
4. Treat `team-impl-log.md`, `impl-run.config.json`, and the CLI result artifacts under `artifacts/` as the recovery surface for a resumed run.
5. Treat missing prior chat or tool-call context as a normal recovery case, not a blocker.
6. Record whether the spec pack is a two-file or four-file tech-design layout.
7. Record whether `custom-story-impl-prompt-insert.md` and `custom-story-verifier-prompt-insert.md` are present. Their absence is non-blocking.
8. Discover verification gates in this precedence order: explicit CLI flags, `impl-run.config.json` entries if the run uses them later, package scripts, project policy docs, then CI configuration.
9. If the policy stays ambiguous after that precedence order, pause for a user decision instead of improvising.
10. Run `preflight` before provider-backed work.
11. After `preflight`, record the validated run configuration, available providers, active role defaults, verification gates, and degraded fallback conditions in `team-impl-log.md`.

## Default Resolution Contract

- Claude Code is the primary harness for every run.
- If Codex CLI is available, default the story implementor to Codex `gpt-5.4` with high reasoning.
- If Codex CLI is available, default the verifier pair to Codex `gpt-5.4` with extra high reasoning plus Claude Sonnet with high reasoning.
- If Codex CLI is available, default epic verifier GPT lanes and the epic synthesizer to Codex `gpt-5.4` with extra high reasoning, paired with a Claude Sonnet verifier lane.
- If Codex is unavailable but Copilot CLI is available, use Copilot for the fresh-session GPT roles and keep the retained story implementor on Claude Sonnet high.
- If no GPT-capable secondary harness is available, switch the run to Claude-only defaults, record the degraded-diversity condition explicitly, and note that verifier diversity is weaker in this run.

## State Ownership

- `impl-run.config.json` is orchestrator-owned configuration.
- `team-impl-log.md` is the durable run record.
- The CLI performs one bounded operation per call and returns structured results.
- The CLI does not own story progression, acceptance, or recovery strategy between calls.
- Run the final story gate yourself after implementation evidence and verifier results are complete.
- compile deferred and accepted-risk items into a durable cleanup artifact before epic verification begins.
- Run the final epic gate yourself after cleanup, epic verification, and synthesis are complete.
- Compare the current total test count to the prior accepted baseline before accepting a story.
- Advance to the next story only from the committed codebase, the ordered story list, `team-impl-log.md`, and the recorded artifacts on disk.

## Read Next

After the initial `inspect` pass and log setup, read:

1. `references/claude-impl-reading-journey.md`
2. `references/claude-impl-process-playbook.md`
3. `references/claude-impl-cli-operations.md`
4. `references/claude-impl-prompt-system.md`
