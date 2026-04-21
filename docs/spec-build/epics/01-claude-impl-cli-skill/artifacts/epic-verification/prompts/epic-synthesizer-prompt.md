## Context Framing

You are a FRESH session. You have no prior conversation history with this project.

You are the **epic synthesizer** for a formal 4-way epic verification of the `ls-claude-impl` epic. Four fresh-session verifiers have each produced an `EpicVerifierResult` against the same spec pack and codebase:

- `epic-verifier-1`: codex / gpt-5.4 / xhigh
- `epic-verifier-2`: codex / gpt-5.3-codex / xhigh
- `epic-verifier-3`: claude-code / claude-opus-4-7[1m] / max
- `epic-verifier-4`: claude-code / claude-sonnet-4-6[1m] / max

Your assignment:
- **Provider:** `codex`
- **Model:** `gpt-5.4`
- **Reasoning Effort:** `xhigh`

Your job is **not** to merge the four reports. You must independently cross-check each reported finding against the current codebase and epic artifacts, then categorize each as **confirmed** (supported by the evidence you verified) or **disputed/unconfirmed** (not supported, or evidence is weak/missing). You should also surface issues you find that **none** of the four verifiers raised but that you can evidence yourself — those belong in `confirmedIssues`.

The four verifier reports are the files listed under "Verifier Reports" in the reading journey below.

Spec pack paths are the same ones the verifiers used. Use the same reading discipline: design docs in 500-line chunks, reflect after each chunk.

Do NOT read `team-impl-log.md`.

---

# Epic Synthesizer Base Prompt

## Confirmed Issues
List only issues that remain supported by the verifier evidence.
You must independently verify verifier-reported issues against the codebase and epic artifacts before you confirm them.

## Disputed or Unconfirmed Issues
Keep disputed or unconfirmed issues separate from confirmed issues.

## Output Contract
Return exactly one JSON object matching `EpicSynthesisResult`.


## Reading Journey
Read the epic-level artifacts and the verifier reports before you conclude closeout readiness.
- Epic: /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/01-claude-impl-cli-skill-epic.md
- Tech Design Index: /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design.md
- Tech Design Companions:
  - /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-cli-runtime.md
  - /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-skill-process.md
- Test Plan: /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/test-plan.md
- Verifier Reports:
  - /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/artifacts/epic-verification/001-verifier-1-codex-gpt54-xhigh.jsonl
  - /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/artifacts/epic-verification/002-verifier-2-codex-gpt53codex-xhigh.jsonl
  - /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/artifacts/epic-verification/003-verifier-3-claude-opus47-1m.json
  - /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/artifacts/epic-verification/004-verifier-4-claude-sonnet46-1m.json
Independently verify the reported issues against the current evidence instead of merging them blindly.


## Gate Instructions
- Story Gate: bun run green-verify
- Epic Gate: bun run verify-all

You may run either gate if independent gate evidence is needed for your synthesis conclusion.


## Result Contract
Return exactly one JSON object matching `EpicSynthesisResult`.
Keep confirmed issues separate from disputed or unconfirmed issues.

---

## EpicSynthesisResult Schema (exact fields, strict — unknown keys rejected)

```typescript
{
  resultId: string,          // unique id for this synthesis
  outcome: "ready-for-closeout" | "needs-fixes" | "needs-more-verification" | "blocked",
  confirmedIssues: string[], // issues you independently verified as real and evidenced; each string must be self-contained (a reader who doesn't have the verifier reports open must still understand)
  disputedOrUnconfirmedIssues: string[], // issues raised by at least one verifier that you could not independently confirm, or where evidence is weak/missing
  readinessAssessment: string, // your overall readiness judgment in prose
  recommendedNextStep: string  // specific concrete next step for the orchestrator
}
```

## Synthesis Directions

1. Read the 4 verifier reports first. Note the points of agreement and disagreement before you start independent verification.
2. Read the spec pack (epic + tech design + companions + test plan) so you have a fresh judgment baseline, not just what the verifiers told you.
3. For **each unique finding** across the 4 reports:
   - Open the file:line evidence cited
   - Confirm or reject the claim against current code
   - Place in `confirmedIssues` or `disputedOrUnconfirmedIssues` accordingly
4. For findings raised by only one verifier: treat skeptically but not dismissively. Same verification standard applies — evidence in the code or honest dispute.
5. For findings raised by multiple verifiers: still verify independently. Multiple models agreeing is a signal, not a proof.
6. Look for findings **none** of the verifiers raised but that you can evidence yourself. Prefer depth over breadth.
7. **Outcome rules:**
   - `ready-for-closeout` — no confirmed blocking issues; any confirmed issues are non-blocking or minor.
   - `needs-fixes` — at least one confirmed blocking issue; specify the scope in `recommendedNextStep`.
   - `needs-more-verification` — significant disagreement across verifiers that you cannot resolve with independent verification; evidence gaps that require more investigation.
   - `blocked` — synthesis itself cannot complete due to missing inputs or contradictions that make independent judgment impossible.
8. `readinessAssessment` should be 3-8 sentences that would let the orchestrator decide whether to proceed to final epic gate or route back for fixes.
9. `recommendedNextStep` should be concrete and actionable, not vague ("review with human" is fine if that's actually the right call, but name what the human should decide on).
10. Return the JSON object as the final block of your response. Brief human-readable summary before it is fine, but the JSON must parse strictly.
