import { describe, expect, test } from "bun:test";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");

async function read(relativePath: string): Promise<string> {
  return Bun.file(join(ROOT, relativePath)).text();
}

describe("claude-impl skill source", () => {
  test("SKILL.md teaches skill onboarding before initialization starts", async () => {
    const content = await read("src/phases/claude-impl.md");
    expect(content).toContain("## Introduction & Onboarding");
    expect(content).toContain("## Orchestration Setup");
    expect(content).toContain("## Read When Entering Later Phases");
  });

  test("SKILL.md teaches the long-session reading protocol", async () => {
    const content = await read("src/phases/claude-impl.md");
    expect(content).toContain("400-line chunks");
    expect(content).toContain("retained notes");
    expect(content).toContain("will get removed");
  });

  test("SKILL.md routes to all onboarding, setup, phases, and operations files", async () => {
    const content = await read("src/phases/claude-impl.md");
    expect(content).toContain("onboarding/01-orientation.md");
    expect(content).toContain("onboarding/02-terminology.md");
    expect(content).toContain("onboarding/03-operating-model.md");
    expect(content).toContain("onboarding/04-stage-map.md");
    expect(content).toContain("onboarding/05-initialization-overview.md");
    expect(content).toContain("setup/10-spec-pack-discovery.md");
    expect(content).toContain("setup/11-spec-pack-read-order.md");
    expect(content).toContain("setup/12-run-setup.md");
    expect(content).toContain("phases/20-story-cycle.md");
    expect(content).toContain("phases/21-verification-and-fix-routing.md");
    expect(content).toContain("phases/22-recovery-and-resume.md");
    expect(content).toContain("phases/23-cleanup-and-closeout.md");
    expect(content).toContain("operations/30-cli-operations.md");
    expect(content).toContain("operations/31-provider-resolution.md");
    expect(content).toContain("operations/32-prompting-and-inserts.md");
    expect(content).toContain("operations/33-artifact-contracts.md");
  });

  test("01-orientation addresses the agent in role", async () => {
    const content = await read("src/claude-impl/onboarding/01-orientation.md");
    expect(content).toContain("Your job");
    expect(content).toContain("You are not the implementor");
    expect(content).toContain("You are not the verifier");
    expect(content).toContain("durable state lives on disk");
  });

  test("02-terminology defines the primitive vocabulary", async () => {
    const content = await read("src/claude-impl/onboarding/02-terminology.md");
    expect(content).toContain("## Spec pack");
    expect(content).toContain("## Roles");
    expect(content).toContain("## System layers");
    expect(content).toContain("## Durable artifacts");
    expect(content).toContain("## Actions");
    expect(content).toContain("**Orchestrator**");
    expect(content).toContain("**Implementor**");
    expect(content).toContain("**Verifier**");
    expect(content).toContain("**Primary harness**");
    expect(content).toContain("**Secondary harness**");
    expect(content).toContain("**Gate**");
  });

  test("02-terminology links the spec pack to the producing skills", async () => {
    const content = await read("src/claude-impl/onboarding/02-terminology.md");
    expect(content).toContain("ls-epic");
    expect(content).toContain("ls-tech-design");
    expect(content).toContain("ls-publish-epic");
  });

  test("03-operating-model explains why backgrounded provider-backed work must be polled instead of waited on blindly", async () => {
    const content = await read("src/claude-impl/onboarding/03-operating-model.md");
    expect(content).toContain("backgrounded task can hang or stall");
    expect(content).toContain("waiting indefinitely on a hung subprocess");
    expect(content).toContain("status.json");
    expect(content).toContain("lastOutputAt");
  });

  test("TC-1.3a teaches the new-run path when team-impl-log.md is absent", async () => {
    const content = await read("src/claude-impl/setup/12-run-setup.md");
    expect(content).toContain("If it does not exist");
    expect(content).toContain("`State: SETUP`");
  });

  test("TC-1.3b teaches the resume path via recovery-and-resume", async () => {
    const content = await read("src/claude-impl/setup/12-run-setup.md");
    expect(content).toContain("you are resuming a previous run");
    expect(content).toContain("phases/22-recovery-and-resume.md");
  });

  test("TC-1.4a documents both public prompt insert files as optional runtime inputs", async () => {
    const content = await read("src/claude-impl/operations/32-prompting-and-inserts.md");
    expect(content).toContain("custom-story-impl-prompt-insert.md");
    expect(content).toContain("custom-story-verifier-prompt-insert.md");
    expect(content).toContain("non-blocking when absent");
  });

  test("TC-1.4b captures prompt-insert presence during discovery without blocking", async () => {
    const content = await read("src/claude-impl/setup/10-spec-pack-discovery.md");
    expect(content).toContain("public prompt-insert presence");
    expect(content).toContain("custom-story-impl-prompt-insert.md");
    expect(content).toContain("custom-story-verifier-prompt-insert.md");
  });

  test("TC-1.5a teaches the orchestrator to onboard through stories and the test plan before implementation starts", async () => {
    const content = await read("src/claude-impl/setup/11-spec-pack-read-order.md");
    expect(content).toContain("every story in `stories/` in order");
    expect(content).toContain("`test-plan.md`");
    expect(content).toContain("before starting Story 0 or Story 1");
    expect(content).toContain("Use as lookup material when needed");
  });

  test("TC-1.5b keeps epic and tech-design files as lookup material for the orchestrator", async () => {
    const content = await read("src/references/claude-impl-reading-journey.md");
    expect(content).toContain("Read every story file in `stories/` in order");
    expect(content).toContain("Read `test-plan.md`.");
    expect(content).toContain("Use `epic.md` only");
    expect(content).toContain("Use `tech-design.md` and companion tech-design files only");
  });

  test("TC-1.6a teaches verification-gate discovery with the documented precedence", async () => {
    const content = await read("src/claude-impl/setup/12-run-setup.md");
    expect(content).toContain("Discover verification gates");
    expect(content).toContain("precedence order");
    expect(content).toContain("explicit CLI flags");
    expect(content).toContain("package scripts");
    expect(content).toContain("project policy docs");
    expect(content).toContain("CI configuration");
  });

  test("TC-1.6b teaches the orchestrator to pause when gate policy stays ambiguous", async () => {
    const content = await read("src/claude-impl/setup/12-run-setup.md");
    expect(content).toContain("If gate policy remains ambiguous");
    expect(content).toContain("pause for a user decision");
  });

  test("run setup documents preflight gate persistence and gate-discovery rationale", async () => {
    const content = await read("src/claude-impl/setup/12-run-setup.md");
    expect(content).toContain(
      "preflight` may persist resolved `verification_gates`"
    );
    expect(content).toContain("expected CLI side effect");
    expect(content).toContain("candidate commands considered");
  });

  test("TC-2.2a / TC-2.2b / TC-2.2c teaches the provider fallback chain", async () => {
    const content = await read("src/claude-impl/operations/31-provider-resolution.md");
    expect(content).toContain("### Codex available");
    expect(content).toContain("### Codex unavailable, Copilot available");
    expect(content).toContain("### Neither available");
    expect(content).toContain("degraded-diversity condition");
  });

  test("TC-2.3 teaches role-specific defaults and Claude-only fallback", async () => {
    const content = await read("src/claude-impl/operations/31-provider-resolution.md");
    expect(content).toContain("story_implementor");
    expect(content).toContain("quick_fixer");
    expect(content).toContain("story_verifier");
    expect(content).toContain("epic_verifier_1");
    expect(content).toContain("epic_verifier_2");
    expect(content).toContain("epic_synthesizer");
    expect(content).toContain("gpt-5.4");
    expect(content).toContain("claude-sonnet");
  });

  test("TC-2.4a teaches the orchestrator to record the resolved configuration after preflight", async () => {
    const content = await read("src/claude-impl/setup/12-run-setup.md");
    expect(content).toContain("Record the outcome in `team-impl-log.md`");
    expect(content).toContain("active role defaults");
    expect(content).toContain("degraded-diversity condition");
  });

  test("TC-3.4a teaches the implementor reading journey with the tech-design set", async () => {
    const content = await read("src/claude-impl/operations/32-prompting-and-inserts.md");
    expect(content).toContain("Story implementor");
    expect(content).toContain("full tech-design set");
    expect(content).toContain("test plan");
  });

  test("TC-3.4b teaches the verifier reading journey as evidence-focused", async () => {
    const content = await read("src/claude-impl/operations/32-prompting-and-inserts.md");
    expect(content).toContain("Story verifier");
    expect(content).toContain("evidence-first lens");
  });

  test("TC-3.4c teaches the quick-fix handoff as narrow and free of reading journey", async () => {
    const content = await read("src/claude-impl/operations/32-prompting-and-inserts.md");
    expect(content).toContain("Quick fixer");
    expect(content).toContain("Plain-language task description only");
    expect(content).toContain("story-agnostic");
  });

  test("story implementor handoff guidance keeps self-review scoped to obligations already present in the handoff", async () => {
    const content = await read("src/claude-impl/operations/32-prompting-and-inserts.md");
    expect(content).toContain(
      "only checks obligations already present in that handoff"
    );
  });

  test("TC-5.4a teaches implementor uncertainty as an explicit routing signal", async () => {
    const content = await read("src/claude-impl/phases/21-verification-and-fix-routing.md");
    expect(content).toContain("`needs-human-ruling`");
    expect(content).toContain("Do not auto-resolve");
  });

  test("TC-5.4b teaches verifier and implementor disagreement as preserved evidence", async () => {
    const content = await read("src/claude-impl/phases/21-verification-and-fix-routing.md");
    expect(content).toContain(
      "If the retained verifier and implementor still disagree materially"
    );
    expect(content).toContain("Do not pretend the disagreement is resolved");
  });

  test("verification routing forbids orchestrator overrides of blocker findings and unintended shims", async () => {
    const content = await read("src/claude-impl/phases/21-verification-and-fix-routing.md");
    expect(content).toContain(
      "The orchestrator never overrides verification-identified blockers"
    );
    expect(content).toContain(
      "Never allow non-specified or non-designed shims"
    );
    expect(content).toContain(
      "verifier says the package review path is test-shim only"
    );
    expect(content).toContain(
      "Do not let a declared `specDeviations` entry become a passive note"
    );
  });

  test("TC-5.5a teaches that the final story gate is orchestrator-owned", async () => {
    const content = await read("src/claude-impl/phases/20-story-cycle.md");
    expect(content).toContain("## 4. Run the final story gate");
    expect(content).toContain("The CLI does not accept stories. You do.");
  });

  test("story cycle reminds the orchestrator to poll every 5 minutes when backgrounding long-running CLI work", async () => {
    const content = await read("src/claude-impl/phases/20-story-cycle.md");
    expect(content).toContain("5-minute cadence");
    expect(content).toContain("waiting only on the background job notification");
    expect(content).toContain("waits indefinitely on a hung task");
    expect(content).toContain("references/claude-impl-process-playbook.md");
  });

  test("TC-6.1a teaches the pre-acceptance receipt fields required before acceptance", async () => {
    const content = await read("src/claude-impl/phases/20-story-cycle.md");
    expect(content).toContain("pre-acceptance receipt");
    expect(content).toContain("story id and title");
    expect(content).toContain("implementor result artifact");
    expect(content).toContain("verifier result artifact");
    expect(content).toContain("story gate command");
    expect(content).toContain("`fixed`, `accepted-risk`, or `defer`");
    expect(content).toContain("open risks");
    expect(content).toContain("cumulative baseline before and after");
  });

  test("TC-6.1a captures the receipt schema in 33-artifact-contracts", async () => {
    const content = await read("src/claude-impl/operations/33-artifact-contracts.md");
    expect(content).toContain("## Story Receipt");
    expect(content).toContain("Story Title");
    expect(content).toContain("Implementor Evidence");
    expect(content).toContain("Verifier Evidence");
    expect(content).toContain("Story Gate");
    expect(content).toContain("Dispositions");
    expect(content).toContain("Open Risks");
    expect(content).toContain("Baseline Before");
    expect(content).toContain("Baseline After");
    expect(content).toContain("the commit has landed");
  });

  test("artifact contracts document top-level quick-fix artifacts and gate rationale fields", async () => {
    const content = await read("src/claude-impl/operations/33-artifact-contracts.md");
    expect(content).toContain("Gate Discovery Rationale");
    expect(content).toContain("├── quick-fix/");
    expect(content).toContain("001-quick-fix.json");
    expect(content).toContain("quick-fix is story-agnostic by contract");
  });

  test("TC-6.2a/b teaches baseline regression checks and commit-bound acceptance", async () => {
    const content = await read("src/claude-impl/phases/20-story-cycle.md");
    expect(content).toContain("prior accepted baseline");
    expect(content).toContain("regression");
    expect(content).toContain("block acceptance");
    expect(content).toContain("commit is part of acceptance");
  });

  test("TC-6.3a teaches resume after interruption from the durable recovery surface", async () => {
    const content = await read("src/claude-impl/phases/22-recovery-and-resume.md");
    expect(content).toContain("Recovery surface");
    expect(content).toContain("`team-impl-log.md`");
    expect(content).toContain("`impl-run.config.json`");
    expect(content).toContain("artifacts/");
  });

  test("TC-6.3b teaches recovery after context stripping without prior chat history", async () => {
    const content = await read("src/claude-impl/phases/22-recovery-and-resume.md");
    expect(content).toContain("Missing prior chat or tool-call context is a normal recovery case");
    expect(content).toContain("Trust the files");
  });

  test("TC-6.3 teaches state-based resume routing", async () => {
    const content = await read("src/claude-impl/phases/22-recovery-and-resume.md");
    expect(content).toContain("## State-based routing");
    expect(content).toContain("`SETUP`");
    expect(content).toContain("`BETWEEN_STORIES`");
    expect(content).toContain("`STORY_ACTIVE`");
    expect(content).toContain("`PRE_EPIC_VERIFY`");
    expect(content).toContain("`EPIC_VERIFY_ACTIVE`");
    expect(content).toContain("`COMPLETE`");
    expect(content).toContain("`FAILED`");
  });

  test("TC-6.3 routes story recovery through self-review before verification", async () => {
    const content = await read("src/claude-impl/phases/22-recovery-and-resume.md");
    expect(content).toContain("`self-review`");
    expect(content).toContain("proceed to step 2 (self-review)");
    expect(content).toContain("Does the self-review batch artifact exist");
    expect(content).toContain("proceed to step 3 (verify)");
  });

  test("TC-6.3 teaches replay rules bound by artifact existence", async () => {
    const content = await read("src/claude-impl/phases/22-recovery-and-resume.md");
    expect(content).toContain("artifact exists on disk");
    expect(content).toContain("Replay from the last completed checkpoint");
    expect(content).toContain("pause for user ruling");
  });

  test("TC-7.1a teaches the orchestrator to materialize a cleanup artifact before epic verification", async () => {
    const content = await read("src/claude-impl/phases/23-cleanup-and-closeout.md");
    expect(content).toContain("compile deferred");
    expect(content).toContain("cleanup batch");
    expect(content).toContain("artifacts/cleanup/");
  });

  test("TC-7.2a teaches cleanup review as orchestrator and human-owned", async () => {
    const content = await read("src/claude-impl/phases/23-cleanup-and-closeout.md");
    expect(content).toContain("Review with the user");
    expect(content).toContain("Do not dispatch without review");
  });

  test("TC-7.3a teaches cleanup verification before epic verification begins", async () => {
    const content = await read("src/claude-impl/phases/23-cleanup-and-closeout.md");
    expect(content).toContain("Verify the cleanup result");
    expect(content).toContain("Run the story gate yourself");
  });

  test("TC-8.1a / TC-8.1b teaches epic verification as mandatory with no skip path", async () => {
    const content = await read("src/claude-impl/phases/23-cleanup-and-closeout.md");
    expect(content).toContain("Epic verification is mandatory");
    expect(content).toContain("no skip path");
  });

  test("TC-8.2a teaches mandatory synthesis after epic verifier results exist", async () => {
    const content = await read("src/claude-impl/phases/23-cleanup-and-closeout.md");
    expect(content).toContain("Synthesis is mandatory");
    expect(content).toContain("epic-synthesize");
  });

  test("TC-8.4a teaches the final epic gate as orchestrator-owned after synthesis", async () => {
    const content = await read("src/claude-impl/phases/23-cleanup-and-closeout.md");
    expect(content).toContain("## 7. Run the final epic gate");
    expect(content).toContain("The CLI does not close epics");
  });

  test("33-artifact-contracts pins the state and phase vocabulary", async () => {
    const content = await read("src/claude-impl/operations/33-artifact-contracts.md");
    expect(content).toContain("### Allowed `State` values");
    expect(content).toContain("### Allowed `Current Phase` values");
    expect(content).toContain("`implement`");
    expect(content).toContain("`self-review`");
    expect(content).toContain("`verify`");
    expect(content).toContain("`fix-routing`");
    expect(content).toContain("`gate`");
    expect(content).toContain("`accept`");
    expect(content).toContain("`cleanup-compile`");
    expect(content).toContain("`epic-verify`");
    expect(content).toContain("`epic-synthesize`");
    expect(content).toContain("`epic-gate`");
  });

  test("33-artifact-contracts pins per-gate source fields in the log template", async () => {
    const content = await read("src/claude-impl/operations/33-artifact-contracts.md");
    expect(content).toContain("Story Gate Source");
    expect(content).toContain("Epic Gate Source");
  });

  test("30-cli-operations documents all ten public operations and the routing matrix", async () => {
    const content = await read("src/claude-impl/operations/30-cli-operations.md");
    expect(content).toContain("## Public operations");
    expect(content).toContain("`inspect`");
    expect(content).toContain("`preflight`");
    expect(content).toContain("`story-implement`");
    expect(content).toContain("`story-continue`");
    expect(content).toContain("`story-self-review`");
    expect(content).toContain("`story-verify`");
    expect(content).toContain("`quick-fix`");
    expect(content).toContain("`epic-cleanup`");
    expect(content).toContain("`epic-verify`");
    expect(content).toContain("`epic-synthesize`");
    expect(content).toContain("## Routing matrix");
    expect(content).toContain("## Error codes");
  });
});
