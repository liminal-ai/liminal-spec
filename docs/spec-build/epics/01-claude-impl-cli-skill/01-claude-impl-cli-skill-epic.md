# Epic: ls-claude-impl

This epic defines the complete requirements for `ls-claude-impl`, a Claude Code orchestration skill that implements a completed Liminal Spec epic story by story using `ls-impl-cli`. It serves as the source of truth for the technical design work.

---

## Liminal Spec Context

Liminal Spec is a spec-driven development methodology for AI-assisted software delivery. It separates planning, specification, design, and implementation into explicit artifacts so that each downstream phase can read complete documents instead of inheriting unstable conversation context.

A **spec pack** is the implementation input bundle for one epic. It contains the epic, the valid tech design set, the test plan, and the sharded story files for that epic.

A **Liminal Spec epic** is the functional source of truth for one feature-sized slice of work. It defines user-facing flows, acceptance criteria, test conditions, scope, and the external contracts the implementation must satisfy.

A **Liminal Spec tech design** is the implementation design for that epic. It translates the epic into module responsibilities, interfaces, work breakdown, design constraints, and a test plan. In this workflow, the valid tech design shapes are:

- `tech-design.md` plus `test-plan.md`
- `tech-design.md` plus two companion tech-design files plus `test-plan.md`

Liminal Spec **stories** are individual story files derived by sharding the epic into ordered implementation slices. Stories live in a `stories/` directory alongside the epic. They preserve traceability back to the epic's acceptance criteria and test conditions so implementation can proceed one story at a time.

The `ls-claude-impl` skill assumes the spec pack already exists and is complete. Its job is not to create these artifacts. Its job is to orchestrate implementation from them.

---

## User Profile

**Primary User:** A Claude Code orchestration agent operating on behalf of a senior engineer or tech lead  
**Context:** Running a completed spec pack through a disciplined implementation workflow without relying on conversation memory or ad hoc orchestration  
**Mental Model:** "I load a finished spec pack, confirm the environment and options, launch the right workflow through the CLI, and supervise implementation and verification until the epic is complete."  
**Key Constraint:** Claude Code is always available. GPT model lanes depend on whether Codex CLI or Copilot CLI is available in the local environment.

---

## Feature Overview

`ls-claude-impl` orchestrates implementation of a completed Liminal Spec epic by reading the spec pack, selecting available model lanes, composing role-fit prompts, launching CLI-backed implementation and verification workflows, collecting structured results, routing fixes, and driving the epic to final verification. The skill defines what must be present, what must be configured, what stages exist, how each stage works, and how the orchestrator calls the CLI through clear public contracts.

The skill does not replace the orchestrator. The orchestrator remains the coordinating intelligence that reads the spec pack, makes routing decisions, runs final gates, interprets structured outputs, records durable progress in `team-impl-log.md`, and decides when to continue, escalate, or close out.

### Workflow Summary

- **[Spec Pack Intake and Run Initialization](#1-spec-pack-intake-and-run-initialization)** — Confirm the epic folder is valid, identify the tech design shape, load all stories, detect prompt inserts, discover verification gates, and initialize `team-impl-log.md`. AC: `1.1-1.6`
- **[Environment Resolution and Role Defaults](#2-environment-resolution-and-role-defaults)** — Detect which providers and model lanes are available, apply default role selections, and record degraded fallback conditions when GPT lanes are unavailable. AC: `2.1-2.4`
- **[Prompt Composition and Public Insert Contracts](#3-prompt-composition-and-public-insert-contracts)** — Assemble role prompts from stable base prompts, reusable snippets, and public insert files in a predictable way. AC: `3.1-3.4`
- **[Story Implementation Workflow](#4-story-implementation-workflow)** — Launch the retained story implementor, complete implementation, and run the default three-pass same-session self-review cycle. AC: `4.1-4.5`
- **[Story Verification and Fix Routing](#5-story-verification-and-fix-routing)** — Launch two fresh verifiers by default, compare structured findings, and route fixes through the implementor, quick fixer, or human judgment. AC: `5.1-5.5`
- **[Story Acceptance, Progression, and Recovery](#6-story-acceptance-progression-and-recovery)** — Run the final story gate, record acceptance evidence, move to the next story, and recover from interruption using durable artifacts. AC: `6.1-6.3`
- **[Pre-Epic-Verification Cleanup](#7-pre-epic-verification-cleanup)** — Materialize deferred and accepted-risk items into an explicit fix batch before epic-level verification begins. AC: `7.1-7.3`
- **[Epic Verification, Synthesis, and Final Closeout](#8-epic-verification-synthesis-and-final-closeout)** — Run fresh epic-level verification, perform mandatory synthesis, review the result with the human, and run the final epic gate before closeout. AC: `8.1-8.4`

---

## Scope

### In Scope

`ls-claude-impl` defines and supports:

- Spec-pack readiness checks against a canonical epic folder structure
- Environment-aware provider and model selection for each orchestration role
- Public orchestration behavior for `ls-impl-cli`
- Prompt composition from stable base prompts, reusable snippets, and public custom prompt-insert files
- Story implementation through a retained implementor session
- Automatic same-session self-review with three default passes and non-controversial fixes
- Fresh dual story verification by default
- Quick-fix routing as a first-class workflow
- Story acceptance, progression, and durable logging in `team-impl-log.md`
- Resume and recovery from durable artifacts rather than conversation memory
- Epic-level verification, mandatory synthesis, and orchestrator-run final project verification

### Out of Scope

- Writing or repairing the epic, tech design, or story artifacts themselves
- General-purpose project planning outside a completed spec pack
- Improvised orchestration that bypasses the defined contracts and role workflows
- Provider-specific implementation details that are invisible to the orchestrator user
- Fully autonomous release or ship decisions without orchestrator and human judgment

### Constraints

| ID | Constraint | Status | Owner | Notes |
|----|------------|--------|-------|-------|
| C1 | The caller is a Claude Code orchestration agent, so Claude Code agent capabilities are available for every run | Validated | Product | This is a defining condition of the skill |
| C2 | A valid spec pack always includes `epic.md`, a `stories/` directory, and one of the two valid tech design configurations defined below | Validated | Product | `stories.md` is not a valid v1 input layout |
| C3 | The CLI is stateless across calls | Validated | Product | A single call may run a multi-step internal workflow, but no run state is stored across calls |
| C4 | `team-impl-log.md` is the durable orchestration record for implementation runs | Validated | Product | This lives alongside the epic and tech design artifacts |

### Operational Defaults

| ID | Default | Status | Owner | Notes |
|----|------------|--------|-------|-------|
| D1 | Codex CLI is preferred when GPT model lanes are available | Validated | Product | Copilot CLI is fallback when Codex is unavailable |
| D2 | If neither Codex CLI nor Copilot CLI is available, the run continues with Claude-only role defaults rather than failing | Validated | Product | This changes role defaults and verifier diversity |
| D3 | Story implementor self-review defaults to 3 passes with evolving prompts and only non-controversial self-fixes | Validated | Product | Uncertain fixes are surfaced to the orchestrator |

---

## Flows & Requirements

### 1. Spec Pack Intake and Run Initialization

The orchestrator begins from an epic folder containing a completed spec pack. The skill guides the orchestrator to confirm that the required artifacts exist, determine which tech design shape is present, identify optional custom prompt inserts, discover the verification gates, establish story order, and initialize the run log before any implementation work starts.

1. Orchestrator points the skill at an epic folder
2. Skill checks for required artifacts
3. Skill identifies the valid tech design configuration
4. Skill checks for optional custom prompt inserts
5. Skill discovers the verification gates the run will use
6. Skill creates or resumes `team-impl-log.md`
7. Skill records the story sequence and initial run choices
8. Orchestrator proceeds to environment and provider resolution

#### Acceptance Criteria

**AC-1.1:** The skill recognizes only valid v1 spec-pack layouts

- **TC-1.1a: Two-file tech design configuration**
  - Given: The epic folder contains `epic.md`, `tech-design.md`, `test-plan.md`, and `stories/`
  - When: The orchestrator initializes a run
  - Then: The skill accepts the spec pack as valid
- **TC-1.1b: Four-file tech design configuration**
  - Given: The epic folder contains `epic.md`, `tech-design.md`, two tech-design companion files, `test-plan.md`, and `stories/`
  - When: The orchestrator initializes a run
  - Then: The skill accepts the spec pack as valid
- **TC-1.1c: Invalid story layout**
  - Given: The epic folder contains `stories.md` instead of `stories/`
  - When: The orchestrator initializes a run
  - Then: The skill reports the layout as invalid for v1 and does not start implementation
- **TC-1.1d: Missing required artifact**
  - Given: A required file or directory is missing
  - When: The orchestrator initializes a run
  - Then: The skill identifies the missing artifact explicitly and does not start implementation

**AC-1.2:** The skill identifies the tech design configuration before role dispatch begins

- **TC-1.2a: Two-file configuration identified**
  - Given: Only `tech-design.md` and `test-plan.md` are present
  - When: The skill inspects the epic folder
  - Then: It records the two-file configuration and does not expect companion tech-design files
- **TC-1.2b: Four-file configuration identified**
  - Given: `tech-design.md`, two companion tech-design files, and `test-plan.md` are present
  - When: The skill inspects the epic folder
  - Then: It records the four-file configuration and makes those companions available to relevant role prompts

**AC-1.3:** The skill initializes `team-impl-log.md` as the durable orchestration record

- **TC-1.3a: New run**
  - Given: No `team-impl-log.md` exists
  - When: The orchestrator starts a new run
  - Then: The skill creates `team-impl-log.md` and records initial run setup information
- **TC-1.3b: Existing run**
  - Given: `team-impl-log.md` already exists
  - When: The orchestrator starts the skill in the same epic folder
  - Then: The skill reads the existing log and resumes from recorded state rather than starting from scratch

**AC-1.4:** The skill detects optional public prompt insert files without making them required

- **TC-1.4a: Both inserts present**
  - Given: `custom-story-impl-prompt-insert.md` and `custom-story-verifier-prompt-insert.md` exist in the epic folder
  - When: The skill initializes the run
  - Then: The skill records that both public inserts are available for prompt assembly
- **TC-1.4b: Inserts absent**
  - Given: Neither custom insert file exists
  - When: The skill initializes the run
  - Then: The skill continues normally and records that no custom inserts are active

**AC-1.5:** The orchestrator reads all stories before starting implementation

- **TC-1.5a: Full story inventory**
  - Given: The epic folder contains multiple story files in `stories/`
  - When: The skill performs run initialization
  - Then: The orchestrator reads all stories and records the story order before Story 0 or Story 1 begins

**AC-1.6:** The skill discovers and records the verification gates before implementation starts

- **TC-1.6a: Gates discovered from project policy**
  - Given: The project exposes verification commands through policy docs, scripts, or CI configuration
  - When: The skill initializes the run
  - Then: The orchestrator identifies the story and epic verification gates and records them in `team-impl-log.md`
- **TC-1.6b: Gate policy ambiguous**
  - Given: Project policy does not clearly identify the required verification gate
  - When: The skill initializes the run
  - Then: The orchestrator pauses to resolve the ambiguity before starting story implementation

### 2. Environment Resolution and Role Defaults

The orchestrator determines which provider lanes and model options are available for the run. Claude lanes are always available. GPT lanes depend on Codex CLI or Copilot CLI availability. The skill teaches the orchestrator what role options exist, what the defaults are, and how those defaults change when providers are unavailable.

1. Orchestrator checks local environment through the prescribed workflow
2. Skill determines whether Codex CLI is available
3. Skill checks Copilot CLI if Codex is unavailable
4. Skill computes available model ranges and per-role defaults
5. Skill records the run’s resolved provider/model matrix
6. Orchestrator uses those defaults when calling the CLI

#### Acceptance Criteria

**AC-2.1:** Claude-only lanes are always available to the orchestrator

- **TC-2.1a: Claude baseline**
  - Given: The orchestrator is a Claude Code agent
  - When: The skill resolves available lanes
  - Then: Claude model lanes are always included in the available role options

**AC-2.2:** Codex CLI is the preferred GPT provider when available

- **TC-2.2a: Codex available**
  - Given: Codex CLI is available
  - When: The skill resolves provider options
  - Then: GPT model defaults for eligible roles are assigned to Codex-backed lanes
- **TC-2.2b: Codex unavailable, Copilot available**
  - Given: Codex CLI is unavailable and Copilot CLI is available
  - When: The skill resolves provider options
  - Then: GPT model defaults for eligible roles are assigned to Copilot-backed lanes
- **TC-2.2c: Neither Codex nor Copilot available**
  - Given: Neither GPT-capable CLI is available
  - When: The skill resolves provider options
  - Then: The skill switches the run to Claude-only defaults and records that change explicitly

**AC-2.3:** The skill defines role-specific available models, defaults, and fallback rules

- **TC-2.3a: Story implementor defaults**
  - Given: Codex CLI is available
  - When: The skill resolves story implementor defaults
  - Then: Story implementation defaults to Codex `gpt-5.4 high`
- **TC-2.3b: Story implementor Claude fallback**
  - Given: No GPT-capable CLI is available
  - When: The skill resolves story implementor defaults
  - Then: Story implementation defaults to Claude Sonnet high
- **TC-2.3c: Story verifier defaults**
  - Given: Codex CLI is available
  - When: The skill resolves story verifier defaults
  - Then: The default verifier pair is `gpt-5.4 extra high` plus Claude Sonnet high
- **TC-2.3d: Story verifier Claude-only fallback**
  - Given: No GPT-capable CLI is available
  - When: The skill resolves story verifier defaults
  - Then: The default verifier pair uses Claude-only verifier roles and records the weaker diversity condition
- **TC-2.3e: Epic verification defaults**
  - Given: GPT-capable lanes and Claude lanes are both available
  - When: The skill resolves epic-level verification defaults
  - Then: The epic verifier set and synthesizer default are selected from the defined allowed models and recorded in the run configuration

**AC-2.4:** The orchestrator records resolved role defaults in `team-impl-log.md`

- **TC-2.4a: Run configuration recorded**
  - Given: Provider and model resolution completed
  - When: The skill finishes environment setup
  - Then: `team-impl-log.md` records available providers, active defaults, and any degraded fallback conditions for the run

### 3. Prompt Composition and Public Insert Contracts

The skill defines prompt composition as a functional capability. Each CLI call is driven by a role-specific base prompt plus reusable prompt snippets and any active public custom insert file for that role. The orchestrator understands what each prompt assembly includes and why.

1. Orchestrator chooses the role workflow to launch
2. Skill selects the role’s base prompt
3. Skill adds the required reusable snippets for that workflow
4. Skill injects the role’s public custom insert if present
5. Skill fills story-, stage-, and environment-specific values
6. Orchestrator calls the CLI with a documented contract

#### Acceptance Criteria

**AC-3.1:** Prompt assembly uses stable role prompts plus reusable prompt snippets

- **TC-3.1a: Story implementor prompt assembly**
  - Given: The orchestrator launches a story implementor workflow
  - When: The skill composes the prompt contract
  - Then: The prompt includes the implementor base prompt, required reusable snippets, current story values, and the applicable reading journey
- **TC-3.1b: Story verifier prompt assembly**
  - Given: The orchestrator launches story verification
  - When: The skill composes the verifier prompts
  - Then: Each verifier prompt includes the verifier base prompt, required reusable snippets, verification-specific values, and the applicable reading journey

**AC-3.2:** `custom-story-impl-prompt-insert.md` is a public contract with deterministic behavior

- **TC-3.2a: Implementor insert applied**
  - Given: `custom-story-impl-prompt-insert.md` exists
  - When: The orchestrator launches a story implementor workflow
  - Then: The skill includes the file’s contents in the implementor prompt assembly every time
- **TC-3.2b: Implementor insert absent**
  - Given: `custom-story-impl-prompt-insert.md` does not exist
  - When: The orchestrator launches a story implementor workflow
  - Then: The skill omits the insert with no error and no special failure path

**AC-3.3:** `custom-story-verifier-prompt-insert.md` is a public contract with deterministic behavior

- **TC-3.3a: Verifier insert applied**
  - Given: `custom-story-verifier-prompt-insert.md` exists
  - When: The orchestrator launches story verification
  - Then: The skill includes the file’s contents in each story verifier prompt assembly
- **TC-3.3b: Verifier insert absent**
  - Given: `custom-story-verifier-prompt-insert.md` does not exist
  - When: The orchestrator launches story verification
  - Then: The skill omits the insert with no error and no special failure path

**AC-3.4:** The reading journey is role-fit and bounded

- **TC-3.4a: Story implementor reading journey**
  - Given: A story implementor workflow is being assembled
  - When: The skill prepares the prompt contract
  - Then: The reading journey includes the story, the full tech design set, and the standard bounded chunking and reflection behavior
- **TC-3.4b: Story verifier reading journey**
  - Given: A story verifier workflow is being assembled
  - When: The skill prepares the prompt contract
  - Then: The reading journey includes the story, the full tech design set, and the verifier’s evidence-focused reading instructions
- **TC-3.4c: Quick fixer handoff**
  - Given: The orchestrator launches a quick-fix workflow
  - When: The skill prepares the prompt contract
  - Then: The quick fixer receives no reading journey at all and remains story-agnostic, with no story-id, story-title, or story-path prompt contract

### 4. Story Implementation Workflow

The orchestrator launches a story implementor through the CLI. The implementor is a retained session for that story. The same session performs initial implementation and self-review. The CLI performs internal multi-step work for that call and returns structured output to the orchestrator.

1. Orchestrator selects the current story and role defaults
2. Orchestrator calls the CLI to launch story implementation
3. CLI runs the implementor using the assembled prompt and role context
4. Implementor completes implementation work
5. CLI runs three default self-review passes in the same session
6. CLI applies only non-controversial fixes during self-review
7. CLI returns structured results, including session continuation fields

#### Acceptance Criteria

**AC-4.1:** Story implementation is launched through a documented CLI contract

- **TC-4.1a: Implementor launch**
  - Given: The orchestrator is ready to start a story
  - When: It calls the story implementor CLI operation
  - Then: The CLI accepts the documented inputs, reads the specified spec-pack artifacts, and returns a structured implementation result

**AC-4.2:** The story implementor remains a retained session for the duration of the story workflow unless replaced

- **TC-4.2a: Same-session continuity**
  - Given: Story implementation completes successfully
  - When: Self-review begins
  - Then: Self-review runs in the same implementor session rather than a fresh session
- **TC-4.2b: Session continuation fields returned**
  - Given: The CLI finishes a story implementation call
  - When: It returns the structured result
  - Then: The result includes the provider identifier and session identifier required to continue that implementor session later

**AC-4.3:** Default self-review uses three passes with evolving prompts

- **TC-4.3a: Three self-review passes**
  - Given: A story implementation call reaches self-review
  - When: The CLI runs the default self-review cycle
  - Then: It runs three self-review passes unless the workflow stops early because of a blocking condition
- **TC-4.3b: Evolving self-review prompt**
  - Given: The CLI is running multiple self-review passes
  - When: It advances from one pass to the next
  - Then: Each pass adjusts the self-review prompt so the implementor does not repeat the same review request unchanged

**AC-4.4:** Self-review applies only non-controversial fixes automatically

- **TC-4.4a: Non-controversial fix**
  - Given: A self-review pass finds a clear and local correction with no meaningful design ambiguity
  - When: The implementor can fix it confidently
  - Then: The CLI allows that fix to be applied during the same story implementation call
- **TC-4.4b: Uncertain fix**
  - Given: A self-review pass finds a potential issue but the implementor is not confident the change is the right fix
  - When: The self-review cycle completes
  - Then: The issue is surfaced to the orchestrator for routing instead of being fixed automatically

**AC-4.5:** The implementor returns a structured report suitable for orchestration and later verification

- **TC-4.5a: Structured implementation result**
  - Given: Story implementation and self-review complete
  - When: The CLI returns the implementor result
  - Then: The result includes identity fields, planning summary, changed files, tests added or changed, gates run, self-review findings, open questions, any spec deviations, and a recommended next step

### 5. Story Verification and Fix Routing

After story implementation, the orchestrator launches fresh story verifiers through the CLI, collects structured reports, compares findings, routes approved fixes, and launches fresh verification again until the story is ready for acceptance or requires escalation.

1. Orchestrator calls the CLI to launch story verification
2. CLI launches two fresh verifier runs by default
3. Each verifier returns a structured evidence-bound report
4. Orchestrator compares verifier results and determines fix routing
5. Orchestrator routes follow-up work to the retained implementor, quick fixer, or human ruling
6. Orchestrator launches fresh verification again when required

#### Acceptance Criteria

**AC-5.1:** Story verification defaults to two fresh verifiers

- **TC-5.1a: Default dual verification**
  - Given: The orchestrator launches story verification with no verifier-count override
  - When: The CLI runs the workflow
  - Then: The CLI launches two fresh verifier runs
- **TC-5.1b: Fresh verifier sessions**
  - Given: Story verification has already run once for the story
  - When: Re-verification is needed
  - Then: The next verifier run uses fresh verifier sessions rather than reusing prior verifier sessions

**AC-5.2:** Each story verifier returns a structured, evidence-bound report

- **TC-5.2a: Verifier report contract**
  - Given: A story verifier finishes its review
  - When: The CLI returns the verifier result
  - Then: The result includes identity fields, artifacts-read information, findings, requirement coverage, gate results, recommended next step, and routing guidance
- **TC-5.2b: Additional observations surfaced**
  - Given: A story verifier notices observations that do not rise to the level of formal findings
  - When: The CLI returns the verifier result
  - Then: The result includes those additional observations rather than dropping them silently
- **TC-5.2c: Mock and shim audit**
  - Given: A story verifier reviews implementation that claims to satisfy an integration-facing story
  - When: The verifier evaluates the story result
  - Then: The verifier checks for inappropriate mocks, shims, placeholders, or fake adapters that allow tests to pass without exercising the intended implementation path and reports them explicitly

**AC-5.3:** Quick fixer is a first-class correction workflow

- **TC-5.3a: Quick-fix routing**
  - Given: The orchestrator identifies a small, clearly bounded correction
  - When: It chooses the quick-fix path
  - Then: The skill provides a narrow quick-fix contract rather than sending the issue through full story re-implementation
- **TC-5.3b: Quick-fix routing contract remains explicit**
  - Given: The quick fixer is used
  - When: The workflow is launched
  - Then: The explicit contract lives at the orchestrator routing layer for when quick-fix is appropriate, while the subagent prompt itself remains intentionally contract-free beyond the outer result envelope

**AC-5.4:** Unresolved or uncertain fixes are routed by the orchestrator rather than hidden

- **TC-5.4a: Implementor uncertainty**
  - Given: The implementor or self-review finds an issue but is not confident in the best change
  - When: The structured result is returned
  - Then: The issue is surfaced to the orchestrator for a routing decision
- **TC-5.4b: Verifier disagreement**
  - Given: Two story verifiers disagree materially on whether a finding is real or blocking
  - When: The orchestrator reviews the results
  - Then: The skill supports fresh follow-up verification or human escalation rather than pretending the disagreement is resolved

**AC-5.5:** The orchestrator runs the final story acceptance gate itself

- **TC-5.5a: Story gate owned by orchestrator**
  - Given: Story implementation and verification appear complete
  - When: The story is ready for acceptance
  - Then: The orchestrator runs the final story acceptance gate itself rather than relying only on verifier evidence

### 6. Story Acceptance, Progression, and Recovery

The orchestrator records durable story state, accepts the story only after final verification passes, progresses to the next story from the pre-read story set, and can recover after interruption by using artifacts on disk rather than relying on active conversation context.

1. Orchestrator reviews implementation and verifier outputs
2. Orchestrator runs the final story gate
3. Orchestrator records a pre-acceptance receipt in `team-impl-log.md`
4. Orchestrator accepts and commits the story
5. Orchestrator updates cumulative expectations and transitions to the next story
6. If interrupted, the orchestrator resumes from durable artifacts

#### Acceptance Criteria

**AC-6.1:** Story acceptance requires explicit recorded evidence

- **TC-6.1a: Pre-acceptance receipt**
  - Given: A story is ready for acceptance
  - When: The orchestrator completes the acceptance decision
  - Then: `team-impl-log.md` records the implementation evidence, verification evidence, gate results, dispositions, and open risks for that story

**AC-6.2:** Story progression uses cumulative evidence rather than ad hoc memory

- **TC-6.2a: Cumulative progression**
  - Given: One story has been accepted
  - When: The orchestrator prepares to start the next story
  - Then: The skill uses the committed codebase, the story order, the log, and recorded cumulative expectations to guide the transition
- **TC-6.2b: Test-count regression check**
  - Given: One story has been accepted and a later story is ready for acceptance
  - When: The orchestrator compares the current test total to the prior accepted baseline
  - Then: A lower-than-expected test total is treated as a regression that blocks acceptance until resolved

**AC-6.3:** Recovery does not depend on preserving orchestration conversation context

- **TC-6.3a: Resume after interruption**
  - Given: The orchestrator session is interrupted after implementation work has started
  - When: The skill is loaded again in the same epic folder
  - Then: The orchestrator can resume from `team-impl-log.md` and the durable artifacts created by prior CLI calls
- **TC-6.3b: Resume after context stripping**
  - Given: Prior tool-call context is no longer present in the orchestration session
  - When: The run resumes
  - Then: The skill continues from files on disk rather than requiring the prior full conversation

### 7. Pre-Epic-Verification Cleanup

After all stories are accepted and before epic-level verification begins, the orchestrator compiles deferred and accepted-risk items into a durable cleanup batch. The orchestrator reviews that batch with the human, routes approved fixes, and verifies the resulting state before moving into full-epic verification.

1. Orchestrator compiles deferred and accepted-risk items from completed stories
2. The cleanup list is materialized as a durable artifact
3. Orchestrator reviews the cleanup batch with the human
4. Approved cleanup items are fixed through the appropriate workflow
5. The orchestrator verifies the cleanup results before epic verification starts

#### Acceptance Criteria

**AC-7.1:** Deferred and accepted-risk items are materialized before epic verification

- **TC-7.1a: Cleanup list compiled**
  - Given: All story-level work is complete
  - When: The run transitions toward epic verification
  - Then: Deferred and accepted-risk items from prior story cycles are compiled into a durable cleanup artifact

**AC-7.2:** Cleanup is reviewed before dispatch

- **TC-7.2a: Human review of cleanup batch**
  - Given: A cleanup artifact has been compiled
  - When: The orchestrator prepares to dispatch cleanup work
  - Then: The orchestrator reviews the categorized cleanup batch with the human before dispatching it

**AC-7.3:** Epic verification starts from the cleaned state rather than skipping outstanding tracked items

- **TC-7.3a: Cleanup before epic verification**
  - Given: The cleanup phase has produced approved fixes
  - When: The run proceeds to epic verification
  - Then: The orchestrator verifies the cleanup result before launching epic-level verification

### 8. Epic Verification, Synthesis, and Final Closeout

After all stories are accepted, the orchestrator runs epic-level verification through the CLI, collects fresh epic-verifier reports, runs a mandatory synthesis workflow, reviews the results with the human, and runs the final epic gate itself before closeout.

1. Orchestrator launches epic-level verification through the CLI
2. CLI launches the configured epic verifier set
3. Epic verifiers return standalone reports
4. Orchestrator launches mandatory synthesis
5. Synthesis verifies and consolidates epic-level findings
6. Orchestrator reviews results with the human
7. Orchestrator runs the final epic acceptance gate and closes out the run

#### Acceptance Criteria

**AC-8.1:** Epic-level verification is mandatory for every run

- **TC-8.1a: Multi-story epic**
  - Given: All stories in a multi-story epic are accepted
  - When: The implementation run reaches epic closeout
  - Then: The skill requires epic-level verification before final closeout
- **TC-8.1b: No skip path**
  - Given: The implementation run reaches epic closeout
  - When: The orchestrator is deciding next steps
  - Then: The skill does not treat epic-level verification as optional
- **TC-8.1c: Epic-level mock and shim audit**
  - Given: Epic-level verification is running
  - When: Epic verifiers review the implemented system
  - Then: They check for remaining inappropriate mocks, shims, placeholders, or fake adapters on production paths and report them explicitly

**AC-8.2:** Epic synthesis is mandatory for every run

- **TC-8.2a: Mandatory synthesis**
  - Given: Epic verifier reports have been collected
  - When: The epic verification workflow proceeds
  - Then: The orchestrator launches the synthesis workflow every run

**AC-8.3:** Epic synthesis is more than report merging

- **TC-8.3a: Synthesizer verifies reported issues**
  - Given: Epic verifier reports contain findings
  - When: The synthesis workflow runs
  - Then: The synthesizer independently checks and categorizes the reported issues before returning its result

**AC-8.4:** The orchestrator runs final epic verification commands itself

- **TC-8.4a: Final epic gate owned by orchestrator**
  - Given: Epic verification and synthesis are complete
  - When: The run is ready for final closeout
  - Then: The orchestrator runs the final epic acceptance gate itself rather than relying only on verifier and synthesizer reports

---

## Data Contracts

The epic’s contracts cover the spec-pack root, public insert files, and the CLI surfaces the orchestrator must understand and use.

### Canonical Epic Folder Contract

Required files and directories:

| Path | Required | Description |
|------|----------|-------------|
| `epic.md` | yes | The epic being implemented |
| `stories/` | yes | Directory of individual story files |
| `team-impl-log.md` | created by run | Durable orchestration log |
| `custom-story-impl-prompt-insert.md` | no | Optional public implementor insert |
| `custom-story-verifier-prompt-insert.md` | no | Optional public verifier insert |

Valid tech design configurations:

| Configuration | Required Files |
|---------------|----------------|
| Two-file tech design | `tech-design.md`, `test-plan.md` |
| Four-file tech design | `tech-design.md`, two tech-design companion files, `test-plan.md` |

### Role Model Matrix

| Role | Primary Use | Default | Fallback | Session Shape |
|------|-------------|---------|----------|---------------|
| Orchestrator | Run setup, routing, interpretation, final gates | Claude Code orchestration agent | none | Retained interactive session |
| Story implementor | Main story implementation | Codex `gpt-5.4 high` when Codex CLI is available | Copilot `gpt-5.4 high`, then Claude Sonnet high | Retained per-story session |
| Story verifier | Fresh story review | Default pair: `gpt-5.4 extra high` plus Claude Sonnet high when GPT lanes are available | Claude-only verifier pair when GPT lanes are unavailable | Fresh session per verifier run |
| Quick fixer | Small, bounded correction work | General-purpose quick-fix agent using run defaults | Any available lighter-weight lane allowed by the run | Fresh lightweight session |
| Epic verifier | Full-epic verification | Configured epic verifier set for the run | Claude-only epic verifier set when GPT lanes are unavailable | Fresh session per verifier run |
| Epic synthesizer | Verify and consolidate epic-level findings | Primary synthesis model for the run | Claude fallback synthesizer when GPT lanes are unavailable | Fresh one-shot session |

### CLI Operations

The exact command syntax is a technical design concern. The orchestrator-facing operations are functional contracts.

| Operation | Purpose | Required Inputs | Expected Outputs | Outcome States |
|-----------|---------|-----------------|------------------|----------------|
| Initialize / inspect run context | Validate the spec pack and environment | epic folder path, optional explicit configuration | resolved spec-pack shape, provider availability, role defaults, detected inserts | ready, needs-user-decision, blocked |
| Launch story implementor | Start story implementation | story id, role config, prompt assembly inputs, working directory | structured implementor result, provider id, session id | ready-for-verification, needs-followup-fix, needs-human-ruling, blocked |
| Continue story implementor | Continue the retained implementor session | provider id, session id, follow-up prompt contract | continued implementor result | ready-for-verification, needs-followup-fix, needs-human-ruling, blocked |
| Launch story verifiers | Run story verification | story id, verifier configs, prompt assembly inputs, working directory | array of structured verifier results | pass, revise, block |
| Launch quick fixer | Run a bounded correction workflow | free-form task description, working directory, role config | outer result envelope plus provider-native quick-fix output | ready-for-verification, needs-more-routing, blocked |
| Launch epic verifiers | Run epic-level verification | epic folder context, verifier configs, working directory | array of structured epic verifier results | pass, revise, block |
| Launch epic synthesis | Synthesize epic verification results | epic verifier reports, synthesis config, working directory | synthesized epic result | ready-for-closeout, needs-fixes, needs-more-verification, blocked |
| Launch pre-epic cleanup | Resolve deferred and accepted-risk items before epic verification | cleanup batch artifact, selected fix workflow, working directory | cleanup result and updated verification state | cleaned, needs-more-cleanup, blocked |

### Implementation Log Requirements

`team-impl-log.md` is a durable orchestration artifact. The epic does not fully define its schema, but it does require the log to capture enough structure for recovery, progression, and closeout.

The log must record:

- current run state and overall run status
- active provider/model choices and verification-gate configuration
- story sequence, dependencies, and current progress across stories
- artifact paths used by the run
- story-level checkpoints with evidence references, gate results, commit outcomes, and open items
- cumulative test progression and regression-relevant baseline information
- pre-epic-cleanup status
- epic-verification and synthesis status
- enough state for the orchestrator to resume after interruption without reconstructing the run from conversation context

### Implementor Result

| Field | Description |
|-------|-------------|
| provider id | Provider/runtime used for the implementor |
| session id | Identifier required to continue the same implementor session |
| story id and title | Story identity |
| plan summary | ACs, TCs, non-TC tests, approach, likely failure modes |
| change inventory | Files changed and why |
| test summary | Tests added, modified, removed, and total count after story |
| test-count delta | Change in test total from the prior accepted story baseline |
| gates run and gate results | What was executed and what passed or failed |
| self-review findings fixed | Issues found and fixed during the self-review loop |
| self-review findings surfaced | Uncertain or unresolved issues sent back to the orchestrator |
| open questions | Blocking uncertainties |
| spec deviations | Any divergence from story, tech design, or test plan |
| recommended next step | Orchestrator routing recommendation |

### Story Verifier Result

| Field | Description |
|-------|-------------|
| provider id | Provider/runtime used for the verifier |
| verifier label | Distinguishes verifier instances in the same batch |
| story id and title | Story identity |
| artifacts read | What the verifier actually read |
| review scope summary | What the verifier focused on |
| findings | Structured findings with severity and evidence |
| verified and unverified ACs/TCs | Requirement coverage outcome |
| gates run and gate results | What checks were executed |
| mock or shim audit findings | Any inappropriate mocks, shims, placeholders, or fake adapters found during verification |
| recommended next step | `pass`, `revise`, or `block` |
| recommended fix scope | Same-session implementor, quick fix, fresh fix path, or human ruling |
| open questions | Unsettled issues |
| additional observations | What else the verifier noticed but did not include as a formal finding |

### Quick Fix Request

The quick-fix workflow is intentionally simpler than the main implementor workflow.

| Field | Description |
|-------|-------------|
| prompt/request text | The main bounded fix request |
| working directory | Project directory where the fix runs |
| provider/model override | Optional override when the orchestrator wants a non-default quick-fix lane |
| acceptance hint | Optional gate command, validation hint, or expected outcome |

The quick-fix request is intentionally story-agnostic. It does not carry a story-id, story-title, story-path, or any reading-journey contract.

### Quick Fix Result

The quick-fix result requires only the outer CLI result envelope. The inner payload is provider-native free-form output rather than a structured quick-fix schema.

### Epic Verifier Result

| Field | Description |
|-------|-------------|
| provider id | Provider/runtime used for the epic verifier |
| reviewer label | Distinguishes reviewers in the epic batch |
| cross-story findings | Integration and consistency findings |
| architecture findings | End-to-end architecture issues |
| epic AC/TC coverage assessment | Compliance and completeness findings |
| mock or shim audit findings | Remaining inappropriate mocks, shims, placeholders, or fake adapters on production paths |
| non-blocking and blocking findings | Categorized issues |
| unresolved items | Evidence gaps or uncertain claims |
| gate result | Result of the epic verification checks run by that verifier |

### Epic Synthesis Result

| Field | Description |
|-------|-------------|
| confirmed issues | Findings the synthesizer validated |
| disputed or unconfirmed issues | Findings not validated cleanly |
| readiness assessment | Whether the epic appears ready for closeout |
| recommended next step | Additional fixes, additional verification, or closeout discussion |

---

## Dependencies

Technical dependencies:

- Claude Code orchestration environment
- `ls-impl-cli`
- Optional Codex CLI or Copilot CLI for GPT lanes
- Completed Liminal Spec epic folder

Process dependencies:

- Epic, tech design, test plan, and stories are already complete
- The human has decided that the epic is ready for implementation orchestration
- The orchestrator has access to the project working directory and verification commands

---

## Non-Functional Requirements

### Durability

- The run must be recoverable from files on disk rather than conversation memory
- `team-impl-log.md` must be sufficient to understand current progress and prior decisions
- CLI results must return structured outputs suitable for durable recording

### Context Discipline

- The orchestrator must not need to preload unnecessary artifacts before implementation begins
- Reading journeys must be bounded and role-fit
- Prompt composition must reduce duplicated rereads where those rereads do not add value

### Verification Quality

- Story verification defaults to two fresh verifiers
- Epic verification and synthesis run every time
- The orchestrator runs final story and epic gates itself
- Uncertain fixes are surfaced rather than silently applied

### Operational Clarity

- The skill must define what each stage does and what each CLI operation contract expects
- The CLI surface must be legible enough that an orchestration agent can use it consistently without improvising undocumented behavior

---

## Tech Design Questions

Questions for the Tech Lead to answer during design:

1. What are the exact public CLI commands, arguments, exit codes, and result artifact formats for each v1 operation?
2. How are prompt assets stored, versioned, and assembled from base prompts and reusable snippets?
3. How does the CLI implement the three evolving self-review passes inside a single story implementation call?
4. What exact model matrix is supported per provider and per role, including fallback behavior when lanes are unavailable?
5. How are continuation identifiers represented and validated when a retained implementor session is resumed?
6. What exact fields and serialization format are used for implementor, verifier, quick-fix, epic verifier, and synthesis results?
7. What standard state model and required fields should `team-impl-log.md` use, informed by prior `ls-team-impl` and `ls-codex-impl` logs?
8. How does the orchestrator consume CLI results and write them into `team-impl-log.md` consistently?
9. How should story and epic verification gates be hardened in the runtime and derived from project policy?
10. What file naming convention is used for the two companion tech-design files in the four-file configuration?
11. What exact conditions trigger implementor replacement versus same-session continuation?
12. How does the quick-fix workflow stay narrow while still returning enough structured evidence for safe re-verification?
13. How should pre-epic-verification cleanup artifacts and correction-only fix workflows be represented and verified?
14. How should the three self-review prompts evolve across passes, and what stop rules determine whether another pass runs?

---

## Recommended Story Breakdown

### Story 0: Foundation
**Delivers:** Canonical epic-folder discovery, CLI operation skeletons, public contracts, structured result shapes, and `team-impl-log.md` initialization conventions. This epic's Story 0 is a behavior-carrying foundation story, not a no-behavior setup-only exception.  
**Prerequisite:** None  
**ACs covered:**
- AC-1.1
- AC-1.2
- AC-1.3
- AC-1.4

### Story 1: Run Setup and Environment Resolution
**Delivers:** Verification-gate discovery, environment checks, provider availability detection, role-specific model defaults and fallback logic, and story order initialization  
**Prerequisite:** Story 0  
**ACs covered:**
- AC-1.5
- AC-1.6
- AC-2.1
- AC-2.2
- AC-2.3
- AC-2.4

### Story 2: Prompt Composition and Public Inserts
**Delivers:** Base prompt selection, reusable snippet assembly, public insert handling, and role-fit reading journeys  
**Prerequisite:** Story 1  
**ACs covered:**
- AC-3.1
- AC-3.2
- AC-3.3
- AC-3.4

### Story 3: Story Implementor Workflow
**Delivers:** Story implementation launch, retained implementor session, structured implementor result, and three-pass self-review behavior  
**Prerequisite:** Story 2  
**ACs covered:**
- AC-4.1
- AC-4.2
- AC-4.3
- AC-4.4
- AC-4.5

### Story 4: Story Verification Workflow
**Delivers:** Dual fresh verifier launch, verifier result contracts, and evidence-bound verification batches  
**Prerequisite:** Story 3  
**ACs covered:**
- AC-5.1
- AC-5.2

### Story 5: Fix Routing and Quick Fix
**Delivers:** Quick fixer workflow, same-session implementor continuation, uncertain-fix routing, and re-verification triggers  
**Prerequisite:** Story 4  
**ACs covered:**
- AC-5.3
- AC-5.4

### Story 6: Story Acceptance and Progression
**Delivers:** Orchestrator-run final story gate, pre-acceptance receipts, durable progression, and story-to-story transition behavior  
**Prerequisite:** Story 5  
**ACs covered:**
- AC-5.5
- AC-6.1
- AC-6.2

### Story 7: Resume and Recovery
**Delivers:** Recovery from interruption and context loss using disk artifacts and `team-impl-log.md`  
**Prerequisite:** Story 6  
**ACs covered:**
- AC-6.3

### Story 8: Epic Verification, Synthesis, and Closeout
**Delivers:** Pre-epic cleanup, epic verifier workflows, mandatory synthesis, orchestrator-run final epic gate, and closeout behavior  
**Prerequisite:** Story 7  
**ACs covered:**
- AC-7.1
- AC-7.2
- AC-7.3
- AC-8.1
- AC-8.2
- AC-8.3
- AC-8.4

---

## Validation Checklist

- [ ] User Profile has all four fields + Feature Overview
- [ ] Scope boundaries are explicit
- [ ] The two valid tech-design configurations are defined clearly
- [ ] Every major orchestration stage is represented as a flow
- [ ] Every AC is testable
- [ ] Every AC has at least one TC
- [ ] Flows cover happy paths, alternate paths, and error or recovery paths
- [ ] TCs cover happy path, edge cases, and errors where applicable
- [ ] Data contracts are explicit at the orchestrator ↔ CLI ↔ artifact seams
- [ ] Story breakdown covers the full workflow
- [ ] Story ordering follows dependency order
- [ ] Self-review behavior, verifier defaults, quick fix, resume, and final gates are all explicit
- [ ] Non-functional requirements are distinct from AC/TC behavior rather than repeating it
