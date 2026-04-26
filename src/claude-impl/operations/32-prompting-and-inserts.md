# Prompting and Inserts

The CLI assembles every role prompt deterministically and executes it through the configured provider. You don't construct prompts yourself, but understanding what the CLI sends helps you reason about role behavior and author public inserts when you need per-run customization.

## Assembly model

Every role prompt is composed the same way:

1. **Base prompt** — a stable per-role prompt embedded in the CLI (implementor, verifier, quick-fixer, epic verifier, epic synthesizer).
2. **Required snippets** — reusable prompt fragments (reading journey, report contract, gate instructions, mock audit, self-review pass).
3. **Optional public insert** — the orchestrator-visible customization file if present at the spec-pack root.
4. **Runtime values** — story path, tech-design paths, test-plan path, gate commands, continuation handles.

The CLI emits one provider-ready prompt per call plus an assembly manifest for debugging. Assembly is deterministic: the same inputs produce the same prompt.

## Public inserts

Public inserts let you add project-specific context without modifying the skill. They live at the spec-pack root and are non-blocking when absent.

| File | Injected into |
|---|---|
| `custom-story-impl-prompt-insert.md` | Every story implementor and `story-continue` prompt |
| `custom-story-verifier-prompt-insert.md` | Every initial and follow-up story verifier prompt |

The CLI validates readability and size at preflight; malformed or unreadable inserts return `PROMPT_INSERT_INVALID`.

Inserts do not apply to `quick-fix`, `epic-verify`, or `epic-synthesize` in v1. Quick-fix is story-agnostic by contract; epic roles receive the full epic and all stories in a fresh reading journey and are not customized per run.

## Role-fit reading journeys

Each role receives a bounded reading journey chosen by its job. The CLI constructs these; they are not orchestrator-authored.

| Role | Reads | Why |
|---|---|---|
| Story implementor | Current story, full tech-design set, test plan | Build within one story's scope; self-review uses the same retained session in a separate bounded call and only checks obligations already present in that handoff |
| Story verifier | Current story, full tech-design set, test plan (evidence-first lens) | Initial pass establishes findings; follow-up passes reuse the retained verifier session to assess implementor responses and convergence |
| Quick fixer | Plain-language task description only | Stay story-agnostic; no reading journey |
| Epic verifier | Epic, full tech-design set, test plan, all stories, full implementation | Cross-story findings, integration consistency, production-path mock audit |
| Epic synthesizer | Epic-verifier reports plus the epic and tech-design set | Independently verify and consolidate findings |

Neither implementor nor verifier reads `CLAUDE.md`, prior story files, or `team-impl-log.md`. Role context is bounded by design so sessions stay fresh and compaction-resilient.

## When to author an insert

Most runs do not need public inserts; the base prompts and snippets cover the methodology. Author one when the project carries context worth injecting into every story-level role — a domain glossary, a project-specific verification stance, or known failure modes to flag.

Keep inserts compact; they are added to every call in their scope.

## Authoring constraints

- Inserts are plain markdown. No code execution, no templating.
- Do not duplicate content already in the base prompts or snippets — inserts supplement, not replace.
- Do not reference files or paths outside the spec-pack; the reading journey is bounded.
- Do not include `team-impl-log.md` content or prior-run state; each role starts fresh per call.
