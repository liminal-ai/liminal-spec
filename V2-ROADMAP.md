# SDD Improvement Roadmap

v9 is functional for users familiar with the methodology. This roadmap tracks improvements for broader adoption.

**Status:** v9 complete. Testing with oc-context-cleaner before implementing improvements.

---

## Prioritized Improvements

Improvements in order of priority, informed by critical review (2026-01-31).

### 1. Orchestration Playbook
**Gap:** SKILL.md says "Opus orchestrates" but never shows what orchestration looks like.
**Deliverable:** 1-2 page playbook covering:
- Sample prompts for starting each phase
- Decision criteria for "ready for handoff" vs "loop back"
- Handling engineer output that doesn't meet spec
- Partial completion / resumption after compression

**Location:** SKILL.md section or `references/orchestration-playbook.md`

### 2. Tutorial
**Gap:** Current docs are execution-oriented, not learning-oriented. Newcomers need conceptual onboarding.
**Deliverable:** Separate MD file, progressively disclosed. Structured for LLM to walk user through:
- Section-by-section conceptual walkthrough
- Explicit pause points for Q&A
- Teaches the "why" not just the "how"
- Scales better than manual walkthroughs

**Location:** `tutorial.md` (loaded on request, not by default)

### 3. Worked Example
**Gap:** All methodology, no through-line demonstration of artifacts.
**Deliverable:** Compact example (3-5 files) showing:
- Small feature spec (aim for ~50-150 lines)
- Tech design (aim for ~150-600 lines)
- One story with prompts
- Actual tests and implementation

**Note on length targets:** These line counts are *illustrative heuristics*, not requirements.
The real readiness criteria is completeness + traceability (User Profile → Flows → ACs → TCs;
and TCs map cleanly to tests), with enough prose to avoid flat bullet lists. Some features will
need far more detail; some will need less.

**Note:** May merge with tutorial — tutorial that builds a small example as it teaches.

### 4. Stack-Agnostic Framing
**Gap:** Examples skew React/TypeScript/Vitest. Non-React users must translate constantly.
**Options:**
- Generalize examples (show pattern without React specifics), OR
- Explicitly label: "Examples use React/TypeScript/Vitest. Patterns apply to any stack."

**Minimal fix:** Add note to SKILL.md acknowledging the bias.

### 5. CLI (`sdd-skill`)
**Gap:** Installation is manual file copying. No structured onboarding or utilities.
**Deliverable:** npm package with:
```bash
npm install -g sdd-skill
sdd-skill init        # Deploy skill files to .claude/skills/sdd/
sdd-skill quickstart  # Interactive: Tutorial / Test Drive / Jump In / Reference
sdd-skill tutorial    # Conceptual walkthrough
sdd-skill status      # Where am I in the pipeline?
```

**Test Drive:** Scaffolds a practice feature for low-stakes pipeline learning.

**Fits into:** agent-cli-tools library (alongside ccs-cloner, oc-context-cleaner)

---

## Completed (v9)

### Testing Philosophy ✓
- Rewrote `testing.md` with service mocks philosophy
- API testing (deepest), UI testing (acknowledges gaps), Convex (brief)
- TC traceability integrated
- Honest about UI testing limitations

### SDLC Phase Reframe ✓
- Phases defined by artifact entry/exit, not agents
- Two dimensions explicit (macro phases, micro story cycle)
- SKILL.md restructured around this model

### TC Traceability ✓
- Updated testing.md, tech-lead.md, story-prompts.md
- TC IDs carry through from spec to test code

### Model Selection Guidance ✓
- Added prompting-opus-4.5.md and prompting-gpt-5.2.md
- Model selection table in SKILL.md

---

## Deferred (Evaluate After Usage)

### Bootstrap/Getting Started
Add explicit instructions for starting an SDD project. Deferred because Lee knows the process; scaffold for others after real usage reveals friction.

### Human-Agent Signaling Protocol
Template messages for phase completion, blocking issues, review requests. Deferred for same reason.

### Agent/Subagent Restructure
If SDD becomes a plugin with skill + subagents, may reorganize reference files into agent prompts. Decision point after more usage.

### Verifier Role Clarification
Either create verifier.md or document that verification is orchestrator-driven. Currently played by feel.

### Artifact Naming Conventions
Current templates use generic names like `feature-spec.md`, `tech-design.md`, `story-0.md`. When building multiple features, you end up with indistinguishable files. Need descriptive naming guidance.

Examples of the problem:
- `feature-spec.md` → should be `feature-user-auth.md` or `feature-context-cleaner.md`
- `story-0.md` → should be `story-0-session-listing.md`
- `tech-design.md` → should be `tech-design-user-auth.md`

Clarify naming conventions in templates and BA/Tech Lead references. Consider folder-per-feature structure vs flat with prefixes.

---

## Not Changing

- **"SDD or not at all" philosophy** — intentional design choice
- **Token load** — price of rigor, progressive disclosure manages it
- **Multi-agent orchestration flexibility** — environment-dependent by design

---

## Issues Discovered During oc-context-cleaner (2026-01-31)

### CLI Testing Gap in testing.md

**Experience:** During Tech Design for oc-context-cleaner (a CLI tool), the Tech Lead designed a test structure with unit tests for internal modules:
- `tool-call-remover.test.ts` — tests algorithm in isolation
- `backup-manager.test.ts` — tests manager with mocked filesystem
- `edit-operation-executor.test.ts` — tests executor with mocked filesystem
- `edit-command.test.ts` — tests command

This violates the service mock principle: "Test at entry point, exercise all internal pathways, mock only at external boundaries." The correct structure tests through commands (entry points) and only has separate tests for pure algorithms (no IO).

**Root Cause:** The testing.md reference has:
- Clear principle ("test at entry point, mock only external boundaries")
- API testing examples (route handlers, HTTP injection)
- UI testing examples (React components, Testing Library)
- **No CLI testing examples**

The tech-design template reinforces this with UI-oriented test organization ("Page tests", "Component tests", "Hook tests").

An agent pattern-matching to examples sees "test the hook, test the component, test the page" and translates to "test the remover, test the manager, test the command" — structurally similar but wrong for CLI.

**Recommendation:** Add CLI testing section to `references/testing.md`:

```markdown
## CLI Testing

For CLI tools, the entry point is the command handler. Apply the same principle:

| Layer | Mock? | Why |
|-------|-------|-----|
| Command handler | Test here | Entry point |
| Internal orchestration (executors, managers) | Don't mock | Exercise through command |
| Pure algorithms (no IO) | Can test directly | No mocking needed, supplemental coverage |
| Filesystem/network | Mock | External boundary |

### Correct Structure
```
tests/
├── commands/              # Entry point tests (primary coverage)
│   ├── edit-command.test.ts    # Full edit flow, mocks filesystem
│   ├── clone-command.test.ts   # Full clone flow, mocks filesystem
│   └── list-command.test.ts    # Full list flow, mocks filesystem
└── algorithms/            # Pure function tests (supplemental)
    └── tool-call-remover.test.ts  # No mocks, edge case coverage
```

### Anti-Pattern
```
tests/
├── edit-operation-executor.test.ts  # ❌ Internal module with mocked fs
├── backup-manager.test.ts           # ❌ Internal module with mocked fs
├── tool-call-remover.test.ts        # ✓ Pure algorithm, ok
└── edit-command.test.ts             # ✓ Entry point, ok
```

The anti-pattern tests internal modules in isolation with mocked dependencies. This hides integration bugs between your own components — exactly what service mocks avoid.
```

**Priority:** High — affects any CLI tool built with SDD. The principle is there but agents won't apply it correctly without examples.

---

## Next Steps

1. Build oc-context-cleaner using SDD (tests the skill)
2. Collect friction points and questions from real usage
3. Revisit LiminalDB, refine next steps there
4. Return to SDD improvements with real data
5. Build CLI

Target: oc-context-cleaner + SDD CLI shipped by next weekend.
