import { expect, test } from "bun:test";

import { buildStrictCodexOutputSchema } from "../core/provider-adapters/codex-output-schema";
import { epicCleanupProviderPayloadSchema } from "../core/epic-cleanup";
import { epicSynthesisProviderPayloadSchema } from "../core/epic-synthesizer";
import { epicVerifierProviderPayloadSchema } from "../core/epic-verifier";
import { storyImplementorProviderPayloadSchema } from "../core/story-implementor";
import { storyVerifierProviderPayloadSchema } from "../core/story-verifier";

function assertStrictObjects(schema: unknown) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return;
  }

  const record = schema as Record<string, unknown>;
  if (
    record.properties &&
    typeof record.properties === "object" &&
    !Array.isArray(record.properties)
  ) {
    const properties = record.properties as Record<string, unknown>;
    const required = Array.isArray(record.required) ? record.required : [];

    expect(required.sort()).toEqual(Object.keys(properties).sort());

    for (const child of Object.values(properties)) {
      assertStrictObjects(child);
    }
  }

  if (record.items) {
    assertStrictObjects(record.items);
  }

  if (Array.isArray(record.anyOf)) {
    for (const child of record.anyOf) {
      assertStrictObjects(child);
    }
  }
}

test("story implementor fresh Codex output schema makes optional test counters required-and-nullable for OpenAI strict structured outputs", () => {
  const schema = buildStrictCodexOutputSchema(storyImplementorProviderPayloadSchema) as {
    properties: {
      tests: {
        required: string[];
        properties: {
          totalAfterStory: {
            type?: string | string[];
            anyOf?: Array<Record<string, unknown>>;
          };
          deltaFromPriorBaseline: {
            type?: string | string[];
            anyOf?: Array<Record<string, unknown>>;
          };
        };
      };
    };
  };

  expect(schema.properties.tests.required).toEqual([
    "added",
    "modified",
    "removed",
    "totalAfterStory",
    "deltaFromPriorBaseline",
  ]);
  expect(schema.properties.tests.properties.totalAfterStory.anyOf).toEqual([
    expect.objectContaining({
      type: "integer",
    }),
    expect.objectContaining({
      type: "null",
    }),
  ]);
  expect(schema.properties.tests.properties.deltaFromPriorBaseline.anyOf).toEqual([
    expect.objectContaining({
      type: "integer",
    }),
    expect.objectContaining({
      type: "null",
    }),
  ]);
});

test("all fresh Codex provider payload schemas are OpenAI strict-mode compatible after normalization", () => {
  const schemas = [
    storyImplementorProviderPayloadSchema,
    storyVerifierProviderPayloadSchema,
    epicCleanupProviderPayloadSchema,
    epicVerifierProviderPayloadSchema,
    epicSynthesisProviderPayloadSchema,
  ];

  for (const schema of schemas) {
    const jsonSchema = buildStrictCodexOutputSchema(schema);
    assertStrictObjects(jsonSchema);
  }
});
