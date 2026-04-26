import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const TEST_ROOT_REL = ".test-tmp/claude-impl-build";
const TEST_DIST_REL = `${TEST_ROOT_REL}/dist`;
const TEST_ROOT = join(ROOT, TEST_ROOT_REL);
const DIST = join(ROOT, TEST_DIST_REL);

let buildExitCode = -1;
let buildOutput = "";

beforeAll(async () => {
  await rm(TEST_ROOT, { recursive: true, force: true });

  const proc = Bun.spawn(["bun", "run", "scripts/build.ts"], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      DIST_DIR: TEST_DIST_REL,
    },
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  buildOutput = stdout + stderr;
  buildExitCode = await proc.exited;
}, 30_000);

afterAll(async () => {
  await rm(TEST_ROOT, { recursive: true, force: true });
});

async function createSmokeSpecPack(): Promise<string> {
  const specPackRoot = join(TEST_ROOT, "spec-pack");
  await mkdir(join(specPackRoot, "stories"), { recursive: true });
  await Bun.write(join(specPackRoot, "epic.md"), "# Epic\n");
  await Bun.write(join(specPackRoot, "tech-design.md"), "# Technical Design\n");
  await Bun.write(join(specPackRoot, "test-plan.md"), "# Test Plan\n");
  await Bun.write(
    join(specPackRoot, "stories", "00-foundation.md"),
    "# Story 0: Foundation\n"
  );
  return specPackRoot;
}

describe("claude-impl build integration", () => {
  test("registers ls-claude-impl in the manifest and build summary", async () => {
    const manifest = (await Bun.file(join(ROOT, "manifest.json")).json()) as {
      skills: Record<string, unknown>;
    };

    expect(manifest.skills["ls-claude-impl"]).toBeDefined();
    expect(buildExitCode).toBe(0);
    expect(buildOutput).toContain("skill: ls-claude-impl");
  });

  test("packages the claude-impl references into the installed skill output", async () => {
    expect(
      await Bun.file(
        join(DIST, "skills", "ls-claude-impl", "references", "claude-impl-reading-journey.md")
      ).exists()
    ).toBe(true);
    expect(
      await Bun.file(
        join(DIST, "skills", "ls-claude-impl", "references", "claude-impl-process-playbook.md")
      ).exists()
    ).toBe(true);
    expect(
      await Bun.file(
        join(DIST, "skills", "ls-claude-impl", "references", "claude-impl-cli-operations.md")
      ).exists()
    ).toBe(true);
    expect(
      await Bun.file(
        join(DIST, "skills", "ls-claude-impl", "references", "claude-impl-prompt-system.md")
      ).exists()
    ).toBe(true);
  });

  test("packages the claude-impl onboarding, setup, phase, and operations docs into the installed skill output", async () => {
    for (const relativePath of [
      "onboarding/01-orientation.md",
      "onboarding/02-terminology.md",
      "onboarding/03-operating-model.md",
      "onboarding/04-stage-map.md",
      "onboarding/05-initialization-overview.md",
      "setup/10-spec-pack-discovery.md",
      "setup/11-spec-pack-read-order.md",
      "setup/12-run-setup.md",
      "phases/20-story-cycle.md",
      "phases/21-verification-and-fix-routing.md",
      "phases/22-recovery-and-resume.md",
      "phases/23-cleanup-and-closeout.md",
      "operations/30-cli-operations.md",
      "operations/31-provider-resolution.md",
      "operations/32-prompting-and-inserts.md",
      "operations/33-artifact-contracts.md",
    ]) {
      expect(
        await Bun.file(join(DIST, "skills", "ls-claude-impl", relativePath)).exists()
      ).toBe(true);
    }
  });

  test("copies the bundled cli artifact into the packaged skill", async () => {
    const cliPath = join(DIST, "skills", "ls-claude-impl", "bin", "ls-impl-cli.cjs");
    const cliExists = await Bun.file(cliPath).exists();

    expect(cliExists).toBe(true);
    const content = await Bun.file(cliPath).text();
    expect(content.startsWith("#!/usr/bin/env node\n")).toBe(true);
  });

  test("runs the bundled cli under Node for inspect", async () => {
    const specPackRoot = await createSmokeSpecPack();
    const proc = Bun.spawn(
      [
        "node",
        join(DIST, "skills", "ls-claude-impl", "bin", "ls-impl-cli.cjs"),
        "inspect",
        "--spec-pack-root",
        specPackRoot,
        "--json",
      ],
      {
        cwd: ROOT,
        stdout: "pipe",
        stderr: "pipe",
      }
    );
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(JSON.parse(stdout).outcome).toBe("ready");
  });
});
