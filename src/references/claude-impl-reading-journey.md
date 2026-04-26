# Claude Impl Reading Journey

Use this file after the initial `inspect` pass. The goal is to read just enough, in the right order, to onboard the orchestrator to the implementation surface before any story work begins.

## Read Order

1. Read every story file in `stories/` in order before starting Story 0 or Story 1.
2. Read `test-plan.md`.

Use `epic.md` only when the stories and test plan leave story scope or AC/TC provenance unclear.

Use `tech-design.md` and companion tech-design files only when the stories and test plan leave architecture, boundary, or runtime constraints unclear.

## What To Record In `team-impl-log.md`

- the resolved spec-pack root
- the ordered story inventory
- the test-plan expectations that matter for the story cycle
- the story and epic verification gates
- any blockers that require a user decision
- any targeted lookup clarifications taken from `epic.md` or the tech-design set
- whether public prompt inserts are active

## Prompt Insert Detection

Check for these public insert files in the spec-pack root:

- `custom-story-impl-prompt-insert.md`
- `custom-story-verifier-prompt-insert.md`

If either file is present, record that it is available for later prompt assembly. If neither insert file is present, continue normally and record that no public prompt inserts are active.
