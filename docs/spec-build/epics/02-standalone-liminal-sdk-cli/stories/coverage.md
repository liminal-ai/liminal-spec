# Coverage Artifact

## Coverage Gate

| AC | TC | Story |
|----|----|-------|
| AC-1.1 | TC-1.1a, TC-1.1b | Story 0 |
| AC-1.2 | TC-1.2a, TC-1.2b | Story 0 |
| AC-1.3 | TC-1.3a, TC-1.3b | Story 0 |
| AC-1.4 | TC-1.4a, TC-1.4b | Story 0 |
| AC-1.5 | TC-1.5a, TC-1.5b | Story 0 |
| AC-2.1 | TC-2.1a | Story 1 |
| AC-2.2 | TC-2.2a, TC-2.2b | Story 1 |
| AC-2.3 | TC-2.3a | Story 1 |
| AC-2.4 | TC-2.4a, TC-2.4b | Story 1 |
| AC-2.5 | TC-2.5a | Story 1 |
| AC-3.1 | TC-3.1a | Story 2 |
| AC-3.2 | TC-3.2a | Story 2 |
| AC-3.3 | TC-3.3a | Story 2 |
| AC-3.4 | TC-3.4a, TC-3.4b | Story 2 |
| AC-3.5 | TC-3.5a, TC-3.5b | Story 2 |
| AC-4.1 | TC-4.1a, TC-4.1b | Story 3 |
| AC-4.2 | TC-4.2a, TC-4.2b | Story 3 |
| AC-4.3 | TC-4.3a, TC-4.3b | Story 3 |
| AC-4.4 | TC-4.4a | Story 3 |
| AC-4.5 | TC-4.5a | Story 3 |
| AC-4.6 | TC-4.6a | Story 3 |
| AC-4.7 | TC-4.7a, TC-4.7b | Story 3 |
| AC-4.8 | TC-4.8a, TC-4.8b | Story 3 |
| AC-5.1 | TC-5.1a, TC-5.1b, TC-5.1c, TC-5.1d | Story 4 |
| AC-5.2 | TC-5.2a, TC-5.2b | Story 4 |
| AC-5.3 | TC-5.3a, TC-5.3b | Story 4 |
| AC-5.4 | TC-5.4a, TC-5.4b | Story 5 |
| AC-5.5 | TC-5.5a | Story 5 |
| AC-5.6 | TC-5.6a, TC-5.6b | Story 5 |
| AC-5.7 | TC-5.7a, TC-5.7b | Story 5 |
| AC-5.8 | TC-5.8a | Story 5 |
| AC-6.1 | TC-6.1a | Story 6 |
| AC-6.2 | TC-6.2a, TC-6.2b | Story 6 |
| AC-6.3 | TC-6.3a | Story 6 |
| AC-6.4 | TC-6.4a | Story 7 |
| AC-6.5 | TC-6.5a, TC-6.5b, TC-6.5c, TC-6.5d, TC-6.5e | Story 7 |
| AC-6.6 | TC-6.6a | Story 7 |
| AC-6.7 | TC-6.7a | Story 7 |

## Integration Path Trace

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Package baseline | Create the standalone package, portable toolchain, and parity test baseline | Story 0 | TC-1.1a, TC-1.5a |
| SDK invocation | Expose the runtime operations as typed functions callable without the CLI shell | Story 1 | TC-2.1a, TC-2.4b |
| CLI invocation | Route subcommands through the thin shell, preserve the envelope, and map exit codes | Story 2 | TC-3.1a, TC-3.4a, TC-3.5b |
| Runtime durability | Version contracts, classify errors, write atomically, reserve artifact indexes safely, and fix known regressions | Story 3 | TC-4.1a, TC-4.2a, TC-4.4a, TC-4.5a, TC-4.7a, TC-4.7b |
| Captured-output defense | Fail fast on parser drift from committed real-provider samples on default CI | Story 4 | TC-5.3a, TC-5.3b |
| Real-provider execution | Exercise smoke, resume, structured-output, and stall behavior against real provider CLIs | Story 4 | TC-5.1a, TC-5.1b, TC-5.1c, TC-5.1d |
| Gorilla end-to-end verification | Walk every operation against a real fixture, reset cleanly, and capture structured evidence | Story 5 | TC-5.5a, TC-5.6a, TC-5.7b, TC-5.8a |
| Published artifact consumption | Pack, install, and import the exact artifact shape consumers receive from npm | Story 6 | TC-6.2a, TC-6.3a |
| Release gate | Enforce default CI, real-harness, and gorilla evidence before publish | Story 7 | TC-6.5b, TC-6.5c, TC-6.5d, TC-6.5e |
| First-publish smoke | Install the first published package through `npx` and run one operation end to end | Story 7 | TC-6.7a |
