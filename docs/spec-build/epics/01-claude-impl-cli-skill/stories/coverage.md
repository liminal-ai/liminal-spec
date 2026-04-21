# Coverage Artifact: ls-claude-impl

## Integration Path Trace

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Initialize spec-pack | Orchestrator points the skill at an epic folder and validates the v1 layout | Story 0 | TC-1.1a |
| Detect tech-design shape | Skill records whether the spec pack is two-file or four-file | Story 0 | TC-1.2a |
| Detect prompt inserts | Skill records implementor/verifier public inserts if present | Story 0 | TC-1.4a |
| Read story inventory | Orchestrator reads all story files and records story order | Story 1 | TC-1.5a |
| Discover verification gates | Orchestrator identifies story and epic verification commands from project policy | Story 1 | TC-1.6a |
| Pause on ambiguous gate policy | Orchestrator stops setup when gate policy is unclear | Story 1 | TC-1.6b |
| Resolve preferred GPT defaults | Skill computes Codex-backed role defaults when Codex is available | Story 1 | TC-2.2a |
| Record Claude-only degraded fallback | Skill switches to Claude-only defaults when no GPT CLI is available | Story 1 | TC-2.2c |
| Assemble role prompts | Role-specific base prompts, snippets, and inserts are assembled deterministically | Story 2 | TC-3.1a |
| Build implementor reading journey | Implementor prompt includes full tech-design set and bounded reflection behavior | Story 2 | TC-3.4a |
| Launch retained implementor | Story implementation starts through the CLI and returns structured output | Story 3 | TC-4.1a |
| Self-review in same session | Self-review stays in the implementor session and evolves by pass | Story 3 | TC-4.2a |
| Launch fresh verifiers | Two fresh verifier sessions review the story result | Story 4 | TC-5.1a |
| Report evidence-bound findings | Verifiers return coverage, findings, and mock/shim audits | Story 4 | TC-5.2a |
| Route bounded fixes | Orchestrator can use the quick-fix workflow for small corrections | Story 5 | TC-5.3a |
| Preserve uncertainty/disagreement | Implementor uncertainty and verifier disagreement remain visible | Story 5 | TC-5.4b |
| Re-run fresh verification after fixes | Re-verification uses fresh verifier sessions instead of reusing prior review context | Story 4 | TC-5.1b |
| Run final story gate | Orchestrator performs the final story acceptance gate | Story 6 | TC-5.5a |
| Record story receipt | Story acceptance writes durable evidence, dispositions, and risks | Story 6 | TC-6.1a |
| Resume from disk | Orchestrator resumes from log and prior CLI artifacts after interruption | Story 7 | TC-6.3a |
| Materialize cleanup batch | Deferred and accepted-risk items are compiled before epic verification | Story 8 | TC-7.1a |
| Verify cleaned state | Orchestrator confirms cleanup result before epic verification starts | Story 8 | TC-7.3a |
| Run epic verifier batch | Epic-level verification runs for every completed run | Story 8 | TC-8.1a |
| Run mandatory synthesis | Orchestrator launches synthesis every run after epic verifier reports exist | Story 8 | TC-8.2a |
| Verify and consolidate findings | Synthesizer independently checks and categorizes reported issues | Story 8 | TC-8.3a |
| Run final epic gate | Orchestrator performs the final epic acceptance gate | Story 8 | TC-8.4a |

## Coverage Gate

| AC | TC | Story |
|----|-----|-------|
| AC-1.1 | TC-1.1a, TC-1.1b, TC-1.1c, TC-1.1d | Story 0 |
| AC-1.2 | TC-1.2a, TC-1.2b | Story 0 |
| AC-1.3 | TC-1.3a, TC-1.3b | Story 0 |
| AC-1.4 | TC-1.4a, TC-1.4b | Story 0 |
| AC-1.5 | TC-1.5a | Story 1 |
| AC-1.6 | TC-1.6a, TC-1.6b | Story 1 |
| AC-2.1 | TC-2.1a | Story 1 |
| AC-2.2 | TC-2.2a, TC-2.2b, TC-2.2c | Story 1 |
| AC-2.3 | TC-2.3a, TC-2.3b, TC-2.3c, TC-2.3d, TC-2.3e | Story 1 |
| AC-2.4 | TC-2.4a | Story 1 |
| AC-3.1 | TC-3.1a, TC-3.1b | Story 2 |
| AC-3.2 | TC-3.2a, TC-3.2b | Story 2 |
| AC-3.3 | TC-3.3a, TC-3.3b | Story 2 |
| AC-3.4 | TC-3.4a, TC-3.4b, TC-3.4c | Story 2 |
| AC-4.1 | TC-4.1a | Story 3 |
| AC-4.2 | TC-4.2a, TC-4.2b | Story 3 |
| AC-4.3 | TC-4.3a, TC-4.3b | Story 3 |
| AC-4.4 | TC-4.4a, TC-4.4b | Story 3 |
| AC-4.5 | TC-4.5a | Story 3 |
| AC-5.1 | TC-5.1a, TC-5.1b | Story 4 |
| AC-5.2 | TC-5.2a, TC-5.2b, TC-5.2c | Story 4 |
| AC-5.3 | TC-5.3a, TC-5.3b | Story 5 |
| AC-5.4 | TC-5.4a, TC-5.4b | Story 5 |
| AC-5.5 | TC-5.5a | Story 6 |
| AC-6.1 | TC-6.1a | Story 6 |
| AC-6.2 | TC-6.2a, TC-6.2b | Story 6 |
| AC-6.3 | TC-6.3a, TC-6.3b | Story 7 |
| AC-7.1 | TC-7.1a | Story 8 |
| AC-7.2 | TC-7.2a | Story 8 |
| AC-7.3 | TC-7.3a | Story 8 |
| AC-8.1 | TC-8.1a, TC-8.1b, TC-8.1c | Story 8 |
| AC-8.2 | TC-8.2a | Story 8 |
| AC-8.3 | TC-8.3a | Story 8 |
| AC-8.4 | TC-8.4a | Story 8 |

## Validation Notes

- Every AC from the detailed epic is assigned to exactly one story file.
- Every TC from the detailed epic is assigned to exactly one story file.
- Critical initialization, execution, re-verification, recovery, cleanup, and closeout path segments each have an owning story and at least one relevant TC.
- The integration path trace is a targeted cross-story proof for critical paths and alternate branches; the coverage gate remains the exhaustive AC/TC assignment record.
- No business epic was produced for this publication pass.
