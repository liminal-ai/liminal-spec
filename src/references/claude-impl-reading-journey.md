# Claude Impl Reading Journey

Use this file after the initial `inspect` pass. The goal is to read just enough, in the right order, to establish durable state before any implementation work begins.

## Read Order

1. Read `tech-design.md`.
2. If `inspect` reported a four-file layout, read `tech-design-skill-process.md` and `tech-design-cli-runtime.md` next.
3. Read `test-plan.md`.
4. Read `epic.md`.
5. Read every story file in `stories/` in order before starting Story 0 or Story 1.

## What To Record In `team-impl-log.md`

- the resolved spec-pack root
- whether the tech design is a two-file or four-file pack
- the ordered story inventory
- the story and epic verification gates
- any blockers that require a user decision
- whether public prompt inserts are active

## Prompt Insert Detection

Check for these public insert files in the spec-pack root:

- `custom-story-impl-prompt-insert.md`
- `custom-story-verifier-prompt-insert.md`

If either file is present, record that it is available for later prompt assembly. If neither insert file is present, continue normally and record that no public prompt inserts are active.
