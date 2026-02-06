# Prompting Claude Opus 4.6

Opus 4.6 is the primary model for orchestration, story sharding, and prompt drafting in Liminal Spec. It excels at gestalt thinking, capturing spirit and intent, and managing multi-step workflows.

## When to Use Opus 4.6

| Task | Why Opus 4.6 |
|------|--------------|
| **Orchestration** | Exceptional at managing complex workflows, delegating to subagents |
| **Story sharding** | Understands feature scope, breaks work into coherent stories |
| **Prompt drafting** | Captures intent and writes prompts for other models |
| **Spec/design writing** | Strong narrative flow, functional-technical weaving |
| **Code review synthesis** | Integrates feedback from multiple sources |

## General Principles

### Be Explicit

Opus 4.6 responds well to clear, explicit instructions. If you want "above and beyond" behavior, request it explicitly.

```
# Less effective
Create an analytics dashboard

# More effective
Create an analytics dashboard. Include as many relevant features 
and interactions as possible. Go beyond the basics to create a 
fully-featured implementation.
```

### Add Context for Why

Explain motivation behind instructions. Opus generalizes well from understanding.

```
# Less effective
NEVER use ellipses

# More effective
Your response will be read aloud by a text-to-speech engine, 
so never use ellipses since the engine won't know how to 
pronounce them.
```

### Communication Style

Opus 4.6 is more concise and natural than previous models:
- **Direct and grounded** — fact-based, not self-congratulatory
- **More conversational** — less machine-like
- **Less verbose** — may skip summaries unless prompted

If you want updates as it works:
```
After completing a task that involves tool use, provide a quick 
summary of the work you've done.
```

## Agentic Behavior

### Tool Usage

Opus 4.6 follows instructions precisely. If you say "suggest changes," it will suggest rather than implement.

```
# Will only suggest
Can you suggest some changes to improve this function?

# Will implement
Change this function to improve its performance.
```

For proactive action by default:
```xml
<default_to_action>
By default, implement changes rather than only suggesting them. 
If the user's intent is unclear, infer the most useful likely 
action and proceed, using tools to discover any missing details 
instead of guessing.
</default_to_action>
```

### Subagent Orchestration

Opus 4.6 naturally recognizes when to delegate to subagents. Ensure:
- Subagent tools are well-defined
- Let Opus orchestrate naturally (no explicit instruction needed)

For more conservative delegation:
```
Only delegate to subagents when the task clearly benefits from 
a separate agent with a new context window.
```

### Parallel Tool Calling

Opus 4.6 excels at parallel execution. For maximum parallelism:
```xml
<use_parallel_tool_calls>
If you intend to call multiple tools and there are no dependencies 
between the calls, make all independent calls in parallel. Never 
use placeholders or guess missing parameters.
</use_parallel_tool_calls>
```

## Long-Horizon Work

### Context Awareness

Opus 4.6 tracks its remaining context window. For agent harnesses with compaction:
```
Your context window will be automatically compacted as it approaches 
its limit, allowing you to continue working indefinitely. Do not stop 
tasks early due to token budget concerns. Save progress and state 
before the context window refreshes.
```

### Multi-Context Workflows

For work spanning multiple sessions:
1. **First context** — Set up framework, write tests, create setup scripts
2. **Subsequent contexts** — Iterate on todo list
3. **Use structured state** — `tests.json`, `progress.txt`
4. **Use git** — Log of what's done, checkpoints to restore

### State Management

```json
// Structured state (tests.json)
{
  "tests": [
    {"id": 1, "name": "auth_flow", "status": "passing"},
    {"id": 2, "name": "user_mgmt", "status": "failing"}
  ],
  "passing": 150,
  "failing": 25
}
```

```
// Progress notes (progress.txt)
Session 3:
- Fixed auth token validation
- Next: investigate user_mgmt failures
```

## Coding Behavior

### Code Exploration

Opus can be conservative about exploring code. Add explicit instructions:
```
ALWAYS read and understand relevant files before proposing edits. 
Do not speculate about code you have not inspected. Be rigorous 
and persistent in searching code for key facts.
```

### Minimizing Overengineering

Opus may overengineer (extra files, unnecessary abstractions). Counter with:
```
Avoid over-engineering. Only make changes that are directly requested.
Don't add features, refactor code, or make "improvements" beyond 
what was asked. A bug fix doesn't need surrounding code cleaned up.
Don't create helpers or abstractions for one-time operations.
```

### Minimizing Hallucinations

```xml
<investigate_before_answering>
Never speculate about code you have not opened. If the user 
references a specific file, you MUST read it before answering. 
Give grounded, hallucination-free answers.
</investigate_before_answering>
```

## Output Formatting

### Reduce Markdown

```xml
<avoid_excessive_markdown>
Write in clear, flowing prose using complete paragraphs. Use 
standard paragraph breaks. Reserve markdown for inline code, 
code blocks, and simple headings. Avoid bold/italics.

DO NOT use bullet lists unless presenting truly discrete items 
or explicitly requested. Incorporate items naturally into sentences.
</avoid_excessive_markdown>
```

### Match Prompt Style to Output

The formatting in your prompt influences response style. If you want less markdown, remove markdown from your prompt.

## For Liminal Spec Prompt Writing

When Opus 4.6 drafts prompts for execution (implementation, verification):

1. **Specify the target model** — "This prompt will be executed by GPT 5x Codex"
2. **Include model-specific guidance** — Reference the appropriate prompting guide
3. **Be explicit about constraints** — Service mocks, contract-first, TDD expectations
4. **Include verification criteria** — Clear pass/fail, test counts, type checks

Example prompt preamble for implementation execution:
```markdown
## Model Context
This prompt targets Claude Code or a fresh Opus 4.6 context.
Execute with TDD discipline: service mocks at API boundary,
contract-first development, assert behavior not errors.

## Constraints
- Mock external dependencies only (network, database)
- Never mock in-process logic
- Tests must verify behavior, not NotImplementedError
```
