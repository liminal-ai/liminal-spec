import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { createSpecPack, writeTextFile } from "./test-helpers";

describe("story ordering", () => {
  test("TC-1.5a applies numeric ordering, lexical fallback, and flags mixed naming as ambiguous", async () => {
    const { resolveStoryOrder } = await import("../core/story-order");

    const orderedRoot = await createSpecPack("story-order-numeric");
    await writeTextFile(
      join(orderedRoot, "stories", "01-alpha.md"),
      "# Story 1: Alpha\n"
    );
    await writeTextFile(
      join(orderedRoot, "stories", "01-beta.md"),
      "# Story 1: Beta\n"
    );
    await writeTextFile(
      join(orderedRoot, "stories", "02-final.md"),
      "# Story 2: Final\n"
    );

    const ordered = await resolveStoryOrder(join(orderedRoot, "stories"));
    expect(ordered.status).toBe("ready");
    expect(ordered.stories.map((story: { id: string }) => story.id)).toEqual([
      "00-foundation",
      "01-alpha",
      "01-beta",
      "01-next",
      "02-final",
    ]);

    const ambiguousRoot = await createSpecPack("story-order-ambiguous");
    await writeTextFile(
      join(ambiguousRoot, "stories", "beta.md"),
      "# Story Beta\n"
    );

    const ambiguous = await resolveStoryOrder(join(ambiguousRoot, "stories"));
    expect(ambiguous.status).toBe("needs-user-decision");
    expect(ambiguous.notes).toContain(
      "Mixed numeric and non-numeric story filenames require an explicit user ordering decision."
    );
  });
});
