import { describe, expect, test } from "bun:test";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");

async function read(relativePath: string): Promise<string> {
  return Bun.file(join(ROOT, relativePath)).text();
}

describe("claude-impl skill source", () => {
  test("TC-1.3a teaches the new-run path when team-impl-log.md is absent", async () => {
    const content = await read("src/phases/claude-impl.md");
    expect(content).toContain("If `team-impl-log.md` is absent");
    expect(content).toContain("create `team-impl-log.md`");
  });

  test("TC-1.3b teaches the resume path when team-impl-log.md already exists", async () => {
    const content = await read("src/phases/claude-impl.md");
    expect(content).toContain("If `team-impl-log.md` already exists");
    expect(content).toContain("resume from the recorded state");
  });

  test("TC-1.4a documents both public prompt insert files as optional runtime inputs", async () => {
    const content = await read("src/references/claude-impl-prompt-system.md");
    expect(content).toContain("custom-story-impl-prompt-insert.md");
    expect(content).toContain("custom-story-verifier-prompt-insert.md");
    expect(content).toContain("optional public inserts");
  });

  test("TC-1.4b keeps insert detection non-blocking when the files are absent", async () => {
    const content = await read("src/references/claude-impl-reading-journey.md");
    expect(content).toContain("If neither insert file is present, continue normally");
    expect(content).toContain("record that no public prompt inserts are active");
  });

  test("TC-1.5a teaches the orchestrator to read every story before implementation starts", async () => {
    const content = await read("src/phases/claude-impl.md");
    expect(content).toContain("Read every story file in `stories/` in order");
    expect(content).toContain("before starting Story 0 or Story 1");
  });

  test("TC-1.6a teaches verification-gate discovery with the documented precedence", async () => {
    const content = await read("src/phases/claude-impl.md");
    expect(content).toContain("Discover verification gates in this precedence order");
    expect(content).toContain("explicit CLI flags");
    expect(content).toContain("package scripts");
    expect(content).toContain("project policy docs");
    expect(content).toContain("CI configuration");
  });

  test("TC-1.6b teaches the orchestrator to pause when gate policy stays ambiguous", async () => {
    const content = await read("src/phases/claude-impl.md");
    expect(content).toContain("If the policy stays ambiguous after that precedence order");
    expect(content).toContain("pause for a user decision instead of improvising");
  });

  test("TC-2.4a teaches the orchestrator to record the resolved run configuration after preflight", async () => {
    const content = await read("src/phases/claude-impl.md");
    expect(content).toContain("After `preflight`, record the validated run configuration");
    expect(content).toContain("available providers");
    expect(content).toContain("active role defaults");
    expect(content).toContain("degraded fallback conditions");
  });

  test("TC-2.2a / TC-2.2b / TC-2.2c teaches the provider fallback chain", async () => {
    const content = await read("src/phases/claude-impl.md");
    const section = content.match(
      /## Default Resolution Contract[\s\S]*?(?=\n## |\s*$)/
    )?.[0];
    expect(section).toBeDefined();
    expect(section).toContain(
      "- If Codex CLI is available, default the story implementor to Codex `gpt-5.4` with high reasoning."
    );
    expect(section).toContain(
      "- If Codex is unavailable but Copilot CLI is available, use Copilot for the fresh-session GPT roles and keep the retained story implementor on Claude Sonnet high."
    );
    expect(section).toContain(
      "- If no GPT-capable secondary harness is available, switch the run to Claude-only defaults, record the degraded-diversity condition explicitly, and note that verifier diversity is weaker in this run."
    );
  });

  test("TC-2.3a / TC-2.3b / TC-2.3c / TC-2.3d / TC-2.3e teaches the role-specific defaults and Claude-only fallback", async () => {
    const content = await read("src/phases/claude-impl.md");
    const section = content.match(
      /## Default Resolution Contract[\s\S]*?(?=\n## |\s*$)/
    )?.[0];
    expect(section).toBeDefined();
    expect(section).toContain(
      "- If Codex CLI is available, default the story implementor to Codex `gpt-5.4` with high reasoning."
    );
    expect(section).toContain(
      "- If Codex CLI is available, default the verifier pair to Codex `gpt-5.4` with extra high reasoning plus Claude Sonnet with high reasoning."
    );
    expect(section).toContain(
      "- If Codex CLI is available, default epic verifier GPT lanes and the epic synthesizer to Codex `gpt-5.4` with extra high reasoning, paired with a Claude Sonnet verifier lane."
    );
    expect(section).toContain("Claude-only defaults");
    expect(section).toContain("verifier diversity is weaker in this run");
  });

  test("TC-3.4a teaches the implementor reading journey with the full tech-design set and bounded reflection", async () => {
    const content = await read("src/references/claude-impl-prompt-system.md");
    expect(content).toContain("Story implementor reading journey");
    expect(content).toContain("Read the current story first");
    expect(content).toContain("read the full tech-design set");
    expect(content).toContain("Read each file in 500-line chunks if large");
    expect(content).toContain("reflect after each chunk");
  });

  test("TC-3.4b teaches the verifier reading journey as evidence-focused rather than implementation-first", async () => {
    const content = await read("src/references/claude-impl-prompt-system.md");
    expect(content).toContain("Story verifier reading journey");
    expect(content).toContain("extract AC and TC evidence");
    expect(content).toContain("verify against code, tests, and artifacts");
    expect(content).toContain("read the full tech-design set");
  });

  test("TC-3.4c teaches the quick-fix handoff as narrow and intentionally free of the full reading journey", async () => {
    const content = await read("src/references/claude-impl-prompt-system.md");
    expect(content).toContain("Quick-fix handoff");
    expect(content).toContain("narrow, task-specific handoff");
    expect(content).toContain("Do not inject the full story reading journey");
    expect(content).toContain("no reading journey at all");
    expect(content).toContain("plain-language task description");
    expect(content).toContain("no structured quick-fix result contract");
  });

  test("TC-5.4a teaches implementor uncertainty as an explicit routing signal instead of a silent auto-fix", async () => {
    const content = await read("src/references/claude-impl-process-playbook.md");
    expect(content).toContain("If `story-implement` returns `needs-human-ruling`");
    expect(content).toContain("keep the surfaced uncertainty explicit");
    expect(content).toContain("pause for an orchestrator routing decision");
    expect(content).toContain("choose explicitly from this routing menu");
    expect(content).toContain("`story-continue` with the same-session implementor");
    expect(content).toContain("`quick-fix` for a small bounded correction");
    expect(content).toContain("Human escalation");
  });

  test("TC-5.4b teaches verifier disagreement as preserved evidence that routes to follow-up verification or human escalation", async () => {
    const content = await read("src/references/claude-impl-process-playbook.md");
    expect(content).toContain("If verifier results disagree materially");
    expect(content).toContain("do not auto-resolve the disagreement");
    expect(content).toContain("Keep both verifier result sets visible");
    expect(content).toContain("fresh follow-up verification");
    expect(content).toContain("human escalation");
  });

  test("TC-5.5a teaches that the final story gate is run by the orchestrator after verification completes", async () => {
    const phaseContent = await read("src/phases/claude-impl.md");
    const playbookContent = await read(
      "src/references/claude-impl-process-playbook.md"
    );

    expect(phaseContent).toContain(
      "The CLI does not own story progression, acceptance, or recovery strategy between calls."
    );
    expect(playbookContent).toContain(
      "When implementation evidence and verifier results are complete, run the final story gate yourself instead of treating verifier output as acceptance."
    );
    expect(playbookContent).toContain(
      "Run `bun run green-verify` as the canonical story gate unless the recorded project policy says otherwise."
    );
  });

  test("TC-6.1a teaches the pre-acceptance receipt fields required before a story can be accepted", async () => {
    const content = await read("src/references/claude-impl-process-playbook.md");
    expect(content).toContain("Before accepting a story, record:");
    expect(content).toContain("the story id and title");
    expect(content).toContain("the implementor result artifact");
    expect(content).toContain("the verifier result artifacts");
    expect(content).toContain("the exact story gate command and result");
    expect(content).toContain("the disposition of every unresolved finding");
    expect(content).toContain("Use `fixed`, `accepted-risk`, and `defer`");
    expect(content).toContain("the open risks that remain after the acceptance decision");
    expect(content).toContain("the cumulative test baseline before the story");
    expect(content).toContain("the cumulative test baseline after the story");
  });

  test("TC-6.2a teaches story progression from durable artifacts instead of ad hoc memory", async () => {
    const content = await read("src/references/claude-impl-process-playbook.md");
    expect(content).toContain(
      "Prepare the next story from the committed codebase, the ordered story list, `team-impl-log.md`, and the recorded artifacts on disk."
    );
    expect(content).toContain(
      "Do not rely on ad hoc memory or prior chat context to decide what happens next."
    );
    expect(content).toContain(
      "Advance to the next story only after acceptance is recorded, the receipt is complete, the cumulative baseline is updated, and the log state returns to `BETWEEN_STORIES`."
    );
  });

  test("TC-6.2b teaches that a lower test total than the prior accepted baseline blocks acceptance", async () => {
    const content = await read("src/references/claude-impl-process-playbook.md");
    expect(content).toContain(
      "Compare the current total test count to the prior accepted baseline before accepting the story."
    );
    expect(content).toContain(
      "If the current total is lower than the prior accepted baseline, treat it as a regression and block acceptance until resolved."
    );
    expect(content).toContain(
      "If the current total meets or exceeds the prior accepted baseline, record the new baseline and continue the acceptance decision."
    );
  });

  test("TC-6.3a teaches resume after interruption from the durable recovery surface on disk", async () => {
    const phaseContent = await read("src/phases/claude-impl.md");
    const playbookContent = await read(
      "src/references/claude-impl-process-playbook.md"
    );

    expect(phaseContent).toContain(
      "Treat `team-impl-log.md`, `impl-run.config.json`, and the CLI result artifacts under `artifacts/` as the recovery surface for a resumed run."
    );
    expect(playbookContent).toContain(
      "Recover the active story, current phase, and any retained implementor continuation handle from `team-impl-log.md` before dispatching more work."
    );
    expect(playbookContent).toContain(
      "Use the recorded artifact paths to reopen the latest implementor and verifier evidence instead of reconstructing state from memory."
    );
  });

  test("TC-6.3b teaches recovery after context stripping without requiring prior chat or tool-call history", async () => {
    const phaseContent = await read("src/phases/claude-impl.md");
    const playbookContent = await read(
      "src/references/claude-impl-process-playbook.md"
    );

    expect(phaseContent).toContain(
      "Treat missing prior chat or tool-call context as a normal recovery case, not a blocker."
    );
    expect(playbookContent).toContain(
      "Do not ask for the prior conversation to be restored before resuming the run."
    );
    expect(playbookContent).toContain(
      "Resume from the durable files on disk even when the orchestration session has been compacted or restarted."
    );
  });

  test("TC-6.3a teaches partial-state recovery from current phase, last completed checkpoint, and expected artifacts", async () => {
    const content = await read("src/references/claude-impl-process-playbook.md");

    expect(content).toContain(
      "Keep `Current Phase` coarse and `Last Completed Checkpoint` specific so an interrupted story cycle can resume from the last durable step."
    );
    expect(content).toContain(
      "Compare the recorded phase and checkpoint to the expected result artifact for that phase before resuming."
    );
    expect(content).toContain(
      "If an in-flight implementor, quick-fix, or verifier step has no durable result artifact yet, treat it as incomplete rather than assuming it finished."
    );
  });

  test("TC-6.3b teaches safe replay or escalation for interrupted in-flight work without restored chat context", async () => {
    const content = await read("src/references/claude-impl-process-playbook.md");

    expect(content).toContain(
      "Use completed artifacts already on disk as evidence and route only the missing or invalidated work."
    );
    expect(content).toContain(
      "Replay from the last completed checkpoint when the durable inputs on disk make that replay safe."
    );
    expect(content).toContain(
      "If the replay boundary is unclear, pause for human ruling instead of guessing from memory."
    );
  });

  test("TC-7.1a teaches the orchestrator to materialize a cleanup artifact before epic verification begins", async () => {
    const phaseContent = await read("src/phases/claude-impl.md");
    const playbookContent = await read(
      "src/references/claude-impl-process-playbook.md"
    );

    expect(phaseContent).toContain("compile deferred and accepted-risk items");
    expect(phaseContent).toContain("durable cleanup artifact");
    expect(playbookContent).toContain(
      "Do not launch epic verification until the cleanup artifact exists on disk."
    );
  });

  test("TC-7.2a teaches cleanup review as an orchestrator and human-owned checkpoint before dispatch", async () => {
    const content = await read("src/references/claude-impl-process-playbook.md");

    expect(content).toContain(
      "Review the categorized cleanup batch with the human before dispatching `epic-cleanup`."
    );
    expect(content).toContain(
      "Do not treat cleanup review as a CLI-owned decision."
    );
  });

  test("TC-7.3a teaches epic verification to start only from a verified cleaned state", async () => {
    const content = await read("src/references/claude-impl-process-playbook.md");

    expect(content).toContain(
      "Verify the cleanup result before launching `epic-verify`."
    );
    expect(content).toContain(
      "Epic verification starts from the cleaned state rather than from outstanding tracked cleanup items."
    );
  });

  test("TC-8.1a teaches epic verification as mandatory for every multi-story closeout", async () => {
    const content = await read("src/references/claude-impl-process-playbook.md");

    expect(content).toContain(
      "For every multi-story epic, run `epic-verify` before final closeout."
    );
    expect(content).toContain(
      "Do not close the epic directly from accepted stories."
    );
  });

  test("TC-8.1b teaches that there is no skip path around epic verification", async () => {
    const content = await read("src/references/claude-impl-process-playbook.md");

    expect(content).toContain(
      "Do not offer or invent a skip path around epic verification."
    );
    expect(content).toContain(
      "Epic verification is required even when story-level verification already passed."
    );
  });

  test("TC-8.2a teaches mandatory synthesis after epic verifier results exist", async () => {
    const content = await read("src/references/claude-impl-process-playbook.md");

    expect(content).toContain(
      "After `epic-verify` returns, launch `epic-synthesize` every run."
    );
    expect(content).toContain(
      "Do not treat synthesis as optional when verifier reports already exist."
    );
    expect(content).toContain(
      "Do not offer or invent a skip path around synthesis after epic verifier reports exist."
    );
  });

  test("TC-8.4a teaches the final epic gate as an orchestrator-owned step after synthesis", async () => {
    const phaseContent = await read("src/phases/claude-impl.md");
    const playbookContent = await read(
      "src/references/claude-impl-process-playbook.md"
    );

    expect(phaseContent).toContain(
      "Run the final epic gate yourself after cleanup, epic verification, and synthesis are complete."
    );
    expect(playbookContent).toContain(
      "Treat `ready-for-closeout` as evidence to review, not as automatic epic acceptance."
    );
  });
});
