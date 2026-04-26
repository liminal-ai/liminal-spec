# Spec-Pack Discovery

Your first action in stage 2 is structural validation. Run `inspect` against the spec-pack root the user has provided, and capture what it returns into your retained notes before reading any pack content.

## Run

```bash
bin/ls-impl-cli.cjs inspect --spec-pack-root <path> --json
```

## Capture

From the `inspect` result envelope:

- the resolved spec-pack root
- tech-design shape (`two-file` or `four-file`)
- required artifact paths (`epic.md`, `tech-design.md`, companion tech-design files if four-file, `test-plan.md`)
- ordered story inventory (filenames and titles, in order)
- public prompt-insert presence (`custom-story-impl-prompt-insert.md`, `custom-story-verifier-prompt-insert.md`)
- any blockers or decision-required conditions

## Pause if

- required artifacts are missing
- the pack layout is invalid (for example, `stories.md` in place of `stories/`)
- the tech-design shape is ambiguous or mixed
- `inspect` returns `needs-user-decision` or `blocked`

Do not improvise around missing files or an invalid layout. Surface the blocker to the user and wait.

## Exit

`inspect` returned `ready`. You have the spec-pack root, tech-design shape, story inventory, and insert presence in your retained notes. Proceed to `11-spec-pack-read-order.md`.
