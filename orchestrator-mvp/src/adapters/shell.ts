import type { CommandExecutor, ShellExecutionResult } from "../types";

export class BunCommandExecutor implements CommandExecutor {
  async run(command: string, cwd: string): Promise<ShellExecutionResult> {
    const proc = Bun.spawn(["zsh", "-lc", command], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
      env: process.env,
    });

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    return { exitCode, stdout, stderr };
  }
}
