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

**Location:** SKILL.md (keep orchestration guidance centralized; avoid a separate playbook doc)

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

### 5. CLI (`liminal-spec`)
**Gap:** Installation is manual file copying. No structured onboarding or utilities.
**Deliverable:** npm package with:
```bash
npm install -g liminal-spec
liminal-spec init        # Deploy skill files to .claude/skills/liminal-spec/
liminal-spec quickstart  # Interactive: Tutorial / Test Drive / Jump In / Reference
liminal-spec tutorial    # Conceptual walkthrough
liminal-spec status      # Where am I in the pipeline?
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

## Feedback from Story Sharding Phase (2026-02-01)

Collected during Phase 4 (Scrum Master / Story Sharding) of oc-context-cleaner. These are observations from the first real project built with the skill.

### Validation Process Documentation

**Gap:** The methodology mentions prompt validation (Scrum Master drafts prompts, Senior Engineer previews, different model reviews), but the actual orchestration pattern isn't documented. During oc-context-cleaner, validation happened in parallel via a separate agent—but the skill doesn't describe this.

**Recommendation:** Add explicit documentation of the parallel validation pattern:
- When validation happens (concurrent with drafting, not sequential)
- Mechanism (separate agent with fresh context)
- What's validated (cross-prompt consistency, story-level coherence, spec alignment)
- How feedback flows back to Orchestrator

**Location:** `references/scrum-master.md` or new `references/prompt-validation.md`

### Story Zero / Infrastructure Story Pattern

**Gap:** Every SDD project starts with a "Story 0" for types, fixtures, error classes. This is implicit but not called out as a named pattern with guidance.

**Recommendation:** Formalize "Story Zero" or "Infrastructure Story" as a standard concept:
- What it contains (types, error classes, test fixtures, project config)
- Why it's always first (establishes contracts for all subsequent stories)
- Template or checklist for common Story 0 deliverables
- No tests in Story 0 (types only)

**Location:** `references/scrum-master.md` or `references/story-prompts.md`

### Technical Stand-Up Stories / Feature 0

**Gap:** No guidance for projects that need significant architectural scaffolding before any product functionality. Example: a project with Convex backend, Fastify app server, REST endpoints, frontend, MCP endpoints, and MCP widgets. The integration risk dominates—getting all pieces connected matters more than iterating features.

**Experience:** Recent project required "hello world with full auth and all layers connected" before building actual features. This was pair-programmed because no SDD pattern existed.

**Recommendation:** Add "Feature 0" or "Technical Stand-Up" pattern:
- When to use: greenfield projects with multiple integration points, new stacks, auth flows
- What it delivers: overbuilt scaffold with all structural pieces and NFRs, zero product functionality
- Why: adapts architecture before features lock it in, reduces rework
- Relationship to Story 0: Feature 0 may span multiple stories, Story 0 is one story within a feature

**Note:** This is a significant addition. May require restructuring or a separate reference file.

**Location:** New `references/feature-zero.md` or section in `references/scrum-master.md`

### NFR Handling

**Gap:** The methodology focuses on functional requirements (User Flows → ACs → TCs). Non-functional requirements (performance, security, observability, error handling patterns) aren't addressed.

**Recommendation:** Add NFR guidance:
- Where NFRs live in artifacts (separate section in Feature Spec? Tech Design?)
- How NFRs trace to implementation (not through TCs—different mechanism)
- Common NFR categories for agentic/CLI tools

**Location:** `references/business-analyst.md` and/or `templates/feature-spec.template.md`

### CLI Enhancements

Several items relate to CLI tooling. Add to CLI roadmap (item #5 in Prioritized Improvements):

**Test Count Tracking:**
- Automated counting of tests per story
- Running total calculation
- Validation that TC count matches test count

**Structured Story Manifest:**
- `stories.yaml` or similar that lists stories, test counts, dependencies
- Auto-generates README tables
- Enables validation (all TCs covered, no orphan tests)

**Verification Prompt Generator:**
- Given `story.md`, generate `prompt-N.R-verify.md`
- Structure is predictable: test results table, typecheck, specific checks, pass criteria
- Reduces boilerplate, ensures consistency

**Prompt Template File:**
- Skeleton prompt structure for Scrum Master to fill in
- Ensures consistent format across stories
- `templates/prompt.template.md`

### Prompt Improvements

**Blocked Handling:**
- Prompts don't specify what the Engineer should do if blocked
- Add standard line: "If blocked, document the blocker and return to Orchestrator before proceeding"

**Escalation Protocol:**
- Related to blocked handling
- When to escalate vs. when to work around
- Include in every execution prompt

**Location:** Add to `references/story-prompts.md` as standard prompt section

---

## Additions from Story Execution Phase (2026-02-01)

### Added: `references/execution-orchestration.md`

**What it covers:**
- Dual-validator pattern (Senior Engineer + GPT-5.2 Codex in parallel)
- Validation → Fix → Execute → Verify pipeline
- Parallel story processing (validate N+1 while executing N)
- Session management (when to resume vs fresh)
- Human decision points where automation breaks down
- Agent selection guide (which agent/model/sandbox for each task)
- Anti-patterns and checklist

**Why it was needed:**
The skill documented WHAT to do in Phase 5 (Skeleton → Red → Green → Gorilla → Verify) but not HOW to coordinate agents through it. During oc-context-cleaner execution, a repeatable orchestration pattern emerged that wasn't captured anywhere.

**Integration:**
- Referenced from SKILL.md Phase 5 section
- Added to Progressive Disclosure Phase 5 load list
- Added to Full Reference List under Process & Patterns

### Recommendations for Refining execution-orchestration.md

**Immediate fixes (before next execution cycle):**

1. **Rename internal phases to avoid collision**
   - Document uses "Phase 1: Story Validation" etc.
   - SDD already uses "Phase 1-5" for macro phases
   - Change to "Step 1" or "Stage 1" or remove numbering

2. **Add session resume syntax**
   - Codex CLI: `codex exec resume <session-id> "prompt"`
   - Claude Code Task tool: `resume` parameter with agent ID
   - Currently says "resume same session" without explaining how

3. **Add orchestrator context management note**
   - Orchestrator has limited context budget
   - When to launch subagents vs work directly
   - When to clone/compress context
   - This constraint affects the whole pipeline

**Short-term improvements:**

4. **Add worked example**
   - Concrete example from today: "Story 3 validation found X, fixed Y, meanwhile Story 2 executing"
   - Show actual validator output, fix decisions, re-validation
   - Anonymized but realistic

5. **Document backfill strategy**
   - When prompts evolve beyond tech-design, update tech-design
   - Keep artifacts in sync
   - Mentioned in conversation but not documented

6. **Expand Gorilla testing guidance**
   - Currently just "human does ad-hoc testing"
   - Add: "exercise happy path, try invalid inputs, try TC edge cases"
   - Different for CLI vs web app vs API

7. **Add cost/benefit analysis for dual-validation**
   - Two validators per story is expensive (tokens, time, attention)
   - When to use both vs skip one
   - Probably: always for complex stories, maybe skip for trivial Story 0

**Deeper improvements (after more usage):**

8. **Explain WHY dual-validator works**
   - SE has builder empathy (understands shortcuts, pragmatic tradeoffs)
   - GPT-5.2 reads specs literally without context of intent
   - Complementarity is the insight, not just "two > one"

9. **Add failure mode recovery**
   - What if validator is wrong and you implement wrong fix?
   - What if fix cycle exceeds 3 iterations?
   - What if Story N-1 fails verification after Story N is executing?

10. **Abstract away Codex CLI specifics**
    - Currently hardcodes `codex exec -m gpt-5.2-codex -c model_reasoning_effort=high`
    - Will be wrong when tooling changes
    - Separate "pedantic verifier with high reasoning" from access method

11. **Add metrics/signals section**
    - How do you know the process is working?
    - Validation catching issues that would have blocked execution
    - Verification catching issues that would have shipped bugs
    - Currently no way to improve systematically

### Self-Assessment of execution-orchestration.md

**Strengths:**
- Captures actual workflow from practice, not theory
- Clear structure with actionable guidance (validator template, agent table, checklist)
- Human Decision Points section explicitly names where automation breaks down
- Anti-Patterns section names what NOT to do

**Weaknesses:**
- Missing the "why" for dual-validator (complementary cognitive models)
- Too tied to current Codex CLI syntax
- Phase numbering collision with SDD macro phases
- No worked example
- Gorilla testing under-specified
- Assumes orchestrator has unlimited context

**Overall:**
Good enough to use, not good enough to hand off without explanation. Captures WHAT we do but not enough of WHY or WHEN TO DEVIATE. Needs iteration after more execution cycles.

---

## Next Steps

1. Build oc-context-cleaner using SDD (tests the skill)
2. Collect friction points and questions from real usage
3. Revisit LiminalDB, refine next steps there
4. Return to SDD improvements with real data
5. Build CLI

Target: oc-context-cleaner + SDD CLI shipped by next weekend.
