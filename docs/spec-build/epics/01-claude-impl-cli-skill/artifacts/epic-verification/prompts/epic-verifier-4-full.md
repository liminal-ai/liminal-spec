## Your Assignment

- **Reviewer Label:** `epic-verifier-4`
- **Provider:** `claude-code`
- **Model:** `claude-sonnet-4-6[1m]`
- **Effort:** `max`

Use these exact strings when you fill the `provider`, `model`, and `reviewerLabel` fields of your `EpicVerifierResult` JSON output.

---

## Context Framing

You are a FRESH session. You have no prior conversation history with this project.

You are reviewing the **fully implemented `ls-claude-impl` epic**, which delivers a Claude Code orchestration skill + a `ls-impl-cli` Node-compatible runtime. All 9 stories (0-8) have been implementor-accepted and gone through per-story dual-verifier review. Additionally, two post-implementation passes have been accepted:

1. **Closeout pass** — implemented the Copilot fresh-session adapter (AC-2.2c runtime closure) plus 5 small coverage additions (64 KiB prompt insert guard + PROMPT_INSERT_INVALID runtime mapping, parser positive variants for text/naked payloads, TC-6.1a baseline-before/after assertions, epic-synthesize INVALID_INVOCATION test, repo-root guard tests for all 3 epic-* commands).
2. **Strict-parser fix** — tightened ~15 inner payload schemas across `result-contracts.ts`, `story-implementor.ts`, `story-verifier.ts`, `epic-cleanup.ts`, `epic-verifier.ts`, `epic-synthesizer.ts` to `.strict()`. Wrapper-vs-payload boundary preserved. Quick-fix intentionally NOT strict (per Correction 2). Diagnostic detail now includes Zod-derived unexpected-key paths.

Current test baseline: **247 passing, 0 fail, 969 expect calls, 24 files**. Gate command: `bun run green-verify`. Epic gate: `bun run verify-all`.

This is a formal **4-way epic verification**. You are one of four parallel, fresh-session epic verifiers. The other three are using different models: codex gpt-5.4 xhigh, codex gpt-5.3-codex xhigh, claude opus-4-7 1M, claude sonnet-4-6 1M. An epic synthesizer (codex gpt-5.4 xhigh) will later independently cross-check and categorize your findings against the other three reports and against the codebase.

Your job is **not** to agree with any prior disposition. You should read the epic + tech design + test plan + codebase FRESH and judge independently.

## Spec Pack Paths

- Epic: `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/01-claude-impl-cli-skill-epic.md`
- Tech Design Index: `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design.md`
- Tech Design Companions:
  - `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-cli-runtime.md`
  - `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-skill-process.md`
- Test Plan: `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/test-plan.md`
- Stories directory: `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/stories/`
- Implementation root: `/Users/leemoore/code/liminal-spec/processes/impl-cli/`
- Skill source: `/Users/leemoore/code/liminal-spec/src/phases/claude-impl.md` + `/Users/leemoore/code/liminal-spec/src/references/claude-impl-*.md`

Do NOT read `team-impl-log.md` — it is orchestrator-private state. The epic, tech design, test plan, stories, and codebase are the authoritative sources for your review.

---

# Epic Verifier Base Prompt

## Cross-Story Checks
Review the implemented epic as a whole codebase rather than as isolated stories.

## Architecture Consistency
Check for cross-story drift against the architecture and tech-design contracts.

## Mock Audit
Perform a production-path mock or shim audit and report every material finding.

## Output Contract
Return exactly one JSON object matching `EpicVerifierResult`.


## Reading Journey
Read the epic-level artifacts and the whole codebase before you judge the implementation set.
- Epic: /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/01-claude-impl-cli-skill-epic.md
- Tech Design Index: /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design.md
- Tech Design Companions:
  - /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-cli-runtime.md
  - /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-skill-process.md
- Test Plan: /Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/test-plan.md
Check cross-story consistency, architecture alignment, and production-path mock or shim usage before you conclude the outcome.


## Gate Instructions
- Story Gate: bun run green-verify
- Epic Gate: bun run verify-all

Run both gates yourself before concluding. Record what you ran and what passed or failed. If a gate fails, your outcome cannot be `pass`.


## Result Contract
Return exactly one JSON object matching `EpicVerifierResult`.



## Mock Or Shim Audit
Audit production paths for mocks, shims, or fake adapters and report every material finding explicitly. Tests may mock external boundaries (provider CLIs, auth checks) — that is in scope. Production code that silently mocks or stubs behavior is out of scope and must be reported.

---

## EpicVerifierResult Schema (exact fields, strict — unknown keys rejected)

```typescript
{
  resultId: string,          // unique id for this report (use an ISO-ish timestamp + random, e.g. "ev-2026-04-21-v1")
  outcome: "pass" | "revise" | "block",
  provider: "claude-code" | "codex" | "copilot",
  model: string,             // exact model string, e.g. "gpt-5.4", "claude-opus-4-7[1m]"
  reviewerLabel: string,     // your assigned label: "epic-verifier-1", "epic-verifier-2", etc.
  crossStoryFindings: string[],        // plain-string integration/consistency findings across stories
  architectureFindings: string[],      // plain-string end-to-end architecture issues
  epicCoverageAssessment: string[],    // plain-string AC/TC coverage assessment per section
  mockOrShimAuditFindings: string[],   // plain-string mock/shim audit findings on production paths
  blockingFindings: VerifierFinding[], // structured blocking issues
  nonBlockingFindings: VerifierFinding[], // structured non-blocking observations
  unresolvedItems: string[],           // evidence gaps or uncertain claims
  gateResult: "pass" | "fail" | "not-run"
}
```

Where VerifierFinding is:

```typescript
{
  id: string,
  severity: "blocking" | "critical" | "major" | "minor" | "nit" | "observation",
  title: string,
  evidence: string,           // file:line references plus observed behavior
  affectedFiles: string[],
  requirementIds: string[],   // AC/TC ids: e.g. ["AC-2.2c", "TC-5.1b"]
  recommendedFixScope: "same-session-implementor" | "quick-fix" | "fresh-fix" | "human-ruling",
  blocking: boolean
}
```

Return the JSON object as the final output of your response. Also include a brief human-readable summary before the JSON block is acceptable but the JSON must be the final block and parse strictly (no extra keys).

## Review Directions

1. Follow the reading journey in order. Read each design doc in 500-line chunks if large; reflect after each chunk.
2. Spot-check the codebase for evidence against the ACs you're evaluating — don't just trust the design docs.
3. Run both gates yourself:
   - `cd /Users/leemoore/code/liminal-spec && bun run green-verify`
   - `cd /Users/leemoore/code/liminal-spec && bun run verify-all`
4. Mock/shim audit — grep production paths in `processes/impl-cli/core/`, `processes/impl-cli/commands/`, `scripts/` for placeholders, stubs, "not implemented", `TODO`, `FIXME`, conditionals that bypass real behavior.
5. Cross-story consistency — are the 5 flows from the tech-design actually connected? Does prompt assembly produce the exact artifacts the provider adapters expect? Does the result contract produced by `story-implement` round-trip into `story-continue`? Does epic-verify produce output `epic-synthesize` can consume?
6. Architecture consistency — are the provider-agnostic seams clean, or has provider-specific logic leaked into command modules?
7. AC/TC coverage — sample at least 10 ACs across the 8 sections and confirm real test coverage in the locations test-plan.md specifies.
8. Strictness — the strict-parser fix is recent. Verify `.strict()` is applied where tech-design says "exactly" and NOT applied to wrappers. Verify quick-fix is intentionally NOT strict per Correction 2.
9. Copilot adapter — recent fix. Verify the adapter actually invokes `copilot -p "<prompt>" -s --model <model>` for fresh-session roles (story_verifier, quick_fixer, epic_verifier, epic_synthesizer) and rejects retained-session attempts with `CONTINUATION_HANDLE_INVALID`.
10. If you find **no blocking issues**, return `outcome: "pass"` and empty `blockingFindings`. If minor/observation-level concerns exist, put them in `nonBlockingFindings`. Do not inflate severity to demonstrate thoroughness.
11. If you find real blocking issues, return `outcome: "revise"` or `"block"` with concrete evidence. A blocking finding requires file:line evidence, not just "this feels wrong."
