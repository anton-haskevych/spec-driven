#!/usr/bin/env bun
import { contextPack, parseContextRequest } from "./commands/context";
import { doctorReport } from "./commands/doctor";
import { graphCommand } from "./commands/graph";
import { lessonsCommand } from "./commands/lessons";
import { readyReport } from "./commands/ready";

const USAGE = "usage: bun spec.ts doctor [<spec-name>] | context <sub-command> <spec-name> [hint] | lessons … | graph … | ready <spec-name>";

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
    default:
      return USAGE;
  }
}

if (import.meta.main) {
  try {
    console.log(run(Bun.argv.slice(2), process.cwd()));
  } catch (cause) {
    console.log(`spec tools failed: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}
