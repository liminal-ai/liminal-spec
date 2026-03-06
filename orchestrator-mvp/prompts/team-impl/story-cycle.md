# Team Impl Phase: {{PHASE_TITLE}}

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
1. Use Opus orchestration with Codex verification pressure.
2. Implement and verify story cycle in a bounded pass.
3. Generate pre-acceptance receipt details: codex evidence, top findings + dispositions, exact gate commands/results, open risks.
4. If findings are clear must-fix/should-fix items, auto-dispatch fixes before phase completion.

Required outputs:
- {{RECEIPT_PATH}}
- {{STATUS_PATH}}

`status.json` must include codexEvidenceRef and milestones completed.
