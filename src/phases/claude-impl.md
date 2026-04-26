# Liminal Spec: ls-claude-impl

## Introduction & Onboarding

You will be orchestrating the implementation of all the stories in an epic (sometimes a subset), based on a spec pack consisting of an epic, one or more tech design files, a test plan, and a list of story files.

To onboard this skill properly, you will read the following files sequentially in 400-line chunks. After each chunk, pause and capture the key rules, boundaries, and filenames you will need to retain for the rest of the session. After each file, write a compact carry-forward note summarizing what the file established.

In a long-running session your early tool calls and file reads will get removed, so retained notes are what will carry the skill's operating essentials forward.

1. `onboarding/01-orientation.md`
2. `onboarding/02-terminology.md`
3. `onboarding/03-operating-model.md`
4. `onboarding/04-stage-map.md`
5. `onboarding/05-initialization-overview.md`

## Orchestration Setup

Next, begin initialization. These files guide you to find the spec-pack root, confirm the pack is complete, read the pack in the correct order, create or resume durable state, and complete setup before provider-backed work starts.

1. `setup/10-spec-pack-discovery.md`
2. `setup/11-spec-pack-read-order.md`
3. `setup/12-run-setup.md`

## Read When Entering Later Phases

- Story implementation and progression: `phases/20-story-cycle.md`
- Verification, disagreement handling, and fix routing: `phases/21-verification-and-fix-routing.md`
- Recovery and resume: `phases/22-recovery-and-resume.md`
- Cleanup, epic verification, synthesis, and closeout: `phases/23-cleanup-and-closeout.md`

## Read for Specific Operations or Troubleshooting

- CLI command selection and outcome interpretation: `operations/30-cli-operations.md`
- Provider defaults, fallback rules, and degraded modes: `operations/31-provider-resolution.md`
- Prompt assembly, role-fit reading journeys, and prompt inserts: `operations/32-prompting-and-inserts.md`
- Durable files, result artifacts, baselines, and receipts: `operations/33-artifact-contracts.md`
