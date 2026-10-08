#!/usr/bin/env bun
import { contextPack } from "./commands/context";
import { parseContextRequest } from "./context/request";
import { doctorReport } from "./commands/doctor";
import { GATES_USAGE, gatesReport } from "./commands/gates";
import { graphCommand } from "./commands/graph";
import { LAUNCH_USAGE, launchCommand } from "./commands/launch";
import { lessonsCommand } from "./commands/lessons";
import { BOARD_USAGE, boardCommand, systemBoardDeps } from "./commands/board";
import { CLAIM_USAGE, claimCommand } from "./commands/claim";
import { LIST_USAGE, listCommand } from "./commands/list";
import { PHASE_USAGE, phaseCommand } from "./commands/phase";
import { playbooksReport } from "./commands/playbooks";
import { PR_STATUS_USAGE, prStatusReport } from "./commands/pr-status";
import { PUBLISH_DOCS_USAGE, publishDocsReport } from "./commands/publish-docs";
import { PUSH_USAGE, pushReport } from "./commands/push";
import { readyReport } from "./commands/ready";
import { settingsReport } from "./commands/settings";
import { TREES_USAGE, treesCommand } from "./commands/trees";
import { findSpecs } from "./core/spec-folders";

export interface Command {
  usage: string;
  run(projectDir: string, args: readonly string[]): string | Promise<string>;
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
  list: { usage: LIST_USAGE, run: (dir, args) => listCommand(dir, args, systemBoardDeps()) },
  board: { usage: BOARD_USAGE, run: (dir, args) => boardCommand(dir, args) },
  playbooks: { usage: "playbooks <spec-name>", run: (dir, args) => playbooksReport(dir, args[0]) },
  phase: { usage: PHASE_USAGE, run: phaseCommand },
  settings: { usage: "settings", run: (dir) => settingsReport(dir) },
  "pr-status": { usage: PR_STATUS_USAGE, run: (dir, args) => prStatusReport(dir, args) },
  push: { usage: PUSH_USAGE, run: (dir, args) => pushReport(dir, args) },
  "publish-docs": { usage: PUBLISH_DOCS_USAGE, run: (dir, args) => publishDocsReport(dir, args) },
  claim: { usage: CLAIM_USAGE, run: (dir, args) => claimCommand(dir, args) },
  launch: { usage: LAUNCH_USAGE, run: (dir, args) => launchCommand(dir, args) },
  trees: { usage: TREES_USAGE, run: (dir, args) => treesCommand(dir, args) },
};

export const USAGE = `usage: bun spec.ts ${Object.values(COMMANDS)
  .map((command) => command.usage)
  .join(" | ")}`;

export async function run(argv: readonly string[], projectDir: string): Promise<string> {
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
    console.log(await run(await withStdinArgs(Bun.argv.slice(2)), process.cwd()));
  } catch (cause) {
    console.log(`spec tools failed: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}
