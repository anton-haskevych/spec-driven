import type { PhaseDeps } from "../plan/phase-writer";
import { readPlansAt } from "../plan/read-plans";
import { questionLine, questionRows, questionsSummary } from "../questions/list";
import { recordViewOf } from "../record/read";
import type { LocalPilot } from "../runtime/workflow-capabilities";
import { phaseCommand } from "./phase";
import { parseFlags } from "./phase/args";
import { systemPhaseDeps } from "./phase/context";
import { answerById } from "./question/answer";

export const QUESTION_USAGE = 'question ask <spec> <phase> "<question>" [--recommend "<answer>"] | answer <spec> <q-id|phase> "<answer>" [--if-version <v>] | list [--all] [--json]';

const QUESTION_ID = /^q[1-9]\d*$/;

// `ask` and an answer by phase are `phase park` and `phase unpark`: one writer, both homes.
export function questionCommand(projectDir: string, args: readonly string[], workflow?: LocalPilot, deps: PhaseDeps = systemPhaseDeps()): string | Promise<string> {
  const [action, ...rest] = args;
  if (action === "ask") return phaseCommand(projectDir, ["park", ...rest], workflow, deps);
  if (action === "answer") return answer(projectDir, rest, workflow, deps);
  if (action === "list") return list(projectDir, rest, deps);
  return `usage: ${QUESTION_USAGE}`;
}

function answer(projectDir: string, args: readonly string[], workflow: LocalPilot | undefined, deps: PhaseDeps): string | Promise<string> {
  const parsed = parseFlags(args, { "if-version": { type: "string" } });
  const [spec, target, text] = parsed?.positionals ?? [];
  if (!parsed || !spec || !target || !text?.trim()) return `usage: ${QUESTION_USAGE}`;
  if (!QUESTION_ID.test(target)) return phaseCommand(projectDir, ["unpark", spec, target, text], workflow, deps);
  return answerById(projectDir, spec, target, text, deps, parsed.values["if-version"]);
}

function list(projectDir: string, args: readonly string[], deps: PhaseDeps): string {
  const parsed = parseFlags(args, { all: { type: "boolean" }, json: { type: "boolean" } });
  if (!parsed || parsed.positionals.length > 0) return `usage: ${QUESTION_USAGE}`;
  const all = parsed.values.all === true;
  const view = recordViewOf(readPlansAt(projectDir, deps, deps.now()).record);
  const rows = view ? questionRows(view, all) : [];
  if (parsed.values.json) return JSON.stringify({ questions: rows });
  return [...rows.map(questionLine), view ? questionsSummary(rows, all) : "question: no board record here; parked phases of specs in files show on the board"].join("\n");
}
