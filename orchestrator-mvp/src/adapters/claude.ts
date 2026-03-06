import { resolve } from "node:path";

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export interface ClaudePhaseCommandOptions {
  cwd: string;
  promptPath: string;
  stdoutPath: string;
  stderrPath: string;
  model?: string;
}

export function buildClaudePhaseCommand(options: ClaudePhaseCommandOptions): string {
  const cwd = resolve(options.cwd);
  const promptPath = resolve(options.promptPath);
  const stdoutPath = resolve(options.stdoutPath);
  const stderrPath = resolve(options.stderrPath);
  const model = options.model ?? "opus";

  return [
    "set -euo pipefail",
    `cd ${quote(cwd)}`,
    `cat ${quote(promptPath)} | claude -p --model ${quote(model)} --permission-mode bypassPermissions --add-dir ${quote(cwd)} > ${quote(stdoutPath)} 2> ${quote(stderrPath)}`,
  ].join("\n");
}
