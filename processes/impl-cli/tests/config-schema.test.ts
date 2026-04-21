import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { resolveRunConfigPath } from "../core/config-schema";
import { createSpecPack, writeTextFile } from "./test-helpers";

describe("config path contract", () => {
  test("resolves the default impl-run.config.json path from the spec-pack root", () => {
    expect(resolveRunConfigPath("/tmp/spec-pack")).toBe(
      "/tmp/spec-pack/impl-run.config.json"
    );
  });

  test("resolves an explicit config override path", () => {
    expect(
      resolveRunConfigPath("/tmp/spec-pack", "./configs/custom-run.json")
    ).toBe(join("/tmp/spec-pack", "configs", "custom-run.json"));
  });
});

describe("impl-run config schema", () => {
  test("TC-2.3a accepts the Codex-backed story implementor default shape", async () => {
    const { implRunConfigSchema } = await import("../core/config-schema");

    const parsed = implRunConfigSchema.parse({
      version: 1,
      primary_harness: "claude-code",
      story_implementor: {
        secondary_harness: "codex",
        model: "gpt-5.4",
        reasoning_effort: "high",
      },
      quick_fixer: {
        secondary_harness: "codex",
        model: "gpt-5.4",
        reasoning_effort: "medium",
      },
      story_verifier_1: {
        secondary_harness: "codex",
        model: "gpt-5.4",
        reasoning_effort: "xhigh",
      },
      story_verifier_2: {
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "high",
      },
      self_review: {
        passes: 3,
      },
      epic_verifiers: [
        {
          label: "epic-verifier-1",
          secondary_harness: "codex",
          model: "gpt-5.4",
          reasoning_effort: "xhigh",
        },
      ],
      epic_synthesizer: {
        secondary_harness: "codex",
        model: "gpt-5.4",
        reasoning_effort: "xhigh",
      },
    });

    expect(parsed.story_implementor.secondary_harness).toBe("codex");
    expect(parsed.story_implementor.reasoning_effort).toBe("high");
  });

  test("TC-2.3b accepts the Claude-only story implementor fallback shape", async () => {
    const { implRunConfigSchema } = await import("../core/config-schema");

    const parsed = implRunConfigSchema.parse({
      version: 1,
      primary_harness: "claude-code",
      story_implementor: {
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "high",
      },
      quick_fixer: {
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "medium",
      },
      story_verifier_1: {
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "high",
      },
      story_verifier_2: {
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "high",
      },
      self_review: {
        passes: 2,
      },
      epic_verifiers: [
        {
          label: "epic-verifier-1",
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
      ],
      epic_synthesizer: {
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "high",
      },
    });

    expect(parsed.story_implementor.secondary_harness).toBe("none");
    expect(parsed.story_implementor.model).toBe("claude-sonnet");
  });

  test("TC-2.3c accepts the mixed verifier pair default shape", async () => {
    const { implRunConfigSchema } = await import("../core/config-schema");

    const parsed = implRunConfigSchema.parse({
      version: 1,
      primary_harness: "claude-code",
      story_implementor: {
        secondary_harness: "codex",
        model: "gpt-5.4",
        reasoning_effort: "high",
      },
      quick_fixer: {
        secondary_harness: "codex",
        model: "gpt-5.4",
        reasoning_effort: "medium",
      },
      story_verifier_1: {
        secondary_harness: "codex",
        model: "gpt-5.4",
        reasoning_effort: "xhigh",
      },
      story_verifier_2: {
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "high",
      },
      self_review: {
        passes: 3,
      },
      epic_verifiers: [
        {
          label: "epic-verifier-1",
          secondary_harness: "codex",
          model: "gpt-5.4",
          reasoning_effort: "xhigh",
        },
      ],
      epic_synthesizer: {
        secondary_harness: "codex",
        model: "gpt-5.4",
        reasoning_effort: "xhigh",
      },
    });

    expect(parsed.story_verifier_1.reasoning_effort).toBe("xhigh");
    expect(parsed.story_verifier_2.secondary_harness).toBe("none");
  });

  test("TC-2.3d accepts the Claude-only verifier pair fallback shape", async () => {
    const { implRunConfigSchema } = await import("../core/config-schema");

    const parsed = implRunConfigSchema.parse({
      version: 1,
      primary_harness: "claude-code",
      story_implementor: {
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "high",
      },
      quick_fixer: {
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "medium",
      },
      story_verifier_1: {
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "high",
      },
      story_verifier_2: {
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "high",
      },
      self_review: {
        passes: 2,
      },
      epic_verifiers: [
        {
          label: "epic-verifier-1",
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
      ],
      epic_synthesizer: {
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "high",
      },
    });

    expect(parsed.story_verifier_1.model).toBe("claude-sonnet");
    expect(parsed.story_verifier_2.model).toBe("claude-sonnet");
  });

  test("TC-2.3e accepts the epic verifier array plus epic synthesizer shape", async () => {
    const { implRunConfigSchema } = await import("../core/config-schema");

    const parsed = implRunConfigSchema.parse({
      version: 1,
      primary_harness: "claude-code",
      story_implementor: {
        secondary_harness: "codex",
        model: "gpt-5.4",
        reasoning_effort: "high",
      },
      quick_fixer: {
        secondary_harness: "codex",
        model: "gpt-5.4",
        reasoning_effort: "medium",
      },
      story_verifier_1: {
        secondary_harness: "codex",
        model: "gpt-5.4",
        reasoning_effort: "xhigh",
      },
      story_verifier_2: {
        secondary_harness: "none",
        model: "claude-sonnet",
        reasoning_effort: "high",
      },
      self_review: {
        passes: 3,
      },
      epic_verifiers: [
        {
          label: "epic-verifier-1",
          secondary_harness: "codex",
          model: "gpt-5.4",
          reasoning_effort: "xhigh",
        },
        {
          label: "epic-verifier-2",
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
      ],
      epic_synthesizer: {
        secondary_harness: "codex",
        model: "gpt-5.4",
        reasoning_effort: "xhigh",
      },
    });

    expect(parsed.epic_verifiers).toHaveLength(2);
    expect(parsed.epic_synthesizer.secondary_harness).toBe("codex");
  });

  test("rejects Copilot as the retained story implementor secondary harness in v1", async () => {
    const { implRunConfigSchema } = await import("../core/config-schema");

    expect(() =>
      implRunConfigSchema.parse({
        version: 1,
        primary_harness: "claude-code",
        story_implementor: {
          secondary_harness: "copilot",
          model: "gpt-5.4",
          reasoning_effort: "high",
        },
        quick_fixer: {
          secondary_harness: "copilot",
          model: "gpt-5.4",
          reasoning_effort: "medium",
        },
        story_verifier_1: {
          secondary_harness: "copilot",
          model: "gpt-5.4",
          reasoning_effort: "xhigh",
        },
        story_verifier_2: {
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
        self_review: {
          passes: 3,
        },
        epic_verifiers: [
          {
            label: "epic-verifier-1",
            secondary_harness: "copilot",
            model: "gpt-5.4",
            reasoning_effort: "xhigh",
          },
        ],
        epic_synthesizer: {
          secondary_harness: "copilot",
          model: "gpt-5.4",
          reasoning_effort: "xhigh",
        },
      })
    ).toThrow();
  });

  test("rejects duplicate epic verifier labels", async () => {
    const { implRunConfigSchema } = await import("../core/config-schema");

    expect(() =>
      implRunConfigSchema.parse({
        version: 1,
        primary_harness: "claude-code",
        story_implementor: {
          secondary_harness: "codex",
          model: "gpt-5.4",
          reasoning_effort: "high",
        },
        quick_fixer: {
          secondary_harness: "codex",
          model: "gpt-5.4",
          reasoning_effort: "medium",
        },
        story_verifier_1: {
          secondary_harness: "codex",
          model: "gpt-5.4",
          reasoning_effort: "xhigh",
        },
        story_verifier_2: {
          secondary_harness: "none",
          model: "claude-sonnet",
          reasoning_effort: "high",
        },
        self_review: {
          passes: 3,
        },
        epic_verifiers: [
          {
            label: "epic-verifier",
            secondary_harness: "codex",
            model: "gpt-5.4",
            reasoning_effort: "xhigh",
          },
          {
            label: "epic-verifier",
            secondary_harness: "none",
            model: "claude-sonnet",
            reasoning_effort: "high",
          },
        ],
        epic_synthesizer: {
          secondary_harness: "codex",
          model: "gpt-5.4",
          reasoning_effort: "xhigh",
        },
      })
    ).toThrow();
  });

  test("loads only the explicit run-config file in c12 explicit-file mode", async () => {
    const { loadRunConfig } = await import("../core/config-schema");

    const specPackRoot = await createSpecPack("config-schema-explicit-file");
    await writeTextFile(
      join(specPackRoot, "impl-run.config.json"),
      JSON.stringify(
        {
          version: 1,
          primary_harness: "claude-code",
          story_implementor: {
            secondary_harness: "none",
            model: "claude-sonnet",
            reasoning_effort: "high",
          },
          quick_fixer: {
            secondary_harness: "none",
            model: "claude-sonnet",
            reasoning_effort: "medium",
          },
          story_verifier_1: {
            secondary_harness: "none",
            model: "claude-sonnet",
            reasoning_effort: "high",
          },
          story_verifier_2: {
            secondary_harness: "none",
            model: "claude-sonnet",
            reasoning_effort: "high",
          },
          self_review: {
            passes: 2,
          },
          epic_verifiers: [
            {
              label: "epic-verifier-1",
              secondary_harness: "none",
              model: "claude-sonnet",
              reasoning_effort: "high",
            },
          ],
          epic_synthesizer: {
            secondary_harness: "none",
            model: "claude-sonnet",
            reasoning_effort: "high",
          },
        },
        null,
        2
      )
    );
    await writeTextFile(
      join(specPackRoot, "package.json"),
      JSON.stringify(
        {
          implRun: {
            version: 99,
          },
        },
        null,
        2
      )
    );

    const loaded = await loadRunConfig({
      specPackRoot,
    });

    expect(loaded.version).toBe(1);
    expect(loaded.story_implementor.model).toBe("claude-sonnet");
  });
});
