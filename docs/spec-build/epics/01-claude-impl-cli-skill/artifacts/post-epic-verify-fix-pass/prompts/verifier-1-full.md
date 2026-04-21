## Your Assignment

- **Reviewer Label:** `fix-pass-verifier-1`
- **Provider:** `codex`
- **Model:** `gpt-5.4`
- **Reasoning Effort:** `xhigh`

---

## Context Framing

You are a FRESH session verifier. You have no prior conversation history with this project.

You are verifying a **focused post-epic-verify fix pass** on the `ls-claude-impl` epic. Prior state:
- 9 stories + closeout pass + strict-parser fix all accepted.
- A formal 4-way epic verification + codex gpt-5.4 xhigh synthesizer flagged 4 confirmed findings (2 blocking, 2 non-blocking drifts).
- The orchestrator's review surfaced an additional 11 clear improvements (6 minor code + 5 spec/docs alignment).
- All 15 items were bundled into a single implementor dispatch + 3 self-review passes.

Prior test baseline (before fix pass): **247**. Current (after fix pass): **266** (delta +19, with 1 intentional test file rewrite for S3).

**All 15 Items Scoped:**

Blocking:
- **B1** — Gate discovery traverses to repo root for nested spec packs. Was: searches only under `<spec-pack-root>`. Fix: walk up to first ancestor with `.git`; if both local and repo-root yield gates, local wins.
- **B2** — Implement 4-tier provider availability (`binary-present` | `authenticated-known` | `auth-unknown` | `unavailable`). Was: collapsed to available/unavailable. Fix: added `tier` field to `HarnessAvailability`, preflight blocks only `unavailable`.

Major (non-blocking contract drift):
- **M1** — Strip `epicPath` from story-implementor and story-verifier reading journeys (Correction 1 violation).
- **M2** — Preflight invalid-config path persists its envelope artifact.

Minor (clear improvements):
- **m1** — Anchor APPROVED regex in `epic-cleanup.ts` (`/^[-*]\s*\[x\]\s+APPROVED\b/mi` or similar) to reject "NOT APPROVED", "pre-APPROVED", etc.
- **m2** — Replace `error.message.includes("config")` with typed `ConfigLoadError` class. New module: `processes/impl-cli/core/command-errors.ts`. Applied across all 8 command wrappers that load run config.
- **m3** — Replace hardcoded `ALLOWED_TECH_DESIGN_COMPANIONS` with glob match (`tech-design-*.md`).
- **m4** — Extend `MAX_PUBLIC_INSERT_BYTES` guard to apply to any role that might load public inserts (structural, not role-gated).
- **m5** — Add unknown-outcome fallback in `statusForOutcome()` — returns `"error"` instead of throwing.
- **m6** — Make `implRunConfigSchema` strict (including nested objects). Strict violations surface as `ConfigLoadError` (uses m2).

Spec/Docs Alignment:
- **S1** — test-plan.md now references `scripts/__tests__/claude-impl-build.test.ts` (not the non-existent `packaged-cli-smoke.test.ts`).
- **S2** — tech-design-cli-runtime.md routing matrix now distinguishes outcome `"block"` from envelope status `"blocked"`.
- **S3** — Gate discovery now returns canonical names (`bun run green-verify`), not raw script bodies. Docs + impl + tests all aligned. **Intentional test modification** to `gate-discovery.test.ts` and `preflight-command.test.ts`.
- **S4** — tech-design.md now documents where actual packaged-CLI smoke coverage lives (`scripts/__tests__/claude-impl-build.test.ts`).
- **S5** — tech-design-cli-runtime.md Flow 4 now documents that epic-cleanup reuses `quick_fixer` role config.

## Spec Pack Paths

- Epic: `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/01-claude-impl-cli-skill-epic.md`
- Tech Design Index: `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design.md`
- Tech Design Companions:
  - `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-cli-runtime.md`
  - `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/tech-design-skill-process.md`
- Test Plan: `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/test-plan.md`
- Implementation root: `/Users/leemoore/code/liminal-spec/processes/impl-cli/`
- Fix pass artifact root: `/Users/leemoore/code/liminal-spec/docs/spec-build/epics/01-claude-impl-cli-skill/artifacts/post-epic-verify-fix-pass/`

**Do NOT read `team-impl-log.md`.** It is orchestrator-private state (Correction 3).

Reported gate state: `bun run green-verify` and `bun run verify-all` both pass. `guard:no-test-changes` passes after `capture:test-baseline --force` (re-baselined once post-S3).

## Reading Journey

Read in 500-line chunks if large; reflect after each chunk.

1. The epic file.
2. Tech design index.
3. Both tech design companions.
4. Test plan.
5. Sample ~10 of the 15 item implementations by reading the modules + new tests.

## Your Job

- **Independently verify each of the 15 items** against the actual implementation.
- Run `bun run green-verify` yourself; record actual gate result.
- Spot-check the S3 test modification — was it scoped correctly? Was any non-S3 test change smuggled in?
- Mock/shim audit: production paths in `processes/impl-cli/core/` and `commands/`. Are there any new mocks, shims, placeholders, or fake adapters introduced by the fix pass? Flag explicitly.
- Severity discipline: do not inflate findings. Blocking requires file:line evidence that the fix is structurally incorrect.
- If the fix pass is clean, return `outcome: "pass"` and empty `blockingFindings`.

Do NOT auto-fix. Do NOT modify code.

## Result Schema (strict — unknown keys rejected)

Match the `EpicVerifierResult` schema from prior epic-verify dispatches:

```typescript
{
  resultId: string,
  outcome: "pass" | "revise" | "block",
  provider: "codex",
  model: string,                 // "gpt-5.4" or "gpt-5.3-codex"
  reviewerLabel: string,         // your assigned label
  crossStoryFindings: string[],  // use for "fix-pass-wide" findings in this context
  architectureFindings: string[],
  epicCoverageAssessment: string[],
  mockOrShimAuditFindings: string[],
  blockingFindings: VerifierFinding[],
  nonBlockingFindings: VerifierFinding[],
  unresolvedItems: string[],
  gateResult: "pass" | "fail" | "not-run"
}
```

Where `VerifierFinding`:

```typescript
{
  id: string,
  severity: "blocking" | "critical" | "major" | "minor" | "nit" | "observation",
  title: string,
  evidence: string,
  affectedFiles: string[],
  requirementIds: string[],
  recommendedFixScope: "same-session-implementor" | "quick-fix" | "fresh-fix" | "human-ruling",
  blocking: boolean
}
```

Return the JSON object as the final block of your response.
