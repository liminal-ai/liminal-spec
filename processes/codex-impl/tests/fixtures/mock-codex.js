#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

function getArgValue(flag) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

const outputPath = getArgValue("-o");
const promptArg = args.at(-1);

if (promptArg === "Reply with OK only.") {
  process.stdout.write(JSON.stringify({ type: "turn.completed", text: "OK" }) + "\n");
  process.exit(0);
}

let prompt = "";
process.stdin.on("data", (chunk) => {
  prompt += chunk.toString();
});

process.stdin.on("end", () => {
  const mode = process.env.MOCK_CODEX_MODE || "success";

  if (mode === "stall") {
    process.stdout.write(JSON.stringify({ type: "turn.started" }) + "\n");
    setInterval(() => {}, 1_000);
    return;
  }

  if (mode === "error") {
    process.stderr.write("mock codex error\n");
    process.exit(1);
    return;
  }

  const isSynthesis = /Synthesis Primitive/.test(prompt);
  const status = isSynthesis
    ? {
        processType: "codex-impl",
        primitiveSlug: "codex54-xhigh-story-synthesize",
        storyId: "00-foundation",
        status: "DONE",
        decision: "PASS",
        codexEvidenceRef: "stdout.jsonl",
        reportMarkdown:
          "# Mock Synthesis Report\n\n## DECISION\n\nPASS\n\n## OVERLAPS\n\n(none)\n\n## UNIQUE_FINDINGS\n\n(none)\n\n## DISAGREEMENTS\n\n(none)\n\n## DISPOSITIONS\n\n(none)\n\n## NEXT_ACTION\n\nstory_accept\n\n## OPEN_RISKS\n\n(none)\n",
        milestones: ["accepted"],
        unresolvedFindings: [],
        notes: "mock synthesis pass",
        requiresUserDecision: false,
        nextRecommendedAction: "story_accept"
      }
    : {
        processType: "codex-impl",
        primitiveSlug: "codex54-xhigh-story-implement",
        storyId: "00-foundation",
        status: "DONE",
        codexEvidenceRef: "stdout.jsonl",
        reportMarkdown:
          "# Mock Implement Report\n\n## PLAN\n\nImplement story.\n\n## CHANGES\n\nMock changes.\n\n## TESTS\n\nMock tests.\n\n## GATE_RESULT\n\nPASS\n\n## RESIDUAL_RISKS\n\n(none)\n\n## SPEC_DEVIATIONS\n\n(none)\n\n## OPEN_QUESTIONS\n\n(none)\n",
        milestones: ["implemented"],
        unresolvedFindings: [],
        notes: "mock primitive pass",
        requiresUserDecision: false,
        nextRecommendedAction: "story_verify_primary"
      };

  if (!outputPath) {
    process.stderr.write("missing -o output path\n");
    process.exit(1);
    return;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(status, null, 2) + "\n");
  process.stdout.write(JSON.stringify({ type: "turn.completed" }) + "\n");
  process.exit(0);
});
