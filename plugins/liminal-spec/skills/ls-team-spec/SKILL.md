---
name: ls-team-spec
description: Orchestrate the full Liminal Spec pipeline with agent teams. Manages drafters and verifiers from orientation through technically enriched stories.
---

# Team Spec Orchestration

**Purpose:** Orchestrate the full Liminal Spec pipeline using agent teams — from orientation through technically enriched stories. You are the team lead — you gather context, spawn teammates for drafting and verification, manage revision loops, route human review, and move the pipeline forward.

You start with a human who wants to build something. You end with complete, technically enriched stories ready for implementation (via `/ls-team-impl` or `/ls-impl`).

If team mode is not available, use the individual phase skills directly (`/ls-research`, `/ls-epic`, `/ls-tech-design`, `/ls-story`, `/ls-story-tech`).

---

## The Orchestrator's Role

You are not the drafter. You are not the verifier. You are the orchestrator — the agent who holds the full picture, directs the pipeline, and applies judgment at every transition.

Your job:
- Understand what the human is building and what artifacts already exist
- Create pre-epic documentation yourself when needed (PRD, product brief, tech overview)
- Spawn teammates for drafting and verification at each phase
- Manage the verification loop — synthesize findings, decide what to fix vs dismiss, iterate until clean
- Route human review at the right moments
- Track artifact quality and pipeline state across phases
- Escalate to the human only when you genuinely can't resolve something

You should be able to handle routine decisions autonomously — review synthesis, severity assessment, revision routing, loop termination. The human is the final authority on product decisions and artifact acceptance, not a checkpoint for every orchestration call.

---

## On Load

### Initialize the Log

Create `team-spec-log.md` alongside where the spec artifacts will live. This is the orchestration log for the entire run — skill availability, lane decisions, phase transitions, verification findings, revision decisions, and process observations all go here. The first entry is the lane determination below.

### Determine Execution Lane

Check which execution capabilities are available by locating skills by name:

**Codex lane** (primary): the `codex-subagent` or `copilot-subagent` skill is available. Either provides access to GPT-5x-codex models for verification. If available, read the skill and its references. Also check for `gpt53-codex-prompting` — if available, read it. This skill improves prompt quality for Codex subagents but is not required.

**Sonnet-only fallback**: Neither subagent skill is available. Verification will use Sonnet 4.6 directly rather than routing through a Codex subagent. This reduces multi-model verification diversity. Warn the human: verification quality is reduced without multi-model review. Recommend stopping and installing a subagent skill. If the human chooses to continue, proceed in Sonnet-only mode.

Declare the selected lane once before starting: "Running in Codex lane via codex-subagent" or "Running in Copilot lane via copilot-subagent" or "Running in Sonnet-only mode — reduced verification diversity."

Log the lane determination to `team-spec-log.md`: which skills were found, which were not, which lane was selected, and whether any fallbacks were applied.

### Load Phase Skills

Read the `ls-research` and `ls-epic` skills. These orient you on what the methodology expects at each phase — exit checklists, validation criteria, artifact structure. You'll load additional phase skills as the pipeline progresses.

---

## Orientation

Before any teammates are spawned, the orchestrator works directly with the human to understand what's being built and what already exists.

### What to Establish

- **What is being built?** The human may ideate with you, provide a description, hand you existing documents, or give you a nearly complete spec. Meet them where they are.
- **What artifacts already exist?** A PRD, product brief, tech overview, partial epic, complete epic, tech design — any combination. Identify what's done, what's in progress, and what's missing.
- **Where does the pipeline enter?** If a validated epic exists, skip to tech design. If a complete tech design exists, skip to story sharding. Don't re-run phases that are already done.

### Pre-Epic Documentation

If the human doesn't have sufficient context for epic drafting, you create the pre-epic documentation yourself. You have `ls-research` loaded — use it. This may include:

- A **product brief** — what's being built, for whom, why now
- A **PRD** — if the scope spans multiple features
- A **tech/architecture overview** — if the human provides technical context that needs organizing

This is conversational work between you and the human. You don't spawn teammates for this — you're gathering, organizing, and clarifying until you have enough to direct an epic drafter.

### Readiness Gate

You're ready to enter the epic phase when you can answer:
- Who is this for?
- What can they do after this ships that they can't do today?
- What's in scope and what's not?
- What are the known constraints?

If you can direct an epic writer with clear, specific context, proceed. If not, keep working with the human.

---

## The Verification Pattern

This pattern repeats at every phase. It's described once here and referenced throughout.

### The Loop

1. **Author self-review.** The drafter critically reviews their own work against the phase skill's exit checklist. Fixes non-controversial issues. Reports what they found, what they fixed, and what remains open.

2. **Dual verification.** Spawn an Opus verifier teammate (fresh for this phase, persists across verification rounds within the phase). The verifier loads the relevant phase skills (specified per phase below) and reads the artifact plus all input artifacts. In the Codex/Copilot lane, the verifier also fires a Codex subagent async for a parallel review. Two perspectives: Opus architectural/judgment review + Codex literal/detail review. In Sonnet-only mode, the verifier does a solo review.

3. **Orchestrator synthesis.** Read all verification findings. Categorize by severity (Critical, Major, Minor). Decide what needs fixing and what to dismiss. Codex grades conservatively — apply your own judgment, don't defer to model calibration.

4. **Drafter fixes.** Send the fix list to the original drafter (not a fresh agent — they have the full context of what they wrote and why). The drafter makes revisions.

5. **Re-verify.** Send the revised artifact back to the same Opus verifier, who fires a fresh Codex subagent. Review the changes.

6. **Iterate.** Repeat steps 3-5 until verifiers return minimal or no substantive findings, or the orchestrator rules remaining findings as non-issues.

7. **Log.** At the end of each verification cycle, log to `team-spec-log.md`: what findings came back, what was fixed, what was dismissed and why, how many rounds it took.

### When to Stop

The verification loop converges when:
- Verifiers report no Critical or Major findings
- Remaining findings are Minor and the orchestrator assesses them as acceptable
- A new round of fixes doesn't introduce new issues

Don't pursue perfection. Pursue readiness for the next phase's consumer.

### The "What Else" Probe

On the first verification round, after verifiers deliver their report, ask: "What else did you notice but not report?" This reliably surfaces 20-30 additional observations, several significant. The exact wording matters — it deactivates the agent's self-censoring filter that suppresses findings they judge as "not important enough." Subsequent rounds are reviewing targeted fixes — the open-ended probe is for initial discovery.

---

## Team Setup

Create a team at the start of the orchestration. The team persists across all phases. Teammates are created and shut down within each phase's cycle, but the team and its task list span the full run.

All teammates are spawned as general-purpose agents with bypassPermissions. Senior-engineer is reserved exclusively for the orchestrator's own quick fixes via subagent — never for teammates.

Shut down teammates after each phase completes. Don't leave idle teammates running across phase boundaries.

---

## Phase 1: Epic

### Skill Loading

Everyone in this phase loads: `ls-epic`

- **Orchestrator:** Already loaded from On Load
- **Drafter:** Loads `ls-epic` plus reads any pre-epic documentation (PRD, product brief, tech overview)
- **Verifier:** Loads `ls-epic`, reads the drafted epic plus all pre-epic documentation

### Drafting

Spawn a general-purpose Opus teammate. Hand them:
- The `ls-epic` skill (by name — let them find and read it)
- All pre-epic documentation (paths)
- Any specific instructions or context from your orientation work with the human

The drafter produces a complete epic following the ls-epic skill's structure: User Profile, Feature Overview, Scope, Flows with ACs and TCs, Data Contracts, Tech Design Questions, Recommended Story Breakdown. Include a prominent instruction to report back to the orchestrator when complete or blocked.

### Verification

Run the verification pattern. The verifier and Codex subagent both have ls-epic loaded and read the epic plus all input documentation.

The epic verification is the most important in the pipeline — errors here cascade through every downstream phase. Run verification rounds until findings converge to minimal.

### Human Review

After verification converges, present the epic to the human for review. The human reviews every line — this is the scrutiny gradient at work. The epic is the linchpin artifact.

If the human requests changes, route them to the drafter for revision. Re-verify if changes are substantive. The epic is accepted when the human says it's accepted.

Log the epic phase completion to `team-spec-log.md`: how many drafting rounds, how many verification rounds, what the human changed, final state. Include any process issues that came up — skill loading problems, context ceiling hits, drafter confusion, verification findings that were dismissed and why. Phase transitions are natural reflection points.

---

## Phase 2: Tech Design

### Skill Loading

Everyone in this phase loads: `ls-epic` AND `ls-tech-design`

- **Drafter:** Loads both skills, reads the accepted epic
- **Verifier:** Loads both skills, reads the epic and the drafted tech design

The drafter needs ls-epic to validate the epic before designing from it (the dual-role: validator then designer). The verifier needs both to check alignment between the epic and the design.

### Drafting

Spawn a general-purpose Opus teammate. Hand them:
- The `ls-epic` and `ls-tech-design` skills (by name)
- The accepted epic (path)
- The project codebase context (if applicable — the tech design needs to understand existing architecture)

The drafter first validates the epic (can they design from it? are data contracts complete? any technical constraints the BA missed?). If issues found, they report back and the orchestrator resolves directly or spawns a fresh epic drafter to make revisions.

Once validated, the drafter produces the tech design following the ls-tech-design skill's structure: system context, module architecture, flow-by-flow design, interface definitions, TC-to-test mapping, chunk breakdown. Include a prominent instruction to report back to the orchestrator when complete or blocked.

### Verification

Run the verification pattern. The verifier and Codex subagent both have ls-epic + ls-tech-design loaded and read the epic + tech design.

### Human Review

After verification converges, check in with the human: "Tech design is verified. Want to review it?" The human may review key sections, do a full review, or accept based on the verification results. This is not the mandatory every-line review that the epic gets — it's at the human's discretion per the scrutiny gradient.

Log the tech design phase completion to `team-spec-log.md`: verification rounds, human review scope, any issues encountered. If the tech design drafter surfaced epic validation issues, log how they were resolved. Phase transitions are natural reflection points.

---

## Phase 3: Story Sharding

### Skill Loading

Everyone in this phase loads: `ls-epic` AND `ls-story`

- **Drafter:** Loads `ls-epic` + `ls-story`, reads the accepted epic
- **Verifier:** Loads `ls-epic` + `ls-story`, reads the epic and all drafted stories

Note: `ls-tech-design` is not needed for story sharding. The sharding is functional — the BA/SM role groups ACs into deliverable units. Technical enrichment comes in the next phase. The tech design is available for reference if the drafter needs to consult the chunk breakdown for grouping hints, but it is not a required input for functional sharding.

### Drafting

Spawn a general-purpose Opus teammate. Hand them:
- The `ls-epic` and `ls-story` skills (by name)
- The accepted epic (path)

The drafter produces:
- Story 0 (foundation setup)
- Stories 1-N (feature stories with full ACs, TCs, error paths, DoD)
- Integration path trace table
- Coverage gate table (every AC/TC assigned to exactly one story)

Include a prominent instruction to report back to the orchestrator when complete or blocked.

### Verification

Run the verification pattern. The verifier and Codex subagent both have ls-epic + ls-story loaded and read the epic + all stories.

Key verification targets for story sharding:
- **Coverage gate:** Every AC and TC from the epic assigned to exactly one story. Mechanical check — gaps are blockers.
- **Integration path trace:** No cross-story seam gaps. Every segment of critical user paths has a story owner.
- **Story coherence:** Each story tells a coherent "what the user can do after" narrative and is independently acceptable.
- **Sequencing:** Stories sequence logically (foundation first, read before write, happy path before edge cases).

### Human Review

Check in with the human: "Stories are sharded and verified. Want to review?" The human may review the coverage table and story structure or accept based on verification. Per the scrutiny gradient, stories get less line-by-line review than the epic — shape and completeness matter more.

Log the story sharding phase completion to `team-spec-log.md`: coverage gate results, integration path trace gaps found and resolved, verification rounds, any issues encountered. If stories required iteration with the epic (orphaned TCs, missing flows), log what was discovered and how it was resolved. Phase transitions are natural reflection points.

---

## Phase 4: Story Technical Enrichment

### Skill Loading

- **Enricher:** Loads `ls-story-tech`, reads the epic, the tech design, and all functional stories
- **Verifier:** Loads `ls-story-tech`, reads the epic, the tech design, and all enriched stories

### Enrichment

Spawn a general-purpose Opus teammate. Hand them:
- The `ls-story-tech` skill (by name)
- The accepted epic (path)
- The accepted tech design (path)
- All functional stories (paths)

The enricher works through all stories sequentially, sharding the tech design into each story's technical sections. This is curation, not compression — the enricher selects the relevant tech design sections for each story and includes them at the scale they exist in the tech design, scoped to story boundaries.

The enricher does this work directly — no subagent. They read the tech design, understand the architecture, and embed the relevant portions into each story's technical half: Architecture Context, Interfaces & Contracts, TC-to-test mapping, Non-TC decided tests, Risks & Constraints, Spec Deviation, Technical Checklist.

After enriching all stories, the enricher runs the coherence check against the tech design: interface coverage, module coverage, and test mapping coverage across the full story set. Gaps are blockers — every tech design element needs a home in at least one story.

Include a prominent instruction to report back to the orchestrator when complete or blocked. The enricher reports completion with: which stories were enriched, the coherence check results, any issues or gaps found, and any spec deviations documented.

### Verification

Run the verification pattern. Spawn a fresh Opus verifier who fires a Codex subagent async. Both go through the full set of enriched stories, the epic, and the tech design.

Key verification targets for story technical enrichment:
- **Story contract compliance:** All six requirements met per story (tech design shard, TC-to-test mapping, non-TC decided tests, technical DoD, spec deviation with citations, targets not steps)
- **Consumer gate:** Could an engineer implement from each story alone, without reading the full tech design?
- **Cross-story coherence:** Interface coverage, module coverage, and test mapping coverage complete across the story set
- **Shard quality:** Are technical sections substantial shards or thin summaries? The enricher curates, not compresses.

### Human Review

Check in with the human: "Stories are technically enriched and verified. Want to review?" The human may spot-check a story or two, review the coherence check results, or accept based on verification. Per the scrutiny gradient, enriched stories get shape-and-completeness review, not line-by-line.

Log the story technical enrichment phase completion to `team-spec-log.md`: enrichment approach, coherence check results, verification findings, any spec deviations documented, any issues encountered. If enrichment surfaced gaps in the tech design or functional stories, log what was discovered and how it was resolved. Phase transitions are natural reflection points.

---

## Phase 5: Final Story Verification

After enrichment, each story gets an independent verification pass, then the full set gets a cross-story coherence check. This is the final quality gate before implementation.

### Per-Story Verification

For each story, spawn a dual verifier: an Opus teammate who fires a Codex subagent async. In Sonnet-only mode, the verifier does a solo review. Both read the epic, the tech design, and the individual story. They verify:

- Story contract compliance (all six requirements)
- Consumer gate (could an engineer implement from this story alone?)
- TC-to-test mapping completeness
- Spec deviation accuracy (cited sections actually checked, deviations correctly documented)
- Architecture context is a substantial shard, not a summary

Unlike earlier phases where the drafter owns fixes, Phase 5 verifiers fix directly — the work is verification cleanup (thin shards, missing mappings, citation gaps), not content creation. The enricher's intent is preserved through the tech design and epic as source of truth. The verifier has all three artifacts in context and can fix coherence issues on the spot. If a fix requires substantive new content — new architecture context, new interface definitions, rewriting flows — route it back to the orchestrator rather than authoring it in the verifier role.

Stories can be verified in parallel — each story's verification is independent. If per-story verifiers fix shared types or contracts, the cross-story coherence check will catch inconsistencies — this is expected, not a failure.

### Cross-Story Coherence Check

After all individual story verifications complete, spawn one final dual verifier: an Opus teammate who fires a Codex subagent async. In Sonnet-only mode, the verifier does a solo review. Both read the epic, the tech design, and all stories. They check:

- **Coverage completeness:** Every AC and TC from the epic is covered across the story set. No orphaned requirements.
- **Interface coverage:** Every interface from the tech design appears in at least one story's Interfaces & Contracts section.
- **Module coverage:** Every module from the tech design's responsibility matrix appears in at least one story's Architecture Context.
- **Test mapping coverage:** The union of all stories' TC-to-test mapping tables covers every TC from the epic. Non-TC decided tests from the tech design all have homes.
- **Cross-story seam integrity:** Integration paths between stories are coherent. No gaps where Story N assumes something Story M provides but neither story explicitly owns the connection.
- **Consistency:** Types, error shapes, and contracts referenced across multiple stories are consistent — no story using a different version of a shared interface.

If fixes are needed, the Opus verifier teammate makes them directly. This is the final signoff — when this pass comes back clean, the spec pipeline is complete.

### Human Review

Present the final state to the human: "All stories individually verified and cross-story coherence check passed. Spec pipeline is complete." The human may do a final spot-check or accept.

Log the final verification phase completion to `team-spec-log.md`: per-story verification results, fixes made, cross-story coherence check results, any issues encountered and resolved. This is the final log entry for the spec pipeline.

---

## Handoff to Implementation

After all phases complete, the pipeline output is a set of complete, technically enriched stories ready for implementation. The orchestrator presents the full artifact set to the human:

- Epic (accepted)
- Tech design (accepted)
- Complete stories with functional + technical halves
- `team-spec-log.md` (orchestration log — useful context for implementation orchestrator: patterns noticed, decisions made, deviations documented)

From here, the human can proceed to implementation via `/ls-team-impl` (team orchestration) or `/ls-impl` (solo implementation).

Log the full pipeline completion to `team-spec-log.md`: total phases run, total verification rounds across all phases, significant process decisions, and any recommendations for future runs.

---

## Escalation Handling

When teammates escalate issues or problems arise during any phase:

1. **Assess the situation yourself.** Read the artifacts, understand the context. Don't just forward the question.
2. **Reflect against the upstream artifacts.** The epic contains the requirements rationale. The tech design contains the architecture rationale. Most questions can be answered by tracing back.
3. **If you can make a reasonable decision, make it.** Route the answer back to the teammate with your reasoning.
4. **If you need the human's ruling:** explain what's needed, what you did to investigate, what you understand about the issue, your recommendation, and your reasoning. Give the human enough context to decide without re-investigating from scratch.

---

## Operational Patterns

These patterns apply across all phases and encode failure modes the skill needs to handle.

### Idle Notifications Are Unreliable Signals

Teammates emit idle notifications between turns. These are noise during multi-step tasks — a drafter writing a tech design will fire multiple idle notifications while actively working. Do not interpret idle notifications as "the agent is done" or "the agent is stuck."

The reliable signal is the teammate's explicit message reporting results. Wait for that. If extended time passes with no message (calibrate based on task complexity), send a brief nudge: "Did you complete the work? Report your results." Don't assume failure from silence alone.

### Context Ceilings

Drafters that read extensive input documentation (epic + codebase + tech overview) and then produce large artifacts (tech designs) can exhaust their context window. Symptoms: the agent goes idle without completing, or produces truncated/confused output.

Mitigation: the human configures model context size. If an agent hits context limits, the human may need to intervene to adjust model settings. The orchestrator cannot control context size at spawn time — flag the issue and let the human handle it.

### Agents Forget to Report Back

After long drafting tasks (30+ minutes, extensive tool calls for codebase analysis), agents sometimes complete their work but forget to send the completion message back to the team lead. The reporting instruction decays over long execution chains.

Place the reporting instruction prominently in the handoff prompt. If two idle notifications pass after expected completion time with no message, send a nudge.

### Sequencing: Wait for Confirmation Before Proceeding

Do not launch verification before the drafter signals "done." Do not launch the next phase before the current phase is fully accepted. The teammate's explicit report is the trigger for the next step, not the orchestrator's independent observation of file state.

### Severity Calibration

Codex models grade conservatively — they flag everything as Major. Claude models tend to grade more generously. The orchestrator applies their own judgment. Not every Major finding is actually Major. Some Minor findings at the epic level are actually Critical because they'll cascade. Calibrate based on the scrutiny gradient: upstream findings get more weight.

---

## Process Adaptation

The workflow defined above is the default. The orchestrator has discretion to adjust within bounds.

What can be adjusted:
- How much detail goes into handoff prompts based on artifact complexity
- Whether to flag specific risks or patterns based on previous phase findings
- Number of verification rounds based on artifact quality trajectory

What cannot be adjusted:
- The verification pattern always runs — every artifact gets at minimum author self-review + one dual verification round
- Fresh verifiers per phase — no carrying verification context forward
- The human always gets the option to review at phase boundaries
- The epic always gets human every-line review

If a phase's verification surfaces a pattern, flag it in subsequent phase handoffs. If the human directs a process change, apply it and log the change and reasoning to `team-spec-log.md`.

---

## Logging

`team-spec-log.md` is created during On Load and lives alongside the spec artifacts. It captures the full orchestration experience for this run.

**What to log:**
- Lane determination: which skills were found, which weren't, which lane was selected, fallbacks applied
- Skill availability issues: teammates that couldn't find expected skills, how it was resolved
- Orientation decisions: what the human provided, what pre-epic documentation was created, pipeline entry point
- Phase transitions: when and why each phase was considered complete
- Verification rounds per phase: what findings came back, what was fixed, what was dismissed and why
- Human review outcomes: what the human changed, what they accepted
- Corrections the human makes to your process
- Failure modes encountered and how they were resolved
- Patterns that emerge across phases

**What not to log:**
- Status updates ("starting tech design phase")
- Routine events that went as expected
- Artifact content (that's the artifact's job)

Write narrative entries, not bullet points. Each entry should tell the story of what happened, what was observed, and why it might matter. A future reader building or refining this skill needs to understand the shape of the work, not just the checkboxes.

`team-spec-log.md` is a first-class deliverable. A smooth orchestration with thin notes is less valuable than a rough orchestration with thorough documentation. Optimize for learning surface area.

---

## Reference: confidence-chain

## The Confidence Chain

Every line of code traces back through a chain:

```
AC (requirement) → TC (test condition) → Test (code) → Implementation
```

**Validation rule:** Can't write a TC? The AC is too vague. Can't write a test? The TC is too vague.

This chain is what makes the methodology traceable. When something breaks, you can trace from the failing test back to the TC, back to the AC, back to the requirement.

---

## Reference: Verification: The Scrutiny Gradient

# Verification: The Scrutiny Gradient

**Upstream = more scrutiny. Errors compound downward.**

The epic gets the most attention because if it's on track, everything else follows. If it's off, everything downstream is off.

## The Gradient

```
Epic:  #################### Every line
Tech Design:   #############....... Detailed review
Stories:       ########............ Key things + shape
Implementation:####................ Spot checks + tests
```

## Epic Verification (MOST SCRUTINY)

This is the linchpin. Read and verify EVERY LINE.

### Verification Steps

1. **BA self-review** -- Critical review of own work. Fresh eyes on what was just written.

2. **Tech Lead validation** -- Fresh context. The Tech Lead validates the spec is properly laid out for tech design work:
   - Can I map every AC to implementation?
   - Are data contracts complete and realistic?
   - Are there technical constraints the BA missed?
   - Do flows make sense from implementation perspective?

3. **Additional model validation** -- Another perspective (different model, different strengths):
   - Different model, different strengths
   - Adversarial/diverse perspectives catch different issues

4. **Fix all issues, not just blockers** -- Severity tiers (Critical/Major/Minor) set fix priority order, not skip criteria. Address all issues before handoff. Minors at the spec level compound downstream -- zero debt before code exists.

5. **Validation rounds** -- Run validation until no substantive changes are introduced, typically 1-3 rounds. The Tech Lead also validates before designing -- a built-in final gate. Number of rounds is at the user's discretion.

6. **Human review (CRITICAL)** -- Read and parse EVERY LINE:
   - Can you explain why each AC matters?
   - No "AI wrote this and I didn't read it" items
   - This is the document that matters most

## Tech Design Verification

Still detailed review, but less line-by-line than epic.

### What to Check

- Structure matches methodology expectations
- TC-to-test mapping is complete
- Interface definitions are clear
- Phase breakdown makes sense
- No circular dependencies

### Who Validates

- **Tech Lead self-review** -- Critical review of own work
- **BA/SM validation** -- Can I shard stories from this? Can I identify coherent AC groupings?
- **Tech Lead re-validation** -- Can I add story-level technical sections from this?

## Story Verification

Stories go through a two-phase validation reflecting their two-phase authoring.

### Functional Stories (after BA/SM sharding)

Less line-by-line, more shape and completeness:

- Coverage gate: every AC/TC assigned to a story
- Integration path trace: no cross-story seam gaps
- Each story coherent and independently acceptable
- Tech Lead confirms they can add technical sections

### Technically Enriched Stories (after Tech Lead enrichment)

Story contract compliance check:

1. **Tech design shard present** -- substantial, story-scoped tech design content in Architecture Context and Interfaces
2. **TC-to-test mapping present** -- every TC mapped to a test approach with file names and approaches from the tech design
3. **Non-TC decided tests present** -- edge/integration tests from tech design carried forward or explicitly noted as absent
4. **Technical DoD present** -- specific verification commands
5. **Spec deviation field present with citations** -- checked tech design sections listed, even when no deviations
6. **Targets, not steps** -- technical sections describe what, not how

Consumer gate: could an engineer implement from this story alone, without reading the full tech design?

## Implementation Verification

Spot checks + automated tests.

### What to Check

- Tests pass (full suite)
- Types check clean
- Lint passes
- Spot check implementation against tech design
- Gorilla testing catches "feels wrong" moments

---

## Multi-Agent Validation Pattern

Liminal Spec uses this pattern throughout:

| Artifact | Author Reviews | Consumer Reviews |
|----------|---------------|------------------|
| Epic | BA self-review | Tech Lead (needs it for design) |
| Tech Design | Tech Lead self-review | BA/SM (needs it for story sharding) + Tech Lead (needs it for technical sections) |
| Functional Stories | BA/SM self-review | Tech Lead (needs them for technical enrichment) |
| Complete Stories | Tech Lead self-review | Engineer (needs them for implementation) |

### Why This Works

1. **Author review** -- Catches obvious issues, forces author to re-read
2. **Consumer review** -- Downstream consumer knows what they need from the artifact
3. **Different model** -- Different strengths catch different issues. Use adversarial/diverse perspectives for complementary coverage.
4. **Fresh context** -- No negotiation baggage, reads artifact cold

### The Key Pattern: Author + Downstream Consumer

If the Tech Lead can't build a design from the epic -> spec isn't ready.
If the BA/SM can't shard stories from tech design -> design isn't ready.
If the Tech Lead can't add technical sections to stories -> stories aren't ready.
If the Engineer can't implement from complete stories -> stories aren't ready.

**The downstream consumer is the ultimate validator.**

---

## Orchestration

**How to run validation passes is left to the practitioner.** This skill describes:
- **WHAT to validate** -- Which artifacts, which aspects
- **WHEN to validate** -- Checkpoints in the flow

Leaves flexible:
- **HOW to validate** -- Which models, how many passes
- **Specific orchestration** -- Based on your setup and preferences

---

## Checkpoints

### Before Tech Design

- [ ] Epic complete
- [ ] BA self-review done
- [ ] Model validation complete
- [ ] All issues addressed (Critical, Major, and Minor)
- [ ] Validation rounds complete
- [ ] Tech Lead validated: can design from this
- [ ] Human reviewed every line

### Before Story Sharding

- [ ] Tech Design complete (all altitudes: system context, modules, interfaces)
- [ ] Tech Lead self-review done (completeness, richness, writing quality, readiness)
- [ ] Model validation complete (different model for diverse perspective)
- [ ] All issues addressed (Critical, Major, and Minor)
- [ ] Validation rounds complete (no substantive changes remaining)
- [ ] TC -> Test mapping complete (every TC from epic maps to a test)
- [ ] BA/SM validated: can shard stories from this
- [ ] Human reviewed structure and coverage

### Before Implementation

- [ ] Functional stories complete (all ACs/TCs assigned, integration path traced)
- [ ] Technical enrichment complete (all six story contract requirements met)
- [ ] Consumer gate passed: engineer can implement from stories
- [ ] Different model reviewed stories (if high-stakes)

### Before Ship

- [ ] All tests pass
- [ ] Gorilla testing complete
- [ ] Verification checklist passes
- [ ] Human has seen it work
