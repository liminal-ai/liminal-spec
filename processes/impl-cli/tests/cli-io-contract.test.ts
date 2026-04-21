import { describe, expect, test } from "bun:test";

import { createSpecPack, parseJsonOutput, runSourceCli } from "./test-helpers";

describe("cli io contract", () => {
  test("--json emits exactly one envelope object on stdout", async () => {
    const specPackRoot = await createSpecPack("cli-io-json");
    const run = await runSourceCli([
      "inspect",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ]);

    expect(run.exitCode).toBe(0);
    expect(run.stdout.trim().split("\n")).toHaveLength(1);

    const envelope = parseJsonOutput<any>(run.stdout);
    expect(envelope.command).toBe("inspect");
  });

  test("persisted artifact json matches the stdout envelope", async () => {
    const specPackRoot = await createSpecPack("cli-io-artifact");
    const run = await runSourceCli([
      "inspect",
      "--spec-pack-root",
      specPackRoot,
      "--json",
    ]);

    expect(run.exitCode).toBe(0);

    const envelope = parseJsonOutput<any>(run.stdout);
    const artifactPath = envelope.artifacts[0].path as string;
    const persisted = JSON.parse(await Bun.file(artifactPath).text());

    expect(persisted).toEqual(envelope);
  });
});
