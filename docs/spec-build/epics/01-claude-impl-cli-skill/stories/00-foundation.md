# Story 0: Foundation

### Summary
<!-- Jira: Summary field -->
Establish canonical spec-pack discovery, tech-design shape detection, durable log initialization, and public prompt-insert detection for `ls-claude-impl`.

### Description
<!-- Jira: Description field -->

**User Profile**

- **Primary User:** A Claude Code orchestration agent operating on behalf of a senior engineer or tech lead
- **Context:** Running a completed spec pack through a disciplined implementation workflow without relying on conversation memory or ad hoc orchestration
- **Mental Model:** "I load a finished spec pack, confirm the environment and options, launch the right workflow through the CLI, and supervise implementation and verification until the epic is complete."
- **Key Constraint:** Claude Code is always available. GPT model lanes depend on whether Codex CLI or Copilot CLI is available in the local environment.

**Objective**

Create the behavior-carrying foundation for the runtime and skill surface so the orchestrator can recognize valid spec packs, identify the active tech-design shape, initialize or resume the durable log, and detect optional prompt-insert files before any provider-backed work begins.

**In Scope**

- Canonical spec-pack layout recognition for v1
- Two-file versus four-file tech-design shape detection
- `team-impl-log.md` initialization and resume behavior
- Detection of public implementor and verifier prompt-insert files

**Out of Scope**

- Verification-gate discovery
- Provider/harness/model default resolution
- Prompt assembly
- Story implementation, verification, or fix routing

**Dependencies**

- None
- Uses the completed epic, tech design, and test plan as the source of truth for spec-pack expectations

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

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

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant Data Contracts**

#### Canonical Epic Folder Contract

| Path | Required | Description |
|------|----------|-------------|
| `epic.md` | yes | The epic being implemented |
| `stories/` | yes | Directory of individual story files |
| `team-impl-log.md` | created by run | Durable orchestration log |
| `custom-story-impl-prompt-insert.md` | no | Optional public implementor insert |
| `custom-story-verifier-prompt-insert.md` | no | Optional public verifier insert |

#### Valid Tech Design Configurations

| Configuration | Required Files |
|---------------|----------------|
| Two-file tech design | `tech-design.md`, `test-plan.md` |
| Four-file tech design | `tech-design.md`, two tech-design companion files, `test-plan.md` |

#### Foundation Command Skeletons

| Command | Purpose |
|---------|---------|
| `inspect` | Resolve spec-pack layout, story inventory, and insert presence |
| `preflight` | Validate authored run config, gate inputs, provider availability, and prompt assets |
| `story-implement` | Start retained implementor execution for a story |
| `story-verify` | Launch a fresh verifier batch |
| `quick-fix` | Run a bounded correction path |
| `epic-cleanup` | Execute cleanup-only corrections before epic verification |
| `epic-verify` | Launch epic-level verification |
| `epic-synthesize` | Consolidate epic verifier findings |

#### Shared CLI Result Envelope

| Field | Description |
|-------|-------------|
| command | The public CLI command that produced the result |
| version | Envelope version |
| status | `ok`, `needs-user-decision`, `blocked`, or `error` |
| outcome | Command-specific routing outcome |
| result | Command payload |
| errors | Machine-readable errors |
| warnings | Non-blocking warnings |
| artifacts | Persisted artifact paths associated with the command |

#### Implementation Log Requirements

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

**Relevant Tech Design Sections**

- `tech-design.md` -> System View, External Contracts, Module Architecture, Manifest and Build Metadata
- `tech-design-skill-process.md` -> Orchestrator-Owned Artifacts, `team-impl-log.md`, Flow 1
- `tech-design-cli-runtime.md` -> Flow 1: Inspect and Preflight, Tech Design Companion Discovery Rules

*See the tech design document for full architecture, implementation targets, and test mapping.*

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- `inspect` can distinguish valid two-file and four-file spec-pack layouts
- Invalid layouts and missing artifacts return explicit blocking feedback
- `team-impl-log.md` can be initialized for new runs and reused for existing runs
- Public prompt-insert file detection is explicit and non-blocking when files are absent
- Story 0 test fixtures cover valid, invalid, and resume-path spec-pack setups
