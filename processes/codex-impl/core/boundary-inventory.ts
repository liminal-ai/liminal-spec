import { readFile } from "node:fs/promises";

export type BoundaryStatus = "stub" | "mocked" | "integrated" | "unknown";

export interface BoundaryInventoryEntry {
  boundary: string;
  status: BoundaryStatus;
  story?: string;
}

export async function loadBoundaryInventory(
  path?: string
): Promise<BoundaryInventoryEntry[]> {
  if (!path) {
    return [];
  }

  const content = await readFile(path, "utf8");
  const lines = content.split(/\r?\n/);
  const entries: BoundaryInventoryEntry[] = [];

  for (const line of lines) {
    if (!line.trim().startsWith("|")) {
      continue;
    }
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length < 2) {
      continue;
    }
    if (
      cells[0].toLowerCase() === "boundary" ||
      /^-+$/.test(cells[0].replace(/:/g, ""))
    ) {
      continue;
    }

    entries.push({
      boundary: cells[0],
      status: normalizeBoundaryStatus(cells[1]),
      story: cells[2],
    });
  }

  return entries;
}

export function summarizeBoundaryInventory(
  entries: BoundaryInventoryEntry[],
  fallback = "Boundary inventory missing."
): string {
  if (entries.length === 0) {
    return fallback;
  }

  return entries
    .map((entry) => `${entry.boundary}:${entry.status}${entry.story ? `@${entry.story}` : ""}`)
    .join(", ");
}

export function hasBlockingStubBoundary(entries: BoundaryInventoryEntry[]): boolean {
  return entries.some((entry) => entry.status === "stub");
}

function normalizeBoundaryStatus(value: string): BoundaryStatus {
  const normalized = value.trim().toLowerCase();
  if (normalized === "stub" || normalized === "mocked" || normalized === "integrated") {
    return normalized;
  }
  return "unknown";
}
