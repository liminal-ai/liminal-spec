import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { assemblePrompt, PromptInsertError } from "../core/prompt-assembly";
import { createSpecPack, writeTextFile } from "./test-helpers";

async function createPromptSpecPack(
  scope: string,
  options: {
    includeImplInsert?: boolean;
    includeVerifierInsert?: boolean;
  } = {}
) {
  const specPackRoot = await createSpecPack(scope, {
    companionMode: "four-file",
    includeImplInsert: options.includeImplInsert ?? false,
    includeVerifierInsert: options.includeVerifierInsert ?? false,
  });
  const storyPath = join(
    specPackRoot,
    "stories",
    "02-prompt-composition-and-public-inserts.md"
  );
  await writeTextFile(
    storyPath,
    "# Story 2: Prompt Composition and Public Inserts\n"
  );

  return {
    specPackRoot,
    storyId: "02-prompt-composition-and-public-inserts",
    storyTitle: "Prompt Composition and Public Inserts",
    storyPath,
    epicPath: join(specPackRoot, "epic.md"),
    techDesignPath: join(specPackRoot, "tech-design.md"),
    techDesignCompanionPaths: [
      join(specPackRoot, "tech-design-cli-runtime.md"),
      join(specPackRoot, "tech-design-skill-process.md"),
    ],
    testPlanPath: join(specPackRoot, "test-plan.md"),
    implementationPromptInsertPath: join(
      specPackRoot,
      "custom-story-impl-prompt-insert.md"
    ),
    verifierPromptInsertPath: join(
      specPackRoot,
      "custom-story-verifier-prompt-insert.md"
    ),
    gateCommands: {
      story: "bun run green-verify",
      epic: "bun run verify-all",
    },
  };
}

describe("prompt assembly", () => {
  test("TC-3.1a assembles the story implementor prompt from the base prompt, required snippets, runtime values, and reading journey", async () => {
    const fixture = await createPromptSpecPack("prompt-assembly-implementor");

    const assembled = await assemblePrompt({
      role: "story_implementor",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
    });

    expect(assembled.basePromptId).toBe("story-implementor");
    expect(assembled.snippetIds).toEqual([
      "reading-journey",
      "gate-instructions",
      "report-contract",
    ]);
    expect(assembled.prompt).toContain("# Story Implementor Base Prompt");
    expect(assembled.prompt).toContain("## Reading Journey");
    expect(assembled.prompt).toContain(fixture.storyPath);
    expect(assembled.prompt).toContain("bun run green-verify");
  });

  test("TC-3.1b assembles the story verifier prompt from the verifier base prompt, required snippets, runtime values, and reading journey", async () => {
    const fixture = await createPromptSpecPack("prompt-assembly-verifier");

    const assembled = await assemblePrompt({
      role: "story_verifier",
      verifierLabel: "story-verifier-1",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
    });

    expect(assembled.basePromptId).toBe("story-verifier");
    expect(assembled.snippetIds).toEqual([
      "reading-journey",
      "gate-instructions",
      "report-contract",
      "mock-audit",
    ]);
    expect(assembled.prompt).toContain("# Story Verifier Base Prompt");
    expect(assembled.prompt).toContain("## Reading Journey");
    expect(assembled.prompt).toContain("story-verifier-1");
    expect(assembled.prompt).toContain("evidence-backed");
    expect(assembled.prompt).toContain(
      "Audit production paths for mocks, shims, or fake adapters"
    );
  });

  test("TC-3.2a includes the implementor public insert on every assembly when the file exists", async () => {
    const fixture = await createPromptSpecPack("prompt-assembly-impl-insert", {
      includeImplInsert: true,
    });

    const first = await assemblePrompt({
      role: "story_implementor",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
      implementationPromptInsertPath: fixture.implementationPromptInsertPath,
    });
    const second = await assemblePrompt({
      role: "story_implementor",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
      implementationPromptInsertPath: fixture.implementationPromptInsertPath,
    });

    expect(first.prompt).toContain("Custom implementor insert");
    expect(first.publicInsertIds).toEqual([
      "custom-story-impl-prompt-insert.md",
    ]);
    expect(second).toEqual(first);
  });

  test("TC-3.2b omits the implementor public insert cleanly when the file is absent", async () => {
    const fixture = await createPromptSpecPack(
      "prompt-assembly-impl-insert-absent"
    );

    const assembled = await assemblePrompt({
      role: "story_implementor",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
    });

    expect(assembled.publicInsertIds).toEqual([]);
    expect(assembled.prompt).not.toContain("Custom implementor insert");
  });

  test("TC-3.3a includes the verifier public insert on every verifier assembly when the file exists", async () => {
    const fixture = await createPromptSpecPack(
      "prompt-assembly-verifier-insert",
      {
        includeVerifierInsert: true,
      }
    );

    const first = await assemblePrompt({
      role: "story_verifier",
      verifierLabel: "story-verifier-1",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
      verifierPromptInsertPath: fixture.verifierPromptInsertPath,
    });
    const second = await assemblePrompt({
      role: "story_verifier",
      verifierLabel: "story-verifier-1",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
      verifierPromptInsertPath: fixture.verifierPromptInsertPath,
    });

    expect(first.prompt).toContain("Custom verifier insert");
    expect(first.publicInsertIds).toEqual([
      "custom-story-verifier-prompt-insert.md",
    ]);
    expect(second).toEqual(first);
  });

  test("TC-3.3b omits the verifier public insert cleanly when the file is absent", async () => {
    const fixture = await createPromptSpecPack(
      "prompt-assembly-verifier-insert-absent"
    );

    const assembled = await assemblePrompt({
      role: "story_verifier",
      verifierLabel: "story-verifier-1",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
    });

    expect(assembled.publicInsertIds).toEqual([]);
    expect(assembled.prompt).not.toContain("Custom verifier insert");
  });

  test("TC-3.4a includes the implementor reading journey with the story, full tech-design set, and bounded chunking instructions", async () => {
    const fixture = await createPromptSpecPack(
      "prompt-assembly-implementor-journey"
    );

    const assembled = await assemblePrompt({
      role: "story_implementor",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
    });

    expect(assembled.prompt).toContain("Read the current story first");
    expect(assembled.prompt).toContain(fixture.storyPath);
    expect(assembled.prompt).toContain(fixture.techDesignPath);
    expect(assembled.prompt).toContain(fixture.techDesignCompanionPaths[0]);
    expect(assembled.prompt).toContain(fixture.techDesignCompanionPaths[1]);
    expect(assembled.prompt).toContain("Read each file in 500-line chunks if large");
    expect(assembled.prompt).toContain("Reflect after each chunk");
  });

  test("TC-3.4b includes the verifier reading journey with evidence-focused instructions", async () => {
    const fixture = await createPromptSpecPack(
      "prompt-assembly-verifier-journey"
    );

    const assembled = await assemblePrompt({
      role: "story_verifier",
      verifierLabel: "story-verifier-1",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
    });

    expect(assembled.prompt).toContain("extract AC and TC evidence");
    expect(assembled.prompt).toContain("verify against code, tests, and artifacts");
    expect(assembled.prompt).toContain(fixture.techDesignPath);
    expect(assembled.prompt).toContain(fixture.testPlanPath);
  });

  test("omits the epic path from story-role reading journeys while preserving it for epic-role prompts", async () => {
    const fixture = await createPromptSpecPack("prompt-assembly-bounded-journey");

    const implementor = await assemblePrompt({
      role: "story_implementor",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
    });
    const verifier = await assemblePrompt({
      role: "story_verifier",
      verifierLabel: "story-verifier-1",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
    });
    const epicVerifier = await assemblePrompt({
      role: "epic_verifier",
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
    });
    const epicSynthesizer = await assemblePrompt({
      role: "epic_synthesizer",
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
    });

    expect(implementor.prompt).not.toContain(`- Epic: ${fixture.epicPath}`);
    expect(verifier.prompt).not.toContain(`- Epic: ${fixture.epicPath}`);
    expect(epicVerifier.prompt).toContain(`- Epic: ${fixture.epicPath}`);
    expect(epicSynthesizer.prompt).toContain(`- Epic: ${fixture.epicPath}`);
  });

  test("TC-3.4c keeps the quick-fix handoff narrow and skips the full story reading journey", async () => {
    const fixture = await createPromptSpecPack("prompt-assembly-quick-fix");

    const assembled = await assemblePrompt({
      role: "quick_fixer",
      followupRequest:
        "Fix the failing insert-order assertion in prompt-assembly without widening scope.",
      gateCommands: fixture.gateCommands,
    });

    expect(assembled.basePromptId).toBe("quick-fixer");
    expect(assembled.snippetIds).toEqual([]);
    expect(assembled.prompt).toContain("Fix the failing insert-order assertion");
    expect(assembled.prompt).not.toContain("## Reading Journey");
    expect(assembled.prompt).not.toContain("Read the current story first");
    expect(assembled.prompt).not.toContain("## Result Contract");
    expect(assembled.prompt).not.toContain("bun run green-verify");
    expect(assembled.prompt).not.toContain(fixture.techDesignCompanionPaths[0]);
  });

  test("TC-3.4c keeps quick-fix prompt assembly story-agnostic even when story and tech-design context are supplied", async () => {
    const fixture = await createPromptSpecPack(
      "prompt-assembly-quick-fix-story-agnostic"
    );

    const narrow = await assemblePrompt({
      role: "quick_fixer",
      gateCommands: fixture.gateCommands,
      followupRequest:
        "Fix the failing insert-order assertion in prompt-assembly without widening scope.",
    });
    const withStoryContext = await assemblePrompt({
      role: "quick_fixer",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
      followupRequest:
        "Fix the failing insert-order assertion in prompt-assembly without widening scope.",
    });

    expect(withStoryContext).toEqual(narrow);
    expect(withStoryContext.prompt).not.toContain(fixture.storyId);
    expect(withStoryContext.prompt).not.toContain(fixture.storyTitle);
    expect(withStoryContext.prompt).not.toContain(fixture.storyPath);
    expect(withStoryContext.prompt).not.toContain(fixture.techDesignPath);
    expect(withStoryContext.prompt).not.toContain(
      fixture.techDesignCompanionPaths[0]
    );
    expect(withStoryContext.prompt).not.toContain(fixture.testPlanPath);
  });

  test("TC-4.3b changes the self-review prompt by pass number instead of reusing the same prompt unchanged", async () => {
    const fixture = await createPromptSpecPack(
      "prompt-assembly-self-review-pass"
    );

    const passOne = await assemblePrompt({
      role: "story_implementor",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
      selfReviewPass: 1,
    });
    const passTwo = await assemblePrompt({
      role: "story_implementor",
      storyId: fixture.storyId,
      storyTitle: fixture.storyTitle,
      storyPath: fixture.storyPath,
      epicPath: fixture.epicPath,
      techDesignPath: fixture.techDesignPath,
      techDesignCompanionPaths: fixture.techDesignCompanionPaths,
      testPlanPath: fixture.testPlanPath,
      gateCommands: fixture.gateCommands,
      selfReviewPass: 2,
    });

    expect(passOne.prompt).not.toBe(passTwo.prompt);
    expect(passOne.snippetIds).toContain("self-review-pass-1");
    expect(passTwo.snippetIds).toContain("self-review-pass-2");
    expect(passOne.prompt).toContain("Self-review pass 1");
    expect(passTwo.prompt).toContain("Self-review pass 2");
  });

  test("rejects oversized public inserts even when a future non-story role passes an insert path", async () => {
    const fixture = await createPromptSpecPack("prompt-assembly-oversized-epic-role");
    const oversizedInsertPath = join(
      fixture.specPackRoot,
      "custom-arbitrary-prompt-insert.md"
    );
    await writeTextFile(oversizedInsertPath, "A".repeat(64 * 1024 + 1));

    await expect(
      assemblePrompt({
        role: "epic_verifier",
        epicPath: fixture.epicPath,
        techDesignPath: fixture.techDesignPath,
        techDesignCompanionPaths: fixture.techDesignCompanionPaths,
        testPlanPath: fixture.testPlanPath,
        gateCommands: fixture.gateCommands,
        implementationPromptInsertPath: oversizedInsertPath,
      } as any)
    ).rejects.toBeInstanceOf(PromptInsertError);
  });
});
