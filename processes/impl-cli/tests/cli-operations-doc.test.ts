import { expect, test } from "bun:test";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");

async function read(relativePath: string): Promise<string> {
  return Bun.file(join(ROOT, relativePath)).text();
}

test("TC-5.5a states that the final story gate remains orchestrator-owned", async () => {
  const content = await read("src/references/claude-impl-cli-operations.md");

  expect(content).toContain("The final story gate");
  expect(content).toContain("orchestrator-owned");
});

test("TC-7.2a preserves the cleanup review before dispatch boundary in the CLI guide", async () => {
  const content = await read("src/references/claude-impl-cli-operations.md");

  expect(content).toContain(
    "Review the categorized cleanup batch with the human before dispatching `epic-cleanup`."
  );
  expect(content).toContain("cleanup review remains outside the CLI");
});

test("TC-8.1a requires epic verification before closeout in the public command guide", async () => {
  const content = await read("src/references/claude-impl-cli-operations.md");

  expect(content).toContain("Run `epic-verify` before final closeout.");
  expect(content).toContain(
    "There is no direct closeout path from accepted stories."
  );
});

test("TC-8.1b exposes no skip path around epic verification", async () => {
  const content = await read("src/references/claude-impl-cli-operations.md");

  expect(content).toContain("Do not skip epic verification.");
  expect(content).toContain("Do not treat epic verification as optional.");
});

test("TC-8.4a states that the final epic gate remains orchestrator-owned", async () => {
  const content = await read("src/references/claude-impl-cli-operations.md");

  expect(content).toContain("final epic gate");
  expect(content).toContain("outside the CLI");
});
