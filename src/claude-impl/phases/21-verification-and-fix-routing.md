# Verification and Fix Routing

Consult this file when the implementor or verifier returns findings that need routing — not the clean happy path. Your job is to choose the smallest bounded follow-up that resolves the issue while preserving verifier evidence and final acceptance ownership.

## Routing options

After implementation or verification returns findings, pick the smallest option that fits:

| Option | When | Example |
|---|---|---|
| `story-continue` | Same-session implementor should continue on a directly related follow-up | Verifier flags a test assertion as too loose; implementor can tighten it |
| `story-self-review` | Initial implementation or bounded follow-up is complete and same-session review should run before verification | The implementor pass finished cleanly and the continuation handle is valid |
| `quick-fix` | Small bounded correction not tied to active story context | Typo in an error message, renaming a helper, removing a dead code block |
| Fresh `story-implement` | Extensive rework or same-session output has degraded | Integration broken across multiple files after partial changes |
| Human escalation | Design ambiguity or product intent blocks further routing | Spec says X, tech design says Y; product call needed |

## Core rules

- Preserve verifier evidence rather than collapsing it into a summary.
- Keep implementor uncertainty explicit — if the result surfaced `needs-human-ruling`, do not auto-fix it away.
- Run `story-self-review` after a clean `story-implement` or `story-continue` result before launching `story-verify`.
- Final acceptance stays with you, not with the CLI, not with a verifier.
- Rerun verification after any fix; `story-verify` starts the retained verifier session on the first pass and resumes that same session on follow-up passes.
- The orchestrator never overrides verification-identified blockers. Route blockers to the implementor, back to verification, or to the user for a ruling.
- Never allow non-specified or non-designed shims, mocks, fake adapters, test-only branches, or placeholder production paths without explicit user approval.

## Verification Workflow

When verification returns blockers, your job is convergence management, not adjudication by instinct.

1. Read every blocker and preserve the verifier's evidence.
2. Convert the blocker into a bounded follow-up request for the implementor unless it is clearly a product/design decision.
3. Dispatch the follow-up through the smallest fitting path, usually `story-continue` for story-scoped behavior.
4. After the implementor responds, send the fix evidence back through verification.
5. Repeat until the verifier reports the blocker resolved, the implementor provides spec-backed counter-evidence that requires a human ruling, or the user decides.

High-signal routing:

- If a verifier flags a production path as test-only, shimmed, fake, or placeholder-backed, route to `story-continue` to wire the real path or ask the user to approve the shim.
- If a verifier flags missing AC/TC behavior, route to `story-continue` with the exact AC/TC and evidence.
- If a verifier flags a small mechanical issue outside story context, use `quick-fix`.
- If the implementor says the verifier is wrong, ask for concrete story, epic, tech-design, or test-plan evidence and route that evidence back through verification.
- If the evidence turns on product intent or scope interpretation, ask the user. Do not settle it silently.
- If a finding needs `accepted-risk`, record who accepted it and why. User approval is required for accepting verification-identified blockers.

## What Not To Do

- Do not mark a verifier blocker as `accepted-risk` because the implementor says it is out of scope unless the implementor cites concrete spec or tech-design evidence and the user or verifier accepts that interpretation.
- Do not decide that a production read path can remain test-shimmed because a related production write caller is deferred to a downstream epic. If the current story or tech design requires the read path and the substrate exists, route the fix.
- Do not collapse "the verifier is still blocking this after the implementor responded" into an orchestrator opinion. Keep routing toward convergence or ask the user for a ruling.
- Do not let a declared `specDeviations` entry become a passive note. Route it as unfinished implementation, verifier evidence, or a user decision.
- Do not use `quick-fix` for changes that touch multiple surfaces, change invariants, alter contracts, or repair story-scoped behavior.
- Do not accept non-designed mocks or shims because tests pass. Passing tests against an unintended fake path do not satisfy a production-path requirement.

Examples:

- Wrong: verifier says the package review path is test-shim only; implementor says downstream publishing is future scope; orchestrator accepts risk and moves on. Right: route the blocker back to the implementor to wire the current epic's real package read path, or ask the user for an explicit scope ruling.
- Wrong: verifier flags missing server/client contract behavior; orchestrator sends a tiny quick-fix that patches one caller. Right: use `story-continue` so the retained implementor checks all contract surfaces.
- Wrong: self-review declares a tech-design deviation and the receipt records it as disclosure. Right: route the deviation before verification or ask the user whether the design should change.
- Wrong: tests pass because a fake adapter returns canned success on the production path. Right: replace the fake path or get explicit user approval for a temporary shim.

## If the implementor returns `needs-human-ruling`

Do not auto-resolve. Pick from the routing options above with the user's input, or surface the question to the user if the resolution is a design or product call.

## If the retained verifier and implementor still disagree materially

Do not pretend the disagreement is resolved. Options:

- Continue the retained verifier session with the implementor's full response and any concise orchestrator framing needed for the next decision.
- Surface the disagreement to the user with both the verifier evidence and implementor response visible.

Move on only when fresh evidence resolves it or the user makes the call.

## If verification is clean

Return to `phases/20-story-cycle.md` step 3: run the final story gate yourself, record the receipt, and decide whether to advance.
