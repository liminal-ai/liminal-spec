import type { CommandExecutor } from "../types";

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export interface TmuxLaunchOptions {
  sessionName: string;
  cwd: string;
  callScriptPath: string;
  attachInITerm2: boolean;
  remoteControlBestEffort: boolean;
}

export async function launchWithTmux(
  options: TmuxLaunchOptions,
  executor: CommandExecutor
): Promise<string[]> {
  const notes: string[] = [];
  const newSessionCmd = [
    "tmux new-session -d -s",
    quote(options.sessionName),
    quote(`cd ${options.cwd} && zsh ${options.callScriptPath}`),
  ].join(" ");

  const createResult = await executor.run(newSessionCmd, options.cwd);
  if (createResult.exitCode !== 0) {
    throw new Error(
      `tmux new-session failed: ${createResult.stderr.trim() || createResult.stdout.trim()}`
    );
  }

  if (options.attachInITerm2) {
    const appleScript = [
      'tell application "iTerm2"',
      "create window with default profile",
      `tell current session of current window to write text "tmux attach -t ${options.sessionName}"`,
      "activate",
      "end tell",
    ].join("\n");

    const attachResult = await executor.run(
      `osascript -e ${quote(appleScript)}`,
      options.cwd
    );

    if (attachResult.exitCode !== 0) {
      notes.push(
        `iTerm2 attach failed; run manually: tmux attach -t ${options.sessionName}`
      );
    }
  }

  if (options.remoteControlBestEffort) {
    notes.push(
      "Skipped /remote-control bootstrap in MVP because phase executor runs non-interactively via claude -p."
    );
  }

  return notes;
}

export async function waitForTmuxSessionExit(
  sessionName: string,
  cwd: string,
  executor: CommandExecutor,
  timeoutMs = 45 * 60 * 1000,
  pollMs = 4000
): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const probe = await executor.run(
      `tmux has-session -t ${quote(sessionName)}`,
      cwd
    );

    if (probe.exitCode !== 0) {
      return true;
    }

    await Bun.sleep(pollMs);
  }

  return false;
}
