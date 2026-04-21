# Story 2: Prompt Composition and Public Inserts

### Summary
<!-- Jira: Summary field -->
Assemble role prompts deterministically from base prompts, reusable snippets, role-fit reading journeys, and optional public insert files.

### Description
<!-- Jira: Description field -->

**User Profile**

- **Primary User:** A Claude Code orchestration agent operating on behalf of a senior engineer or tech lead
- **Context:** Running a completed spec pack through a disciplined implementation workflow without relying on conversation memory or ad hoc orchestration
- **Mental Model:** "I load a finished spec pack, confirm the environment and options, launch the right workflow through the CLI, and supervise implementation and verification until the epic is complete."
- **Key Constraint:** Claude Code is always available. GPT model lanes depend on whether Codex CLI or Copilot CLI is available in the local environment.

**Objective**

Build the prompt-system layer that turns stable role prompts, reusable prompt snippets, reading journeys, and optional public insert files into deterministic prompt assemblies for implementor, verifier, and quick-fix workflows.

**In Scope**

- Stable role-prompt + snippet composition
- Deterministic inclusion of `custom-story-impl-prompt-insert.md`
- Deterministic inclusion of `custom-story-verifier-prompt-insert.md`
- Role-fit reading journeys for implementor, verifier, and quick-fix workflows

**Out of Scope**

- Actual provider execution
- Story implementation or verification logic
- Story progression, receipts, or recovery

**Dependencies**

- Story 1 complete
- Run configuration and story order already resolved

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

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
  - Then: The quick fixer receives a narrow, task-specific handoff rather than the full story reading journey

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant Data Contracts**

#### Canonical Epic Folder Contract (insert files)

| Path | Required | Description |
|------|----------|-------------|
| `custom-story-impl-prompt-insert.md` | no | Optional public implementor insert |
| `custom-story-verifier-prompt-insert.md` | no | Optional public verifier insert |

#### CLI Operations Driven by Prompt Assembly

| Operation | Purpose | Required Inputs | Expected Outputs | Outcome States |
|-----------|---------|-----------------|------------------|----------------|
| Launch story implementor | Start story implementation | story id, role config, prompt assembly inputs, working directory | structured implementor result, provider id, session id | ready-for-verification, needs-followup-fix, needs-human-ruling, blocked |
| Launch story verifiers | Run story verification | story id, verifier configs, prompt assembly inputs, working directory | array of structured verifier results | pass, revise, block |
| Launch quick fixer | Run a bounded correction workflow | fix request, affected scope, role config | structured quick-fix result | ready-for-verification, needs-more-routing, blocked |

**Relevant Tech Design Sections**

- `tech-design-cli-runtime.md` -> Prompt Asset System, Prompt Asset Content Contracts, Prompt Assembly Pipeline
- `tech-design-skill-process.md` -> Flow 2: Progressive Reading Journey, `src/references/claude-impl-prompt-system.md`
- `tech-design.md` -> Module Architecture and Work Breakdown Summary

*See the tech design document for full architecture, implementation targets, and test mapping.*

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- Prompt assembly is deterministic for implementor, verifier, and quick-fix workflows
- Public insert files are applied when present and ignored cleanly when absent
- Reading journeys differ appropriately by role
- Prompt asset content contracts are explicit enough to drive structured output and routing behavior
