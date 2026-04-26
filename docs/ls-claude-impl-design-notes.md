# ls-claude-impl Design Notes

## What We Are Trying To Solve

We need a reliable epic-implementation orchestration skill that can take a completed Liminal Spec spec pack and drive story-by-story implementation with enough discipline to be trustworthy and enough runtime simplicity to be usable repeatedly.

The immediate problem is not that the methodology is wrong. The problem is that the current implementation-skill surfaces have too much runtime layering and too much duplicated context loading:

- too many layers between orchestrator and actual worker
- too many roles rereading the same source material
- too much context burned on prompt/setup mechanics rather than useful work
- too much fragility in the runtime shape used to achieve verification diversity

`ls-codex-impl` is not the recovery target right now. That work explored a more scripted runtime and surfaced useful ideas, but it is not the near-term path to a dependable implementation orchestrator.

The near-term target is `ls-claude-impl`: a new implementation orchestration skill built to preserve the useful parts of the current methodology while simplifying the runtime shape enough that it can actually be used repeatedly for full-epic implementation.


## Why We Are Building It

We want a dependable implementation orchestrator that can:

- read a completed spec pack
- implement stories in sequence
- verify the work with fresh verifier agents
- keep the orchestrator separate from implementation work
- avoid wasting context on duplicated artifact rereads
- avoid the extra runtime fragility of agent-teams-plus-subagent stacks

This matters because a reliable implementation orchestrator unblocks repeated spec-pack-driven builds. That, in turn, accelerates real product work and provides the practical harness needed to keep building the broader orchestration system elsewhere.

The goal is not maximal ceremony. The goal is dependable completion with real verification pressure and manageable operating cost.

## Direction Of Travel

The new skill should move away from:

- orchestrator -> teammate -> subagent

and toward:

- orchestrator -> subagent
- orchestrator -> CLI-harness skill subagent

The orchestrator remains the coordinating intelligence. It should be the thing that understands the implementation state, decides what role to run next, and routes fixes or escalations. It should not be buried under extra layers of runtime machinery when those layers do not add meaningful value.

Dual verification remains a valid concept. What changes is how it is implemented. Instead of verifier teammates coordinating verifier subagents in parallel, the orchestrator can directly run one or two fresh verifier agents/subagents with well-composed prompts and role-fit context.

## Core Build Shape

The system we are aiming toward has four major pieces:

1. The skill
2. The CLI
3. Base agent prompts
4. Prompt templates / snippets

These pieces combine to form the orchestrated implementation workflow.

### 1. The Skill

`ls-claude-impl` is the orchestration skill surface.

Its job is to:

- define the orchestration contract
- define state transitions and checkpoints
- define what must be logged
- define the role primitives used during implementation
- define when to escalate, when to continue, and when to re-verify
- guide the orchestrator in composing the right prompt and context for each role

The skill should not try to inline every concrete prompt variant in one giant monolith if those variants can be composed from reusable prompt building blocks.

### 2. The CLI

The CLI is the runtime helper for long-running implementation and verification work.

Its job is to:

- launch long-running implementation / verification work
- run synchronously in the background when appropriate
- write durable artifacts and summaries
- give the orchestrator a clean completion surface
- keep verbose logs separate from concise summaries
- support resumable, inspectable operation rather than requiring the orchestrator to improvise shell behavior every time

The CLI is not the methodology. It is the runtime execution helper that makes the methodology practical.

Likely CLI responsibilities include:

- launching implementation runs
- launching verifier runs
- saving structured summaries
- saving verbose transcripts
- returning disciplined exit codes
- writing durable status files or result artifacts

### 3. Base Agent Prompts

Base prompts are the durable role primitives.

These are not story-specific. They are role-specific.

Examples of likely base prompts:

- orchestrator / supervisor
- story implementor
- story verifier
- quick-fix / small correction agent
- epic verifier
- epic verification synthesizer

The point of a base prompt is to define:

- the role
- the stance
- the responsibilities
- the output contract
- the things the role must not do

Base prompts should be stable and reusable.

### 4. Prompt Templates / Snippets

Prompt templates / snippets are the reusable overlays that get folded into concrete dispatch prompts.

These are the composable building blocks used alongside the base prompt.

Examples:

- reading journey
- verification stance
- finding schema
- blocker discipline
- output contract
- gate-running instructions
- boundary inventory check
- mock/stub audit
- story-stage adaptation
- Story 0 exception
- correction-only batch adaptation

One important example is the `reading journey`.

The reading journey is not the whole prompt. It is a reusable prompt snippet template that can be filled differently for different roles. The same is true for other reusable prompt parts.

## Primitive-Based Workflow Construction

The intended construction pattern is:

1. choose the role primitive
2. choose the needed prompt snippets
3. fill the templates with the current story/stage-specific values
4. dispatch the role with only the context it actually needs

This is meant to replace the current habit of building giant monolithic prompts where every role gets the full artifact world plus a bunch of duplicated instructions.

The aim is not abstract purity. The aim is to make the workflow easier to reason about, easier to revise, and less wasteful of context.

## Context Philosophy

The orchestrator should read what it needs and not read what it does not need.

The same rule applies to every other role.

We do not need to settle every context rule in the abstract up front. The right way to get this correct is to work role by role and decide what each role actually needs from the spec pack to perform its job well.

This implies:

- some roles need deeper context
- some roles need much narrower context
- some roles should receive a self-contained handoff rather than raw source artifacts

The design target is to stop duplicated comprehension work where it does not add value.

## Initial Architecture Skeleton

At a high level, the system should look like this:

```text
ls-claude-impl skill
  -> orchestrator runs
     -> chooses role primitive
     -> composes dispatch prompt from:
        - base role prompt
        - selected prompt snippets
        - story/stage-specific values
        - role-fit context
     -> dispatches:
        - direct Claude subagent
        - or CLI-harness skill subagent
     -> receives structured output
     -> decides next step
```

At runtime, the core workflow components are expected to be built from:

- one orchestration skill
- one or more CLI helpers
- a small set of durable base prompts
- a small set of reusable prompt snippets/templates

This is the primitive set from which implementation, verification, fix-routing, and epic-level review workflows will be assembled.

## What This Document Is For

This note is not the skill itself.

It is the design-space capture for the implementation of `ls-claude-impl`.

Its purpose is to keep the target clear while we work through:

- which role primitives are real
- which prompts should be base prompts
- which reusable prompt snippets we need
- what each role actually needs in its context
- what the CLI should own
- what the orchestrator should own

The next step from here is to work role by role and make the primitive set concrete.

## Orchestrator

### Definition

The orchestrator is the supervising agent for the full epic implementation run.

In `ls-claude-impl`, the orchestrator is expected to be Claude Opus 4.7 at high or extra high thinking, running in an interactive session with the human. The orchestrator is the thing that gets the run ready, keeps it moving, coordinates agent dispatches, interprets outputs, updates the durable orchestration record, and decides what happens next.

The orchestrator is not the implementor and not the verifier.

The orchestrator is the coordinator of the workflow.

### What The Orchestrator Reads

Current expectation:

- all stories
- tech design index
- test plan
- the orchestration skill itself
- the CLI operating instructions for the implementation harness

Provider-specific subagent skills may exist behind the CLI, for example:

- `codex-subagent`
- `copilot-subagent`
- `claude-subagent`
- `cursor-subagent`

The orchestrator should also verify that all required spec-pack artifacts are present before the run begins.

The working correction here is that the orchestrator may not need to load those provider skills directly if the CLI is responsible for launching and resuming the underlying runtimes.

At this stage, the orchestrator does **not** need to fully internalize every companion tech-design document by default. For the 2-doc tech-design configuration, reading the index plus test plan is already the full tech design. For the 4-doc configuration, the orchestrator can begin with the index plus test plan and pull companion sections selectively as needed later.

### Why Context Discipline Matters

One of the major failure modes we are explicitly designing against is burning too much context too early.

If the orchestrator reads too much source material, too many prompt artifacts, too many runtime instructions, and does it all at high or extra high thinking before Story 0 even starts, the session can cross 300k context before the first real implementation dispatch. That creates several problems:

- degraded attention before the first story starts
- unnecessary cost
- harder-to-follow interactive setup
- increased risk that the orchestrator forgets process-critical details during the first real dispatch
- increased temptation to over-explain or over-control instead of moving the run forward

So the orchestrator's job is not to hoard every possible source document into active context. The job is to read what is needed to initialize the run properly, get the pieces in place, and then start the work.

### Core Duties

The orchestrator should:

- confirm the required spec-pack inputs exist
- confirm the relevant providers are available through the CLI/runtime helper
- confirm the CLI is available and understood well enough to operate
- determine the initial run configuration
- create the implementation log
- create a separate run-configuration record if needed
- ask whether custom prompt inserts should be used for story implementors and story verifiers
- establish the story sequence
- establish the verification gates
- establish any provider/model choices for different roles
- begin the implementation run by kicking off Story 1 / Story 0 as appropriate

The orchestrator is responsible for getting all of the pieces in place before implementation starts.

### Setup Responsibilities

Before starting the first story, the orchestrator should:

1. verify the spec-pack inputs are present
2. verify the project gates are discoverable
3. verify the implementation CLI / runtime helper is available
4. create the run log
5. determine the run configuration and parameter choices
6. determine whether `custom-story-impl-prompt-insert.md` and `custom-story-verifier-prompt-insert.md` should be created or used
7. record run choices in a separate configuration artifact if that proves clearer than storing them only in the log
8. determine the story execution order
9. start the first story

This is the interactive setup phase with the human.

### What The Orchestrator Owns

The orchestrator should own:

- run initialization
- log creation and durable progress recording
- run configuration / parameter selection
- optional custom prompt-insert setup
- story sequencing
- agent dispatch
- result interpretation
- fix routing
- verifier routing
- checkpoint writing
- story acceptance
- epic-level verification coordination

The orchestrator may also own some or all state transitions, though some state-writing may eventually be delegated to the CLI if that proves cleaner. That is still an open design point.

### Implementation-Agent Relationship

The orchestrator kicks off the implementor agent.

Assuming the run goes smoothly:

1. the implementor does the implementation work
2. the same implementor session performs a self review
3. the self review should explicitly instruct the implementor to be adversarial with its own code
4. the implementor should fix obvious issues itself
5. the implementor should surface less-clear issues in its report rather than hiding them

The final output of the implementor agent should be:

- the implementation report
- the self-review report
- the session identifier needed to recall or continue that agent if needed

That session identifier matters because the orchestrator may need to:

- ask follow-up questions
- answer implementor questions
- route fixes back into the same running implementation session
- continue the implementation session after review findings

### CLI Relationship

The orchestrator needs detailed instructions for operating the CLI.

Current working assumption:

- the CLI may take over some responsibilities that earlier designs pushed onto the orchestrator directly
- the orchestrator may not need to load provider-specific subagent skills itself if the CLI takes responsibility for launching the underlying agent runtime

This is an important correction.

Earlier thinking assumed the orchestrator might need to load things like `codex-subagent` directly. That may be unnecessary if the CLI becomes the execution helper that launches and manages those runtimes.

So for now:

- the orchestrator should know how to operate the CLI
- the CLI may abstract some provider/runtime details away from the orchestrator
- this reduces orchestration-session context burden
- the CLI should be treated as the standard place where provider-specific launch/resume logic lives

### Things To Keep Open For Later

We will almost certainly return to the orchestrator once we work through:

- story workflow
- verification workflow
- fix-routing workflow
- epic-level verification workflow

Open questions that do not need to be fully settled yet:

- exactly how much state the CLI owns vs the orchestrator
- exactly what companion tech-design material the orchestrator should selectively pull later
- whether run configuration belongs only in the log or in a separate artifact
- whether the orchestrator should always run at high or sometimes at extra high depending on the moment

For now, the important thing is that the orchestrator is the setup-and-coordination brain, not the thing that burns huge context before the first story begins.

## Story Implementor

### Role

The story implementor is the agent that actually performs the implementation work for one story.

This agent is responsible for:

- reading the implementation context it is given
- implementing the story
- performing a same-session self review
- fixing obvious issues it finds in that self review
- reporting clearly on what it changed, what it fixed, and what remains uncertain

The implementor is expected to keep the same session alive through implementation and self review so that the self review is operating on the actual implementation context rather than starting fresh.

### Core Reading Inputs

The core story implementor should read:

- the story
- the full tech design

This should be done using the standard reading-journey procedure.

### Reference List

The story implementor should also receive a general reference list that is separate from the reading journey.

This reference list should include:

- the epic
- all tech-design files
- all story files

These are not part of the standard reading journey.

They should be presented with explicit instructions that they are available for deeper research only if implementation issues, ambiguity, or unexpected complexity require more context than the standard reading journey provides.

### Implementation Provider Options

Current provider order:

1. **Codex gpt-5.4 high** — default when Codex is available
2. **Copilot gpt-5.4 high** — default when Codex is unavailable but Copilot CLI is available
3. **Claude Sonnet 4.6 with 1M context at high** — fallback when neither Codex nor Copilot is available

Additional option:

- **gpt-5.4 extra high** — available when a story or situation justifies stepping up from the default Codex implementation level

### Thinking-Level Defaults

- **Codex gpt-5.4**: high by default
- **Codex gpt-5.4**: extra high is an explicit higher-cost option
- **Copilot gpt-5.4**: high
- **Claude Sonnet 4.6 1M**: always high

Sonnet 4.6 1M should not float between levels. Its implementation setting is always high.

### Standard Reading Journey Procedure

The reading journey is a standard reusable prompt snippet and procedure.

The procedure is:

1. read the source material in bounded chunks
2. think on each chunk before moving on
3. reflect before moving to the next chunk
4. produce a deeper reflection at the end of each file

Chunk size is configurable, but bounded:

- minimum practical range: 200 lines
- maximum: 500 lines
- default: 200 lines if no other value is given

No reading-journey chunk should exceed 500 lines.

This procedure is the default mechanism for reading large implementation artifacts.

### Optional Standard Implementor Insert

We should support a standard story-implementor insert that can optionally be added to every implementor initialization alongside the reading journey.

The intended shape is:

- a standard filename
- stored in the spec directory
- if present, it is always injected into story-implementor prompts

This gives us a durable place for implementation-specific overlay guidance without forcing that material to live inside every story file or every base implementor prompt.

Recommended standard filename:

- `custom-story-impl-prompt-insert.md`

If this file exists in the spec directory, the CLI should automatically include it in story-implementor initialization. If it does not exist, the CLI should continue normally with no special-case failure.

### Session Continuation Contract

The CLI must always return:

- the story implementor session id
- the provider identifier

If the orchestrator or caller wants to continue the same implementation session, both of those values must be provided back to the CLI.

Same-session continuation is a first-class requirement because:

- self review should happen in the same implementation session
- follow-up questions may need to be routed back into the same session
- fix-routing may need to continue the same session rather than starting over

The CLI should also return these values in a disciplined way every time so the orchestrator does not need to scrape them from prose output.

### Implementor Output Contract

The implementor must return a structured report.

This is not a vibes-based summary. It is a predictable contract that the orchestrator can inspect, log, route, and use for follow-up work.

The implementor output should be structured as the following fields.

#### Core Identity Fields

- `provider_id: string`
  The provider/runtime used for this implementor session.
  Examples:
  - `codex`
  - `copilot`
  - `claude`

- `session_id: string`
  The provider-specific session identifier required to continue the same implementation session later.

- `story_id: string`
  The story identifier being implemented.
  Examples:
  - `story-0`
  - `story-3`
  - `04-artifact-review-surface`

- `story_title: string`
  Human-readable story title.

#### Planning Fields

- `plan: object`
  The implementation plan for the story.

  Shape:
  - `acs_targeted: string[]`
  - `tcs_targeted: string[]`
  - `non_tc_tests_targeted: string[]`
  - `approach_summary: string`
  - `likely_failure_modes: string[]`

#### Change Fields

- `changes_made: object[]`
  Structured list of changed files grouped by purpose.

  Each item:
  - `path: string`
  - `change_type: "added" | "modified" | "deleted"`
  - `purpose: "schema" | "service" | "route" | "client" | "test" | "config" | "docs" | "other"`
  - `summary: string`

#### Test Fields

- `tests_added: object[]`
  Tests newly added during the story.

  Each item:
  - `path: string`
  - `test_name: string`
  - `tc_mapping: string | null`
  - `summary: string`

- `tests_modified: object[]`
  Existing tests changed during the story.

  Each item:
  - `path: string`
  - `test_name: string | null`
  - `rationale: string`

- `tests_removed: object[]`
  Existing tests removed during the story. This should usually be empty.

  Each item:
  - `path: string`
  - `test_name: string | null`
  - `rationale: string`

- `test_count: object`
  Test-count summary after this story.

  Shape:
  - `total_after_story: number`
  - `delta_from_previous_story: number`

#### Gate Fields

- `gates_run: object[]`
  The gates or commands actually run by the implementor.

  Each item:
  - `name: string`
  - `command: string`

- `gate_results: object[]`
  The results of the gates run.

  Each item:
  - `name: string`
  - `status: "passed" | "failed" | "not_run"`
  - `details: string`

#### Self-Review Fields

- `self_review_findings_fixed: object[]`
  Issues found in same-session self review and fixed by the implementor.

  Each item:
  - `summary: string`
  - `severity: "critical" | "major" | "minor"`
  - `fix_summary: string`

- `self_review_findings_unfixed: object[]`
  Issues found in same-session self review but not fixed.

  Each item:
  - `summary: string`
  - `severity: "critical" | "major" | "minor"`
  - `reason_unfixed: string`

#### Escalation / Uncertainty Fields

- `open_questions: string[]`
  Questions the implementor could not settle confidently and needs routed back through the orchestrator. Empty if none.

- `blockers_raised_mid_work: object[]`
  Blockers that were explicitly raised during the work before any workaround was attempted.

  Each item:
  - `summary: string`
  - `resolved: boolean`
  - `resolution: string | null`

- `spec_deviations: object[]`
  Deviations from the story, tech design, or test plan.

  Each item:
  - `summary: string`
  - `reason: string`
  - `approved: boolean | null`

#### Boundary / Integration Fields

- `boundary_status_updates: object[]`
  Any relevant boundary inventory updates caused by this story.

  Each item:
  - `boundary: string`
  - `status_after_story: "stub" | "mocked" | "integrated" | "substrate-no-production-caller"`
  - `justification: string`

#### Completion / Routing Field

- `recommended_next_step: string`
  Short recommendation to the orchestrator.
  Examples:
  - `ready_for_verification`
  - `needs_human_ruling`
  - `needs_followup_fix_routing`
  - `blocked`

### Implementor Report Expectations

The implementor report should be:

- structured
- complete
- explicit about uncertainty
- explicit about what was changed
- explicit about what was tested
- explicit about what was fixed during self review
- explicit about what remains unresolved

The orchestrator should be able to use this report to:

- decide whether verification can start
- continue the same session if needed
- route follow-up questions
- log the story state durably
- compare later verifier findings against what the implementor already knew

## Story Verifier

### Role

The story verifier is a fresh verification agent used to review one implemented story after the implementor has completed implementation and same-session self review.

The verifier is responsible for:

- reading the assigned verification context
- independently reviewing the story implementation
- running any required gates or focused checks assigned to verification
- reporting findings in a structured way
- making a clear recommendation about whether the story is ready, needs revision, or is blocked

The verifier is not responsible for orchestrating other verifier agents. In `ls-claude-impl`, the orchestrator launches verifier runs directly.

### Verifier Launch Pattern

The CLI should support a `launch-story-verifier` style capability that accepts an array of story-verifier configurations.

By default, verification launches **two** fresh verifiers.

The verifier count should be configurable and may be set to:

- `1`
- `2`
- `3`
- `4`

Default verifier pair:

1. **gpt-5.4 extra high**
2. **Sonnet 4.6 high**

When only a single verifier is launched, the default should be:

1. **gpt-5.4 extra high**

Other allowed verifier options in the verifier-config array:

- **gpt-5.4 high**
- **Opus 4.7 extra high**
- **Opus 4.7 max**

Sonnet 4.6 should remain at high for this role.

### Core Reading Inputs

The core story verifier should read:

- the story
- the full tech design

This should use the same standard reading-journey procedure described for the implementor.

### Reference List

The story verifier should also receive a general reference list that is separate from the reading journey.

This reference list should include:

- the epic
- all tech-design files
- all story files

These are not part of standard reading for the verifier.

They should be presented with explicit instructions that they are available only for deeper research if verification uncovers ambiguity, conflicts, regressions, or implementation questions that require broader context.

### Optional Standard Verifier Insert

We should support a standard story-verifier insert that can optionally be added to every verifier initialization alongside the reading journey.

Recommended standard filename:

- `custom-story-verifier-prompt-insert.md`

If this file exists in the spec directory, the CLI should automatically include it in story-verifier initialization. If it does not exist, the CLI should continue normally with no failure.

### Verifier Session Handling

In general, verifier state should **not** be retained across the workflow.

The normal pattern is:

- launch fresh verifier
- receive structured verifier report
- route fixes
- launch fresh verifier again if re-verification is needed

So unlike the story implementor, the verifier should be treated as stateless from the orchestrator's point of view.

The CLI may expose verifier session identifiers internally or for debugging, but verifier `session_id` should not be treated as normal orchestration state and should not be relied on as part of the standard workflow contract.

### Relationship To Setup

During initial setup, the orchestrator should ask the user whether there should be any special prompt inserts for:

- story implementors
- story verifiers

The CLI should then automatically use the standard filenames if those files exist in the spec directory.

This keeps the setup explicit for the human while keeping run-time prompt assembly simple and predictable.

### Draft Verifier Output Contract

This section is a draft, not a final contract.

The verifier should return a structured report that the orchestrator can compare across multiple verifier runs, log durably, and use for fix routing or re-verification.

Each verifier report should stand on its own.

#### Core Identity Fields

- `provider_id: string`
  The provider/runtime used for this verifier session.
  Examples:
  - `codex`
  - `copilot`
  - `claude`

- `story_id: string`
  The story identifier being verified.

- `story_title: string`
  Human-readable story title.

- `verifier_label: string`
  Short label for this verifier instance so multiple verifier reports can be distinguished in the same story-verification batch.
  Examples:
  - `verifier-1`
  - `verifier-2`
  - `opus-max`
  - `sonnet-high`

- `verification_batch_id: string | null`
  Optional batch identifier tying multiple verifier reports to the same verification launch.

#### Context / Coverage Fields

- `artifacts_read: object`
  Records what the verifier actually read in the standard path.

  Shape:
  - `story_read: boolean`
  - `tech_design_read: boolean`
  - `custom_insert_applied: boolean`
  - `reference_files_consulted: string[]`

- `review_scope_summary: string`
  Short explanation of what this verifier focused on most heavily.

- `acs_reviewed: string[]`
  Acceptance-criteria ids or labels the verifier explicitly checked.

- `tcs_reviewed: string[]`
  Test-condition ids or labels the verifier explicitly checked.

#### Gate / Evidence Fields

- `gates_run: object[]`
  Gates or commands the verifier actually ran.

  Each item:
  - `name: string`
  - `command: string`

- `gate_results: object[]`
  Results of the verifier-run checks.

  Each item:
  - `name: string`
  - `status: "passed" | "failed" | "not_run"`
  - `details: string`

- `evidence_notes: object[]`
  Concrete evidence notes tied to findings or confirmations.

  Each item:
  - `type: "code" | "test" | "runtime" | "spec" | "git-diff" | "other"`
  - `summary: string`
  - `paths: string[]`

#### Finding Fields

- `findings: object[]`
  Structured list of issues found by this verifier.

  Each item:
  - `id: string`
  - `severity: "critical" | "major" | "minor"`
  - `kind: "bug" | "regression" | "spec-miss" | "test-gap" | "integration-risk" | "cleanup" | "uncertainty" | "other"`
  - `summary: string`
  - `details: string`
  - `paths: string[]`
  - `fix_recommendation: string`

- `must_fix_findings: string[]`
  List of finding ids that should block acceptance until addressed.

- `advisory_findings: string[]`
  List of finding ids that are worth tracking but should not necessarily block story acceptance.

#### Coverage / Confidence Fields

- `verified_acs: string[]`
  Acceptance-criteria ids or labels the verifier believes are satisfied.

- `unverified_or_failed_acs: string[]`
  Acceptance-criteria ids or labels the verifier could not confirm or believes are not yet satisfied.

- `verified_tcs: string[]`
  Test-condition ids or labels the verifier believes are satisfied.

- `unverified_or_failed_tcs: string[]`
  Test-condition ids or labels the verifier could not confirm or believes are not yet satisfied.

- `confidence_notes: string[]`
  Short notes on areas where the verifier's confidence is lower than desired.

#### Fix Routing / Recommendation Fields

- `recommended_next_step: "pass" | "revise" | "block"`
  The verifier's overall recommendation for the story at this moment.

- `recommended_fix_scope: "same-session-implementor" | "fresh-fix-agent" | "human-ruling" | "none"`
  The verifier's recommendation for how follow-up work should be routed.

- `open_questions: string[]`
  Questions the verifier could not settle confidently and wants routed back through the orchestrator.

- `notes_to_next_verifier_or_synthesizer: string[]`
  Optional handoff notes that may help a later verifier or synthesizer understand edge cases, uncertainty, or why a finding matters.

### Draft Verifier Report Expectations

The verifier report should be:

- structured
- evidence-bound
- explicit about what was actually checked
- explicit about what was not verified
- explicit about what should block acceptance versus what is advisory

The orchestrator should be able to use the verifier report to:

- compare multiple verifier runs
- route fixes cleanly
- decide whether re-verification should be fresh
- detect disagreement across verifiers
- log story-verification state durably

## Quick Fixer

### Role

The quick fixer is a narrow-scope correction agent used for:

- quick code fixes
- document updates
- other small, clearly bounded correction work

This role is not the main story implementor.

It is the lightweight fix path when the orchestrator does not want to route work back through the full story-implementor session and does not need a broader fresh implementation pass.

### Reading Shape

There is no reading journey for the quick fixer.

The quick fixer should receive a narrow, task-specific handoff focused on:

- the requested fix
- the relevant findings or change request
- the affected files or file list
- any specific acceptance or verification requirement tied to the fix

This role should stay intentionally light on context.

### Shared Baseline Prompt Insert

We need a shared flat base-agent prompt insert for:

- story implementor
- quick fixer

This is a future design item and should likely capture the common senior-engineer-style execution guidance shared by both roles without dragging in the full implementation reading journey.

For now, this should be tracked as a required shared prompt primitive still to be drafted.

### Runtime Options

The quick fixer may be run by:

- one of the orchestrator's built-in subagents
- `gpt-5.4 medium`
- `gpt-5.4 high`
- `gpt-5.4 extra high`
- `Sonnet 4.6 medium`
- `Sonnet 4.6 high`

The quick fixer should **never** use the 1M-token Sonnet context window.

### Draft Notes

This role is still early and should stay loosely drafted for now.

The important current shape is:

- small scope
- no reading journey
- narrow fix handoff
- suitable for fast correction work
- shares some baseline execution guidance with the main implementor

## Epic Verifier

### Role

The epic verifier is a fresh epic-level review agent.

This role does not verify story by story.

It verifies the implemented codebase against:

- the epic
- the full tech-design file set

The epic verifier is responsible for performing a full epic review against the intended epic scope and the technical design set, then producing a structured verification report.

Like the story verifier, the epic verifier should be treated as fresh and stateless from the orchestrator's point of view.

### Reading Inputs

The epic verifier should read:

- the epic
- the full tech-design array of files

This role should not be framed as a story-by-story verifier.

It should review the epic as a whole and assess whether the implemented state satisfies the epic and its designs at the epic level.

### Allowed Model Options

Allowed epic-verifier models:

- `gpt-5.4 extra high`
- `gpt-5.4 high`
- `gpt-5.3-codex high`
- `gpt-5.3-codex extra high`
- `Opus 4.7 1M max`
- `Sonnet 4.6 1M high`

### Default Launch Set

If epic verification is run without a model-config array, or with an empty array, the default epic-verifier set should be:

1. `gpt-5.4 extra high`
2. `gpt-5.3-codex extra high`
3. `Sonnet 4.6 1M high`

### Output Shape

Each epic verifier should produce a standalone verify report.

We are moving away from meta reports.

That means:

- each verifier does its own full epic verification pass
- each verifier produces its own report
- later synthesis works from verifier reports, not from a verifier plus a meta-report layer

The orchestrator should not treat epic-verifier sessions as normal retained workflow state.

The normal pattern is:

- launch fresh epic verifier
- receive epic verify report
- move to synthesis
- if another epic-level pass is needed later, launch fresh again

### Draft Notes

The epic verifier is conceptually similar to the story verifier, but with a different reading set and a different unit of review.

Key differences:

- reads epic instead of story
- reads full tech-design file set
- assesses epic completion as a whole
- produces an epic verify report, not a story verify report

## Epic Verification Synthesizer

### Role

The epic verification synthesizer reads the epic verify reports and then independently verifies the issues for itself before returning a final synthesis report.

This is not a pure report-merging role.

The synthesizer should:

- read all epic verify reports
- inspect and verify the reported issues for itself
- determine where verifiers agree or disagree
- produce a synthesized epic-verification result

The synthesizer is also a fresh one-shot role, not retained session state.

### Model Options

Default synthesizer:

- `gpt-5.4 extra high`

Fallback synthesizer if `gpt-5.4 extra high` is not available through Codex or Copilot:

- `Opus 4.7 1M max`

### Output Shape

The synthesizer should return a synthesized epic-verification report that:

- identifies confirmed issues
- identifies disputed or unconfirmed issues
- identifies what appears ready versus what still needs work
- gives the orchestrator a clean basis for final discussion and closeout decisions

### Relationship To Orchestrator

Once synthesis returns, the orchestrator should:

- discuss the results with the user
- decide whether more work should be run
- optionally use the CLI or its own tools ad hoc to finish out and close out the implementation orchestration

This keeps final closeout as an orchestrator-and-human judgment step rather than pretending the verification pipeline auto-settles everything by itself.

## Coherence Notes

Current role-family shape after first-pass drafting:

- **Orchestrator**
  Persistent coordinating session with the human. Owns setup, dispatch, interpretation, routing, and closeout.

- **Story implementor**
  Persistent per-story execution session. Keeps same-session continuity through implementation and self review. This is the main retained worker state in the story workflow.

- **Story verifier**
  Fresh stateless verification role. Reads story plus full tech design, produces a verifier report, and is relaunched fresh for re-verification.

- **Quick fixer**
  Narrow-scope correction role. No reading journey. Used for bounded fixes and document updates when the orchestrator does not want to route back through the full implementor session.

- **Epic verifier**
  Fresh stateless epic-level verification role. Reads epic plus full tech-design file set and produces a standalone epic verify report.

- **Epic verification synthesizer**
  Fresh one-shot synthesis role. Reads epic verify reports, independently verifies the reported issues, and returns a synthesized result for orchestrator-and-human closeout.

Important coherence point:

- retained session state belongs primarily to the orchestrator and the current story implementor
- verifier-style roles should be treated as fresh/stateless by default
- the CLI should own provider-specific launch and resume mechanics
- prompt composition should come from stable role prompts plus reusable snippets rather than monolithic hand-built prompts

## Current Planning Lean

This section captures what we are currently leaning toward during a less formal planning pass.

These are not hard decisions and should be revisited as the real specs are built out.

### Likely Next Spec Sequence

Current likely sequence:

1. use this design note as source material for an `ls-epic` pass
2. let the epic formalize the functional workflow, role behavior, and platform capabilities
3. after the epic is in good shape, create a proper technical design for the CLI and skill implementation

The current note is closer to an epic-oriented functional design than to a true technical design, so the working assumption is that an epic should come next rather than trying to force this note directly into technical-design shape.

### Prompt Handling Lean

We are currently leaning toward treating prompt templating and prompt assembly as a real platform capability that should be described functionally in the epic.

That means the epic may describe things like:

- reusable prompt snippets
- role-specific base prompts
- prompt assembly/composition as part of the workflow platform
- configurable prompt inserts and overlays

What would likely wait for technical design:

- exact prompt assets
- exact prompt wording
- composition mechanics
- file layout and schema
- how prompt templates/snippets are stored and assembled
- exact runtime wiring between the skill, CLI, and prompt assets

There is also a reasonable possibility that prompt architecture should eventually get its own technical-design surface or companion design document rather than being buried entirely inside a single broader CLI/skill tech design.

That is only a current leaning, not a locked decision.
