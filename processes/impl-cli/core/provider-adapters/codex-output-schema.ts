import { z } from "zod";

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeSchemaNullable(schema: Record<string, unknown>) {
  if (Array.isArray(schema.type)) {
    if (!schema.type.includes("null")) {
      schema.type = [...schema.type, "null"];
    }
    return;
  }

  if (typeof schema.type === "string") {
    schema.type = [schema.type, "null"];
    return;
  }

  if (Array.isArray(schema.anyOf)) {
    const hasNull = schema.anyOf.some(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        (entry as Record<string, unknown>).type === "null"
    );
    if (!hasNull) {
      schema.anyOf = [...schema.anyOf, { type: "null" }];
    }
    return;
  }

  throw new Error(
    "Unsupported optional property shape in Codex output schema generation."
  );
}

function validateAndNormalizeStrictObjects(
  schema: unknown,
  path: string[] = []
): void {
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
    const required = Array.isArray(record.required)
      ? [...record.required]
      : [];

    for (const [key, child] of Object.entries(properties)) {
      if (!required.includes(key)) {
        if (!child || typeof child !== "object" || Array.isArray(child)) {
          throw new Error(
            `Optional property ${[...path, key].join(".")} is not a JSON-schema object.`
          );
        }

        makeSchemaNullable(child as Record<string, unknown>);
        required.push(key);
      }

      validateAndNormalizeStrictObjects(child, [...path, key]);
    }

    record.required = required;
  }

  if (record.items) {
    validateAndNormalizeStrictObjects(record.items, [...path, "items"]);
  }

  if (Array.isArray(record.anyOf)) {
    for (const [index, child] of record.anyOf.entries()) {
      validateAndNormalizeStrictObjects(child, [...path, `anyOf[${index}]`]);
    }
  }
}

export function buildStrictCodexOutputSchema(
  resultSchema: z.ZodType<unknown>
): Record<string, unknown> {
  const jsonSchema = cloneJsonValue(z.toJSONSchema(resultSchema)) as Record<
    string,
    unknown
  >;
  validateAndNormalizeStrictObjects(jsonSchema);
  return jsonSchema;
}

export function extractCodexStructuredOutputError(stdout: string): string | undefined {
  const lines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as {
        type?: string;
        error?: {
          code?: string;
          message?: string;
          param?: string;
        };
      };
      if (parsed.type !== "error" || !parsed.error?.message) {
        continue;
      }

      const parts = [parsed.error.message];
      if (parsed.error.code) {
        parts.push(`code=${parsed.error.code}`);
      }
      if (parsed.error.param) {
        parts.push(`param=${parsed.error.param}`);
      }
      return parts.join(" | ");
    } catch {}
  }

  return undefined;
}
