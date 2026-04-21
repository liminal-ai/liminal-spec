# Self-Review Pass 3 of 3 — Residual Risk, Boundary Audit, Anything Noticed But Not Raised

Final pass. Look for anything you noticed during implementation or the prior two reviews that you didn't raise yet.

## Focus

1. **Documentation coherence for S1–S5:** re-read each spec/doc change in context (not in isolation). Do the updated paragraphs still flow with surrounding text? Specifically:
   - S2 routing matrix — does the `block`/`blocked` row now sit cleanly alongside other rows? Any orphan references elsewhere in tech-design-cli-runtime.md that still say `blocked` when they should say `block`?
   - S3 canonical gate mapping — does every mention of gate commands across tech-design.md, tech-design-cli-runtime.md, and any other doc now use the canonical names?
   - S5 epic-cleanup note — does it land in the right section, or is there a more specific place (e.g. Run Configuration Contract) where it also needs to appear?

2. **Error-code coverage in tech-design-cli-runtime.md:** you added `ConfigLoadError` and classified it as `INVALID_RUN_CONFIG`. The "Suggested stable error codes" list at the top of the design already includes `INVALID_RUN_CONFIG`. No change needed there. But check: are there any other CLI error codes in the list that are aspirational (no code throws them)? If so, is that a deliberate reserved-for-future or an actual gap?

3. **Symmetry with prior fixes:** the strict-parser fix earlier tightened PROVIDER-produced payloads. m6 tightens ORCHESTRATOR-authored config. Is there any third category of input (e.g. CLI flags parsed via `citty`, or cleanup-batch content parsed somewhere) that should also have strict schema enforcement for consistency? If yes, surface — don't fix; that's beyond this pass's scope.

4. **S3 fallout:** the canonical-name change means tests and fixtures that compare against raw script bodies would fail. You already swept tests. But what about:
   - Golden-output JSON files (if any exist under `tests/fixtures/`) — do they reference raw bodies?
   - Snapshot assertions — does any `toMatchSnapshot` or equivalent pin raw bodies?
   - `cli-operations-doc.test.ts` — does it reference gate commands that now differ?

5. **Idempotency of the fix pass:** if someone re-ran this fix pass against the now-fixed codebase, would any fix do something different? (Example: would m6's strict config rejection suddenly apply to strings the pass added to fixtures for other tests?) Confirm no fix introduces a new sensitivity that the pass itself doesn't address.

6. **Anything you noticed during implementation or review but never wrote down:** include it here. Pattern: small interior things you saw but didn't raise because they weren't in scope.

## What to do with findings

- Clean local fixes with no design ambiguity: fix now in this session.
- Uncertain or out-of-scope items: surface to orchestrator. Do NOT expand scope.
- After any fixes, re-run `bun run green-verify`. Re-run `capture:test-baseline --force` only if you intentionally modified a test.

If you find nothing new: return empty lists for fixed and surfaced. Empty is the correct answer if the pass really is clean.

## Return Format

```
## Findings Fixed (id, summary, files changed) — empty list if none
## Findings Surfaced To Orchestrator (id, summary, why uncertain) — empty list if none
## Documentation Coherence Check (S1-S5, one line each)
## Error-Code Aspirational-Gap Audit
## Strict-Schema Symmetry Audit
## S3 Fallout Residual Check (golden files, snapshots, cli-operations-doc)
## Idempotency Check
## Files Changed In This Pass
## Final Test Count and Delta From Pass 2 Baseline (266)
## Gate Result After This Pass
## Final Recommended Next Step: ready-for-verification | needs-followup-fix | needs-human-ruling | blocked
```
