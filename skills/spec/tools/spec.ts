#!/usr/bin/env bun
import { contextPack } from "./commands/context";
import { parseContextRequest } from "./context/request";
import { doctorReport } from "./commands/doctor";
import { GATES_USAGE, gatesReport } from "./commands/gates";
import { graphCommand } from "./commands/graph";
import { lessonsCommand } from "./commands/lessons";
import { listCommand } from "./commands/list";
import { PHASE_USAGE, phaseCommand } from "./commands/phase";
import { playbooksReport } from "./commands/playbooks";
import { PR_STATUS_USAGE, prStatusReport } from "./commands/pr-status";
import { readyReport } from "./commands/ready";
import { settingsReport } from "./commands/settings";
import { isoDay } from "./core/schedule";
import { findSpecs } from "./core/spec-folders";

export interface Command {
  usage: string;
  run(projectDir: string, args: readonly string[]): string;
}

export const COMMANDS: Record<string, Command> = {
  doctor: { usage: "doctor [<spec-name>]", run: (dir, args) => doctorReport(dir, args[0]) },
  context: {
    usage: "context <sub-command> <spec-name> [hint]",
    run: (dir, args) => contextPack(dir, parseContextRequest(args, (name) => findSpecs(dir, name).length > 0)),
  },
  lessons: { usage: "lessons …", run: lessonsCommand },
  graph: { usage: "graph …", run: graphCommand },
  ready: { usage: "ready <spec-name>", run: (dir, args) => readyReport(dir, args[0]) },
  gates: { usage: GATES_USAGE, run: gatesReport },
  list: { usage: "list [all] [filter] [--json]", run: (dir, args) => listCommand(dir, args, isoDay(new Date())) },
  playbooks: { usage: "playbooks <spec-name>", run: (dir, args) => playbooksReport(dir, args[0]) },
  phase: { usage: PHASE_USAGE, run: phaseCommand },
  settings: { usage: "settings", run: (dir) => settingsReport(dir) },
  "pr-status": { usage: PR_STATUS_USAGE, run: (dir, args) => prStatusReport(dir, args) },
};

export const USAGE = `usage: bun spec.ts ${Object.values(COMMANDS)
  .map((command) => command.usage)
  .join(" | ")}`;

export function run(argv: readonly string[], projectDir: string): string {
  const [name, ...args] = argv;
  const command = name !== undefined && Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined;
  return command ? command.run(projectDir, args) : USAGE;
}

// `context -` reads its arguments from stdin, so SKILL.md can pass raw user text without shell quoting.
async function withStdinArgs(argv: readonly string[]): Promise<readonly string[]> {
  if (argv[0] !== "context" || argv[1] !== "-") return argv;
  return ["context", await Bun.stdin.text()];
}

if (import.meta.main) {
  try {
    console.log(run(await withStdinArgs(Bun.argv.slice(2)), process.cwd()));
  } catch (cause) {
    console.log(`spec tools failed: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}
