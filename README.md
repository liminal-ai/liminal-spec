# Liminal Spec

A spec-driven development skill pack for AI coding assistants.

## What This Is

Liminal Spec is a set of skills that guide AI agents through a structured development process: define what you're building, specify the requirements in detail, design the implementation, and break it into implementable stories. Each phase produces a document that the next phase reads cold, with no shared conversation and no accumulated assumptions.

The core idea is a traceability chain: every acceptance criterion gets test conditions, every test condition maps to a test, every test drives implementation. When tests pass, you can follow the chain from any test back to the requirement it verifies. You know the build matches what was specified because the chain makes it auditable.

## Is This For You?

Liminal Spec works best when you can describe most of what you want to build before you start building it. The sweet spot is a feature or epic that would take a team 1-4 weeks to build traditionally: standard database patterns, known integrations, established UI frameworks, clear user workflows. The kind of work where you can spend a few hours thinking through what users need and what the system should do, and come away with a substantial picture of the requirements.

That describes most enterprise business applications, many startup products, and a lot of hobbyist projects with clear goals.

**Not the right tool for:**
- Quick bug fixes or just a few small file changes. Use your AI coding assistant's plan mode feature.
- Experimental work where you're discovering what works through iteration, like a novel algorithm, an unfamiliar protocol, or something where the hard part is figuring out whether the approach even works. Use small slices of plan mode and execution iterations.
- Situations where you genuinely don't know what you want yet and need to build small pieces to find out

You can also mix approaches. The surrounding system benefits from specs even when one component requires experimental iteration.

### A Note on Documentation

The specs produced by this process are blueprints for a build, not living application documentation. They can serve as a useful basis for writing or updating your application's "as-is" documentation, but they are not a substitute for it. Application documentation still requires regular updates to stay current and useful. Liminal Spec and spec-driven development in general were never intended as a solution for keeping current the as-is documentation of an application.

## Who Benefits Most

**Senior engineers and tech leads** get the most out of this. The methodology assumes you can reason about user needs, system boundaries, and technical tradeoffs, then express that reasoning as structured requirements. Engineers who've been turning business problems into code for years already think this way. The specs formalize and amplify that thinking so AI agents can execute from it reliably.

**POs and BAs** can use the functional-side skills (writing epics, publishing stories) in Claude.ai or any AI assistant using the standalone markdown files. The specs force enough clarifying questions that even someone new to the process produces detailed, testable output. The output format includes Jira section markers for direct copy-paste into project management tools.

**Developers receiving stories** from this process get implementation artifacts with full acceptance criteria, test conditions, and technical notes. The stories are self-contained. You implement from the story, not from a conversation with the person who wrote the spec.

## How It Works

The pipeline has five phases. Each produces an artifact the next phase consumes.

**1. PRD** (`ls-prd`) -- Define what you're building across 3-8 features. Each feature section has user scenarios and acceptance criteria at a level of detail that lets the next phase expand them without going back to the human for basic questions. Run alongside `ls-arch` (Technical Architecture) to settle the technical world: stack, system shape, major boundaries.

**2. Epic** (`ls-epic`) -- Expand one feature into a complete functional specification. Line-level acceptance criteria, each with test conditions. Data contracts at system boundaries. A recommended story breakdown. This is the most important artifact. Errors here cascade through everything downstream. The human reviews every line.

**3. Tech Design** (`ls-tech-design`) -- Design the implementation. Module architecture, interface definitions, test mapping, work breakdown. The tech design validates the epic first. If it can't design from the spec, the spec isn't ready. Produces 2 or 4 documents depending on complexity.

**4. Publish Epic** (`ls-publish-epic`) -- Break the epic into individual story files, each with full acceptance criteria, test conditions, and technical notes from the tech design. Produces a coverage artifact proving every requirement is assigned to exactly one story. Optionally produces a PO-friendly business epic.

**5. Implement** (`ls-team-impl-cc` or `ls-team-impl`) -- Orchestrate story-by-story implementation with agent teams. TDD methodology (skeleton, red, green per story). External model verification. Each story gets a fresh implementer and a fresh reviewer. No carrying assumptions between stories.

You don't have to use the full pipeline. If you already have requirements, start at step 2. If you have a spec, start at step 3. If you have stories, start at step 5.

### Team Orchestration

`ls-team-spec` orchestrates the spec pipeline (steps 1-4) with agent teams: drafters, external verifiers, and human review gates. `ls-team-impl-cc` and `ls-team-impl` orchestrate implementation (step 5) with Claude Code teams or external CLI models (Codex, Copilot).

## Try It Out

### If you have Claude Code or another AI coding agent

Download the skill pack from [Releases](https://github.com/liminal-ai/liminal-spec/releases) and unzip into your skills directory:

```bash
# Claude Code
unzip liminal-spec-skill-pack.zip -d ~/.claude/

# Other agents (Copilot, Codex, Gemini CLI, Cursor, Windsurf, Antigravity, etc.)
# These agents use the .agents directory as a shared skills harness
unzip liminal-spec-skill-pack.zip -d ~/.agents/
```

We no longer support the Claude Code plugin and plugin marketplace formats. They are buggy, confusing, only work with Claude Code, and often lead to working with stale versions of the artifacts without realizing it. We are investigating simpler, better-functioning mechanisms to distribute a pack of skills, agents, and commands together that work more intuitively across coding agent platforms. Versions of this should be out by early to mid April 2026.

Once installed, start a new conversation in your project. The easiest first experience is writing an epic for something you already understand well, like a feature you've been thinking about or a piece of work already on your board.

Tell Claude: "I want to write a spec for [your feature]. Use ls-epic."

The skill will interview you about the user profile, scope, flows, and acceptance criteria. Don't fight the structure; let it ask its questions. The output will be longer and more detailed than you'd write by hand. That's the point. The detail is what makes the downstream phases work.

Once you have an epic you're happy with, try `ls-tech-design` on it. Then `ls-publish-epic` to get stories. Each step builds on the previous artifact.

### If you have Claude.ai (Enterprise, Pro, or Team)

Download the markdown pack from [Releases](https://github.com/liminal-ai/liminal-spec/releases). Each file is a standalone skill. Paste it into a Claude.ai project's instructions or drop it into the conversation.

Start with `02-epic-skill.md`. Create a new project, paste the skill content into the project instructions, then start a conversation describing what you want to build. Same process: let it interview you, let it build the spec.

### What to Expect

Your first epic will take longer than you think. The skill asks a lot of questions because it's building something with enough detail that an AI agent can implement from it without asking you what the system is supposed to do. That upfront investment is the point. It's cheaper to answer questions during spec writing than to discover gaps during implementation.

A good first test: after the epic is done, read the acceptance criteria and test conditions. Can you tell exactly what the system does and how to verify it? If yes, the spec is working. If you find vague spots, the skill probably asked about them and you gave a vague answer. That's the feedback loop.

## Skills Reference

| Skill | Purpose |
|-------|---------|
| `ls-prd` | Product requirements, features as scenario-driven proto-epics |
| `ls-arch` | Technical architecture: stack, system shape, cross-cutting decisions |
| `ls-epic` | Functional specification: acceptance criteria, test conditions, story breakdown |
| `ls-tech-design` | Implementation design: modules, interfaces, test mapping, work plan |
| `ls-publish-epic` | Story files with full AC/TC detail, Jira markers, coverage artifact |
| `ls-team-spec` | Spec pipeline orchestration with agent teams |
| `ls-team-impl` | Implementation orchestration with Codex/Copilot CLI |
| `ls-team-impl-cc` | Implementation orchestration with Claude Code agent teams |

## Development

```bash
git clone https://github.com/liminal-ai/liminal-spec.git
cd liminal-spec
bun install
bun run verify    # Build + validate + test
```

Edit content in `src/`, never in `dist/`. The build composes phase content with shared references per the manifest.

```bash
bun run build       # Compose source into dist/
bun run validate    # Validate output
bun test            # Run tests
bun run verify      # Build + validate + test (primary gate)
```

### Project Structure

```
src/
  phases/          -- Phase-specific content (one per skill)
  shared/          -- Cross-cutting concepts used by multiple skills
  templates/       -- Artifact templates (tech design)
  examples/        -- Verification prompt templates
scripts/
  build.ts         -- Compose src/ into dist/
  validate.ts      -- Validate build output
manifest.json      -- Maps skills to source files and shared dependencies
dist/              -- Build output (gitignored)
  skills/          -- Installable skill directories
  standalone/      -- Markdown files + pack zips
```

## Links

- [Releases](https://github.com/liminal-ai/liminal-spec/releases)
- [Changelog](CHANGELOG.md)
- [Development Guide](CLAUDE.md)

## License

MIT
