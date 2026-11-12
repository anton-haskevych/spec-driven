import { join } from "node:path";
import type { EditPlan, FileEdit } from "../core/apply-edits";
import { allTasksDone, entryTaskCount } from "../core/phase-entry";
import type { SpecFolder } from "../core/spec-folders";
import { diskReader, loadSpecStateFromFiles, type PhaseState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { findPhase } from "./find-phase";
import { openItemNumber } from "./locate";
import { appendItems, takeOpenItems } from "./move-items";
import { tickPhaseLine, untickPhaseLine } from "./progress-lines";
import { issuesIntroducedBy } from "./validate";

// On the record a task is named by its id; in files it is selected as `phase tick` does, in `from`.
export interface MoveRequest {
  tasks: readonly string[];
  to: string;
  from?: string;
}

export type Move = { kind: "ok"; plan: Extract<EditPlan, { kind: "ok" }>; from: string; to: string; count: number } | { kind: "invalid"; reason: string };

export function planMove(spec: SpecFolder, request: MoveRequest, nodes: ReadonlyMap<string, SpecNode> = new Map()): Move {
  if (!request.from) return invalid("on a spec in files, name the phase the items are in: --from <phase>");
  const state = loadSpecStateFromFiles(spec);
  const from = findPhase(state, request.from);
  const to = findPhase(state, request.to);
  if (typeof from === "string") return invalid(from);
  if (typeof to === "string") return invalid(to);
  if (from.id === to.id) return invalid(`Phase ${from.id} is both --from and --to`);
  if (from.entry === undefined || to.entry === undefined) return invalid(`Phase ${(from.entry === undefined ? from : to).id} has no file`);

  const numbers: number[] = [];
  for (const selector of request.tasks) {
    const found = openItemNumber(from.entry, selector);
    if (found.kind === "invalid") return invalid(found.reason);
    numbers.push(found.number);
  }
  const taken = takeOpenItems(from.entry, numbers);
  if (taken.kind === "invalid") return invalid(taken.reason);

  const edits: FileEdit[] = [
    { file: join(spec.dir, from.pointer), text: taken.remaining },
    { file: join(spec.dir, to.pointer), text: appendItems(to.entry, numbers.flatMap((number) => taken.moved.get(number) ?? [])) },
    ...progressEdit(spec, from, to, taken.remaining),
  ];
  const introduced = issuesIntroducedBy(spec, edits, nodes);
  if (introduced.length > 0) return invalid(introduced.map((issue) => issue.problem).join("; "));
  return { kind: "ok", plan: { kind: "ok", edits }, from: from.id, to: to.id, count: numbers.length };
}

// The source may now be finished; the target, if it was, has open items again.
function progressEdit(spec: SpecFolder, from: PhaseState, to: PhaseState, remaining: string): FileEdit[] {
  const before = diskReader(spec.dir)("progress.md") ?? "";
  const ticked = !from.done && allTasksDone(entryTaskCount(remaining)) ? tickPhaseLine(before, from.pointer) : before;
  const after = to.done ? untickPhaseLine(ticked, to.pointer) : ticked;
  return after === before ? [] : [{ file: join(spec.dir, "progress.md"), text: after }];
}

function invalid(reason: string): Move {
  return { kind: "invalid", reason };
}
