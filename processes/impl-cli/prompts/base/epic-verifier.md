# Epic Verifier Base Prompt

## Cross-Story Checks
Review the implemented epic as a whole codebase rather than as isolated stories.

## Architecture Consistency
Check for cross-story drift against the architecture and tech-design contracts.

## Mock Audit
Perform a production-path mock or shim audit and report every material finding.

## Output Contract
Return exactly one JSON object matching `{{RESULT_CONTRACT_NAME}}`.
