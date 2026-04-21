import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { pathExists, readTextFile } from "./fs-utils";
import type { CliError } from "./result-contracts";

export interface GateDiscoveryResult {
  status: "ready" | "needs-user-decision";
  verificationGates?: {
    storyGate: string;
    epicGate: string;
    storyGateSource: string;
    epicGateSource: string;
  };
  errors: CliError[];
  notes: string[];
}

interface GateSourceCandidates {
  story: string[];
  epic: string[];
  source: string;
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function resolveGateValue(input: {
  explicitValue?: string;
  sourceCandidates: GateSourceCandidates[];
  gate: "story" | "epic";
}): {
  value?: string;
  source?: string;
  ambiguous: boolean;
} {
  if (input.explicitValue) {
    return {
      value: input.explicitValue,
      source: "explicit CLI flag",
      ambiguous: false,
    };
  }

  for (const candidateSet of input.sourceCandidates) {
    const values = uniqueValues(candidateSet[input.gate]);
    if (values.length > 1) {
      return {
        ambiguous: true,
      };
    }

    if (values.length === 1) {
      return {
        value: values[0],
        source: candidateSet.source,
        ambiguous: false,
      };
    }
  }

  return {
    ambiguous: false,
  };
}

async function packageScriptCandidates(
  specPackRoot: string
): Promise<GateSourceCandidates[]> {
  const packageJsonPath = join(specPackRoot, "package.json");
  if (!(await pathExists(packageJsonPath))) {
    return [];
  }

  const packageJson = JSON.parse(await readTextFile(packageJsonPath)) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};

  if (!scripts["green-verify"] && !scripts["verify-all"]) {
    return [];
  }

  return [
    {
      story: scripts["green-verify"] ? [scripts["green-verify"]] : [],
      epic: scripts["verify-all"] ? [scripts["verify-all"]] : [],
      source: "package.json scripts",
    },
  ];
}

async function docCandidates(specPackRoot: string): Promise<GateSourceCandidates[]> {
  const candidates: GateSourceCandidates = {
    story: [],
    epic: [],
    source: "project policy docs",
  };

  for (const fileName of ["AGENTS.md", "README.md"]) {
    const filePath = join(specPackRoot, fileName);
    if (!(await pathExists(filePath))) {
      continue;
    }

    const content = await readTextFile(filePath);
    for (const match of content.matchAll(/^Story Gate:\s*(.+)$/gim)) {
      candidates.story.push(match[1]);
    }
    for (const match of content.matchAll(/^Epic Gate:\s*(.+)$/gim)) {
      candidates.epic.push(match[1]);
    }
  }

  if (candidates.story.length === 0 && candidates.epic.length === 0) {
    return [];
  }

  return [candidates];
}

async function ciCandidates(specPackRoot: string): Promise<GateSourceCandidates[]> {
  const workflowsDir = join(specPackRoot, ".github", "workflows");
  if (!(await pathExists(workflowsDir))) {
    return [];
  }

  const entries = await readdir(workflowsDir, { withFileTypes: true });
  const candidates: GateSourceCandidates = {
    story: [],
    epic: [],
    source: "CI configuration",
  };

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.match(/\.ya?ml$/)) {
      continue;
    }

    const content = await readTextFile(join(workflowsDir, entry.name));
    for (const match of content.matchAll(/run:\s*(.+)$/gim)) {
      const command = match[1].trim();
      if (command.includes("green-verify")) {
        candidates.story.push(command);
      }
      if (command.includes("verify-all")) {
        candidates.epic.push(command);
      }
    }
  }

  if (candidates.story.length === 0 && candidates.epic.length === 0) {
    return [];
  }

  return [candidates];
}

export async function resolveVerificationGates(input: {
  specPackRoot: string;
  explicitStoryGate?: string;
  explicitEpicGate?: string;
}): Promise<GateDiscoveryResult> {
  const specPackRoot = resolve(input.specPackRoot);
  const sourceCandidates = [
    ...(await packageScriptCandidates(specPackRoot)),
    ...(await docCandidates(specPackRoot)),
    ...(await ciCandidates(specPackRoot)),
  ];
  const storyResolution = resolveGateValue({
    explicitValue: input.explicitStoryGate,
    sourceCandidates,
    gate: "story",
  });
  const epicResolution = resolveGateValue({
    explicitValue: input.explicitEpicGate,
    sourceCandidates,
    gate: "epic",
  });

  if (
    storyResolution.ambiguous ||
    epicResolution.ambiguous ||
    !storyResolution.value ||
    !epicResolution.value ||
    !storyResolution.source ||
    !epicResolution.source
  ) {
    return {
      status: "needs-user-decision",
      errors: [
        {
          code: "VERIFICATION_GATE_UNRESOLVED",
          message: "Verification gate policy is ambiguous",
          detail:
            "Provide --story-gate and --epic-gate explicitly or clarify the project policy.",
        },
      ],
      notes: [],
    };
  }

  return {
    status: "ready",
    verificationGates: {
      storyGate: storyResolution.value,
      epicGate: epicResolution.value,
      storyGateSource: storyResolution.source,
      epicGateSource: epicResolution.source,
    },
    errors: [],
    notes: [],
  };
}
