import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
  cliResultEnvelopeSchema,
  epicCleanupResultSchema,
  epicSynthesisResultSchema,
  epicVerifierBatchResultSchema,
  implementorResultSchema,
  inspectResultSchema,
  statusForOutcome,
  storyVerifierBatchResultSchema,
} from "../core/result-contracts";

describe("result contracts", () => {
  test("accepts a valid inspect result envelope", () => {
    const parsed = cliResultEnvelopeSchema(inspectResultSchema).parse({
      command: "inspect",
      version: 1,
      status: "ok",
      outcome: "ready",
      result: {
        status: "ready",
        specPackRoot: "/tmp/spec-pack",
        techDesignShape: "two-file",
        artifacts: {
          epicPath: "/tmp/spec-pack/epic.md",
          techDesignPath: "/tmp/spec-pack/tech-design.md",
          techDesignCompanionPaths: [],
          testPlanPath: "/tmp/spec-pack/test-plan.md",
          storiesDir: "/tmp/spec-pack/stories",
        },
        stories: [],
        inserts: {
          customStoryImplPromptInsert: "absent",
          customStoryVerifierPromptInsert: "absent",
        },
        blockers: [],
        notes: [],
      },
      errors: [],
      warnings: [],
      artifacts: [
        {
          kind: "result-envelope",
          path: "/tmp/spec-pack/artifacts/inspect/001-inspect.json",
        },
      ],
      startedAt: "2026-04-20T00:00:00.000Z",
      finishedAt: "2026-04-20T00:00:00.500Z",
    });

    expect(parsed.outcome).toBe("ready");
  });

  test("rejects an inspect envelope whose status does not match its routing outcome", () => {
    expect(() =>
      cliResultEnvelopeSchema(inspectResultSchema).parse({
        command: "inspect",
        version: 1,
        status: "ok",
        outcome: "blocked",
        result: {
          status: "blocked",
          specPackRoot: "/tmp/spec-pack",
          techDesignShape: "two-file",
          artifacts: {
            epicPath: "/tmp/spec-pack/epic.md",
            techDesignPath: "/tmp/spec-pack/tech-design.md",
            techDesignCompanionPaths: [],
            testPlanPath: "/tmp/spec-pack/test-plan.md",
            storiesDir: "/tmp/spec-pack/stories",
          },
          stories: [],
          inserts: {
            customStoryImplPromptInsert: "absent",
            customStoryVerifierPromptInsert: "absent",
          },
          blockers: ["Missing required artifact: epic.md"],
          notes: [],
        },
        errors: [],
        warnings: [],
        artifacts: [],
        startedAt: "2026-04-20T00:00:00.000Z",
        finishedAt: "2026-04-20T00:00:00.500Z",
      })
    ).toThrow();
  });

  test("TC-4.5a accepts a valid implementor result envelope with continuation fields and the full orchestration report contract", () => {
    const parsed = cliResultEnvelopeSchema(implementorResultSchema).parse({
      command: "story-implement",
      version: 1,
      status: "ok",
      outcome: "ready-for-verification",
      result: {
        resultId: "result-123",
        provider: "codex",
        model: "gpt-5.4",
        role: "story_implementor",
        sessionId: "codex-session-123",
        continuation: {
          provider: "codex",
          sessionId: "codex-session-123",
          storyId: "03-story-implementor-workflow",
        },
        outcome: "ready-for-verification",
        story: {
          id: "03-story-implementor-workflow",
          title: "Story 3: Story Implementor Workflow",
        },
        planSummary:
          "ACs: AC-4.1 to AC-4.5. TCs: TC-4.1a, TC-4.2a, TC-4.2b, TC-4.3a, TC-4.4a, TC-4.4b, TC-4.5a.",
        changedFiles: [
          {
            path: "processes/impl-cli/commands/story-implement.ts",
            reason: "Launch the implementor workflow.",
          },
        ],
        tests: {
          added: ["processes/impl-cli/tests/story-implement-command.test.ts"],
          modified: ["processes/impl-cli/tests/provider-adapter.test.ts"],
          removed: [],
          totalAfterStory: 141,
          deltaFromPriorBaseline: 5,
        },
        gatesRun: [
          {
            command: "bun run green-verify",
            result: "not-run",
          },
        ],
        selfReview: {
          passesRun: 3,
          findingsFixed: [
            "Aligned the continuation artifact path with the explicit session handle contract.",
          ],
          findingsSurfaced: [],
        },
        openQuestions: [],
        specDeviations: [],
        recommendedNextStep: "Run story verification.",
      },
      errors: [],
      warnings: [],
      artifacts: [
        {
          kind: "result-envelope",
          path: "/tmp/spec-pack/artifacts/03-story-implementor-workflow/001-implementor.json",
        },
      ],
      startedAt: "2026-04-20T00:00:00.000Z",
      finishedAt: "2026-04-20T00:00:01.000Z",
    });

    expect(parsed.result?.continuation?.sessionId).toBe("codex-session-123");
  });

  test("rejects an implementor envelope whose status does not match a needs-human-ruling outcome", () => {
    expect(() =>
      cliResultEnvelopeSchema(implementorResultSchema).parse({
        command: "story-implement",
        version: 1,
        status: "ok",
        outcome: "needs-human-ruling",
        result: {
          resultId: "result-124",
          provider: "codex",
          model: "gpt-5.4",
          role: "story_implementor",
          sessionId: "codex-session-124",
          continuation: {
            provider: "codex",
            sessionId: "codex-session-124",
            storyId: "03-story-implementor-workflow",
          },
          outcome: "needs-human-ruling",
          story: {
            id: "03-story-implementor-workflow",
            title: "Story 3: Story Implementor Workflow",
          },
          planSummary: "Surface the uncertain fix to the orchestrator.",
          changedFiles: [],
          tests: {
            added: [],
            modified: [],
            removed: [],
          },
          gatesRun: [],
          selfReview: {
            passesRun: 1,
            findingsFixed: [],
            findingsSurfaced: ["Potential design ambiguity needs human ruling."],
          },
          openQuestions: [],
          specDeviations: [],
          recommendedNextStep: "Pause for a human decision.",
        },
        errors: [],
        warnings: [],
        artifacts: [],
        startedAt: "2026-04-20T00:00:00.000Z",
        finishedAt: "2026-04-20T00:00:01.000Z",
      })
    ).toThrow();
  });

  test("TC-5.2a accepts a valid story verifier batch envelope with identity, coverage, gate results, and routing guidance", () => {
    const parsed = cliResultEnvelopeSchema(storyVerifierBatchResultSchema).parse({
      command: "story-verify",
      version: 1,
      status: "ok",
      outcome: "pass",
      result: {
        outcome: "pass",
        story: {
          id: "04-story-verification-workflow",
          title: "Story 4: Story Verification Workflow",
        },
        verifierResults: [
          {
            resultId: "verify-result-1",
            verifierLabel: "story-verifier-1",
            provider: "codex",
            model: "gpt-5.4",
            story: {
              id: "04-story-verification-workflow",
              title: "Story 4: Story Verification Workflow",
            },
            artifactsRead: [
              "/tmp/spec-pack/stories/04-story-verification-workflow.md",
              "/tmp/spec-pack/tech-design.md",
              "/tmp/spec-pack/test-plan.md",
            ],
            reviewScopeSummary:
              "Reviewed the story requirements, verification routing, and provider evidence.",
            findings: [
              {
                id: "verify-finding-1",
                severity: "major",
                title: "Verifier finding shape is preserved",
                evidence:
                  "The verifier found one requirement-coverage gap in the current implementation batch.",
                affectedFiles: [
                  "processes/impl-cli/commands/story-verify.ts",
                ],
                requirementIds: ["TC-5.2a"],
                recommendedFixScope: "quick-fix",
                blocking: false,
              },
            ],
            requirementCoverage: {
              verified: ["AC-5.1", "AC-5.2", "TC-5.1a", "TC-5.2a"],
              unverified: [],
            },
            gatesRun: [
              {
                command: "bun run green-verify",
                result: "not-run",
              },
            ],
            mockOrShimAuditFindings: [
              "The verifier found no fake success path, but it explicitly audited the production adapter path.",
            ],
            recommendedNextStep: "pass",
            recommendedFixScope: "same-session-implementor",
            openQuestions: [
              "Should future verifier batches attach persisted provider stdout artifacts?",
            ],
            additionalObservations: [
              "No additional finding, but artifact persistence remains easy to audit.",
            ],
          },
        ],
      },
      errors: [],
      warnings: [],
      artifacts: [
        {
          kind: "result-envelope",
          path: "/tmp/spec-pack/artifacts/04-story-verification-workflow/001-verify-batch.json",
        },
      ],
      startedAt: "2026-04-20T00:00:00.000Z",
      finishedAt: "2026-04-20T00:00:01.000Z",
    });

    expect(parsed.result?.verifierResults[0]?.verifierLabel).toBe(
      "story-verifier-1"
    );
    expect(parsed.result?.verifierResults[0]?.findings[0]).toMatchObject({
      id: "verify-finding-1",
      severity: "major",
      recommendedFixScope: "quick-fix",
      blocking: false,
    });
    expect(
      parsed.result?.verifierResults[0]?.mockOrShimAuditFindings[0]
    ).toContain("production adapter path");
  });

  test("rejects a story verifier batch envelope when the verifier contract drops required coverage or observation fields", () => {
    expect(() =>
      cliResultEnvelopeSchema(storyVerifierBatchResultSchema).parse({
        command: "story-verify",
        version: 1,
        status: "ok",
        outcome: "revise",
        result: {
          outcome: "revise",
          story: {
            id: "04-story-verification-workflow",
            title: "Story 4: Story Verification Workflow",
          },
          verifierResults: [
            {
              resultId: "verify-result-2",
              verifierLabel: "story-verifier-2",
              provider: "claude-code",
              model: "claude-sonnet",
              story: {
                id: "04-story-verification-workflow",
                title: "Story 4: Story Verification Workflow",
              },
              artifactsRead: [
                "/tmp/spec-pack/stories/04-story-verification-workflow.md",
              ],
              reviewScopeSummary: "Missing several required verifier fields.",
              findings: [],
              gatesRun: [],
              mockOrShimAuditFindings: [],
              recommendedNextStep: "revise",
              recommendedFixScope: "quick-fix",
              openQuestions: [],
            },
          ],
        },
        errors: [],
        warnings: [],
        artifacts: [],
        startedAt: "2026-04-20T00:00:00.000Z",
        finishedAt: "2026-04-20T00:00:01.000Z",
      })
    ).toThrow();
  });

  test("TC-5.3b accepts a quick-fix envelope while validating only the shared outer wrapper", () => {
    const parsed = cliResultEnvelopeSchema(z.unknown()).parse({
      command: "quick-fix",
      version: 1,
      status: "ok",
      outcome: "ready-for-verification",
      result: {
        provider: "codex",
        model: "gpt-5.4",
        rawProviderOutput:
          "{\"type\":\"item.completed\",\"message\":\"Applied the requested fix.\"}",
        arbitraryProviderMetadata: {
          session: "quick-fix-001",
        },
      },
      errors: [],
      warnings: [],
      artifacts: [
        {
          kind: "result-envelope",
          path: "/tmp/spec-pack/artifacts/quick-fix/001-quick-fix.json",
        },
      ],
      startedAt: "2026-04-20T00:00:00.000Z",
      finishedAt: "2026-04-20T00:00:01.000Z",
    });

    expect(parsed.result).toMatchObject({
      provider: "codex",
      rawProviderOutput:
        "{\"type\":\"item.completed\",\"message\":\"Applied the requested fix.\"}",
    });
  });

  test("TC-7.1a accepts a valid epic cleanup result envelope with the durable cleanup artifact contract", () => {
    const parsed = cliResultEnvelopeSchema(epicCleanupResultSchema).parse({
      command: "epic-cleanup",
      version: 1,
      status: "ok",
      outcome: "cleaned",
      result: {
        resultId: "cleanup-result-001",
        outcome: "cleaned",
        cleanupBatchPath: "/tmp/spec-pack/artifacts/cleanup/cleanup-batch.md",
        filesChanged: [
          "processes/impl-cli/commands/epic-cleanup.ts",
          "src/references/claude-impl-process-playbook.md",
        ],
        changeSummary:
          "Applied the approved cleanup-only corrections before epic verification.",
        gatesRun: [
          {
            command: "bun run green-verify",
            result: "not-run",
          },
        ],
        unresolvedConcerns: [],
        recommendedNextStep:
          "Review the cleanup result, then launch epic verification.",
      },
      errors: [],
      warnings: [],
      artifacts: [
        {
          kind: "result-envelope",
          path: "/tmp/spec-pack/artifacts/cleanup/001-cleanup-result.json",
        },
      ],
      startedAt: "2026-04-20T00:00:00.000Z",
      finishedAt: "2026-04-20T00:00:00.500Z",
    });

    expect(parsed.result?.cleanupBatchPath).toContain("cleanup-batch.md");
  });

  test("accepts a valid epic verifier batch envelope with explicit mock or shim audit findings and categorized issues", () => {
    const parsed = cliResultEnvelopeSchema(epicVerifierBatchResultSchema).parse({
      command: "epic-verify",
      version: 1,
      status: "ok",
      outcome: "revise",
      result: {
        outcome: "revise",
        verifierResults: [
          {
            resultId: "epic-verify-result-001",
            outcome: "revise",
            provider: "codex",
            model: "gpt-5.4",
            reviewerLabel: "epic-verifier-1",
            crossStoryFindings: [
              "The cleanup workflow and closeout docs drifted across stories.",
            ],
            architectureFindings: [
              "Artifact persistence is consistent, but the final closeout flow still needs synthesis wiring.",
            ],
            epicCoverageAssessment: [
              "AC-7.1 through AC-8.4 were reviewed against the runtime and skill surfaces.",
            ],
            mockOrShimAuditFindings: [
              "No inappropriate mocks remain on production paths after the epic cleanup pass.",
            ],
            blockingFindings: [],
            nonBlockingFindings: [
              {
                id: "epic-finding-001",
                severity: "major",
                title: "Epic synthesis handoff is not yet wired",
                evidence:
                  "The epic verifier confirmed that closeout still lacks the mandatory synthesis step.",
                affectedFiles: [
                  "processes/impl-cli/commands/epic-synthesize.ts",
                ],
                requirementIds: ["TC-8.2a"],
                recommendedFixScope: "fresh-fix-path",
                blocking: false,
              },
            ],
            unresolvedItems: [],
            gateResult: "not-run",
          },
        ],
      },
      errors: [],
      warnings: [],
      artifacts: [
        {
          kind: "result-envelope",
          path: "/tmp/spec-pack/artifacts/epic/001-epic-verifier-batch.json",
        },
      ],
      startedAt: "2026-04-20T00:00:00.000Z",
      finishedAt: "2026-04-20T00:00:01.000Z",
    });

    expect(parsed.result?.verifierResults[0]?.mockOrShimAuditFindings).toEqual(
      expect.arrayContaining([
        "No inappropriate mocks remain on production paths after the epic cleanup pass.",
      ])
    );
  });

  test("TC-8.3a accepts a valid epic synthesis result envelope that keeps confirmed issues separate from disputed or unconfirmed issues", () => {
    const parsed = cliResultEnvelopeSchema(epicSynthesisResultSchema).parse({
      command: "epic-synthesize",
      version: 1,
      status: "ok",
      outcome: "needs-more-verification",
      result: {
        resultId: "epic-synthesis-result-001",
        outcome: "needs-more-verification",
        confirmedIssues: ["Epic verification is mandatory before closeout."],
        disputedOrUnconfirmedIssues: [
          "One verifier reported a production-path mock, but the synthesizer could not confirm it from the current codebase evidence.",
        ],
        readinessAssessment:
          "The epic is not ready for closeout because at least one material issue remains disputed.",
        recommendedNextStep:
          "Run another fresh epic verification pass after the cleanup fixes are applied.",
      },
      errors: [],
      warnings: [],
      artifacts: [
        {
          kind: "result-envelope",
          path: "/tmp/spec-pack/artifacts/epic/001-epic-synthesis.json",
        },
      ],
      startedAt: "2026-04-20T00:00:00.000Z",
      finishedAt: "2026-04-20T00:00:01.000Z",
    });

    expect(parsed.result?.confirmedIssues).toEqual([
      "Epic verification is mandatory before closeout.",
    ]);
    expect(parsed.result?.disputedOrUnconfirmedIssues).toHaveLength(1);
  });

  test("returns an error status for unknown outcomes instead of throwing", () => {
    expect(statusForOutcome("future-outcome-not-yet-mapped")).toBe("error");
  });
});
