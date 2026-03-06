import { resolve } from "node:path";
import type { CommandExecutor, TerminalMode } from "../types";

export interface EffectiveTerminal {
  requested: TerminalMode;
  effective: Exclude<TerminalMode, "auto">;
  useTmux: boolean;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function appExists(executor: CommandExecutor, appName: string): Promise<boolean> {
  const cmd = `open -Ra ${quote(appName)}`;
  const result = await executor.run(cmd, process.cwd());
  return result.exitCode === 0;
}

export async function detectTerminalMode(
  requested: TerminalMode,
  executor: CommandExecutor
): Promise<EffectiveTerminal> {
  if (requested !== "auto") {
    return {
      requested,
      effective: requested,
      useTmux: requested === "iterm2",
    };
  }

  if (await appExists(executor, "iTerm")) {
    return { requested, effective: "iterm2", useTmux: true };
  }

  if (await appExists(executor, "Ghostty")) {
    return { requested, effective: "ghostty", useTmux: false };
  }

  if (await appExists(executor, "Terminal")) {
    return { requested, effective: "terminal", useTmux: false };
  }

  return { requested, effective: "none", useTmux: false };
}

export async function launchWithoutTmux(
  mode: Exclude<TerminalMode, "auto" | "iterm2">,
  callScriptPath: string,
  cwd: string,
  executor: CommandExecutor
): Promise<void> {
  const absoluteScriptPath = resolve(callScriptPath);
  const quotedScript = quote(absoluteScriptPath);

  if (mode === "none") {
    const result = await executor.run(`zsh ${quotedScript}`, cwd);
    if (result.exitCode !== 0) {
      throw new Error(
        `Phase script failed (exit ${result.exitCode}): ${result.stderr.trim() || result.stdout.trim()}`
      );
    }
    return;
  }

  if (mode === "terminal") {
    const cmd = [
      "osascript",
      "-e",
      quote(`tell application \"Terminal\" to do script \"zsh ${absoluteScriptPath}\"`),
      "-e",
      quote(`tell application \"Terminal\" to activate`),
    ].join(" ");

    const result = await executor.run(cmd, cwd);
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to launch Terminal.app for phase script: ${result.stderr.trim() || result.stdout.trim()}`
      );
    }
    return;
  }

  if (mode === "ghostty") {
    const cmd = `open -a ${quote("Ghostty")} --args -e zsh ${quotedScript}`;
    const result = await executor.run(cmd, cwd);
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to launch Ghostty for phase script: ${result.stderr.trim() || result.stdout.trim()}`
      );
    }
    return;
  }
}
