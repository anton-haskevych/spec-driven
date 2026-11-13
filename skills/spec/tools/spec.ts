#!/usr/bin/env bun
import { questionCommand, QUESTION_USAGE } from "./commands/question";
import { CARD_USAGE, cardCommand } from "./commands/card";
import { contextPack } from "./commands/context";
import { parseContextRequest } from "./context/request";
import { doctorCommand, DOCTOR_USAGE } from "./commands/doctor";
import { GATES_USAGE, gatesReport } from "./commands/gates";
import { JOIN_USAGE, joinCommand } from "./commands/join";
import { graphCommand } from "./commands/graph";
import { LAUNCH_USAGE, launchCommand } from "./commands/launch";
import { lessonsCommand } from "./commands/lessons";
import { BOARD_USAGE, boardCommand, systemBoardDeps } from "./commands/board";
import { CLAIM_USAGE, claimCommand } from "./commands/claim";
import { CREW_USAGE, crewCommand } from "./commands/crew";
import { FOCUS_USAGE, focusCommand } from "./commands/focus";
import { LIST_USAGE, listCommand } from "./commands/list";
import { OWNER_USAGE, ownerCommand } from "./commands/owner";
import { PHASE_USAGE, phaseCommand } from "./commands/phase";
import { playbooksReport } from "./commands/playbooks";
import { PR_USAGE, prCommand } from "./commands/pr";
import { PUBLISH_DOCS_USAGE, publishDocsReport } from "./commands/publish-docs";
import { PUSH_USAGE, pushReport } from "./commands/push";
import { readyReport } from "./commands/ready";
import { PLAN_USAGE, planCommand } from "./commands/plan";
import { RECORD_USAGE, recordCommand } from "./commands/record";
import { settingsReport } from "./commands/settings";
import { SHIP_USAGE, shipCommand } from "./commands/ship";
import { SPEC_STATUS_USAGE, specStatusCommand } from "./commands/spec-status";
import { TREES_USAGE, treesCommand } from "./commands/trees";
import { findProjectDir, findSpecs } from "./core/spec-folders";
import { pilotCommandRefusal, type LocalPilot } from "./runtime/workflow-capabilities";

export interface Command {
  usage: string;
  run(projectDir: string, args: readonly string[], workflow?: LocalPilot): string | Promise<string>;
}

export interface CommandDeps {
  context?: Pick<Command, "run">;
  workflow?: LocalPilot;
}

export const COMMANDS: Record<string, Command> = {
  doctor: { usage: DOCTOR_USAGE, run: doctorCommand },
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
  pr: { usage: PR_USAGE, run: (dir, args) => prCommand(dir, args) },
  push: { usage: PUSH_USAGE, run: (dir, args) => pushReport(dir, args) },
  "publish-docs": { usage: PUBLISH_DOCS_USAGE, run: (dir, args) => publishDocsReport(dir, args) },
  claim: { usage: CLAIM_USAGE, run: (dir, args) => claimCommand(dir, args) },
  crew: { usage: CREW_USAGE, run: (dir, args) => crewCommand(dir, args) },
  focus: { usage: FOCUS_USAGE, run: (dir, args) => focusCommand(dir, args) },
  ship: { usage: SHIP_USAGE, run: (dir, args) => shipCommand(dir, args) },
  owner: { usage: OWNER_USAGE, run: (dir, args) => ownerCommand(dir, args) },
  "spec-status": { usage: SPEC_STATUS_USAGE, run: (dir, args) => specStatusCommand(dir, args) },
  launch: { usage: LAUNCH_USAGE, run: (dir, args) => launchCommand(dir, args) },
  trees: { usage: TREES_USAGE, run: (dir, args) => treesCommand(dir, args) },
  record: { usage: RECORD_USAGE, run: (dir, args) => recordCommand(dir, args) },
  join: { usage: JOIN_USAGE, run: (dir, args) => joinCommand(dir, args) },
  plan: { usage: PLAN_USAGE, run: (dir, args) => planCommand(dir, args) },
  question: { usage: QUESTION_USAGE, run: questionCommand },
  card: { usage: CARD_USAGE, run: (dir, args) => cardCommand(dir, args) },
};

export const USAGE = `usage: bun spec.ts ${Object.values(COMMANDS)
  .map((command) => command.usage)
  .join(" | ")}`;

export async function run(argv: readonly string[], projectDir: string, deps: CommandDeps = {}): Promise<string> {
  const refusal = deps.workflow && pilotCommandRefusal(argv, deps.workflow);
  if (refusal) return `spec: ${refusal}`;
  const [name, ...args] = argv;
  if (name === "context" && deps.workflow && !deps.context) return "spec: context binding unavailable in local-pilot; legacy context is disabled";
  if (name === "context" && deps.context) return deps.context.run(projectDir, args);
  const command = name !== undefined && Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined;
  return command ? command.run(projectDir, args, deps.workflow) : USAGE;
}

async function withStdinArgs(argv: readonly string[]): Promise<readonly string[]> {
  if (argv[0] !== "context" || argv[1] !== "-") return argv;
  return ["context", await Bun.stdin.text()];
}

if (import.meta.main) {
  try {
    if (process.env.CODEX_THREAD_ID) {
      console.log("spec: Codex requires the packaged native entry; legacy dispatch is unavailable");
      process.exitCode = 1;
    } else {
      console.log(await run(await withStdinArgs(Bun.argv.slice(2)), findProjectDir(process.cwd())));
    }
  } catch (cause) {
    console.log(`spec tools failed: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}
