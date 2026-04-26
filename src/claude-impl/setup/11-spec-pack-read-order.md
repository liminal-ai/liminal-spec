# Spec-Pack Read Order

With structure validated, onboard to the implementation surface rather than rereading the entire source stack. For the orchestrator, the story shards are the primary spec and the test plan is the verification map. Use the epic and tech-design files as lookup material only when the stories and test plan leave a real gap.

## Read in this order

1. every story in `stories/` in order
2. `test-plan.md`

Read every story before starting Story 0 or Story 1. Do not begin implementation from a partial story read or without the test plan in hand.

## Use as lookup material when needed

- `epic.md` - only if story intent, AC/TC provenance, or cross-story scope is still unclear after reading the stories and test plan
- `tech-design.md` and companion tech-design files - only if architecture, module boundaries, runtime prerequisites, or non-functional constraints are still unclear after reading the stories and test plan

Apply the onboarding reading protocol: 400-line chunks, capture key rules, boundaries, and filenames after each chunk, and write a compact carry-forward note after each file.

## Capture per file

- **stories** — story order, dependency relationships, which ACs/TCs each story owns, the shape of foundation vs. core vs. integration stories
- **test plan** — TC-to-test mapping summary, mock strategy, fixture strategy, expected test count ranges per story
- **lookup docs you consulted** — only the specific clarification you needed from `epic.md` or the tech-design set

## Pause if

- a story references ACs or TCs you cannot reconcile from the stories and test plan, and targeted lookup in `epic.md` still does not settle it
- the test plan's TC mapping is incomplete or contradictory to the stories
- story ordering or dependency relationships are unclear or contradictory

Escalate rather than improvise; the spec pack is supposed to be complete before you start.

## Exit

Every story file and `test-plan.md` have been read and carry-forward notes exist for each. You can name the story sequence, what each story owns, and how the test plan maps verification expectations across the epic. If you needed `epic.md` or the tech-design set, the specific lookup answers are recorded. Proceed to `12-run-setup.md`.
