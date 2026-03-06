import { describe, expect, test } from "bun:test";
import { detectTerminalMode } from "../src/adapters/terminal";
import type { CommandExecutor, ShellExecutionResult } from "../src/types";

class FakeExecutor implements CommandExecutor {
  constructor(private readonly appResults: Record<string, number>) {}

  async run(command: string): Promise<ShellExecutionResult> {
    const app = Object.keys(this.appResults).find((key) => command.includes(key));
    const exitCode = app ? this.appResults[app] : 1;
    return { exitCode, stdout: "", stderr: "" };
  }
}

describe("terminal mode policy", () => {
  test("enables tmux only for iTerm2", async () => {
    const iterm = await detectTerminalMode("iterm2", new FakeExecutor({}));
    const none = await detectTerminalMode("none", new FakeExecutor({}));

    expect(iterm.useTmux).toBe(true);
    expect(none.useTmux).toBe(false);
  });

  test("auto picks iTerm2 first and enables tmux", async () => {
    const mode = await detectTerminalMode(
      "auto",
      new FakeExecutor({ iTerm: 0, Ghostty: 0, Terminal: 0 })
    );

    expect(mode.effective).toBe("iterm2");
    expect(mode.useTmux).toBe(true);
  });

  test("auto falls back to non-tmux terminal modes", async () => {
    const ghostty = await detectTerminalMode(
      "auto",
      new FakeExecutor({ iTerm: 1, Ghostty: 0, Terminal: 0 })
    );

    expect(ghostty.effective).toBe("ghostty");
    expect(ghostty.useTmux).toBe(false);
  });
});
