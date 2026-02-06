# Writing Style Reference

*Deep-dive guide for documentation that serves both humans and AI agents. Load when writing Feature Specs and Tech Designs.*

---

## Quick Navigation (If You're Stuck Mid-Doc)

| Problem | Jump to |
|---------|---------|
| Everything feels flat / equal weight | [Branches, Leaves, Landmarks](#branches-leaves-and-landmarks) • [Before/After #1](#example-1-flat-list--rich-context) |
| Altitude jump / reader lost | [The Smooth Descent](#the-smooth-descent) • [Extended Example](#extended-example-tracing-through-altitudes) |
| Functional ↔ technical drift | [The Weave](#functional-and-technical-the-weave) • [Before/After #3](#example-3-separated--woven) |
| Unsure how deep to go | [Bespoke Depth](#bespoke-depth-signal-optimization) • [Scoring Rubric](#scoring-rubric) |
| Complex diagram overwhelming | [Progressive Construction](#progressive-construction-the-whiteboard-phenomenon) |
| Fast final-pass check | [Quick Diagnostic](#quick-diagnostic) |

---

## The Core Insight: Documentation Has Three Dimensions

Most technical documentation uses one dimension: hierarchy. Categories, subcategories, sections. This works for reference lookup but fails for understanding. Good documentation uses three dimensions—and the third is what makes it work.

**Dimension 1: Hierarchy** — Parent/child relationships. What contains what.

**Dimension 2: Network** — Cross-references. What connects to what.

**Dimension 3: Narrative** — Temporal and causal flow. What leads to what, and why.

The third dimension is where context lives. Not just *what* things are, but *how* they connect, *why* they exist, and *what happens when* you use them.

This matters for AI agents because LLMs trained on internet text—50TB of messy, narrative, temporal human writing—encode knowledge using narrative substrate. When you conform to that structure, you get efficient encoding and better retrieval almost for free. The relationships you'd otherwise need to enumerate explicitly are encoded in the temporal flow.

### Why Narrative Is Compression

Consider two ways to express the same information:

**Enumerated (explicit relationships):**
```
- ConversationManager exists
- Session exists  
- ConversationManager creates Session
- Session handles messages
- Relationship: ConversationManager owns Session
```

**Narrative (implicit relationships):**
```
When a user starts chatting, ConversationManager creates a Session to handle
the conversation. The Session manages message history and coordinates with
external services. The manager holds the session reference throughout the
conversation lifecycle.
```

Both encode the same facts. The narrative version is shorter because relationships emerge from temporal flow ("when... creates... manages... throughout"). You don't enumerate "Relationship: A owns B"—the ownership is implicit in "manager holds the session reference."

For LLMs, narrative structure activates learned patterns from training data. For humans, narrative matches how we naturally think. We remember journeys better than lists.

---

## Branches, Leaves, and Landmarks

Think of your document as a tree. Prose paragraphs establish **branches**—the structural limbs that hold everything together. Bullet lists hang **leaves**—specific details attached to their branch. Diagrams create **landmarks**—spatial anchors that help readers navigate.

This creates attentional hierarchy. When all information has equal visual weight (flat bullets, uniform paragraphs), readers and models spread attention evenly. Key insights get lost in noise.

### The Branch: Prose Paragraphs

Prose establishes context, importance, and relationships. It tells the reader *why* something matters before presenting *what* specifically exists. Two to five sentences. One clear point per paragraph.

### The Leaves: Bullet Lists

Lists enumerate specifics *after* context is established. They hang from the branch that prose creates. Never more than two levels deep in any single section.

**Good list usage:**
```
OAuth tokens are retrieved from keyring storage where other CLI tools have 
already obtained and stored them. We're not implementing OAuth flows—just 
reading tokens.

Token locations:
- ChatGPT: ~/.codex/auth/chatgpt-token
- Claude: ~/.claude/config
```

**Poor list usage:**
```
Authentication:
- API keys supported
- OAuth supported
- ChatGPT tokens
- Claude tokens
- Token refresh
```

The second example forces readers to infer all relationships. The cognitive load is on the reader instead of the writer.

### The Landmarks: Diagrams

Diagrams encode spatial relationships that prose can't express efficiently. They create memory anchors through visual variation.

```
User Command → AuthManager → Check method
                  ↓
            API Key ──→ Config → Headers
                  ↓
            OAuth ──→ Keyring → Token → Headers
```

The same information in prose would take 3-4 sentences and lose the spatial relationship. Diagrams are compression.

### The Ratio: A Compass, Not a Rule

Most well-structured sections land around:

- **~70% prose** — Paragraphs establishing context, relationships, purpose
- **~25% lists** — Specifics, enumerations, steps
- **~5% diagrams** — Spatial relationships, architecture, flow

This isn't prescription. Some sections need more diagrams (architecture overviews). Some need more lists (API references). The ratio is a compass: if you're at 90% bullets, you're probably missing branches. If you're at 100% prose, you're probably missing scannable specifics.

When a section feels off, check the ratio. Monotonous structure often explains the problem.

### Putting It Together

```markdown
## Session Management

Conversations persist through the Session abstraction. When a user starts 
chatting, ConversationManager creates a Session to hold conversation state—
message history, active provider, pending tool calls.

Sessions coordinate between three subsystems:

    Session
    ├── MessageHistory (stores conversation)
    ├── ModelClient (sends to LLM)
    └── ToolRouter (handles tool calls)

Key methods:
- `sendMessage(content)` — Format, send, process response, update history
- `getHistory()` — Return full message history for context
- `processToolCall(call)` — Route to executor, await result, append

The separation between Session and ConversationManager matters for testing.
Sessions test with mocked clients. Managers test lifecycle without message flow.
```

Five elements: branch paragraph, diagram landmark, detail leaves, closing branch. Complete concept.

---

## The Altitude Metaphor

Documentation exists at different altitudes. Higher = broader view, less detail. Lower = narrower focus, more specifics.

```
25,000 ft   PRD: "The system enables collaborative AI conversations"
    ↓
15,000 ft   Tech Approach: "ConversationManager orchestrates Sessions"
    ↓
10,000 ft   Phase README: "Session.sendMessage() formats per provider spec"
    ↓
5,000 ft    Checklist: "Task 3: Wire Session to ModelClient with retry"
    ↓
1,000 ft    Code: const response = await client.send(formatted, { retries: 3 })
```

The failure mode isn't being at the wrong altitude—it's **jumping altitudes without bridges**.

### The Smooth Descent

Each document should bridge levels, not exist at one. Start higher than you'll finish. Descend gradually. Each level answers questions raised by the level above.

**PRD says:** "User can authenticate with ChatGPT OAuth"
**Reader asks:** How does that work technically?

**Tech Design says:** "Read token from ~/.codex keyring"
**Reader asks:** What's the implementation approach?

**Phase Doc says:** "Use keyring-store module, mock filesystem in tests"
**Reader asks:** What are the specific tasks?

**Checklist says:** "1. Import keyring-store  2. Add getToken() wrapper  3. Create mock"

No gaps. Each level makes sense in context of the previous one.

### The Consistency Ladder

The same capability should be visible at every altitude level:

| Altitude | Example |
|----------|---------|
| 25K (PRD) | User can start a conversation and receive a response |
| 15K (Approach) | ConversationManager wires CLI → Codex → ModelClient |
| 10K (Phase) | Implement createConversation(), wire CLI command, mock ModelClient |
| 5K (Checklist) | 1) Add CLI command 2) Implement createConversation 3) Write mocked test |

If a capability appears at one level but not another, something is missing. The ladder is the alignment test.

### Extended Example: Tracing Through Altitudes

**Feature Spec (25K feet):**
> Users can execute tools (read files, run commands) through the AI assistant. The assistant requests permission before executing.

Reader understands: what capability exists, who controls it.
Reader wonders: how does this work technically?

**Tech Design - Overview (15K feet):**
> Tool execution flows through three components. Session detects when the model requests a tool call. ToolRouter matches the request to an executor. The CLI presents approval before execution proceeds.

Reader understands: which components, how they connect.
Reader wonders: what are the specific interfaces?

**Tech Design - Details (10K feet):**
> Session.processResponse() checks for tool_calls in model output. When found, it extracts the tool name and arguments, then calls ToolRouter.route(toolCall). Before execution, Session emits a 'tool_request' event that the CLI handler intercepts.

Reader understands: specific methods, data flow, event mechanism.
Reader wonders: what are my implementation tasks?

**Implementation Checklist (5K feet):**
> 1. Add tool_calls detection to Session.processResponse()
> 2. Implement ToolRouter.route() with executor registry
> 3. Wire CLI approval handler to 'tool_request' event

**Each level answered the question raised by the previous level.** That's the smooth descent.

---

## Functional and Technical: The Weave

Traditional process separates functional requirements ("user can chat") from technical design ("WebSocket with JSON-RPC"). Product writes the PRD, throws it over the wall, engineering writes the tech spec. The gap that opens between them is where projects fail.

Better: weave functional and technical together at every altitude level.

**In high-level docs (mostly functional, touch technical):**
- User outcome: "User can resume saved conversations"
- Technical grounding: "Verify by loading JSONL, continuing from last message"

**In technical docs (mostly technical, ground in functional):**
- Architecture: "Session coordinates ModelClient and ToolRouter"
- Functional anchor: "This enables users to review tool actions before execution"

**In implementation docs (deep technical, verify via functional):**
- Task: "Implement resumeConversation() method"
- Functional test: "User can continue conversation where they left off"

The weave prevents drift. When functional and technical stay interlocked, you can't over-engineer (functional bounds what's needed) and you can't under-deliver (technical serves functional outcomes).

### Functional Verification Grounds Testing

Technical tests without functional grounding:
"Test that ConversationManager.createConversation() returns Conversation object"

This can pass while the user *still can't chat*. The test verified mechanism, not outcome.

Functional test criteria:
"User can start conversation, send message, receive response"

The test name describes the user capability. The test implementation exercises the technical path. The assertion verifies functional success. This is the weave in action.

---

## Bespoke Depth: Signal Optimization

The anti-pattern: uniform depth across all topics. Everything documented to the same depth means nothing stands out.

Better: go deep where it matters, stay shallow where it doesn't.

### The Four Questions

Before diving into any topic, ask:

| Question | Deep if... | Shallow if... |
|----------|-----------|--------------|
| Is this complex or simple? | Complex | Simple |
| Is this new or already done? | Novel | Existing |
| Is this critical or optional? | Critical | Optional |
| Will implementers struggle here? | High risk | Low risk |

### Scoring Rubric

Score each topic 1-5 on four dimensions, then sum:

- **Complexity:** How many moving parts?
- **Novelty:** Is this new or already implemented?
- **Criticality:** Does the project fail if this is wrong?
- **Risk:** How likely is confusion or error?

| Score | Depth |
|-------|-------|
| 4-8 | Shallow (one paragraph, maybe a link) |
| 9-13 | Medium (2-3 paragraphs, small list) |
| 14-20 | Deep (multi-paragraph, diagram, examples) |

**Example:**
- OAuth token retrieval: 4+5+5+4 = 18 → Deep
- Config file parsing: 2+1+2+2 = 7 → Shallow

### Token Budget Thinking

Instead of 10 topics × 500 tokens = 5,000 tokens of uniform depth:

- 2 critical topics × 1,500 tokens = 3,000 tokens of real depth
- 8 simple topics × 100 tokens = 800 tokens of appropriate brevity
- Total: 3,800 tokens, higher signal-to-noise

The critical topics got the depth they need. The simple topics didn't waste tokens.

---

## Progressive Construction: The Whiteboard Phenomenon

There's a difference between seeing a complex diagram and *building* one. People who build understand deeply. People who receive are overwhelmed.

When you whiteboard a system, you add one box at a time, connect it, then add the next. Each step scaffolds the next. Documentation should mimic that process.

### Build Diagrams in Stages

Instead of dropping a 20-component diagram:

```
Step 1: System has three layers.
    CLI → Library → External

Step 2: Library entry point is ConversationManager.
    CLI → ConversationManager → External

Step 3: Manager coordinates Codex and Session.
    CLI → ConversationManager → Codex → Session → External

Step 4: Session routes to ModelClient and ToolRouter.
    CLI → ConversationManager → Codex → Session → ModelClient
                                       ↘ ToolRouter
```

By the final diagram, readers have *constructed* the understanding.

### Conceptual Spiral

Progressive construction applies to concepts, not just diagrams. Revisit from multiple angles, each pass adding detail:

- Pass 1: "Phase 2 adds tool execution to the conversation flow."
- Pass 2: "Session detects tool calls and routes them to ToolRouter."
- Pass 3: "ToolRouter executes the tool, returns results, Session resumes the model call."
- Pass 4: "Here is the sequence diagram of that cycle."

Each pass deepens without forcing a leap. The spiral guides into complexity without drowning.

---

## Before/After Transformations

### Example 1: Flat List → Rich Context

**Before:**
```
CLI Features:
- Interactive REPL
- One-shot command mode  
- JSON output flag
- Provider switching
```

**After:**
```
The CLI supports three interaction modes for different audiences. Interactive 
REPL serves humans who want conversational flow. One-shot commands serve 
automation and testing. JSON output serves programmatic consumption.

Modes available:
- Interactive: `codex` → enters REPL, `quit` to exit
- One-shot: `codex chat "message"` → execute and exit
- JSON output: Add `--json` flag for structured response
```

The prose establishes *why* (the branch). The bullets enumerate *what* (the leaves).

### Example 2: Altitude Jump → Smooth Descent

**Before:**
```
## Tool Execution
The system enables AI-assisted tool execution.

const result = await executor.run(tool, args, { timeout: 30000 });
```

**After:**
```
## Tool Execution
The system enables AI-assisted tool execution, where the model can request 
actions like reading files, running commands, or making API calls.

Tool execution follows a request-approve-execute cycle. The model requests 
a tool call, the system presents it for approval, execution runs sandboxed, 
and results return to the model.

    Model Request → Approval Gate → Executor → Result → Model

const result = await executor.run(tool, args, { timeout: 30000 });
```

Three altitudes (concept → mechanism → implementation), smooth descent between each.

### Example 3: Separated → Woven

**Before:**
```
## Authentication Implementation
AuthManager reads from config.toml or keyring. API keys use ConfigReader.
OAuth tokens use KeyringStore.

Implementation:
- ConfigReader.get('api_key')
- KeyringStore.retrieve(provider)
```

**After:**
```
## Authentication Implementation
Users authenticate through two paths: API keys (for personal accounts) and
OAuth tokens (for reusing existing ChatGPT or Claude subscriptions).

AuthManager abstracts this choice. When a user starts a conversation, the 
manager checks the configured auth method. For API keys, it reads from config.
For OAuth, it retrieves tokens from keyring.

This abstraction enables provider switching without re-authentication—users
configure once, the system handles the rest.

Technical components:
- ConfigReader: Load from config.toml or environment
- KeyringStore: Retrieve OAuth tokens (path varies by provider)
```

Opens with functional context. Shows mechanism. Grounds in benefit. Then enumerates components.

---

## Common Failure Modes

### Bullet Soup
**Symptom:** Every section is bullets. No paragraphs. Lists all the way down.
**Fix:** Add prose branches. Explain why the list matters before presenting it.

### Wall of Text
**Symptom:** Dense paragraphs. No lists. No diagrams. No variation.
**Fix:** Break up with lists for enumerations, diagrams for spatial relationships.

### Altitude Yoyo
**Symptom:** Document bounces between vision and implementation randomly.
**Fix:** Pick an altitude and stay there, or descend smoothly. Don't yoyo.

### All Technical, No Functional
**Symptom:** Describes mechanisms without purpose.
**Fix:** Ground in functional outcome. "When a user sends a message, ConversationManager... This enables users to..."

### Premature Depth
**Symptom:** Edge cases before establishing normal path.
**Fix:** Normal path first, edge cases second.

### Orphaned Diagrams
**Symptom:** Diagram appears without prose context.
**Fix:** Introduce diagrams with prose, then reference them. The diagram confirms; prose explains.

---

## Writing for Agents

This reference will be loaded by AI agents writing Feature Specs and Tech Designs. Understanding how agents read—and fail to read—makes the difference between documentation that works and documentation that wastes context.

### How Agents Read Differently

Humans skim, backtrack, ask questions, fill gaps with intuition. Agents process sequentially, can't ask clarifying questions, and treat ambiguity as noise rather than invitation.

**Human reading:** Scan headings → jump to relevant section → skim for keywords → read closely when relevant → ask if confused.

**Agent reading:** Load document into context → process sequentially → attempt task → fail or succeed based on what was explicit.

This means:
- Gaps that humans bridge intuitively become blockers for agents
- Implied relationships that humans infer need to be stated
- "Obviously" is never obvious—if it matters, write it

### Context Window Economics

Every token of documentation is a token not available for reasoning or code generation. Agents operate under hard context limits. This creates pressure for compression—but compression mustn't sacrifice clarity.

The solution is *signal density*: every token earns its place.

**Low signal density:**
```
The configuration system is designed to be flexible and extensible. 
It supports multiple configuration sources and can be extended by 
implementing the IConfigSource interface.
```

**High signal density:**
```
Configuration loads from config.toml. Extend via IConfigSource interface.
See /src/config/ for implementation.
```

Same information, half the tokens. Strip:
- Obvious filler ("designed to be flexible")
- Vague claims without specifics ("can be extended"—*how*?)
- Redundant phrasing

### What Agents Need Explicitly

| Implicit for Humans | Explicit for Agents |
|---------------------|---------------------|
| "Handle errors appropriately" | "Catch ConfigError, log message, return null" |
| "Test this thoroughly" | "Write tests for: valid input, empty input, malformed input" |
| "Wire up the components" | "Import X from Y, instantiate with config, pass to Z constructor" |
| "Follow the pattern from Phase 1" | "Copy the approach from Session.sendMessage(): validate → transform → execute → handle result" |

### The Explicit Stack

For any task, agents need these layers explicit:

1. **Scope** — What to do, what NOT to do
2. **Inputs** — What exists, where to find it
3. **Outputs** — What to produce, where to put it
4. **Sequence** — What order, what depends on what
5. **Verification** — How to confirm success

**Before (human-readable):**
```
Implement the auth flow. Make sure it works with both API keys and OAuth.
```

**After (agent-executable):**
```
Implement AuthManager.authenticate():

Scope:
- Implement API key and OAuth paths
- Do NOT implement token refresh (out of scope for Phase 1)

Inputs:
- AuthConfig from config.toml (method: 'api_key' | 'oauth', credentials)
- Existing KeyringStore for OAuth token retrieval

Outputs:
- Returns AuthToken { token: string, expiresAt: Date }
- Throws AuthError on failure

Sequence:
1. Read config.method
2. Branch: API key → read from config, OAuth → read from keyring
3. Validate token format
4. Return AuthToken

Verification:
- Test: API key path returns token from config
- Test: OAuth path retrieves from keyring mock
- Test: Invalid config throws AuthError
```

The second version is longer but executable. An agent can complete it without asking questions.

### The Isolation Test

Agents often read documents in isolation—loaded into fresh context without the conversation history that produced them. The document must stand alone.

**Test:** Cover the rest of the document. Read only this section. Could you complete the work described?

If yes: section is self-contained.
If no: identify what's missing and add it.

### Progressive Loading Strategy

For large specifications, don't load everything into every context. Instead:

1. **Core context** (always loaded): Architecture overview, key patterns, current phase
2. **Task context** (loaded for specific work): Relevant phase spec, related component docs
3. **Reference context** (linked, not loaded): API docs, style guides, examples

This mirrors bespoke depth at the document level. Load what matters for this task; link to the rest. Mention what exists even if you don't include it—agents can request additional context if they know it exists.

---

## Quick Diagnostic

When a section feels wrong but you can't identify why:

1. **Altitude check:** Am I jumping levels without bridges?
2. **Branch check:** Do lists have prose context, or are they orphaned?
3. **Depth check:** Am I going deep everywhere, or allocating based on importance?
4. **Weave check:** Is functional purpose present, or is this pure mechanism?
5. **Variation check:** Is the structure monotonous?
6. **Narrative check:** Does this read as a journey, or as disconnected facts?

### The Writing Loop (Mid-Doc Recalibration)

When you drift—and you will—run through:

1. Check altitude: Where am I? 25k, 15k, 10k, 5k?
2. Check bridge: Did I explain why the next level exists?
3. Check weave: Does each technical detail map to a functional outcome?
4. Check depth: Did I go deep where complex and shallow where simple?
5. Check structure: Did I vary form to distribute attention?

If any answer is "no," rewrite that paragraph or section. This loop is the fast path to high-signal documentation.

---

## The Meta-Test

This document should demonstrate what it teaches:

- ✓ Opens with core insight, builds from there
- ✓ Spirals through ideas with increasing depth
- ✓ Mixes structural forms (prose, lists, diagrams, tables, code)
- ✓ Creates attentional weight through variation
- ✓ Includes before/after transformations
- ✓ Weaves functional with technical
- ✓ Uses progressive disclosure

If this document is comprehensible and useful, the principles work.

---

*Remember: You're not following rules. You're thinking about how information encodes and transmits. The patterns are heuristics that usually work. When they don't fit, understand why and adapt.*
