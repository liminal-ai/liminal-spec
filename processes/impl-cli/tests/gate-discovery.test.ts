import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createSpecPack, createTempDir, writeTextFile } from "./test-helpers";

describe("verification gate discovery", () => {
  test("TC-1.6a honors explicit flags ahead of package scripts, docs, and CI evidence", async () => {
    const { resolveVerificationGates } = await import("../core/gate-discovery");

    const specPackRoot = await createSpecPack("gate-discovery-explicit");
    await writeTextFile(
      join(specPackRoot, "package.json"),
      JSON.stringify(
        {
          scripts: {
            "green-verify": "pnpm story-gate",
            "verify-all": "pnpm epic-gate",
          },
        },
        null,
        2
      )
    );
    await writeTextFile(
      join(specPackRoot, "AGENTS.md"),
      [
        "# Policy",
        "",
        "Story Gate: bun run doc-story-gate",
        "Epic Gate: bun run doc-epic-gate",
        "",
      ].join("\n")
    );
    await writeTextFile(
      join(specPackRoot, ".github", "workflows", "ci.yml"),
      [
        "jobs:",
        "  verify:",
        "    steps:",
        '      - run: bun run green-verify-ci',
        '      - run: bun run verify-all-ci',
        "",
      ].join("\n")
    );

    const result = await resolveVerificationGates({
      specPackRoot,
      explicitStoryGate: "bun run explicit-story-gate",
      explicitEpicGate: "bun run explicit-epic-gate",
    });

    expect(result.status).toBe("ready");
    expect(result.verificationGates).toEqual({
      storyGate: "bun run explicit-story-gate",
      epicGate: "bun run explicit-epic-gate",
      storyGateSource: "explicit CLI flag",
      epicGateSource: "explicit CLI flag",
      storyGateCandidates: expect.any(Array),
      epicGateCandidates: expect.any(Array),
      storyGateRationale: expect.any(String),
      epicGateRationale: expect.any(String),
    });
  });

  test("uses inferred npm package script invocations and prefers them over docs and CI when no package manager is declared", async () => {
    const { resolveVerificationGates } = await import("../core/gate-discovery");

    const specPackRoot = await createSpecPack("gate-discovery-package-precedence");
    await writeTextFile(
      join(specPackRoot, "package.json"),
      JSON.stringify(
        {
          scripts: {
            "green-verify": "pnpm lint && pnpm test:story",
            "verify-all": "pnpm test:epic",
          },
        },
        null,
        2
      )
    );
    await writeTextFile(
      join(specPackRoot, "README.md"),
      [
        "# Verification",
        "",
        "Story Gate: bun run doc-story-gate",
        "Epic Gate: bun run doc-epic-gate",
        "",
      ].join("\n")
    );
    await writeTextFile(
      join(specPackRoot, ".github", "workflows", "ci.yml"),
      [
        "jobs:",
        "  verify:",
        "    steps:",
        '      - run: bun run green-verify-ci',
        '      - run: bun run verify-all-ci',
        "",
      ].join("\n")
    );

    const result = await resolveVerificationGates({
      specPackRoot,
    });

    expect(result.status).toBe("ready");
    expect(result.verificationGates).toEqual({
      storyGate: "npm run green-verify",
      epicGate: "npm run verify-all",
      storyGateSource: "local package.json scripts",
      epicGateSource: "local package.json scripts",
      storyGateCandidates: expect.any(Array),
      epicGateCandidates: expect.any(Array),
      storyGateRationale: expect.any(String),
      epicGateRationale: expect.any(String),
    });
  });

  test("discovers inferred npm package-script gates from the repo root when a nested spec pack has no local policy files", async () => {
    const { resolveVerificationGates } = await import("../core/gate-discovery");

    const repoRoot = await createTempDir("gate-discovery-nested-repo-root");
    await writeTextFile(join(repoRoot, ".git", "HEAD"), "ref: refs/heads/main\n");
    await writeTextFile(
      join(repoRoot, "package.json"),
      JSON.stringify(
        {
          scripts: {
            "green-verify": "pnpm lint && pnpm test:story",
            "verify-all": "pnpm test:epic",
          },
        },
        null,
        2
      )
    );

    const specPackRoot = join(
      repoRoot,
      "docs",
      "spec-build",
      "epics",
      "01-nested-spec-pack"
    );
    await writeTextFile(join(specPackRoot, "epic.md"), "# Epic\n");

    const result = await resolveVerificationGates({
      specPackRoot,
    });

    expect(result.status).toBe("ready");
    expect(result.verificationGates).toEqual({
      storyGate: "npm run green-verify",
      epicGate: "npm run verify-all",
      storyGateSource: "repo-root package.json scripts",
      epicGateSource: "repo-root package.json scripts",
      storyGateCandidates: expect.any(Array),
      epicGateCandidates: expect.any(Array),
      storyGateRationale: expect.any(String),
      epicGateRationale: expect.any(String),
    });
  });

  test("uses project policy docs ahead of CI when package scripts do not define the gates", async () => {
    const { resolveVerificationGates } = await import("../core/gate-discovery");

    const specPackRoot = await createSpecPack("gate-discovery-doc-precedence");
    await writeTextFile(
      join(specPackRoot, "README.md"),
      [
        "# Verification",
        "",
        "Story Gate: bun run doc-story-gate",
        "Epic Gate: bun run doc-epic-gate",
        "",
      ].join("\n")
    );
    await writeTextFile(
      join(specPackRoot, ".github", "workflows", "ci.yml"),
      [
        "jobs:",
        "  verify:",
        "    steps:",
        '      - run: bun run green-verify-ci',
        '      - run: bun run verify-all-ci',
        "",
      ].join("\n")
    );

    const result = await resolveVerificationGates({
      specPackRoot,
    });

    expect(result.status).toBe("ready");
    expect(result.verificationGates).toEqual({
      storyGate: "bun run doc-story-gate",
      epicGate: "bun run doc-epic-gate",
      storyGateSource: "project policy docs",
      epicGateSource: "project policy docs",
      storyGateCandidates: expect.any(Array),
      epicGateCandidates: expect.any(Array),
      storyGateRationale: expect.any(String),
      epicGateRationale: expect.any(String),
    });
  });

  test("uses CI configuration when workflow gates are the only discovery source", async () => {
    const { resolveVerificationGates } = await import("../core/gate-discovery");

    const specPackRoot = await createSpecPack("gate-discovery-ci-only");
    await writeTextFile(
      join(specPackRoot, ".github", "workflows", "ci.yml"),
      [
        "jobs:",
        "  verify:",
        "    steps:",
        '      - run: bun run green-verify-ci',
        '      - run: bun run verify-all-ci',
        "",
      ].join("\n")
    );

    const result = await resolveVerificationGates({
      specPackRoot,
    });

    expect(result.status).toBe("ready");
    expect(result.verificationGates).toEqual({
      storyGate: "bun run green-verify-ci",
      epicGate: "bun run verify-all-ci",
      storyGateSource: "CI configuration",
      epicGateSource: "CI configuration",
      storyGateCandidates: expect.any(Array),
      epicGateCandidates: expect.any(Array),
      storyGateRationale: expect.any(String),
      epicGateRationale: expect.any(String),
    });
  });

  test("uses corepack when packageManager declares pnpm explicitly", async () => {
    const { resolveVerificationGates } = await import("../core/gate-discovery");

    const specPackRoot = await createSpecPack("gate-discovery-corepack-pnpm");
    await writeTextFile(
      join(specPackRoot, "package.json"),
      JSON.stringify(
        {
          packageManager: "pnpm@10.33.0",
          scripts: {
            "green-verify": "pnpm lint && pnpm test:story",
            "verify-all": "pnpm test:epic",
          },
        },
        null,
        2
      )
    );

    const result = await resolveVerificationGates({
      specPackRoot,
    });

    expect(result.status).toBe("ready");
    expect(result.verificationGates).toEqual({
      storyGate: "corepack pnpm run green-verify",
      epicGate: "corepack pnpm run verify-all",
      storyGateSource: "local package.json scripts",
      epicGateSource: "local package.json scripts",
      storyGateCandidates: expect.any(Array),
      epicGateCandidates: expect.any(Array),
      storyGateRationale: expect.any(String),
      epicGateRationale: expect.any(String),
    });
  });

  test("uses lockfile inference when packageManager is absent", async () => {
    const { resolveVerificationGates } = await import("../core/gate-discovery");

    const specPackRoot = await createSpecPack("gate-discovery-lockfile-pnpm");
    await writeTextFile(
      join(specPackRoot, "package.json"),
      JSON.stringify(
        {
          scripts: {
            "green-verify": "pnpm lint && pnpm test:story",
            "verify-all": "pnpm test:epic",
          },
        },
        null,
        2
      )
    );
    await writeTextFile(join(specPackRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");

    const result = await resolveVerificationGates({
      specPackRoot,
    });

    expect(result.status).toBe("ready");
    expect(result.verificationGates).toEqual({
      storyGate: "pnpm run green-verify",
      epicGate: "pnpm run verify-all",
      storyGateSource: "local package.json scripts",
      epicGateSource: "local package.json scripts",
      storyGateCandidates: expect.any(Array),
      epicGateCandidates: expect.any(Array),
      storyGateRationale: expect.any(String),
      epicGateRationale: expect.any(String),
    });
  });

  test("TC-1.6b returns needs-user-decision when gate policy stays ambiguous", async () => {
    const { resolveVerificationGates } = await import("../core/gate-discovery");

    const specPackRoot = await createSpecPack("gate-discovery-ambiguous");
    await writeTextFile(
      join(specPackRoot, "README.md"),
      [
        "# Verification",
        "",
        "Story Gate: bun run story-check-a",
        "Story Gate: bun run story-check-b",
        "Epic Gate: bun run epic-check-a",
        "Epic Gate: bun run epic-check-b",
        "",
      ].join("\n")
    );

    const result = await resolveVerificationGates({
      specPackRoot,
    });

    expect(result.status).toBe("needs-user-decision");
    expect(result.errors).toContainEqual({
      code: "VERIFICATION_GATE_UNRESOLVED",
      message: "Verification gate policy is ambiguous",
      detail:
        "Provide --story-gate and --epic-gate explicitly or clarify the project policy.",
    });
  });

  test("returns needs-user-decision instead of crashing when no local policy exists and no repo root is found", async () => {
    const { resolveVerificationGates } = await import("../core/gate-discovery");

    const tempRoot = await mkdtemp(join(tmpdir(), "gate-discovery-no-repo-"));
    const specPackRoot = join(tempRoot, "nested", "spec-pack");
    await writeTextFile(join(specPackRoot, "epic.md"), "# Epic\n");

    const result = await resolveVerificationGates({
      specPackRoot,
    });

    expect(result.status).toBe("needs-user-decision");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "VERIFICATION_GATE_UNRESOLVED",
      })
    );
  });
});
