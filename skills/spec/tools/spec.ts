#!/usr/bin/env bun
import { doctorReport } from "./commands/doctor";

const USAGE = "usage: bun spec.ts doctor [<spec-name>]";

function run(argv: readonly string[], projectDir: string): string {
  const [command, ...args] = argv;
  switch (command) {
    case "doctor":
      return doctorReport(projectDir, args[0]);
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
