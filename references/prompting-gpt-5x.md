# Prompting GPT 5x

GPT 5x is the primary model for verification, code review, and detailed/finicky implementation in Liminal Spec. It excels at catching details Opus misses, thorough verification, and disciplined execution.

## When to Use GPT 5x

| Task | Why GPT 5x |
|------|-------------|
| **Verification** | Thorough, catches details others miss |
| **Code review** | Thorough, checks against spec systematically |
| **Difficult debugging** | Disciplined, methodical problem-solving |
| **Finicky implementation** | Precise instruction following, less drift |
| **Structured extraction** | Strong at schema adherence, JSON output |

**Access methods:**
- Codex CLI (`codex exec` with `--sandbox workspace-write` for implementation)
- GitHub Copilot
- API (expensive — use sparingly for high-value verification)

## Key Behavioral Traits

### More Deliberate Scaffolding

GPT 5x builds clearer plans and intermediate structure by default. Benefits from explicit scope and verbosity constraints.

### Lower Verbosity

More concise and task-focused than GPT 5/5.1. Still prompt-sensitive — articulate verbosity preference.

### Stronger Instruction Adherence

Less drift from user intent. Improved formatting and rationale presentation. Will follow specifications exactly.

### Conservative Grounding

Favors correctness and explicit reasoning. Handles ambiguity better with clarification in prompts.

## Prompting Patterns

### Controlling Verbosity

```xml
<output_verbosity_spec>
- Default: 3–6 sentences or ≤5 bullets for typical answers.
- For simple questions: ≤2 sentences.
- For complex multi-step tasks:
  - 1 short overview paragraph
  - ≤5 bullets: What changed, Where, Risks, Next steps, Open questions.
- Avoid long narrative paragraphs; prefer compact bullets.
- Do not rephrase the user's request.
</output_verbosity_spec>
```

### Preventing Scope Drift

GPT 5x may produce more than minimal specs. Explicitly forbid extras:

```xml
<design_and_scope_constraints>
- Implement EXACTLY and ONLY what the user requests.
- No extra features, no added components, no embellishments.
- Do NOT invent colors, animations, or new elements unless requested.
- If any instruction is ambiguous, choose the simplest valid interpretation.
</design_and_scope_constraints>
```

### Long-Context Recall

For inputs over ~10k tokens:

```xml
<long_context_handling>
- First, produce a short internal outline of key sections.
- Re-state the user's constraints explicitly before answering.
- Anchor claims to sections ("In the 'Data Retention' section…").
- If the answer depends on fine details, quote or paraphrase them.
</long_context_handling>
```

### Handling Ambiguity

```xml
<uncertainty_and_ambiguity>
- If the question is ambiguous, explicitly call this out and:
  - Ask 1–3 precise clarifying questions, OR
  - Present 2–3 plausible interpretations with labeled assumptions.
- Never fabricate exact figures or references when uncertain.
- Prefer "Based on the provided context…" instead of absolute claims.
</uncertainty_and_ambiguity>
```

### High-Risk Self-Check

For verification tasks:

```xml
<high_risk_self_check>
Before finalizing, re-scan your answer for:
- Unstated assumptions
- Specific numbers not grounded in context
- Overly strong language ("always," "guaranteed")
If found, soften or qualify them and state assumptions.
</high_risk_self_check>
```

## Tool Usage

```xml
<tool_usage_rules>
- Prefer tools over internal knowledge for:
  - Fresh or user-specific data
  - Specific IDs, URLs, or document titles
- Parallelize independent reads when possible.
- After any write/update tool call, briefly restate:
  - What changed
  - Where (ID or path)
  - Any follow-up validation performed
</tool_usage_rules>
```

## Agentic Updates

Keep updates minimal and outcome-focused:

```xml
<user_updates_spec>
- Send brief updates (1–2 sentences) only when:
  - You start a new major phase, or
  - You discover something that changes the plan.
- Avoid narrating routine tool calls.
- Each update must include at least one concrete outcome.
- Do not expand the task beyond what was asked.
</user_updates_spec>
```

## Structured Extraction

GPT 5x excels at structured output. Always provide schema:

```xml
<extraction_spec>
Extract structured data into JSON following this schema exactly:
{
  "party_name": string,
  "jurisdiction": string | null,
  "effective_date": string | null,
  "termination_clause_summary": string | null
}
- If a field is not present, set it to null rather than guessing.
- Before returning, re-scan for any missed fields.
</extraction_spec>
```

## Reasoning Effort

GPT 5x supports `reasoning_effort` parameter:

| Level | Use Case |
|-------|----------|
| `none` | Fast responses, simple tasks |
| `low` | Straightforward implementation |
| `medium` | Standard verification, code review |
| `high` | Complex debugging, thorough verification |
| `xhigh` | Deep analysis, catching subtle issues |

For verification, use `medium` to `high`. Reserve `xhigh` for critical artifact review (Feature Spec, Tech Design).

## For Liminal Spec Verification

When using GPT 5x to verify artifacts or review code:

```markdown
## Role
You are verifying [artifact] against [specification]. Your job is to catch what the builder missed.

## Task
Review the artifact systematically against the spec.

## Verification Checklist
1. Every AC in the spec has corresponding implementation
2. Every TC has a test that verifies the condition
3. No untested code paths
4. No drift from specification
5. Type safety: all types match spec definitions

## Output Format
For each issue found:
- Location: [file:line or section]
- Severity: [blocker|major|minor]
- Issue: [what's wrong]
- Spec reference: [AC-X or TC-Y]
- Suggested fix: [how to resolve]

If no issues found, state "Verification passed" with brief summary
of what was checked.
```

## Codex CLI Usage

```bash
# Standard implementation (can write files + run commands)
codex exec --sandbox workspace-write "prompt"

# Read-only analysis
codex exec "prompt"

# Detailed/nuanced work (more care needed)
codex exec --sandbox workspace-write -m gpt-5.2-codex \
  -c model_reasoning_effort=high "prompt"
```

**Model selection:**
- `gpt-5.2` + `medium`: Straightforward tasks
- `gpt-5.2-codex` + `high`: Detailed implementation, verification

**Important:** Default `codex exec` is read-only. Use `--sandbox workspace-write` for:
- Writing/editing files
- Running tests, builds, typechecks
- Any task that modifies the project
