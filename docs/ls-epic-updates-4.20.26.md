# ls-epic Updates — 2026-04-20

This note captures drafting updates that should be considered for the `ls-epic` skill structure based on the `ls-claude-impl` epic work.

These are not corrections to a specific feature's content. They are structural additions that improved onboarding, readability, and navigability in a complex orchestration-heavy epic.

## Recommended Structural Additions

### 1. Add Brief Onboarding Context Ahead of User Profile

For epics that define methodology-facing systems, orchestration systems, or other artifacts where the reader may need domain setup before reading requirements, allow a short context section before `User Profile`.

This section should be brief and definitional, not essay-like.

Recommended uses:

- Briefly define the broader methodology or system the epic belongs to
- Briefly define the artifact bundle the feature operates on
- Briefly define terms that the rest of the epic depends on

For example, in the `ls-claude-impl` draft this included:

- what Liminal Spec is
- what a spec pack is
- what an epic is
- what a tech design is
- what stories are

This was useful because the primary user of the artifact is itself an orchestration agent, and the artifact needed to onboard that agent to the conceptual world it was operating in before dropping into requirements detail.

### 2. Allow Feature Overview to Include a Flow Summary

In addition to the normal prose `Feature Overview`, allow a compact top-level summary of the major flow headings that will later organize the full AC/TC detail.

Recommended shape:

- one bullet per major flow heading
- short description of what that flow covers
- optional AC range reference for each flow

Example pattern:

- Spec Pack Intake and Run Initialization — short description. AC: `1.1-1.5`
- Environment Resolution and Role Defaults — short description. AC: `2.1-2.4`

This improves scanability for long epics. A reader can see the whole shape of the epic before dropping into the detailed `Flows & Requirements` section.

### 3. Permit Internal Navigation Links in Long Epics

For large epics with many flow sections, it is useful to make the flow summary navigable by linking each summary item to the corresponding detailed section below.

Recommended approach:

- use standard markdown heading links when the renderer supports them
- avoid inventing more structure than needed
- treat this as a readability aid, not a required semantic element

This is especially helpful in long orchestration epics where the reader may move repeatedly between summary view and detailed AC/TC sections.

### 4. Treat These as Optional Structural Enhancements

These additions should not become mandatory in every epic.

They are most useful when:

- the epic needs light onboarding before requirements
- the epic has enough top-level flows that a summary view adds value
- the epic is long enough that internal navigation materially improves use

They are less useful for smaller or simpler feature epics where the standard `User Profile -> Feature Overview -> Scope -> Flows & Requirements` structure is already sufficient.

## Suggested Guidance for ls-epic

If this is incorporated into the base skill, the guidance should likely say:

- default to the normal epic structure
- add a brief onboarding context section only when the feature depends on terms or artifacts the downstream reader may not already understand
- add a flow summary in `Feature Overview` when the epic has enough major flows that a top-level map improves comprehension
- use internal links as an optional readability enhancement for long artifacts

## What This Is Not

This is not a recommendation to:

- make epics longer by default
- add methodology prologues to every epic
- replace detailed AC/TC groupings with summaries
- require hyperlinking in all epic outputs

The goal is to improve comprehension where needed without making ordinary epics heavier than they need to be.
