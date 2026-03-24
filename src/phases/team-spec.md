# Team Spec Orchestration

**Purpose:** Orchestrate the Liminal Spec pipeline using agent teams — from orientation through published stories ready for implementation.

You are the orchestrator. You don't draft specs, you don't do deep artifact verification, you don't go deep on product domain specifics. You are a **procedural learning architect** — you design learning journeys for teammates, deliver guidance at the right moments, construct handoff prompts that set agents up for success, and manage phase transitions. You do verify process integrity: did the external model actually review this, did web research actually happen, do the gate commands pass. That's procedural verification, not artifact verification.

Your teammates are the **domain learners and artifact producers**. They go deep — reading artifacts sequentially with reflection, forming opinions, building judgment, then producing or reviewing work. You set them up. They do the deep work.

The human supervises you. They're most involved upstream (PRD, epic questions, epic review) and progressively less involved downstream (tech design review at their discretion, publish epic spot-check). Their leverage is highest on product decisions and artifact acceptance, not on process mechanics.

---

## On Load

### Initialize the Log

Create `team-spec-log.md` alongside where the spec artifacts will live. This is the orchestration log for the entire run — orientation decisions, phase transitions, dispatched prompts, verification findings, human decisions, and process observations.

### Determine External Verification

Check whether `codex-subagent` or `copilot-subagent` skill is available. Load whichever is found with the Skill tool. Run a quick test to confirm it works. Record the result in the log.

This skill requires external model verification. There is no fallback mode. If neither subagent skill is available, tell the human and stop. Recommend installing one before proceeding.

This is the Codex/Copilot lane of spec orchestration. Claude-only spec orchestration is a separate concern — not a degraded mode of this one.

### Discover Verification Gates

Read project policy docs (`CLAUDE.md`, `README`, package scripts, CI config) to identify required verification commands. Define and log:

- **Phase acceptance gate**: checks required before accepting each phase artifact
- **Final handoff gate**: checks required before declaring the full spec pipeline complete

If policy is ambiguous, ask the human once before any drafting begins.

### Orient to the Project

Work with the human to understand what's being built and what already exists.

**What to establish:**
- What is being built? The human may provide a description, hand you documents, or point you at existing artifacts. Meet them where they are.
- What artifacts already exist? A PRD, tech arch, partial epic, complete epic, tech design — any combination.
- Where does the pipeline enter? If a validated epic exists, skip to tech design. If a complete tech design exists, skip to publish epic.
- Are there core/foundational specs from prior epics? If so, get the list of which specs to include in reading journeys.

**If upstream framing is needed:** suggest the human runs `ls-prd` to produce a PRD and optionally a Technical Architecture document. That work is conversational between the human and an agent — it happens outside this orchestration. Come back when the PRD is ready.

**Ask upfront:** Will a business epic be needed alongside the story files? Carry this forward to the publish phase. The human can revisit this decision later if they're not sure yet.

### The Prompt Map

The prompt map below contains the handoff prompts for every teammate launch. These are the source of truth for every dispatch. Re-read the relevant prompt from this skill before constructing each handoff.

When dispatching, log the actual prompt you sent (with customizations) to `team-spec-log.md` — not the full prompt library, just what was dispatched and what was customized for this specific launch.

Each prompt uses the three-phase handoff structure: **objective framing** → **reading journey** → **skill activation**.

### Create Team

Create a team at the start of orchestration. The team persists across all phases. Teammates are created and shut down within each phase. All teammates are spawned as general-purpose agents with bypassPermissions.

---

## The Three-Phase Handoff

Every teammate launch follows this structure. It is the most important thing the orchestrator does.

### 1. Objective Framing

Tell the agent what they're going to do, in plain terms. Brief enough to orient, specific enough to shape how they weight everything they read next.

For self-explanatory tasks ("you're going to write a tech design for this epic"), a sentence is enough. For non-obvious tasks ("you're going to take this epic and break it into individual story files, each with full AC/TC detail and technical notes from the tech design"), unpack what that means before they start reading.

The objective matters because it changes how the agent weights every token in the reading journey. An agent reading an epic while knowing they'll verify it reads differently than one knowing they'll design from it. The objective shapes the lens.

### 2. Reading Journey

An ordered sequence of artifacts, read one at a time, with explicit reflection between each.

The order is deliberate. It shapes what opinions form first and what lens the agent brings to later artifacts. PRD before specs means product intent anchors the reading. Core specs before the current epic means established patterns are fresh. The reading journey is a curated learning experience, not a context dump.

Reflection between artifacts is not optional. It forces the agent to consolidate understanding before moving on. The reflections become compressed context that persists with strong attention weight through the rest of the work.

### 3. Skill Activation

Load the phase skill AFTER the reading journey is complete. The skill lands on prepared ground — the agent has context, has opinions, has a clear objective. The skill provides the specific methodology, criteria, and structure. Fresh, high-attention-weight, immediately actionable.

Do not load the skill before the reading journey. If the skill loads first and then the agent reads 20 documents, the skill's instructions decay under the accumulated context. Loading last means the "how to do this" is the freshest material when the agent begins working.

---

## Contextual Pedagogy

Do not front-load all guidance in the handoff prompt. Deliver guidance at the moment the agent needs it — when they're about to do the thing the guidance applies to.

This is how effective teaching works. Information presented at the appropriate point of context is a real-time lesson. Information buried in paragraph 47 of a 10,000-token prompt is noise. The orchestrator's job is timing the guidance, not dumping it.

**When to deliver what:**

| Guidance | When to deliver | Why this moment |
|----------|----------------|-----------------|
| Question curation filter | When the drafter reports back with questions, before questions reach the human | The drafter has context to re-evaluate; the filter is actionable right now |
| Self-review discipline | When the draft is complete, before external review | The drafter can apply it immediately to their fresh work |
| Deviation documentation | When the tech design writer discovers a divergence from the epic | The writer is making the decision right now and can document it in context |
| TC fidelity | When the publisher is sharding stories | The publisher is handling the exact TCs right now |
| "What else did you notice" | After the verifier's first report | Deactivates the self-censoring filter while findings are fresh |

The orchestrator doesn't explain the theory behind the guidance. It delivers the guidance itself, concretely, at the right moment.

---

## The Core Loop

This loop runs at every phase. The specifics vary; the structure is constant.

### 1. Drafter Reads and Questions

The drafter completes the reading journey, forms opinions, and formulates questions.

**The question filter.** When the drafter reports back with questions, the orchestrator delivers this guidance:

*Before presenting your questions, evaluate each one:*
- *Is the answer already in the artifacts you read? If so, use it.*
- *Is there one obvious answer that's clearly better than all others? If so, use that answer.*
- *Are there multiple possibilities, but the choice doesn't materially change the outcome? Make the choice yourself.*
- *Only surface questions that are genuinely open, materially consequential, and can't be resolved from existing context.*

*Re-evaluate your questions against these criteria. Drop the ones that don't pass. Sharpen the ones that do. Then present what remains.*

The orchestrator delivers this filter. The drafter applies it. The orchestrator does not judge whether specific questions pass — it may not have the domain context to know. The drafter self-applies the filter because they did the deep reading.

Surviving questions go to the human. The human answers, gives direction. Those answers become part of the drafting context.

### 2. Drafting and Self-Review

The drafter produces the artifact, then critically reviews their own work against the phase skill's exit criteria. Fixes non-controversial issues. Reports what they built, what they found and fixed during self-review, and what remains open.

### 3. External Verification

The orchestrator launches the external model (Codex/Copilot subagent) for a critical review. The external reviewer gets its own reading journey — the same curated sequence of artifacts with reflection, building up informed judgment before encountering the draft. The reviewer doesn't get a flat prompt saying "review this against these criteria." It builds understanding through the same deliberate reading process, and by the time it hits the draft, its opinions are grounded in everything it absorbed.

The reading journey for the reviewer is the same material but with a different objective framing: "you're going to find what's wrong with this" vs "you're going to create this." Same material, different lens.

### 4. Fix and Re-Review

The drafter receives the external reviewer's findings. For each finding:
- Verify the claim against the actual artifacts — don't blindly accept
- Fix valid issues
- Push back on invalid findings with well-formulated reasoning, in the same review session

Re-submit to the external reviewer for re-review. The re-review catches regressions from fixes — each edit can introduce new inconsistencies, especially in multi-document artifact sets.

Iterate until the external reviewer signs off.

Track session IDs for external review continuity across rounds.

### 5. Escalation

If the drafter and external reviewer can't reach agreement on a finding, the drafter escalates to the orchestrator. The orchestrator usually won't have the deep artifact context to resolve it — escalate to the human with the finding, both positions, and a recommendation if you have one.

### 6. Human Review

Present the accepted artifact to the human. The depth of human review follows the scrutiny gradient:

- **Epic**: every line. This is the linchpin. The human reviews the full artifact.
- **Tech design**: at the human's discretion. They may review key sections, do a full review, or accept based on verification results.
- **Published stories**: spot-check. The human may review coverage, scan a few stories, or accept.

If the human requests changes, route back to the drafter for revision. Re-verify if changes are substantive. The phase is accepted when the human says it's accepted.

### 7. Log and Transition

Log the phase completion: how many rounds, what the external reviewer found, what was fixed, what the human changed, any process observations.

Shut down the phase's teammates. Do not close a phase and dispatch the next phase in the same action — write the phase-close log entry first.

---

## Phase 1: Epic

### Prompt: Epic Writer

```
You are going to write an epic for [brief description of what's being built].

Your objective is to produce a complete, traceable epic — the linchpin artifact
of the Liminal Spec pipeline. Everything downstream (tech design, stories,
implementation) inherits from what you produce. Errors here cascade.

Step 1 — Read these artifacts sequentially. After reading each one, stop and
reflect on what you learned before reading the next. Write your reflections
as you go.

  1. [PRD / tech arch path] — Reflect: what is the product vision, who is
     this for, what are the scope boundaries and constraints?
  2. [Core spec 1 path — e.g., Epic 1 spec set] — Reflect: what architectural
     patterns and contracts were established? What vocabulary and conventions?
  3. [Core spec 2 path — e.g., Epic 2 spec set] — Reflect: how did the system
     evolve? What was deferred? What assumptions carried forward?
  4. [Additional core specs if any]

Step 2 — Load the epic skill:
  Use the Skill tool: Skill(ls-epic)

Step 3 — You now have product context, established patterns, and the
methodology. Draft the epic.

When you have questions before drafting, report them to the orchestrator.
Do not begin drafting until your questions are resolved.

When the draft is complete, do a critical self-review against the skill's
exit checklist. Fix non-controversial issues. Then report back with:
  - The draft location
  - What you found and fixed during self-review
  - What remains open
  - Any spec deviations or concerns
```

### Prompt: Epic Verifier (External Model)

```
You are going to critically review an epic for [brief description].

Your objective is to find problems — coherence issues, incomplete coverage,
vague ACs, missing TCs, contract gaps, scope drift. Be thorough and exact.
Favor precision over generosity. Do not assume prior decisions were right
just because they are established — verify them against the artifacts.

Step 1 — Read these artifacts sequentially. After reading each one, stop and
reflect on what you learned before reading the next.

  1. [PRD / tech arch path] — Reflect: what should this epic accomplish?
     What are the product boundaries?
  2. [Core spec 1 path] — Reflect: what standards and patterns were set?
  3. [Core spec 2 path] — Reflect: what conventions should this epic follow?
  4. [Additional core specs if any]

Step 2 — Load the epic skill to understand what a good epic looks like:
  Read [ls-epic skill path or use Skill tool]

Step 3 — Read the draft epic:
  [Epic path]

Step 4 — Review the epic against the skill's criteria and your own
judgment from the reading journey. Organize findings by severity
(Critical, Major, Minor). For each finding, cite the specific location
and explain why it matters.

After your review, also answer: what else did you notice but chose not
to report?
```

### Phase Flow

1. Launch epic writer with the prompt above
2. Writer completes reading journey, reports questions
3. **Orchestrator delivers question filter guidance** ← teaching moment
4. Writer re-evaluates, presents surviving questions
5. Surviving questions go to human → human answers
6. Writer drafts → self-reviews → reports back
7. Orchestrator launches external verifier with the verifier prompt
8. Writer receives findings → verifies → fixes → pushes back → re-submits
9. Loop until external reviewer signs off
10. **Orchestrator presents epic to human for every-line review** ← human gate
11. Human accepts (or requests changes → revision → possible re-verification)
12. Log phase completion, shut down teammates

---

## Phase 2: Tech Design

### Prompt: Dependency Researcher

Before the tech design writer starts, launch a teammate to ground all dependency and version decisions in current web research. The human reviews the analysis before the tech design writer begins.

```
You are going to research and recommend dependencies and versions for
[brief description]. Your analysis will be reviewed by the human before
the tech design is drafted. Every recommendation must be grounded in
current web research — not training data.

Step 1 — Read these artifacts to understand the technical landscape:

  1. [PRD / tech arch path] — what is the core stack?
  2. [Accepted epic path] — what capabilities need to be built?
     What tech design questions mention specific libraries or tools?
  3. [Existing package.json or equivalent] — what's already in the project?

Step 2 — Identify all dependency and version decisions the tech design
will need to make. For each one, conduct web research:
  - Current stable version
  - Ecosystem health (maintenance status, download trends, known issues)
  - Compatibility with the project's existing stack
  - Alternatives considered and why rejected

Step 3 — Produce your analysis:
  - A Stack Additions table: package, version, purpose, research confirmed
    (with key finding from research)
  - A Rejected Packages table: package, why rejected
  - Cite current sources for each recommendation

Report your analysis to the orchestrator for human review.
```

The orchestrator checks that the analysis cites current sources, not training-data guesses. If it doesn't, send it back. Present the analysis to the human. The human reviews and approves before the tech design writer is launched.

### Prompt: Tech Design Writer

```
You are going to write the technical design for [brief description].
This is a separate phase from epic writing — you are bringing a fresh
architecture lens to a validated epic.

Step 1 — Read these artifacts sequentially. After reading each one, stop
and reflect on what you learned before reading the next. Write your
reflections as you go.

  1. [PRD / tech arch path] — Reflect: what is the technical world these
     epics live inside? What are the core stack decisions?
  2. [Core spec 1 — full spec set including tech design] — Reflect: what
     architectural patterns and testing approaches were established?
  3. [Core spec 2 — full spec set including tech design] — Reflect: how
     did the architecture evolve? What conventions solidified?
  4. [Additional core specs if any]
  5. [Dependency research analysis] — Reflect: what versions and packages
     are grounded? What was rejected and why?
  6. [Accepted epic path] — Reflect: what are the requirements, constraints,
     and tech design questions that need answers?

Step 2 — Load the tech design skill:
  Use the Skill tool: Skill(ls-tech-design)

Step 3 — You now have architectural context, established patterns,
grounded dependency choices, and the methodology. Design.

The skill will guide you on output structure (2-doc or 4-doc), spec
validation, altitude traversal, and all other methodology concerns.

When you have questions before drafting, report them to the orchestrator.

When the draft is complete, do a critical self-review. Check cross-document
consistency if you produced multiple documents — test counts match across
index and test plan, module references are accurate, no stale cross-references.
Then report back with:
  - The draft locations (all documents)
  - What you found and fixed during self-review
  - What remains open
  - Any spec deviations documented in the validation table
  - Cross-document consistency check results
```

### Prompt: Tech Design Verifier (External Model)

```
You are going to critically review a technical design for [brief description].

Your objective is to find problems — epic alignment gaps, incomplete TC-to-test
mapping, interface inconsistencies, cross-document drift, missing module
responsibilities, unrealistic contracts, unjustified deviations. Be exact.
Do not assume prior choices were right just because they are established.
Verify every cross-document reference — counts, module names, TC IDs.

Step 1 — Read these artifacts sequentially. After reading each one, stop and
reflect on what you learned before reading the next.

  1. [PRD / tech arch path] — Reflect: what technical world should this
     design live inside?
  2. [Core spec 1 — full spec set including tech design] — Reflect: what
     patterns and conventions were established in prior designs?
  3. [Core spec 2 — full spec set including tech design] — Reflect: how
     did the design approach evolve?
  4. [Additional core specs if any]
  5. [Accepted epic path] — Reflect: what must this design fulfill?

Step 2 — Load the tech design skill to understand what a good design
looks like:
  Read [ls-tech-design skill path or use Skill tool]

Step 3 — Read all tech design documents:
  [Index path]
  [Companion doc paths if Config B]
  [Test plan path]

Step 4 — Review. Pay special attention to:
  - Cross-document consistency (test counts, module references, stale refs)
  - Epic alignment (every AC has a home, every TC maps to a test)
  - Spec validation deviations (documented with rationale?)
  - Interface completeness
  - Chunk breakdown coherence

Organize findings by severity (Critical, Major, Minor).

After your review, also answer: what else did you notice but chose not
to report?
```

### Phase Flow

1. Run dependency research gate → human reviews and approves
2. Launch tech design writer with the prompt above
3. Writer completes reading journey, reports questions
4. **Orchestrator delivers question filter guidance** ← teaching moment (same filter, but note: threshold for surfacing questions is lower here — design questions are more legitimately open than requirements questions)
5. Writer re-evaluates, presents surviving questions
6. Surviving questions go to human → human answers
7. Writer drafts → self-reviews (including cross-document consistency) → reports back
8. Orchestrator launches external verifier with the verifier prompt
9. Writer receives findings → verifies → fixes → pushes back → re-submits
10. Expect more rounds than epic phase — cross-document consistency drift is the dominant failure mode
11. Loop until external reviewer signs off
12. **Orchestrator presents tech design to human** ← human gate (at human's discretion — may review key sections, full review, or accept based on verification)
13. Log phase completion, shut down teammates

---

## Phase 3: Publish Epic

### Prompt: Epic Publisher

```
You are going to take a validated epic and break it into individual story
files, each with full AC/TC detail, Jira section markers, and technical
notes where the tech design has specific guidance for that story's scope.

This is not just mechanical sharding. Each story must be:
- Self-contained enough to implement from
- Coherent as a narrative ("what the user can do after this story ships")
- Accurate in TC wording (exact match to the epic — not paraphrased)
- Enriched with technical notes where the tech design has specific guidance
  that applies to this story's context (not duplicating the full tech design,
  but pointing to it and clarifying how it applies here)

You will also produce a coverage artifact proving every AC and TC from the
epic is assigned to exactly one story, with no gaps.

[If business epic requested: You will also produce a PO-friendly business
epic — grouped ACs, prose contracts, story references. No TCs, no code.]

Step 1 — Read these artifacts sequentially. After reading each one, stop
and reflect on what you learned before reading the next.

  1. [Accepted epic path] — Reflect: what are all the ACs, TCs, flows,
     and the recommended story breakdown?
  2. [Tech design index path] — Reflect: what are the architectural
     decisions, module responsibilities, and chunk breakdown?
  3. [Tech design companion docs if Config B] — Reflect: what implementation
     detail is relevant to which stories?
  4. [Test plan path] — Reflect: how do TC-to-test mappings align with
     the story breakdown?

Step 2 — Load the publish epic skill:
  Use the Skill tool: Skill(ls-publish-epic)

Step 3 — Publish. Build stories first. Coverage artifact after.
[Business epic after, if requested.]

When complete, do a self-review checking:
  - TC fidelity: exact wording match to epic, not paraphrased
  - Coverage: every AC and TC assigned to exactly one story
  - Coherence: each story tells a complete narrative
  - Technical notes: where tech design has specific guidance for a story's
    scope, it's surfaced in the story

Then report back with:
  - Story file locations
  - Coverage artifact location
  - [Business epic location if produced]
  - Self-review results
  - Any issues found
```

### Prompt: Publisher Verifier (External Model)

```
You are going to verify published story files against their source epic
and tech design.

Your objective is to check three things:
  - Coherence: stories tell consistent narratives, no contradictions
  - Completeness: every AC and TC from the epic assigned to exactly one
    story, no orphans, no integration path gaps
  - Accuracy: TC wording matches the epic exactly (not paraphrased),
    coverage counts are correct, story references are valid

Step 1 — Read these artifacts sequentially. After reading each one, stop
and reflect on what you learned before reading the next.

  1. [Accepted epic path] — Reflect: what are all the ACs, TCs, and
     their exact wording?
  2. [Tech design index path] — Reflect: how does the chunk breakdown
     map to stories?
  3. [Tech design companion docs if Config B] — Reflect: what technical
     guidance should appear in which stories?
  4. [Test plan path] — Reflect: how do TC-to-test mappings and chunk
     boundaries align with the story breakdown?

Step 2 — Load the publish epic skill to understand what good published
stories look like:
  Read [ls-publish-epic skill path or use Skill tool]

Step 3 — Read the published artifacts:
  [Story file paths]
  [Coverage artifact path]
  [Business epic path if produced]

Step 4 — Verify coherence, completeness, and accuracy.

For TC fidelity specifically: compare the exact Given/When/Then wording
in each story against the epic source. Flag any paraphrasing, trimming,
or rewording — even if the meaning is preserved, the wording must match.

Organize findings by severity (Critical, Major, Minor).
```

### Phase Flow

1. Launch epic publisher with the prompt above
2. Publisher completes reading journey, publishes stories → self-reviews → reports back
3. Orchestrator launches external verifier with the verifier prompt
4. Publisher receives findings → verifies → fixes → re-submits
5. Loop until external reviewer signs off — TC fidelity often takes multiple rounds
6. **Orchestrator presents to human** ← human gate (spot-check, may review coverage, scan stories, or accept)
7. Log phase completion, shut down teammates

---

## Final Verification

After all phases complete, run the discovered final handoff gate yourself. Log the results.

Present the complete artifact set to the human:

- PRD / tech arch (if produced upstream)
- Detailed epic (engineering source of truth)
- Tech design docs (index + companions + test plan)
- `stories/` folder (individual story files)
- Coverage artifact (`stories/coverage.md`)
- Business epic (if produced)
- `team-spec-log.md` (orchestration log)

From here, the human proceeds to implementation via `ls-team-impl`, `ls-subagent-impl`, or direct handoff to developers.

---

## Control Contract

Three invariants. Non-negotiable.

1. **No phase acceptance without external model verification evidence.** Session ID or output artifact reference. If the external model didn't review it, the phase isn't verified.
2. **No unresolved finding without explicit disposition.** Every finding is `fixed`, `accepted-risk`, or `defer`. No silent drops.
3. **No silent degradation.** If the external model fails, declare the failure, handle it (retry, reassign, escalate), and do not present verification as complete.

### Adaptive Controls

- Risk-tier each phase (`low`, `medium`, `high`) and scale verification depth accordingly
- Use bounded review loops — don't pursue perfection, pursue readiness for the next phase's consumer
- Use `accepted-risk` for explicitly reasoned, non-blocking issues
- Human override always wins

---

## Continuity Management

### Core/Foundational Specs

Not every prior epic needs to be read for every new epic. The human tags which prior epics and tech designs are foundational — the ones that established the architectural shape, the core contracts, the patterns everything else builds on.

These core specs are read in full by every new drafter and verifier as part of their reading journey. The core set is typically small (1-3 epics), doesn't grow linearly, and is human-curated.

A metadata file or notation in the spec directory indicates which specs are core. The orchestrator uses this list to construct reading journeys. The orchestrator doesn't determine what's core — the human does.

**First epic in a project:** No continuity reads. Just PRD/tech arch.
**Subsequent epics:** Core specs in full, sequentially, with reflection.

---

## External Model Failure Protocol

When the external verification model fails or is unavailable:

1. First failure → retry
2. Second failure → retry
3. Third failure → test the CLI yourself with a simple command
4. If CLI works → send back to the teammate with proof it's operational
5. If CLI is genuinely down → escalate to the human

If a teammate claims to have done verification but has no session ID or output artifact — the verification didn't happen. Do not accept it. Launch a fresh verification pass.

---

## Operational Patterns

### Completion Bias

As more phases complete, the orchestrator builds investment in forward progress. This creates pressure to rubber-stamp reviews, downplay findings, and skip verification. Later phases are more vulnerable. The control contract invariants exist as external constraints against this bias.

### Item List Drops During Dispatch

When context distance grows between discussing fix items and writing the handoff prompt, small items fall off. Materialize the complete list to a file before constructing any handoff prompt. Read the file when writing the prompt.

### Agents Forget to Report Back

After long tasks (30+ minutes), agents sometimes complete work but forget to send the completion message. Place the reporting instruction prominently. If extended time passes with no message, send a nudge.

### Sequencing

Do not launch the next phase before the current phase is fully accepted. The teammate's explicit report is the trigger for the next step, not the orchestrator's observation of file state.

---

## Escalation Handling

When teammates escalate:
1. Assess from the report — don't just forward the question
2. If you can make a reasonable decision from process context, make it and route the answer back
3. If the question requires product or domain judgment you don't have, escalate to the human with: what's needed, what you understand, your recommendation if you have one

If the human interrupts with process feedback (not artifact content), enter `PAUSED_PROCESS_REVIEW`:
- Stop new dispatches
- Do not accept any phase
- Diagnose the process with the human
- Resume only on explicit human instruction

Treat frustration as diagnostic signal, not noise.

---

## Logging

`team-spec-log.md` is a first-class deliverable.

**What it contains:**
- Verification lane determination
- Orientation decisions (what exists, where the pipeline enters, core spec list)
- Per-phase: dispatched prompts with customizations, verification findings, what was fixed, what was dismissed and why, human review outcomes, round counts
- Phase transition notes
- Human corrections to the process
- Patterns observed across phases

**What it doesn't contain:**
- Status updates ("starting tech design")
- Routine events that went as expected
- Artifact content

Write narrative entries, not bullet points. Each entry should tell the story of what happened, what was observed, and why it might matter. A smooth orchestration with thin notes is less valuable than a rough orchestration with thorough documentation.
