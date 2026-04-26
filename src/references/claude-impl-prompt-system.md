# Claude Impl Prompt System

The runtime prompt model is intentionally simple from the orchestrator's perspective:

1. choose the role
2. load the role's base prompt
3. append the required shared snippets
4. append any optional public inserts
5. interpolate runtime values such as story id, tech-design shape, and gate commands
6. apply the role-fit reading journey or narrow handoff that belongs to that role

## Public Insert Files

The spec-pack root may contain these optional public inserts:

- `custom-story-impl-prompt-insert.md`
- `custom-story-verifier-prompt-insert.md`

These files are optional public inserts. `inspect` records whether they are present, and later prompt assembly uses them when the matching role runs. Their absence is non-blocking and should be recorded as inactive rather than treated as an error.

## Mental Model

- implementor prompts use the implementation base prompt plus the required snippets, the optional implementor insert, runtime values, and the implementor reading journey
- verifier prompts use the verifier base prompt plus the required snippets, the optional verifier insert, runtime values, and the verifier reading journey
- quick-fix handoffs pass through a plain-language task description only
- prompt assembly stays deterministic so the orchestrator can reason about what the runtime will send
- provider-backed prompts instruct the agent to emit the provider payload shape the CLI validates, not the final outer envelope the CLI writes to `artifacts/`

## Story implementor reading journey

Read the current story first, then read the full tech-design set, then the test plan.
Read each file in 500-line chunks if large and reflect after each chunk before moving on.
The implementor journey is intentionally broad enough to ground code changes in the whole story contract rather than a partial reread.

## Story verifier reading journey

Read the current story, then read the full tech-design set, then the test plan with an evidence-first lens.
As you read, extract AC and TC evidence and verify against code, tests, and artifacts before filing findings.
The verifier journey is not implementation-first. It is evidence-focused and outcome-focused.

## Quick-fix handoff

Quick-fix mode uses a narrow, task-specific handoff.
Pass a plain-language task description only.
Do not inject the full story reading journey for quick-fix work.
Do not make quick-fix prompt assembly depend on story-id, story-title, or tech-design reading context.
Use no structured quick-fix result contract.
The quick fixer should receive a plain-language task description and nothing from the story reading journey.
In other words, quick-fix mode has no reading journey at all.
