import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "bun:test";

import {
  createExternalSpecPack,
  createRunConfig,
  createSpecPack,
  createTempDir,
  parseJsonOutput,
  readJsonLines,
  runSourceCli,
  writeFakeProviderExecutable,
  writeRunConfig,
  writeTextFile,
} from "./test-helpers";

interface EpicVerifierFindingReport {
  id: string;
  severity: "critical" | "major" | "minor" | "observation";
  title: string;
  evidence: string;
  affectedFiles: string[];
  requirementIds: string[];
  recommendedFixScope:
    | "same-session-implementor"
    | "quick-fix"
    | "fresh-fix-path"
    | "human-ruling";
  blocking: boolean;
}

interface EpicVerifierReport {
  resultId: string;
  outcome: "pass" | "revise" | "block";
  provider: "claude-code" | "codex" | "copilot";
  model: string;
  reviewerLabel: string;
  crossStoryFindings: string[];
  architectureFindings: string[];
  epicCoverageAssessment: string[];
  mockOrShimAuditFindings: string[];
  blockingFindings: EpicVerifierFindingReport[];
  nonBlockingFindings: EpicVerifierFindingReport[];
  unresolvedItems: string[];
  gateResult: "pass" | "fail" | "not-run";
}

interface EpicSynthesisPayload {
  outcome:
    | "ready-for-closeout"
    | "needs-fixes"
    | "needs-more-verification"
    | "blocked";
  confirmedIssues: string[];
  disputedOrUnconfirmedIssues: string[];
  readinessAssessment: string;
  recommendedNextStep: string;
}

async function createEpicSpecPack(scope: string): Promise<string> {
  const specPackRoot = await createSpecPack(scope, {
    companionMode: "four-file",
  });
  await writeTextFile(
    join(specPackRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "fixture-spec-pack",
        private: true,
        scripts: {
          "green-verify": "bun run green-verify",
          "verify-all": "bun run verify-all",
        },
      },
      null,
      2
    )}\n`
  );

  return specPackRoot;
}

function baseVerifierReport(
  reviewerLabel: string,
  overrides: Partial<EpicVerifierReport> = {}
): EpicVerifierReport {
  const report: EpicVerifierReport = {
    resultId: `${reviewerLabel}-result-001`,
    outcome: "pass",
    provider: reviewerLabel === "epic-verifier-1" ? "codex" : "claude-code",
    model: reviewerLabel === "epic-verifier-1" ? "gpt-5.4" : "claude-sonnet",
    reviewerLabel,
    crossStoryFindings: [
      "Cleanup, verification, and synthesis are treated as a single closeout workflow.",
    ],
    architectureFindings: [
      "Artifacts persist under the expected cleanup and epic directories.",
    ],
    epicCoverageAssessment: ["Epic AC-7.1 through AC-8.4 were reviewed."],
    mockOrShimAuditFindings: [
      "No inappropriate mocks remain on production paths.",
    ],
    blockingFindings: [],
    nonBlockingFindings: [],
    unresolvedItems: [],
    gateResult: "not-run",
  };

  return {
    ...report,
    ...overrides,
    crossStoryFindings:
      overrides.crossStoryFindings ?? report.crossStoryFindings,
    architectureFindings:
      overrides.architectureFindings ?? report.architectureFindings,
    epicCoverageAssessment:
      overrides.epicCoverageAssessment ?? report.epicCoverageAssessment,
    mockOrShimAuditFindings:
      overrides.mockOrShimAuditFindings ?? report.mockOrShimAuditFindings,
    blockingFindings:
      overrides.blockingFindings ?? report.blockingFindings,
    nonBlockingFindings:
      overrides.nonBlockingFindings ?? report.nonBlockingFindings,
    unresolvedItems: overrides.unresolvedItems ?? report.unresolvedItems,
  };
}

async function writeVerifierReport(
  specPackRoot: string,
  fileName: string,
  report: EpicVerifierReport
): Promise<string> {
  const reportPath = join(specPackRoot, "artifacts", "epic", fileName);
  await writeTextFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

function providerResult(sessionId: string, payload: EpicSynthesisPayload) {
  return JSON.stringify({
    sessionId,
    result: payload,
  });
}

function baseSynthesisPayload(
  overrides: Partial<EpicSynthesisPayload> = {}
): EpicSynthesisPayload {
  return {
    outcome: "ready-for-closeout",
    confirmedIssues: ["Epic verification ran before closeout."],
    disputedOrUnconfirmedIssues: [],
    readinessAssessment:
      "The epic is ready for the orchestrator-owned final gate.",
    recommendedNextStep:
      "Run the final epic gate and review the synthesis evidence before closeout.",
    ...overrides,
  };
}

test("returns INVALID_INVOCATION with exit code 1 when no verifier reports are provided", async () => {
  const specPackRoot = await createEpicSpecPack("epic-synthesize-missing-reports");

  const run = await runSourceCli([
    "epic-synthesize",
    "--spec-pack-root",
    specPackRoot,
    "--json",
  ]);

  expect(run.exitCode).toBe(1);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("error");
  expect(envelope.outcome).toBe("error");
  expect(envelope.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "INVALID_INVOCATION",
        message: "Provide at least one --verifier-report path.",
      }),
    ])
  );
});

test("TC-8.2a runs epic synthesis from verifier reports and returns the structured synthesis result", async () => {
  const specPackRoot = await createEpicSpecPack("epic-synthesize-contract");
  await writeRunConfig(specPackRoot, createRunConfig());
  const reportOne = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-1.json",
    baseVerifierReport("epic-verifier-1")
  );
  const reportTwo = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-2.json",
    baseVerifierReport("epic-verifier-2")
  );
  const providerBinDir = await createTempDir("epic-synthesize-contract-provider");
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(
          "codex-epic-synthesize-001",
          baseSynthesisPayload()
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-synthesize",
      "--spec-pack-root",
      specPackRoot,
      "--verifier-report",
      reportOne,
      "--verifier-report",
      reportTwo,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(run.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.command).toBe("epic-synthesize");
  expect(envelope.outcome).toBe("ready-for-closeout");
  expect(envelope.result.confirmedIssues).toEqual([
    "Epic verification ran before closeout.",
  ]);

  const artifactPath = envelope.artifacts[0].path as string;
  expect(artifactPath).toContain("/artifacts/epic/001-epic-synthesis.json");
  const persisted = JSON.parse(await Bun.file(artifactPath).text());
  expect(persisted).toEqual(envelope);

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(1);
  expect(invocations[0]?.args).not.toContain("resume");
});

test("blocks epic-synthesize with INVALID_SPEC_PACK when the spec-pack root is outside any git repo", async () => {
  const specPackRoot = await createExternalSpecPack("epic-synthesize-no-git-repo");
  const verifierReportPath = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-1.json",
    baseVerifierReport("epic-verifier-1")
  );

  const run = await runSourceCli([
    "epic-synthesize",
    "--spec-pack-root",
    specPackRoot,
    "--verifier-report",
    verifierReportPath,
    "--json",
  ]);

  expect(run.exitCode).toBe(3);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("blocked");
  expect(envelope.outcome).toBe("blocked");
  expect(envelope.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "INVALID_SPEC_PACK",
      }),
    ])
  );
});

test("blocks epic-synthesize when the structured synthesis payload includes an unknown top-level key", async () => {
  const specPackRoot = await createEpicSpecPack("epic-synthesize-strict-payload");
  await writeRunConfig(specPackRoot, createRunConfig());
  const reportOne = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-1.json",
    baseVerifierReport("epic-verifier-1")
  );
  const reportTwo = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-2.json",
    baseVerifierReport("epic-verifier-2")
  );
  const providerBinDir = await createTempDir("epic-synthesize-strict-provider");
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: JSON.stringify({
          sessionId: "codex-epic-synthesize-strict-001",
          result: {
            ...baseSynthesisPayload(),
            extraField: "drift",
          },
        }),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-synthesize",
      "--spec-pack-root",
      specPackRoot,
      "--verifier-report",
      reportOne,
      "--verifier-report",
      reportTwo,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(run.exitCode).toBe(3);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("blocked");
  expect(envelope.outcome).toBe("blocked");
  expect(envelope.result).toBeUndefined();
  expect(envelope.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "PROVIDER_OUTPUT_INVALID",
      }),
    ])
  );
});

test("executes epic-synthesize through Copilot when the run config selects Copilot for the epic synthesizer role", async () => {
  const specPackRoot = await createEpicSpecPack("epic-synthesize-copilot");
  await writeRunConfig(
    specPackRoot,
    createRunConfig({
      epic_synthesizer: {
        secondary_harness: "copilot",
        model: "gpt-5.4",
        reasoning_effort: "xhigh",
      },
    })
  );
  const reportOne = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-1.json",
    baseVerifierReport("epic-verifier-1")
  );
  const reportTwo = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-2.json",
    baseVerifierReport("epic-verifier-2")
  );
  const providerBinDir = await createTempDir("epic-synthesize-copilot-provider");
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "copilot",
    responses: [
      {
        stdout: providerResult(
          "copilot-epic-synthesize-001",
          baseSynthesisPayload()
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-synthesize",
      "--spec-pack-root",
      specPackRoot,
      "--verifier-report",
      reportOne,
      "--verifier-report",
      reportTwo,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(run.exitCode).toBe(0);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.outcome).toBe("ready-for-closeout");
  expect(envelope.result.confirmedIssues).toEqual([
    "Epic verification ran before closeout.",
  ]);

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(1);
  expect(invocations[0]?.args).toEqual([
    "-p",
    expect.any(String),
    "-s",
    "--model",
    "gpt-5.4",
  ]);
});

test("TC-8.3a verifies findings independently instead of blindly merging verifier reports", async () => {
  const specPackRoot = await createEpicSpecPack(
    "epic-synthesize-independent-verification"
  );
  await writeRunConfig(specPackRoot, createRunConfig());
  const reportOne = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-1.json",
    baseVerifierReport("epic-verifier-1", {
      outcome: "revise",
      nonBlockingFindings: [
        {
          id: "epic-synth-finding-001",
          severity: "major",
          title: "Cleanup precedes epic verification",
          evidence: "Verifier 1 observed the documented cleanup ordering.",
          affectedFiles: ["src/references/claude-impl-process-playbook.md"],
          requirementIds: ["TC-7.3a"],
          recommendedFixScope: "fresh-fix-path",
          blocking: false,
        },
      ],
    })
  );
  const reportTwo = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-2.json",
    baseVerifierReport("epic-verifier-2", {
      outcome: "revise",
      nonBlockingFindings: [
        {
          id: "epic-synth-finding-002",
          severity: "major",
          title: "A production-path mock may remain",
          evidence:
            "Verifier 2 suspected a production-path mock but could not confirm it conclusively.",
          affectedFiles: ["processes/impl-cli/core/provider-adapters/copilot.ts"],
          requirementIds: ["TC-8.1c"],
          recommendedFixScope: "human-ruling",
          blocking: false,
        },
      ],
    })
  );
  const providerBinDir = await createTempDir(
    "epic-synthesize-independent-verification-provider"
  );
  const { env, logPath } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(
          "codex-epic-synthesize-002",
          baseSynthesisPayload({
            outcome: "needs-more-verification",
            confirmedIssues: [
              "Cleanup must be verified before epic verification begins.",
            ],
            disputedOrUnconfirmedIssues: [
              "The reported production-path mock could not be confirmed from the current evidence set.",
            ],
            readinessAssessment:
              "One material issue remains unconfirmed, so the epic is not ready for closeout.",
            recommendedNextStep:
              "Run another fresh epic verification pass after clarifying the disputed mock report.",
          })
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-synthesize",
      "--spec-pack-root",
      specPackRoot,
      "--verifier-report",
      reportOne,
      "--verifier-report",
      reportTwo,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(run.exitCode).toBe(2);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.outcome).toBe("needs-more-verification");
  expect(envelope.result.confirmedIssues).toEqual([
    "Cleanup must be verified before epic verification begins.",
  ]);
  expect(envelope.result.disputedOrUnconfirmedIssues).toEqual([
    "The reported production-path mock could not be confirmed from the current evidence set.",
  ]);

  const invocations = await readJsonLines<{ args: string[] }>(logPath);
  expect(invocations).toHaveLength(1);
  const prompt = invocations[0]?.args[invocations[0].args.length - 1] ?? "";
  expect(prompt).toContain("independently verify");
  expect(prompt).toContain(reportOne);
  expect(prompt).toContain(reportTwo);
});

test("returns needs-more-verification when all epic findings remain disputed or unconfirmed", async () => {
  const specPackRoot = await createEpicSpecPack("epic-synthesize-all-disputed");
  await writeRunConfig(specPackRoot, createRunConfig());
  const reportOne = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-1.json",
    baseVerifierReport("epic-verifier-1", {
      outcome: "revise",
    })
  );
  const reportTwo = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-2.json",
    baseVerifierReport("epic-verifier-2", {
      outcome: "revise",
    })
  );
  const providerBinDir = await createTempDir("epic-synthesize-all-disputed-provider");
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(
          "codex-epic-synthesize-003",
          baseSynthesisPayload({
            outcome: "needs-more-verification",
            confirmedIssues: [],
            disputedOrUnconfirmedIssues: [
              "No reported issue could be confirmed from the current evidence set.",
            ],
            readinessAssessment:
              "The verifier findings remain too disputed for epic closeout.",
            recommendedNextStep:
              "Run another fresh epic verification cycle or escalate for human ruling.",
          })
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-synthesize",
      "--spec-pack-root",
      specPackRoot,
      "--verifier-report",
      reportOne,
      "--verifier-report",
      reportTwo,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(run.exitCode).toBe(2);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.outcome).toBe("needs-more-verification");
  expect(envelope.result.confirmedIssues).toEqual([]);
  expect(envelope.result.disputedOrUnconfirmedIssues).toHaveLength(1);
});

test("returns exit code 2 when epic synthesis reports needs-fixes", async () => {
  const specPackRoot = await createEpicSpecPack("epic-synthesize-needs-fixes");
  await writeRunConfig(specPackRoot, createRunConfig());
  const reportOne = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-1.json",
    baseVerifierReport("epic-verifier-1", {
      outcome: "revise",
    })
  );
  const reportTwo = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-2.json",
    baseVerifierReport("epic-verifier-2", {
      outcome: "revise",
    })
  );
  const providerBinDir = await createTempDir("epic-synthesize-needs-fixes-provider");
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stdout: providerResult(
          "codex-epic-synthesize-004",
          baseSynthesisPayload({
            outcome: "needs-fixes",
            confirmedIssues: [
              "A closeout fix still needs to land before the epic is ready.",
            ],
            disputedOrUnconfirmedIssues: [],
            readinessAssessment:
              "The epic is not ready for closeout until the confirmed issue is fixed.",
            recommendedNextStep:
              "Route the confirmed issue to a fix path, then re-run epic verification and synthesis.",
          })
        ),
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-synthesize",
      "--spec-pack-root",
      specPackRoot,
      "--verifier-report",
      reportOne,
      "--verifier-report",
      reportTwo,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(run.exitCode).toBe(2);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.outcome).toBe("needs-fixes");
  expect(envelope.result.confirmedIssues).toEqual([
    "A closeout fix still needs to land before the epic is ready.",
  ]);
});

test("returns exit code 3 when epic synthesis is blocked by provider execution failure", async () => {
  const specPackRoot = await createEpicSpecPack("epic-synthesize-blocked");
  await writeRunConfig(specPackRoot, createRunConfig());
  const reportOne = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-1.json",
    baseVerifierReport("epic-verifier-1")
  );
  const reportTwo = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-2.json",
    baseVerifierReport("epic-verifier-2")
  );
  const providerBinDir = await createTempDir("epic-synthesize-blocked-provider");
  const { env } = await writeFakeProviderExecutable({
    binDir: providerBinDir,
    provider: "codex",
    responses: [
      {
        stderr: "epic synthesis provider failed before returning JSON",
        exitCode: 1,
      },
    ],
  });

  const run = await runSourceCli(
    [
      "epic-synthesize",
      "--spec-pack-root",
      specPackRoot,
      "--verifier-report",
      reportOne,
      "--verifier-report",
      reportTwo,
      "--json",
    ],
    {
      env: {
        PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
        ...env,
      },
    }
  );

  expect(run.exitCode).toBe(3);

  const envelope = parseJsonOutput<any>(run.stdout);
  expect(envelope.status).toBe("blocked");
  expect(envelope.outcome).toBe("blocked");
  expect(envelope.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "PROVIDER_UNAVAILABLE",
      }),
    ])
  );
});

test("returns exit code 3 when a verifier report path is unreadable", async () => {
  const specPackRoot = await createEpicSpecPack("epic-synthesize-unreadable-report");
  await writeRunConfig(specPackRoot, createRunConfig());
  const reportOne = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-1.json",
    baseVerifierReport("epic-verifier-1")
  );
  const reportTwo = await writeVerifierReport(
    specPackRoot,
    "epic-verifier-2.json",
    baseVerifierReport("epic-verifier-2")
  );
  await chmod(reportTwo, 0o000);

  try {
    const run = await runSourceCli(
      [
        "epic-synthesize",
        "--spec-pack-root",
        specPackRoot,
        "--verifier-report",
        reportOne,
        "--verifier-report",
        reportTwo,
        "--json",
      ]
    );

    expect(run.exitCode).toBe(3);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.status).toBe("blocked");
    expect(envelope.outcome).toBe("blocked");
    expect(envelope.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_SPEC_PACK",
        }),
      ])
    );
  } finally {
    await chmod(reportTwo, 0o644);
  }
});
