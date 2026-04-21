import { EMBEDDED_PROMPT_ASSETS } from "./embedded-assets.generated";

export type BasePromptId =
  | "story-implementor"
  | "story-verifier"
  | "quick-fixer"
  | "epic-verifier"
  | "epic-synthesizer";

export type SnippetId =
  | "reading-journey"
  | "gate-instructions"
  | "report-contract"
  | "mock-audit"
  | "self-review-pass-1"
  | "self-review-pass-2"
  | "self-review-pass-3";

export interface EmbeddedPromptAssets {
  base: Record<BasePromptId, string>;
  snippets: Record<SnippetId, string>;
}

const REQUIRED_BASE_PROMPTS: BasePromptId[] = [
  "story-implementor",
  "story-verifier",
  "quick-fixer",
  "epic-verifier",
  "epic-synthesizer",
];

const REQUIRED_SNIPPETS: SnippetId[] = [
  "reading-journey",
  "gate-instructions",
  "report-contract",
  "mock-audit",
  "self-review-pass-1",
  "self-review-pass-2",
  "self-review-pass-3",
];

function normalizeAssetMap<T extends string>(
  input: Record<string, string>,
  required: readonly T[]
): Record<T, string> {
  const entries = required.map((assetId) => {
    const value = input[`${assetId}.md`];
    if (!value) {
      throw new Error(`Missing embedded prompt asset: ${assetId}.md`);
    }
    return [assetId, value] as const;
  });

  return Object.fromEntries(entries) as Record<T, string>;
}

export function inspectPromptAssets(): {
  basePromptsReady: boolean;
  snippetsReady: boolean;
  notes: string[];
} {
  const notes: string[] = [];

  for (const assetId of REQUIRED_BASE_PROMPTS) {
    if (!EMBEDDED_PROMPT_ASSETS.base[`${assetId}.md`]) {
      notes.push(`Missing base prompt asset: ${assetId}.md`);
    }
  }

  for (const assetId of REQUIRED_SNIPPETS) {
    if (!EMBEDDED_PROMPT_ASSETS.snippets[`${assetId}.md`]) {
      notes.push(`Missing prompt snippet asset: ${assetId}.md`);
    }
  }

  return {
    basePromptsReady: notes.every((note) => !note.startsWith("Missing base")),
    snippetsReady: notes.every((note) => !note.startsWith("Missing prompt")),
    notes,
  };
}

export function getEmbeddedPromptAssets(): EmbeddedPromptAssets {
  return {
    base: normalizeAssetMap(EMBEDDED_PROMPT_ASSETS.base, REQUIRED_BASE_PROMPTS),
    snippets: normalizeAssetMap(
      EMBEDDED_PROMPT_ASSETS.snippets,
      REQUIRED_SNIPPETS
    ),
  };
}
