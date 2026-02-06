# Liminal Spec

A spec-driven development methodology for AI-assisted coding. Designed for features with detailed requirements, complex integrations, or multi-agent coordination.

Liminal Spec runs a phased pipeline where each phase produces an artifact the next phase reads cold — no shared conversation history, no accumulated assumptions. The traceability chain (requirement → test condition → test → code) means when tests go green, you have high confidence the implementation matches the spec.

## How It Works

Five phases, each defined by what goes in and what comes out:

| Phase | In | Out |
|-------|-----|------|
| 1. Product Research | Vision, idea | PRD |
| 2. Feature Specification | Requirements | Feature Spec |
| 3. Tech Design | Feature Spec | Tech Design |
| 4. Story Sharding | Spec + Design | Stories + Prompt Packs |
| 5. Execution | Prompts | Verified code |

Most work starts at Phase 2. Phase 1 is optional — skip it if you already know what you're building.

Within Phase 5, each story follows: **Skeleton → TDD Red → TDD Green → Gorilla Test → Verify**.

## Key Ideas

**Context isolation.** "Agents" means fresh context with artifact handoff — not roleplay personas. Each phase gets a clean context window. The artifact (document) is the complete handoff. This eliminates negotiation baggage, maximizes token efficiency, and makes handoffs debuggable.

**Confidence chain.** Every line of code traces back: AC (requirement) → TC (test condition) → Test → Implementation. Can't write a TC? The AC is too vague. Can't write a test? The TC is too vague.

**Upstream scrutiny.** The feature spec gets the most review because errors there cascade through every downstream phase. Implementation errors are localized. Review effort follows this gradient.

**Multi-model validation.** Different models catch different things. Artifacts are validated by their downstream consumer (the agent who needs to use them) and by a different model for diverse perspective.

## Installation

Liminal Spec is a [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code/skills). Install it to your user skills directory:

```bash
# Clone the repo
git clone https://github.com/liminal-ai/liminal-spec.git

# Symlink to Claude Code skills directory (recommended — pull updates with git pull)
mkdir -p ~/.claude/skills
ln -s "$(pwd)/liminal-spec" ~/.claude/skills/liminal-spec
```

Alternatively, copy only the skill files (excludes dev artifacts like `.git`, `CHANGELOG.md`, `deploy.sh`):

```bash
mkdir -p ~/.claude/skills/liminal-spec
rsync -av --exclude='.git' --exclude='CHANGELOG.md' --exclude='V2-ROADMAP.md' \
  --exclude='deploy.sh' --exclude='.DS_Store' \
  liminal-spec/ ~/.claude/skills/liminal-spec/
```

Once installed, invoke it in Claude Code with `/liminal-spec`.

## What's In the Box

```
SKILL.md                              # Core methodology (loaded by Claude Code)
references/
  feature-specification.md            # Phase 2: spec writing, AC/TC patterns, template
  tech-design.md                      # Phase 3: architecture and interfaces
  story-sharding.md                   # Phase 4: breaking work into stories
  story-prompts.md                    # Writing self-contained prompt packs
  implementation.md                   # Phase 5: execution from prompts
  phase-execution.md                  # Story cycle: Skeleton → Red → Green → Gorilla → Verify
  execution-orchestration.md          # Agent coordination, dual-validator, parallel pipeline
  verification.md                     # Multi-agent validation patterns
  testing.md                          # Mock strategies, test architecture
  product-research.md                 # Phase 1: PRD (optional)
  context-economics.md                # Why context isolation works
  writing-style.md                    # Documentation principles
  terminology.md                      # Glossary
  state-management.md                 # Project state and recovery
  prompting-opus-4.6.md               # Orchestration and prompt drafting guidance
  prompting-gpt-5x.md                 # Verification and implementation guidance
templates/
  tech-design.template.md             # Phase 3 artifact template
examples/
  feature-verification-prompt.md      # Ready-to-use prompt for spec validation
  tech-design-verification-prompt.md  # Ready-to-use prompt for design validation
```

References are loaded progressively — only what's needed for the current phase. SKILL.md tells the model what to load when.

## When to Use

- New features with multiple components or integration points
- Complex business logic where requirements need precision
- Multi-agent builds where context isolation matters

Not for: quick bug fixes, single-file changes, spikes, or emergency patches. Liminal Spec either runs full or not at all — no "lite" versions.

## Adapting It

The methodology is opinionated but the skill files are plain Markdown. Fork it and adjust to your needs:

- Swap model recommendations for what you have access to
- Modify the feature spec template for your domain
- Adjust the story execution cycle phases
- Change verification checkpoint criteria

The core ideas (context isolation, artifact handoff, traceability chain, upstream scrutiny) are what make the methodology work. The specific file structure and model choices are implementation details.

## Links

- **Source:** [github.com/liminal-ai/liminal-spec](https://github.com/liminal-ai/liminal-spec)

## License

MIT
