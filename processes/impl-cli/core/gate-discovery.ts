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
    storyGateCandidates: string[];
    epicGateCandidates: string[];
    storyGateRationale: string;
    epicGateRationale: string;
  };
  errors: CliError[];
  notes: string[];
}

interface GateSourceCandidates {
  story: string[];
  epic: string[];
  source: string;
}

type PackageManagerName = "bun" | "npm" | "pnpm" | "yarn";

interface PackageManagerResolution {
  name: PackageManagerName;
  useCorepack: boolean;
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
  candidates: string[];
  rationale?: string;
} {
  if (input.explicitValue) {
    return {
      value: input.explicitValue,
      source: "explicit CLI flag",
      ambiguous: false,
      candidates: [input.explicitValue],
      rationale: "Selected the explicit CLI flag over all discovered sources.",
    };
  }

  for (const candidateSet of input.sourceCandidates) {
    const values = uniqueValues(candidateSet[input.gate]);
    if (values.length > 1) {
      return {
        ambiguous: true,
        candidates: values,
      };
    }

    if (values.length === 1) {
      return {
        value: values[0],
        source: candidateSet.source,
        ambiguous: false,
        candidates: values,
        rationale: `Selected '${values[0]}' from ${candidateSet.source}. Candidates considered: ${values.join(", ")}.`,
      };
    }
  }

  return {
    ambiguous: false,
    candidates: [],
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
    packageManager?: string;
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};

  if (!scripts["green-verify"] && !scripts["verify-all"]) {
    return [];
  }

  const packageManager = await detectPackageManager(searchRoot, packageJson);

  return [
    {
      story: scripts["green-verify"]
        ? [formatPackageScriptCommand(packageManager, "green-verify")]
        : [],
      epic: scripts["verify-all"]
        ? [formatPackageScriptCommand(packageManager, "verify-all")]
        : [],
      source,
    },
  ];
}

function parsePackageManagerName(value: string | undefined): PackageManagerName | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const separatorIndex = trimmed.lastIndexOf("@");
  const name =
    separatorIndex > 0 ? trimmed.slice(0, separatorIndex) : trimmed;

  switch (name) {
    case "bun":
    case "npm":
    case "pnpm":
    case "yarn":
      return name;
    default:
      return null;
  }
}

async function detectPackageManager(
  searchRoot: string,
  packageJson: { packageManager?: string }
): Promise<PackageManagerResolution> {
  const configured = parsePackageManagerName(packageJson.packageManager);
  if (configured) {
    return {
      name: configured,
      useCorepack: true,
    };
  }

  if (await pathExists(join(searchRoot, "pnpm-lock.yaml"))) {
    return {
      name: "pnpm",
      useCorepack: false,
    };
  }

  if (
    (await pathExists(join(searchRoot, "bun.lock"))) ||
    (await pathExists(join(searchRoot, "bun.lockb")))
  ) {
    return {
      name: "bun",
      useCorepack: false,
    };
  }

  if (await pathExists(join(searchRoot, "yarn.lock"))) {
    return {
      name: "yarn",
      useCorepack: false,
    };
  }

  if (await pathExists(join(searchRoot, "package-lock.json"))) {
    return {
      name: "npm",
      useCorepack: false,
    };
  }

  return {
    name: "npm",
    useCorepack: false,
  };
}

function formatPackageScriptCommand(
  packageManager: PackageManagerResolution,
  scriptName: string
): string {
  const runner = packageManager.useCorepack
    ? `corepack ${packageManager.name}`
    : packageManager.name;

  switch (packageManager.name) {
    case "bun":
    case "npm":
    case "pnpm":
    case "yarn":
      return `${runner} run ${scriptName}`;
  }
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
  persistedVerificationGates?: {
    storyGate: string;
    epicGate: string;
    storyGateSource?: string;
    epicGateSource?: string;
  };
}): Promise<GateDiscoveryResult> {
  const specPackRoot = resolve(input.specPackRoot);
  const sourceCandidates = [
    ...(input.persistedVerificationGates
      ? [
          {
            story: [input.persistedVerificationGates.storyGate],
            epic: [input.persistedVerificationGates.epicGate],
            source:
              input.persistedVerificationGates.storyGateSource ??
              "impl-run.config.json verification_gates",
          },
        ]
      : []),
    ...(await localAndRepoRootCandidates(specPackRoot)),
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
      storyGateCandidates: storyResolution.candidates,
      epicGateCandidates: epicResolution.candidates,
      storyGateRationale:
        storyResolution.rationale ??
        `Selected '${storyResolution.value}' from ${storyResolution.source}.`,
      epicGateRationale:
        epicResolution.rationale ??
        `Selected '${epicResolution.value}' from ${epicResolution.source}.`,
    },
    errors: [],
    notes: [],
  };
}
