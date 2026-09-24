#!/usr/bin/env bun
import { contextPack, parseContextRequest } from "./commands/context";
import { doctorReport } from "./commands/doctor";
import { lessonsCommand } from "./commands/lessons";

const USAGE = "usage: bun spec.ts doctor [<spec-name>] | context <sub-command> <spec-name> [hint] | lessons …";

function run(argv: readonly string[], projectDir: string): string {
  const [command, ...args] = argv;
  switch (command) {
    case "doctor":
      return doctorReport(projectDir, args[0]);
    case "context":
      return contextPack(projectDir, parseContextRequest(args));
    case "lessons":
      return lessonsCommand(projectDir, args);
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
