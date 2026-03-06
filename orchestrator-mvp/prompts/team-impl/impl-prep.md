# Team Impl Phase: {{PHASE_TITLE}}

Run context:
- Run ID: {{RUN_ID}}
- Flow: {{FLOW_ID}}
- Phase: {{PHASE_ID}}
- Attempt: {{ATTEMPT}}
- Project cwd: {{CWD}}

Artifacts provided:
{{INPUT_ARTIFACTS}}

Required milestones for this phase:
{{REQUIRED_MILESTONES}}

Execution contract:
1. Load required skills with explicit calls (`Skill(codex-subagent)` or `Skill(copilot-subagent)` if available).
2. Discover and lock story acceptance and epic acceptance gate commands.
3. Confirm story sequencing and dependency order.
4. Do not proceed to implementation execution in this phase.

Required outputs:
1. Write a concise phase receipt to:
{{RECEIPT_PATH}}
2. Write machine status JSON to:
{{STATUS_PATH}}

`status.json` shape:
{
  "phaseId": "{{PHASE_ID}}",
  "status": "DONE|NEEDS_REWORK|BLOCKED",
  "codexEvidenceRef": "run/session reference",
  "unresolvedFindings": [{"id": "...", "title": "...", "disposition": "fixed|accepted-risk|defer"}],
  "milestones": ["..."],
  "notes": "..."
}

Quality bar:
- No acceptance without codex evidence reference.
- No unresolved finding without disposition.
- If blocked, explain exact blocker and next rework action.
