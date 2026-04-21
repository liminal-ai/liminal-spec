# Post-Epic-Verify Fix Pass — Implementor (Initial Dispatch)

You are a FRESH session implementor for a bundled fix pass on the `ls-claude-impl` epic. The epic has been through:
- 9 stories (0-8) implementor-accepted with per-story dual-verifier review
- Closeout pass (AC-2.2c Copilot adapter implementation + 5 coverage additions)
- Strict-parser fix (payload schemas tightened to `.strict()`)
- **Formal 4-way epic verification** (codex gpt-5.4 xhigh + codex gpt-5.3-codex xhigh + claude opus-4-7 1M + claude sonnet-4-6 1M) followed by codex gpt-5.4 xhigh synthesizer

The synthesizer independently confirmed 2 blocking issues + 2 non-blocking contract drifts. The orchestrator's subsequent review surfaced an additional 6 clear minor-improvement items + 5 spec/docs alignment items. All 15 are bundled into this single dispatch.

**Prior state:**
- Test baseline: 247 passing, 0 fail, 969 expect calls, 24 files.
- `bun run green-verify` passes.
- `bun run verify-all` passes (with documented visible-skip on `smoke:impl-cli`).
- No production-path mocks/shims/placeholders per the 4-way audit.

## Your Role & Discipline

- **Provider:** `codex`
- **Model:** `gpt-5.4`
- **Reasoning Effort:** `xhigh`
- **Session shape:** retained across the initial dispatch + 3 self-review passes (you will receive each pass via `codex exec resume`)

TDD non-negotiables (identical to prior passes):
1. For each item, write the failing test(s) FIRST. Confirm they fail for the right reason.
2. Implement to green. Do NOT modify tests during green.
3. `bun run green-verify` must pass at the end of your dispatch.
4. Mock only external boundaries (provider CLIs, auth commands). Filesystem is real temp dirs.
5. No production-path mocks, shims, placeholders, or fake adapters.
6. No backwards-compat shims; no `_unused` renames for removed items; no "removed in X" comments.
7. No comments explaining WHAT — only short comments for non-obvious WHY.
8. Do NOT commit or stage. The orchestrator handles commits.
9. Do NOT read `team-impl-log.md`. It is orchestrator-private state (Correction 3).

**Scope discipline:** the 15 items listed below are the full scope. Do not refactor adjacent code "while you're there." Do not extend tests beyond what proves each item is fixed. If you find an issue outside these 15 items that seems material, surface it in `findings surfaced to orchestrator` rather than fixing it.

## Reading Journey

Bounded to the design pack + relevant implementation modules as you work each item:

1. `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/01-claude-impl-cli-skill-epic.md`
2. `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design.md`
3. `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-cli-runtime.md`
4. `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-skill-process.md`
5. `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/test-plan.md`

Read each in 500-line chunks if large; reflect after each chunk. Then read each implementation module as you work the corresponding item.

## The 15 Items (Ordered by Severity DESC, Then by Dependency)

### BLOCKING

**B1 — Gate discovery traverses to repo root for nested spec packs.**
- Files: `processes/impl-cli/core/gate-discovery.ts`
- Current: only searches under `<spec-pack-root>` at lines 71, 101, 124. For nested packs like `docs/spec-build/epics/01-claude-impl-cli-skill/` with no local policy files, returns `VERIFICATION_GATE_UNRESOLVED`.
- Fix: when local search yields no result, traverse up toward the filesystem root looking for the repo root (first ancestor with a `.git` directory). Search `package.json`, `AGENTS.md`/`README.md` policy docs, and `.github/workflows/` at the discovered repo root. Stop at the filesystem root if no repo root is found. If BOTH local and repo-root yield gates, local wins (more specific). Preserve existing precedence: CLI flag > run-config > local-package-scripts > local-policy > local-CI > repo-root-package-scripts > repo-root-policy > repo-root-CI.
- Tests: add a fixture representing a nested spec pack with no local policy files and a repo-root `package.json` containing `green-verify` + `verify-all` scripts. Assert gate discovery returns `ready` with gates discovered from the repo root, and `source` reflects the repo-root-level origin.
- Covers: AC-1.6 (unmet today for nested packs).

**B2 — Implement the 4-tier provider availability model.**
- Files: `processes/impl-cli/core/provider-checks.ts`, `processes/impl-cli/commands/preflight.ts`
- Design source: `tech-design-cli-runtime.md:928-933`. Four tiers: `binary-present`, `authenticated-known`, `auth-unknown`, `unavailable`. `HarnessAvailability.authStatus` at tech-design-cli-runtime.md:313 is typed `"authenticated" | "unknown" | "missing"`.
- Current: `provider-checks.ts:120-149` collapses any auth-check failure (including "subcommand does not exist") into `{ available: false }`. `preflight.ts:70-93, 201-209` converts that into `PROVIDER_UNAVAILABLE` and blocks the run.
- Fix: introduce a `tier: "binary-present" | "authenticated-known" | "auth-unknown" | "unavailable"` field on `HarnessAvailability`. When `--version` succeeds but no non-mutating auth-state command exists OR the auth command exits non-zero in a way consistent with "command not recognized" (distinguish from "authentication explicitly failed"), set tier = `"auth-unknown"` and `authStatus = "unknown"`. In `preflight.ts`, treat `authenticated-known` and `binary-present`/`auth-unknown` as ready (the last two with a notes entry "auth status unknown — proceed if CLI works in your environment"); only `unavailable` blocks. Preserve the existing `unavailable` outcome for missing binaries or explicit auth failure.
- Tests: add preflight fixture cases for each of the four tiers using fake provider executables. Assert the tier value, `authStatus` field, non-blocking vs blocking behavior, and notes content. Keep existing tests green.
- Covers: AC-2.2, AC-2.3, TC-2.2a, TC-2.2b.

### MAJOR — contract drift, non-blocking

**M1 — Strip `epicPath` from story-implementor and story-verifier reading journeys.**
- Files: `processes/impl-cli/core/prompt-assembly.ts:146-180, 183-191`; `processes/impl-cli/core/story-implementor.ts:463-474, 618-629`; `processes/impl-cli/core/story-verifier.ts:329-341`.
- Current: `buildReadingJourney` always appends `- Epic: <epicPath>` when supplied; story-implementor and story-verifier always supply it.
- Design: Correction 1 (bounded reading journey) — story-role reading is limited to the current story file + `tech-design.md` + `tech-design-skill-process.md` + `tech-design-cli-runtime.md` + `test-plan.md`. Five items, period. The Correction is already encoded in `tech-design-cli-runtime.md:361-362` and `tech-design-skill-process.md:343-351`.
- Fix: omit the epic line in `buildReadingJourney` when `input.role === "story_implementor"` or `"story_verifier"`. Separately, stop passing `epicPath` from those two call sites for defense-in-depth.
- Tests: add negative assertions in `prompt-assembly.test.ts` — story-implementor and story-verifier assembled prompts MUST NOT contain the epic path as a reading-journey line. Epic-verifier and epic-synthesizer prompts should still include it (they legitimately read epic-level artifacts).
- Covers: AC-3.4, TC-3.4a, TC-3.4b, Correction 1.

**M2 — Preflight invalid-config path must persist its envelope artifact.**
- Files: `processes/impl-cli/commands/preflight.ts:265-284`.
- Current: the invalid-`impl-run.config.json` catch path emits a blocked envelope to stdout with `artifacts: []` and writes no file.
- Design: `tech-design-cli-runtime.md:129` — "persisted artifacts write the same JSON envelope that was emitted on stdout." Violation creates an orchestration-recovery gap.
- Fix: call the existing artifact writer before returning from the invalid-config catch branch. Preserve envelope structure; populate `artifacts` with the written ref.
- Tests: add a preflight test with a malformed `impl-run.config.json`. Assert stdout envelope matches the file written under `<spec-pack-root>/artifacts/preflight/`.
- Covers: AC-6.3 (durable recovery), TC-6.3a.

### MINOR — clear improvements

**m1 — Tighten APPROVED regex in epic-cleanup.**
- Files: `processes/impl-cli/core/epic-cleanup.ts:143-145`.
- Current: `/\bAPPROVED\b/i` matches "NOT APPROVED", "pre-APPROVED", "previously APPROVED but superseded".
- Fix: require the approval to appear at the start of a list-item or line, e.g. `/^[-*]\s*\[x\]\s+APPROVED\b/mi` (checkbox format) OR `/^\s*APPROVED\s*$/mi` (standalone line). Pick whichever matches the format convention already in use in cleanup-batch fixtures. Keep the match case-insensitive.
- Tests: add negative assertions — "NOT APPROVED", "pre-APPROVED", "previously APPROVED but superseded" must NOT trigger `hasApprovedCleanupItems = true`. Positive assertion for the chosen canonical form.

**m2 — Replace string-match error classification with a typed error.**
- Files: `processes/impl-cli/commands/story-implement.ts:133`, `processes/impl-cli/core/config-schema.ts` (or wherever config load throws).
- Current: `error.message.toLowerCase().includes("config")` misclassifies any error whose message incidentally contains the substring.
- Fix: define a `ConfigLoadError` class in `config-schema.ts` (or closest reasonable home). Throw `ConfigLoadError` when config parsing fails. Catch by `instanceof ConfigLoadError` in `story-implement.ts` and any other command that has the same string-match pattern. Remove the string match.
- Tests: add a targeted test that a config-load failure produces the error code mapped from `ConfigLoadError`, and that an unrelated error with "config" in its message does not get misclassified.

**m3 — Replace hardcoded `ALLOWED_TECH_DESIGN_COMPANIONS` with glob match.**
- Files: `processes/impl-cli/core/spec-pack.ts:9-12, 60`.
- Current: hardcoded `['tech-design-cli-runtime.md', 'tech-design-skill-process.md']`.
- Design: `tech-design-cli-runtime.md:518-524` — "exactly two additional files matching `tech-design-*.md` exist. `tech-design.md` itself is excluded. Companion paths are sorted lexically."
- Fix: pattern-match `^tech-design-.+\.md$` (excluding `tech-design.md` itself), preserve count-must-equal-2 and lexical-sort rules. Update the blocker message to describe the pattern, not specific file names.
- Tests: extend the four-file-companion test to include a non-default companion naming (e.g. `tech-design-foo.md` + `tech-design-bar.md`). Assert it's accepted. Keep existing tests green (the current companions still match the pattern).

**m4 — Extend `MAX_PUBLIC_INSERT_BYTES` guard to all roles that could load public inserts.**
- Files: `processes/impl-cli/core/prompt-assembly.ts:10, 288-314, 340-344`.
- Current: `loadPublicInsert` contains the 64 KiB guard, but `loadPublicInsert` is only called for `story_implementor` and `story_verifier` per the ternary at 340-344.
- Fix: the guard is correct; the scope is what to fix. Two options: (a) keep `loadPublicInsert` role-gated but guarantee that any future role-insert addition must go through `loadPublicInsert`; OR (b) make `loadPublicInsert` defensively apply to any path passed, so the guard is structural regardless of caller. Choose (b) for simplicity — the current structure already routes through `loadPublicInsert`, so just widen the ternary safely. Add a comment explaining why the guard applies to any insert path.
- Tests: add a test that an oversize public insert for an arbitrary role (e.g. simulate a future role wiring) still fails with `PROMPT_INSERT_INVALID`. Keep existing story-impl/story-verifier tests green.

**m5 — Add unknown-outcome fallback to `statusForOutcome()`.**
- Files: `processes/impl-cli/core/result-contracts.ts` (the `statusForOutcome` function near the end of the file).
- Current: throws on unknown outcome string. Future schema additions that forget to update the mapping crash at runtime.
- Fix: add a `default:` branch that returns `"error"` (CLI status for "something went wrong"). Log a warning via the same channel used elsewhere in result-contracts if any; otherwise omit logging and rely on the outcome surfacing via the envelope.
- Tests: add a direct unit test for `statusForOutcome` calling it with an unknown outcome string; assert it returns `"error"` rather than throwing.

**m6 — Make `implRunConfigSchema` strict.**
- Files: `processes/impl-cli/core/config-schema.ts:22-57`.
- Current: non-strict; typos in `impl-run.config.json` silently drop.
- Fix: add `.strict()`. Keep the existing `superRefine` logic. Inner objects (RoleAssignment, EpicVerifierAssignment, SelfReviewConfig) should also be strict if they aren't already — the pattern should match the strict-parser fix applied to provider payload schemas.
- Tests: add a config fixture with an unknown top-level key (e.g. `unknown_field: "value"`). Assert config load fails with a schema error (via `ConfigLoadError` from m2 — sequence the items so m2 lands before or alongside m6). Add a nested-unknown-key test too.

### SPEC / DOCS ALIGNMENT — specs need updating

**S1 — Update test-plan.md to reference the actual packaged-CLI test file.**
- Files: `docs/spec-build/epics/01-claude-impl-cli-skill/test-plan.md:371`.
- Current: references `processes/impl-cli/tests/packaged-cli-smoke.test.ts` (doesn't exist).
- Actual: `scripts/__tests__/claude-impl-build.test.ts:51-116` (4 tests: manifest, references, bundled artifact presence, node-run inspect).
- Fix: update the test-plan section at line 371 (around the "Packaged CLI Smoke" section) to point to `scripts/__tests__/claude-impl-build.test.ts`. Include a brief note that this file covers the build-pipeline + packaged-CLI checks (matches what it actually tests).
- No test changes required for this item alone; it's a pure docs update.

**S2 — Align routing-matrix docs with the `"block"` enum used by verifier schemas.**
- Files: `docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-cli-runtime.md` — the "Result Routing Matrix" section (around the row that currently says `blocked` as a verifier-batch outcome).
- Current: the routing matrix uses `blocked` as the outcome name for verifier batches. But `verifierBatchOutcomeSchema` actually uses `"block"` (see `result-contracts.ts:98-102`). The status-for-outcome mapping correctly maps `"block"` → `"blocked"`, so behavior is fine, but the docs row is misleading.
- Fix: update the routing matrix row so the Command Outcome column reads `"block"` (the actual enum value) and the Envelope Status column reads `"blocked"`. Do NOT change the schema — the schema is the runtime source of truth; the docs should reflect it.
- No code changes.

**S3 — Resolve the gate-discovery canonical-vs-raw inconsistency.**
- Files: `docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-cli-runtime.md:970-984` (Canonical Gate Mapping section) + `processes/impl-cli/core/gate-discovery.ts:85-90` + `processes/impl-cli/tests/gate-discovery.test.ts`.
- Current: the design's canonical mapping says `bun run green-verify` / `bun run verify-all`. The implementation at `gate-discovery.ts:85-90` returns the raw `package.json` script bodies (`bun run verify && bun run guard:no-test-changes` for this repo's `green-verify`). `gate-discovery.test.ts` pins the raw-body behavior. Design and tests actively contradict each other.
- Decision (orchestrator-ruled): gate discovery should return the command the ORCHESTRATOR INVOKES, not the script body. So for a package.json script named `green-verify`, gate discovery should return `bun run green-verify` as the storyGate (not the expanded body). Rationale: (a) aligns with design; (b) the orchestrator already invokes by name; (c) script bodies can contain `&&` chains and expansions that make logging/comparison harder.
- Fix: update `gate-discovery.ts` to return `bun run <script-name>` (or the equivalent invocation command for the runtime in use) when discovering via package-scripts. Update `gate-discovery.test.ts` to pin the canonical-name behavior. Update any other test that expected raw bodies (sweep the test suite). Preserve behavior for policy-doc and CI-config discovery paths — those can continue to return whatever command those sources provide.
- Tests: the existing gate-discovery test that asserts raw-body behavior needs to be rewritten (this is an intentional test change, and allowed in THIS pass because the test was pinning behavior that contradicts the design — flag it clearly in your disposition note). Add a new assertion that discovered package-script gates use `bun run <name>` form.

**S4 — Document where actual packaged-CLI smoke coverage lives.**
- Files: `docs/spec-build/epics/01-claude-impl-cli-skill/tech-design.md:344-347` (Verification Scripts section, around the `smoke:impl-cli` note).
- Current: design says `smoke:impl-cli` "may emit a visible skip notice in its earliest version." That's fine. Missing: where the actual packaged-CLI coverage lives.
- Fix: add one sentence: "Interim packaged-CLI coverage (manifest, bundled artifact presence, and node-run `inspect` smoke) lives in `scripts/__tests__/claude-impl-build.test.ts` until `smoke:impl-cli` is implemented."
- No code changes.

**S5 — Document that `epic-cleanup` reuses the `quick_fixer` role config.**
- Files: `docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-cli-runtime.md` Flow 4 section (Epic Cleanup, Verification, and Synthesis).
- Current: `epic-cleanup.ts:133-135` pulls provider/model/reasoning from `config.quick_fixer`. Design doesn't state this anywhere.
- Fix: add a short sentence to Flow 4's cleanup subsection: "Cleanup execution uses the `quick_fixer` role configuration from `impl-run.config.json`; there is no separate `cleanup_fixer` role in v1." (Precise wording can adjust; intent is to make the coupling visible.)
- No code changes.

## Execution Order Recommendation

Suggested to minimize inter-item interference:
1. Tests-first phase: write all red tests for B1, B2, M1, M2, m1, m3, m4, m5, m6 in parallel (they don't depend on each other structurally). Confirm each fails for the right reason.
2. m2 (typed ConfigLoadError) — do this early because m6 depends on it for error-type assertions.
3. Green phase: implement B1, B2, M1, M2, m1, m3, m4, m5, m6 in any order. Run `bun run green-verify` frequently as a sanity check.
4. S1, S2, S3, S4, S5 — docs updates. S3 includes a test change that needs to be flagged clearly. Update test-plan.md for S1; update tech-design-*.md for S2, S3, S4, S5.
5. Final `bun run green-verify` + `bun run guard:no-test-changes` after S3's intentional test change has been baselined.

Note on S3: the test change is intentional (pinning wrong behavior). Re-run `bun run capture:test-baseline --force` after S3's test update so `guard:no-test-changes` accepts the change. This is the only exception in this pass to the "no test mods in green" rule, and it applies ONLY to the gate-discovery test that currently contradicts the design.

## Result Contract

Return a final structured result:

```
## Summary
<1-3 sentences>

## Per-Item Disposition

For each of the 15 items (B1, B2, M1, M2, m1, m2, m3, m4, m5, m6, S1, S2, S3, S4, S5):
- ID: B1
- Outcome: implemented | deviated | surfaced-to-orchestrator
- Files Changed: [paths]
- Tests Added/Modified/Removed: summary
- Note: <1-2 sentences, only if deviation or uncertainty>

## Changed Files (Full List)
<path + reason>

## Tests
- Added: N
- Modified: N (list with rationale for each — expected only S3's gate-discovery test)
- Removed: N
- Total count after work: N
- Delta from prior baseline 247: +/-N

## Gates Run + Result
- bun run green-verify: pass | fail
- bun run verify-all: pass | fail (if run)
- guard:no-test-changes: pass | fail (after capture:test-baseline re-run for S3)

## Self-Review Findings Fixed (initial pass, expected empty)
## Self-Review Findings Surfaced (initial pass, expected empty)

## Open Questions
<uncertainties you couldn't resolve>

## Spec Deviations
<if you diverged from any item's prescribed fix>

## Recommended Next Step
ready-for-self-review-1 | needs-human-ruling | blocked
```

Workflow:
1. Read the 5 design docs (reading journey).
2. Red phase: write failing tests per plan above. Run them. Confirm they fail.
3. Green phase: implement each item.
4. Final gate: `bun run capture:test-baseline --force` (to pick up S3's test change) then `bun run green-verify`.
5. Return the structured result.

You will receive up to 3 self-review passes via `codex exec resume`. Each pass will be prescriptively scoped; do not preempt their focus by over-reviewing your own work in this initial dispatch.
