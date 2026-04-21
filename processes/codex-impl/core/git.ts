import { runShellCommand } from "./gates";

export async function commitAllChanges(params: {
  repoRoot: string;
  message: string;
}): Promise<{ status: "committed" | "no_changes" | "failed"; summary: string }> {
  const status = await runShellCommand(params.repoRoot, "git status --short");
  if (status.exitCode !== 0) {
    return {
      status: "failed",
      summary: status.stderr.trim() || "git status failed",
    };
  }

  if (!status.stdout.trim()) {
    return {
      status: "no_changes",
      summary: "Working tree clean; nothing to commit.",
    };
  }

  const addResult = await runShellCommand(params.repoRoot, "git add -A");
  if (addResult.exitCode !== 0) {
    return {
      status: "failed",
      summary: addResult.stderr.trim() || "git add failed",
    };
  }

  const commitResult = await runShellCommand(
    params.repoRoot,
    `git commit -m ${JSON.stringify(params.message)}`
  );

  if (commitResult.exitCode !== 0) {
    return {
      status: "failed",
      summary: commitResult.stderr.trim() || "git commit failed",
    };
  }

  return {
    status: "committed",
    summary: commitResult.stdout.trim() || params.message,
  };
}

export async function getWorkingTreeSummary(repoRoot: string): Promise<string> {
  const [status, diffStat] = await Promise.all([
    runShellCommand(repoRoot, "git status --short"),
    runShellCommand(repoRoot, "git diff --stat HEAD"),
  ]);

  const sections: string[] = [];
  sections.push("### git status --short");
  sections.push("");
  sections.push("```text");
  sections.push(status.stdout.trim() || "(clean)");
  sections.push("```");
  sections.push("");
  sections.push("### git diff --stat HEAD");
  sections.push("");
  sections.push("```text");
  sections.push(diffStat.stdout.trim() || "(no diff)");
  sections.push("```");

  return sections.join("\n");
}

export async function getHeadCommit(repoRoot: string): Promise<string> {
  const result = await runShellCommand(repoRoot, "git rev-parse HEAD");
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || "git rev-parse HEAD failed");
  }
  return result.stdout.trim();
}
