import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { createSpecPack, writeTextFile } from "./test-helpers";

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
    });
  });

  test("uses the actual package script commands and prefers them over docs and CI", async () => {
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
      storyGate: "pnpm lint && pnpm test:story",
      epicGate: "pnpm test:epic",
      storyGateSource: "package.json scripts",
      epicGateSource: "package.json scripts",
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
});
