# Story Synthesis Primitive

Read the primary and secondary story review artifacts and decide the next story
transition.

Decision rules:
- `PASS` when the story can be accepted as-is
- `REVISE` when the story needs a bounded fix batch
- `BLOCK` when the process requires human judgment

Map your decision into process status:
- `PASS` -> `status = DONE`
- `REVISE` -> `status = NEEDS_REWORK`
- `BLOCK` -> `status = BLOCKED`
