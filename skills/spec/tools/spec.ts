#!/usr/bin/env bun
import { contextPack, parseContextRequest } from "./commands/context";
import { doctorReport } from "./commands/doctor";
import { gatesReport } from "./commands/gates";
import { graphCommand } from "./commands/graph";
import { lessonsCommand } from "./commands/lessons";
import { listCommand } from "./commands/list";
import { readyReport } from "./commands/ready";
import { isoDay } from "./core/schedule";

const USAGE = "usage: bun spec.ts doctor [<spec-name>] | context <sub-command> <spec-name> [hint] | lessons … | graph … | ready <spec-name> | gates <spec-name> | list [all] [filter] [--json]";

function run(argv: readonly string[], projectDir: string): string {
  const [command, ...args] = argv;
  switch (command) {
    case "doctor":
      return doctorReport(projectDir, args[0]);
    case "context":
      return contextPack(projectDir, parseContextRequest(args));
    case "lessons":
      return lessonsCommand(projectDir, args);
    case "graph":
      return graphCommand(projectDir, args);
    case "ready":
      return readyReport(projectDir, args[0]);
    case "gates":
      return gatesReport(projectDir, args[0]);
    case "list":
      return listCommand(projectDir, args, isoDay(new Date()));
    default:
      return USAGE;
  }
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
