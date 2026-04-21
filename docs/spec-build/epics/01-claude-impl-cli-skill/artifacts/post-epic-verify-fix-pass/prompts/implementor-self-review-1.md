# Self-Review Pass 1 of 3 — Broad Correctness + Scope Audit

Apply critical scrutiny. Assume a fresh-session verifier will read every change line-by-line with the 15-item spec in front of them.

## Focus

1. **Per-item correctness sanity:** for each of B1, B2, M1, M2, m1, m2, m3, m4, m5, m6, S1-S5, re-read the prescribed fix from the initial prompt against your implementation. Did you do exactly what was prescribed? No more, no less?
2. **Scope creep audit:** the m2 typed error fix touched 9 command files. Was each call-site update necessary to satisfy the fix, or did you normalize adjacent code while you were there? List every command-file change and justify it relative to the typed-error scope.
3. **S3 test-change completeness:** the gate-discovery test was intentionally rewritten. Did you update EVERY test that asserted raw-body gate behavior, or are there tests that now pass only incidentally? Grep for any remaining tests referencing raw script bodies (e.g. `"bun run verify && bun run guard:no-test-changes"` or similar compound script strings).
4. **B2 tier semantics:** you added a 4-tier `HarnessAvailability.tier` field. Does the `authStatus` string value still correctly align with each tier? Specifically: `tier: "authenticated-known"` must correspond to `authStatus: "authenticated"`; `tier: "binary-present"` and `tier: "auth-unknown"` both imply `authStatus: "unknown"` (distinct tiers but shared auth-string); `tier: "unavailable"` implies `authStatus: "missing"` OR `"unknown"` depending on whether the binary was missing vs running-but-broken. Check each tier produces the correct pair.
5. **M1 epic-path strip:** you stripped the epic line from story-implementor and story-verifier reading journeys AND stopped passing `epicPath` from those call sites. Confirm both changes are in place (defense-in-depth). Also confirm epic-verifier and epic-synthesizer reading journeys STILL include the epic path (they legitimately need it).
6. **m4 public-insert guard uniformity:** you made the guard apply to any insert path. Did you drop the role-gating ternary at 340-344, or keep it and add defensive loading elsewhere? Verify the behavior for a role that does NOT currently use public inserts (e.g. epic-verifier or quick-fixer) would still enforce the 64 KiB limit if an insert path were somehow passed in. Add a test if one isn't already there.
7. **m6 + m2 interaction:** m2 introduced `ConfigLoadError`. m6 made the config strict. When a malformed/non-strict config is loaded, does the error still surface as `ConfigLoadError` (not a raw Zod error)? Verify the error classification path for a strict-violation case.

## What to do with findings

- If a finding is a clear local correction with no design ambiguity, fix it now in this session.
- If you are uncertain whether the fix is right, do NOT change the code. Surface to the orchestrator.
- After any fixes, re-run `bun run green-verify` and confirm it still passes. Re-run `bun run capture:test-baseline --force` only if you needed to modify the gate-discovery or other intentional-test-change files.

## Return Format

```
## Findings Fixed (id, summary, files changed)
## Findings Surfaced To Orchestrator (id, summary, why uncertain)
## Per-Item Sanity Status (B1 clean / B1 refined / ..., one line each)
## Scope-Creep Audit Result (justified | overreached)
## S3 Test-Change Sweep Result (complete | incomplete with list)
## Files Changed In This Pass
## Gate Result After This Pass (pass | fail | not-run)
## Recommended Next Step
```
