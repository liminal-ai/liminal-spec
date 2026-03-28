# AGENTS

This file defines how coding agents should work in this repository.

## What This Repo Is

`liminal-spec` is a **content + build** project for a skill pack and standalone skill artifacts.

- It is **not** a runtime app/library.
- Source lives in `src/`.
- Build composes markdown into skill pack and standalone outputs.

## Core Rule

Edit source files, not generated outputs.

- Edit in `src/`, `scripts/`, `manifest.json`, and root metadata files.
- Do **not** hand-edit `dist/`.

## Repository Map

- `src/phases/` - phase content (`prd`, `arch`, `epic`, `tech-design`, `publish-epic`, `story-simple`, `story-simple-tech`, `team-impl`, `team-impl-cc`, `team-spec`)
- `src/shared/` - shared sections inlined into skills via manifest
- `src/templates/` - templates included in outputs
- `src/examples/` - verification prompt examples
- `scripts/build.ts` - compose source into build outputs
- `scripts/validate.ts` - structural validation of outputs
- `scripts/__tests__/build.test.ts` - integration tests for build outputs
- `manifest.json` - composition map (what each skill includes)
- `docs/` - reference material and internal developer documentation (not composed into builds)

## Required Workflow For Content Changes

1. Edit source files.
2. Run:
   - `bun run build`
   - `bun run validate`
   - `bun test`
   - or `bun run verify` (preferred all-in-one gate)

## PR Checklist

Before opening or updating a PR:

1. Scope/editing hygiene:
   - Changes are in source files (`src/`, `scripts/`, manifest/metadata), not manual edits in `dist/`.
2. Build + tests:
   - `bun run verify` passes locally.
3. Content coherence (for methodology/content changes):
   - Spot-check affected `dist/skills/*/SKILL.md` for composition flow.
   - Spot-check affected `dist/standalone/*-skill.md` for paste-into-chat usability.
   - Confirm standalone packs are generated: `dist/standalone/liminal-spec-skill-pack.zip` and `dist/standalone/liminal-spec-markdown-pack.zip`.
4. Release-impact awareness:
   - If this PR is intended to release, version fields are updated consistently per release rules.

## Content Composition Rules

- Shared concepts should live in `src/shared/`, not duplicated across phase files.
- If a concept appears in multiple phases, extract to shared and include through `manifest.json`.
- Do not add both inline content and manifest-appended content for the same material (avoids duplication).
- Keep generated skills coherent after composition (readability of phase + inlined shared sections matters).

## Adding/Changing Skills

When adding a new skill:

1. Add phase source in `src/phases/<name>.md`.
2. Add skill entry in `manifest.json` (`name`, `description`, `phases`, `shared`, optional `templates/examples`).
3. Update build tests if needed.
4. Run `bun run verify`.

## Release/Versioning Rules

Before tagging a release, update versions in three places:

- `version.txt`
- `manifest.json`
- `package.json`

Then:

1. Update the changelog: add entry for `vX.Y.Z (YYYY-MM-DD)`.
2. Update pack READMEs: `src/README-pack.md` and `src/README-markdown-pack.md`.
3. Run `bun run verify` (builds, validates, tests).
4. Commit.
5. Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`.

## Methodology Editing Principles

- Preserve the confidence chain: AC -> TC -> Test -> Implementation.
- Upstream phases (especially Epic) require stricter scrutiny because downstream phases depend on them.
- Prefer principle-level guidance over stack-specific command prescriptions.
- Do not add new methodology sections/checklists without explicit user approval.
