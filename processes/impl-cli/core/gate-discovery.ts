import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

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

async function findRepoRoot(start: string): Promise<string | undefined> {
  let current = resolve(start);

  while (true) {
    if (await pathExists(join(current, ".git"))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }

    current = parent;
  }
}

async function packageScriptCandidates(
  searchRoot: string,
  source: string
): Promise<GateSourceCandidates[]> {
  const packageJsonPath = join(searchRoot, "package.json");
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
      story: scripts["green-verify"] ? ["bun run green-verify"] : [],
      epic: scripts["verify-all"] ? ["bun run verify-all"] : [],
      source,
    },
  ];
}

async function docCandidates(
  searchRoot: string,
  source: string
): Promise<GateSourceCandidates[]> {
  const candidates: GateSourceCandidates = {
    story: [],
    epic: [],
    source,
  };

  for (const fileName of ["AGENTS.md", "README.md"]) {
    const filePath = join(searchRoot, fileName);
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

async function ciCandidates(
  searchRoot: string,
  source: string
): Promise<GateSourceCandidates[]> {
  const workflowsDir = join(searchRoot, ".github", "workflows");
  if (!(await pathExists(workflowsDir))) {
    return [];
  }

  const entries = await readdir(workflowsDir, { withFileTypes: true });
  const candidates: GateSourceCandidates = {
    story: [],
    epic: [],
    source,
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

async function localAndRepoRootCandidates(
  specPackRoot: string
): Promise<GateSourceCandidates[]> {
  const repoRoot = await findRepoRoot(specPackRoot);
  const searchRoots = [
    {
      root: specPackRoot,
      packageSource: "local package.json scripts",
      docSource: "project policy docs",
      ciSource: "CI configuration",
    },
    ...(repoRoot && repoRoot !== specPackRoot
      ? [
          {
            root: repoRoot,
            packageSource: "repo-root package.json scripts",
            docSource: "repo-root project policy docs",
            ciSource: "repo-root CI configuration",
          },
        ]
      : []),
  ];

  const sourceCandidates: GateSourceCandidates[] = [];
  for (const searchRoot of searchRoots) {
    sourceCandidates.push(
      ...(await packageScriptCandidates(searchRoot.root, searchRoot.packageSource))
    );
    sourceCandidates.push(
      ...(await docCandidates(searchRoot.root, searchRoot.docSource))
    );
    sourceCandidates.push(
      ...(await ciCandidates(searchRoot.root, searchRoot.ciSource))
    );
  }

  return sourceCandidates;
}

export async function resolveVerificationGates(input: {
  specPackRoot: string;
  explicitStoryGate?: string;
  explicitEpicGate?: string;
}): Promise<GateDiscoveryResult> {
  const specPackRoot = resolve(input.specPackRoot);
  const sourceCandidates = await localAndRepoRootCandidates(specPackRoot);
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
