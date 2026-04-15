# Current-State Code Map Guide

Read this guide when drafting the **code-reading map** side of the current-state baseline:

- `current-state-code-map.md`

The main `SKILL.md` contains the truth model, workflow, and output checks. This guide narrows to how to write a code map that helps fresh agents find the right code fast.

---

## Writing Register

Use a **curated navigation register**:

- show where to start
- show what to read next
- show what can wait
- show ownership and seams, not just paths

This is not a file inventory and not a second technical baseline.

### Keep

- real entry points
- top-level code areas
- domain-to-code mapping
- read order
- coordination hubs
- contract and state roots
- test map
- trap areas that save a new agent from wasting time

### Cut

- full directory trees
- every helper, util, and style file
- repeated architecture prose already covered in the technical baseline
- giant file lists with no explanation of why they matter

### The Test

Could a fresh implementer find the right code and tests to start from without scanning the whole repo blindly?

If not, the code map is too inventory-shaped or too thin.

---

## What A Good Code Map Does

The code map should answer:

- where does the system start?
- what top-level areas own what?
- what files should I read first for this domain?
- what shared state or contracts will I hit immediately?
- where do the best tests for this area live?

The code map is the "where to read" sibling to the technical baseline's "how this is shaped."

---

## Relationship To The Technical Baseline

Keep the split clear:

- **Technical baseline** explains current system context, ownership seams, contracts, sequences, and validation surfaces
- **Code map** explains where to read and in what order

If a section starts teaching the whole architecture again, it belongs in `current-state-tech-design.md`.

If a section starts listing paths with no reading guidance, it is failing as a code map.

---

## Entry Points First

Start the code map with the real entry points:

- runtime entry points
- bootstrap/composition roots
- CLI entry points
- desktop shell entry points
- package/library entry points if separate

For each one, say:

- file path
- what starts here
- when a fresh agent should read it

This helps new readers orient faster than starting with the raw tree.

---

## Top-Level Code Areas

After entry points, map the top-level code areas:

| Area | Path | Owns | Read When |
|------|------|------|-----------|
| [area] | [path] | [ownership] | [when it matters] |

Keep this at directory or module-root level. Do not immediately descend into every file.

---

## Recommended Read Order

This is one of the highest-value sections.

Include:

- a **general onboarding read order**
- targeted read orders for common work types

Examples:

- if working on user-facing behavior
- if working on API/server behavior
- if working on exports
- if working on packages
- if working on desktop/electron

Good read orders usually go:

1. entry point or composition root
2. shared contracts or state roots
3. domain/module roots
4. key services or handlers
5. tests for that same seam

Every code map must include targeted read orders for at least:

- server / API work
- client / UI work
- durable-state / data-model work

It should also include repo-level mandatory onboarding files when relevant, such as:

- `AGENTS.md`
- `CLAUDE.md`
- generated or repo-specific policy files like `convex/_generated/ai/guidelines.md`

---

## Domain-to-Code Mapping

For each current functional domain, provide a focused reading map:

### `[Domain Name]`

**Start here**
- [1-3 key files]

**Then read**
- [next 3-6 files or directories]

**Only if needed**
- [deeper helpers, styles, or leaf files]

**Owns**
- [what this slice of code really owns]

**Key seams**
- [what it talks to]

This is where the code map becomes truly useful. It tells a fresh agent how to read purposefully instead of wandering through the repo.

### Depth Rule

Do not give every domain the same number of files.

Go deeper when:

- the domain is the most likely extension target
- the behavior is subtle
- ownership is spread across several areas
- tests are especially valuable to understanding current truth

Stay lighter when:

- the domain is stable
- the code shape is obvious
- there are only one or two real starting files

---

## Coordination Hubs

Call out the files that coordinate a lot of behavior and are worth learning early:

- app composition roots
- state roots
- shared contract roots
- dispatch hubs
- orchestrators
- package state coordinators
- export coordinators

For each:

- file path
- why it matters
- what other areas connect through it

This section helps fresh agents identify the real hubs of the system.

---

## Contract And State Roots

Fresh agents often need these immediately.

Split out:

- shared contracts
- state/store roots
- persistence/session roots
- API client
- websocket/event contracts
- IPC contracts

If the system has one especially important shared state shape, call it out directly.

---

## Test Map

Treat tests as first-class reading surfaces.

For each major area, say:

- where the main tests live
- what kind of truth they give
- which tests are best first reads

Good test-map rows answer:

- if I change this area, what tests should I read first?
- where is behavior truth strongest?

---

## High-Leverage Files

Add a short "if you only read 10 files" section when it helps.

This is optional, but it is very effective in mature repos.

Keep it truly high-signal.

---

## Trap Areas

Call out anything likely to mislead a fresh reader:

- files that look central but are thin wrappers
- behavior split across client and server
- legacy names that hide current ownership
- generated or support files that look more important than they are
- areas where tests tell the truth better than the code structure does

This section should prevent wasted onboarding time.

---

## Optional Support Artifacts

When the repo is large enough or refreshability matters, also emit:

- `current-state-module-tree.json`
- `current-state-doc-meta.json`

### `current-state-module-tree.json`

Use this as a machine-readable support artifact for:

- current domain-to-code grouping
- top-level code areas
- key paths per area
- short ownership descriptions

This is useful for refreshes, downstream tooling, and future automation.

### `current-state-doc-meta.json`

Use this to preserve:

- generated-at timestamp
- repo state (branch/commit when known)
- output shape (`compact` vs `pack`)
- whether support artifacts were emitted
- key documentation roots used as inputs

Do not force these support artifacts for every tiny repo. Emit them when they materially help later refresh or downstream use.

---

## Code-Map Failure Modes

**Raw tree dump.**
Listing folders without teaching read order or ownership.

**Second technical baseline.**
Repeating architecture explanations instead of helping the reader navigate code.

**Uniform domain coverage.**
Giving every domain the same file list regardless of complexity.

**Leaf-file overload.**
Listing every helper and utility instead of the real reading path.

**No test map.**
Forgetting that tests are one of the fastest onboarding surfaces.

**No trap warnings.**
Failing to protect fresh readers from misleading areas.

---

## Template

### Template E: `current-state-code-map.md`

```markdown
# [Product Name] — Current Code Map

## Status
[What repository state this reflects.]

## How To Use This Map
[How this differs from the technical baseline, and how to use it for fast onboarding.]

## Codebase Entry Points

| Entry Point | Path | Starts Here | Read When |
|-------------|------|-------------|-----------|
| [entry] | [path] | [what starts here] | [when to read] |

## Top-Level Code Areas

| Area | Path | Owns | Read When |
|------|------|------|-----------|
| [area] | [path] | [ownership] | [when it matters] |

## Recommended Read Order

### General Onboarding
1. [file / area]
2. [file / area]
3. [file / area]

### If Working On [Area]
1. [file / area]
2. [file / area]
3. [tests / contracts]

## Domain-to-Code Mapping

### [Domain Name]

**Start here**
- [file]

**Then read**
- [file or directory]

**Only if needed**
- [file or directory]

**Owns**
- [ownership]

**Key seams**
- [connection points]

## Coordination Hubs

| Hub | Path | Why It Matters |
|-----|------|----------------|
| [hub] | [path] | [why] |

## Contract And State Roots
- [contract or state root]

## Test Map

| Area | Read These Tests First | Why |
|------|------------------------|-----|
| [area] | [path] | [signal] |

## High-Leverage Files
- [file] — [why]

## Known Trap Areas
- [trap]

## Optional Support Artifacts
- `current-state-module-tree.json` — [when emitted]
- `current-state-doc-meta.json` — [when emitted]
```
