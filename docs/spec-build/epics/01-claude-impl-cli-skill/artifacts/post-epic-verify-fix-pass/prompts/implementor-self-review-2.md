# Self-Review Pass 2 of 3 — Test Depth, Mock-Shape Passes, Edge Cases

Apply adversarial scrutiny. Assume a verifier is looking for tests that pass for the wrong reason.

## Focus

1. **Mock-shape passes:** for each of the 15 items, ask: does my test exercise the real production code path, or could it pass with `.strict()` or the guard removed? Walk each test and answer honestly.
   - B1: does the repo-root traversal test actually reach the repo-root branch, or does it pass because the local fixture happens to have a package.json by accident?
   - B2: do the 4-tier tests each prove that the SPECIFIC tier value flows through to preflight routing, or do they all pass because preflight just checks `tier !== "unavailable"`?
   - M1: does the negative assertion on story-role reading journey actually check the role-gated code path, or could it pass if the epic path just happened to be falsy in the fixture?
   - M2: does the artifact-persistence test prove the file is written to the specific blocked-envelope path, or does it just check a file exists?
   - m1: do the negated-APPROVED tests each fail without the regex fix? Specifically, run the NEW tests against the OLD regex mentally — would they fail?
   - m2: the typed-error test — does it prove `ConfigLoadError` is thrown AND caught, or only that one or the other happens?
   - m3: the glob companion test — does it use a name pattern that the OLD allowlist would reject?
   - m4: the oversized-insert test for a non-story role — does it actually go through `publicInsertPathForInput` or does it bypass?
   - m5: the unknown-outcome fallback test — does it call `statusForOutcome()` directly with a string that isn't in the enum?
   - m6: the strict config test — does it use an extra key that would have been silently stripped under the old non-strict schema?

2. **Omit+strict composition:** for m6 (strict config), are nested objects (RoleAssignment, EpicVerifierAssignment, self_review) also strict? Add a nested-key rejection test if missing.

3. **Edge cases that tests might have missed:**
   - B1: what if the spec pack IS at the repo root (no nesting)? Does local discovery still win and skip the repo-root fallback?
   - B1: what if the filesystem walks hit root (`/`) with no repo discovered? Does the discovery return `needs-user-decision`, not crash?
   - B2: what if `codex --version` succeeds but returns garbled output? Does it still resolve to `binary-present` + `auth-unknown`?
   - M2: what about `ENOENT` on the config file vs malformed JSON vs schema-violation? All three should produce a blocked envelope — and all three should persist the artifact. Does each?
   - m1: what if a cleanup batch has both a `[x] APPROVED item` AND plain text "not approved" elsewhere in the body? The match should still return true for the approved item.
   - m4: what if the insert path is an empty string vs absent vs unreadable? Each should have distinct behavior.

4. **Unrelated regression risk:** did any of the 15 fixes inadvertently change behavior for unrelated flows? Sample: the typed-error refactor in story-implement.ts — are there other error paths in that file (non-config errors) whose classification behavior you need to preserve? Confirm nothing else was disturbed.

5. **Gate-command round-trip in S3:** the implementation now returns `bun run green-verify` as the storyGate. Does the PROMPT ASSEMBLY interpolate the gate command correctly? i.e., if the orchestrator persists the gate into `impl-run.config.json` or feeds it into prompt assembly, does the canonical form still flow through? Spot-check one end-to-end.

## What to do with findings

- If a finding is a clear local correction with no design ambiguity, fix it now in this session.
- If a test added now would materially increase confidence without overreach, add it.
- If you are uncertain about a fix, do NOT change code. Surface.
- After any fixes, re-run `bun run green-verify` and confirm it still passes. If you touched intentional-test-change files (gate-discovery), re-run `capture:test-baseline --force` first.

## Return Format

```
## Findings Fixed (id, summary, files changed)
## Findings Surfaced To Orchestrator (id, summary, why uncertain)
## Mock-Shape Audit Per Item (one line each, "real path" | "shallow, fixed in this pass" | "shallow, deferred to orchestrator")
## Edge-Case Coverage Delta (what was added, what was deliberately skipped)
## Unrelated-Regression Audit Result
## Files Changed In This Pass
## Test Count After Pass and Delta
## Gate Result After This Pass
## Recommended Next Step
```
