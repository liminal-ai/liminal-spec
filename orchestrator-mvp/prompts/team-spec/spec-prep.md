# Team Spec Phase: {{PHASE_TITLE}}

Run context:
- Run ID: {{RUN_ID}}
- Phase: {{PHASE_ID}}
- Attempt: {{ATTEMPT}}
- Project cwd: {{CWD}}

Artifacts provided:
{{INPUT_ARTIFACTS}}

Required milestones:
{{REQUIRED_MILESTONES}}

Execution contract:
1. Confirm the selected pipeline entry point from research-entry output.
2. Discover and lock project verification gates for this run.
3. Confirm skill availability and lane setup.

Escalation path:
- Log any unresolved contradictions/questions in status and receipt.
- Codex supervisor can answer directly or escalate to user.

Required outputs:
- {{RECEIPT_PATH}}
- {{STATUS_PATH}}
