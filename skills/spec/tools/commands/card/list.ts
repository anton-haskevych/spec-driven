import { cardProblems } from "../../cards/check";
import { cardLine, cardRows, cardsSummary } from "../../cards/list";
import type { PhaseDeps } from "../../plan/phase-writer";
import { readPlansAt } from "../../plan/read-plans";
import { recordViewOf } from "../../record/read";
import { OLDER_PLUGIN } from "../../record/write";
import { parseFlags } from "../phase/args";

const NO_RECORD = "card: no board record here; with the board off, ideas are files in docs/specs/_backlog/";

export function listCards(projectDir: string, args: readonly string[], deps: PhaseDeps, usage: string): string {
  const parsed = parseFlags(args, { all: { type: "boolean" }, tag: { type: "string" }, json: { type: "boolean" } });
  if (!parsed || parsed.positionals.length > 0) return `usage: ${usage}`;
  const plans = readPlansAt(projectDir, deps.runner, deps.now());
  if (plans.record.kind === "newer") return `card list: ${OLDER_PLUGIN}`;
  const view = recordViewOf(plans.record);
  const all = parsed.values.all === true;
  const rows = view ? cardRows(view, { all, ...(parsed.values.tag ? { tag: parsed.values.tag } : {}) }) : [];
  if (parsed.values.json) return JSON.stringify({ cards: rows });
  if (!view) return NO_RECORD;
  return [...rows.map(cardLine), cardsSummary(rows, all)].join("\n");
}

// What no single card can see; the doctor runs the same check on the local copy.
export function checkCards(projectDir: string, deps: PhaseDeps): string {
  const plans = readPlansAt(projectDir, deps.runner, deps.now());
  if (plans.record.kind === "newer") return `card check: ${OLDER_PLUGIN}`;
  const view = recordViewOf(plans.record);
  if (!view) return NO_RECORD;
  const problems = cardProblems(view);
  if (problems.length === 0) return "card check: clean";
  return [...problems.map(({ path, problem }) => `${path}: ${problem}`), `card check: ${problems.length} ${problems.length === 1 ? "problem" : "problems"}`].join("\n");
}
