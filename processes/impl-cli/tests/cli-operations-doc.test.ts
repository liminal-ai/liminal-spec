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

test("documents pollable runtime progress artifacts without replacing the final envelope", async () => {
  const content = await read("src/references/claude-impl-cli-operations.md");

  expect(content).toContain("progress/<artifact-base>.status.json");
  expect(content).toContain("progress/<artifact-base>.progress.jsonl");
  expect(content).toContain("Use the final JSON envelope for routing");
});

test("teaches the orchestrator how to poll and describe long-running work", async () => {
  const content = await read("src/references/claude-impl-process-playbook.md");

  expect(content).toContain("read `status.json`");
  expect(content).toContain("compare `updatedAt` and `lastOutputAt`");
  expect(content).toContain("suspected-stall");
  expect(content).toContain("Do not reroute");
});

test("documents story-self-review as a separate bounded operation in the public command guide", async () => {
  const content = await read("src/references/claude-impl-cli-operations.md");

  expect(content).toContain("`story-self-review`");
  expect(content).toContain("Run `story-self-review` after a clean `story-implement` or `story-continue` result");
});

test("documents story-verify as a retained verifier convergence command", async () => {
  const content = await read("src/claude-impl/operations/30-cli-operations.md");

  expect(content).toContain("start or continue the retained verifier session");
  expect(content).toContain("Initial verifier pass");
  expect(content).toContain("Follow-up verifier pass");
  expect(content).toContain("--response-file <path> | --response-text <text>");
  expect(content).toContain("--orchestrator-context-file <path> | --orchestrator-context-text <text>");
});

test("documents portable CLI invocation and top-level quick-fix artifacts", async () => {
  const content = await read("src/references/claude-impl-cli-operations.md");

  expect(content).toContain("node bin/ls-impl-cli.cjs");
  expect(content).toContain("portable invocation form across macOS, Linux, and Windows");
  expect(content).toContain("quick-fix persists under top-level `artifacts/quick-fix/`");
});
