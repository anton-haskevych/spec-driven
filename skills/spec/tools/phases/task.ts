import { join } from "node:path";
import type { EditPlan, FileEdit } from "../core/apply-edits";
import { allTasksDone, entryTaskCount } from "../core/phase-entry";
import type { SpecFolder } from "../core/spec-folders";
import { diskReader, loadSpecStateFromFiles, type PhaseState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { findPhase } from "./find-phase";
import { locateOpenItem, openItemNumber } from "./locate";
import { appendItems, takeOpenItems } from "./move-items";
import { tickPhaseLine, untickPhaseLine } from "./progress-lines";
import { issuesIntroducedBy } from "./validate";

// A done task is never edited or dropped: it is the record of the work.
export type TaskRequest = { phase: string } & ({ action: "add"; texts: string[] } | { action: "edit"; task: string; text: string } | { action: "drop"; task: string });

export type TaskChange = { kind: "ok"; plan: Extract<EditPlan, { kind: "ok" }>; line: string } | { kind: "invalid"; reason: string };

const CHECKBOX_PREFIX = /^(\s*[-*+]\s+\[.\]\s+).*$/;

export function planTask(spec: SpecFolder, request: TaskRequest, nodes: ReadonlyMap<string, SpecNode> = new Map()): TaskChange {
  const phase = findPhase(loadSpecStateFromFiles(spec), request.phase);
  if (typeof phase === "string") return invalid(phase);
  if (phase.entry === undefined) return invalid(`Phase ${phase.id} points at ${phase.pointer}, which does not exist`);
  const changed = changeEntry(phase.entry, request);
  if (typeof changed === "string") return invalid(changed);

  const edits: FileEdit[] = [{ file: join(spec.dir, phase.pointer), text: changed.entry }, ...progressEdit(spec, phase, changed.entry)];
  const introduced = issuesIntroducedBy(spec, edits, nodes);
  if (introduced.length > 0) return invalid(introduced.map((issue) => issue.problem).join("; "));
  return { kind: "ok", plan: { kind: "ok", edits }, line: `task: phase ${phase.id} · ${changed.said}` };
}

function changeEntry(entry: string, request: TaskRequest): { entry: string; said: string } | string {
  if (request.action === "add") {
    const count = request.texts.length;
    return { entry: appendItems(entry, request.texts.map((text) => `- [ ] ${text}`)), said: `added ${count} ${count === 1 ? "task" : "tasks"}` };
  }
  if (request.action === "edit") {
    const location = locateOpenItem(entry, request.task);
    if (location.kind === "invalid") return location.reason;
    const lines = entry.split("\n");
    lines[location.line] = (lines[location.line] ?? "").replace(CHECKBOX_PREFIX, `$1${request.text}`);
    return { entry: lines.join("\n"), said: `"${location.text}" → "${request.text}"` };
  }
  const found = openItemNumber(entry, request.task);
  if (found.kind === "invalid") return found.reason;
  const text = locateOpenItem(entry, `#${found.number}`);
  const taken = takeOpenItems(entry, [found.number]);
  if (taken.kind === "invalid") return taken.reason;
  return { entry: taken.remaining, said: `dropped "${text.kind === "found" ? text.text : request.task}"` };
}

function progressEdit(spec: SpecFolder, phase: PhaseState, entry: string): FileEdit[] {
  const before = diskReader(spec.dir)("progress.md") ?? "";
  const done = allTasksDone(entryTaskCount(entry));
  const after = done === phase.done ? before : done ? tickPhaseLine(before, phase.pointer) : untickPhaseLine(before, phase.pointer);
  return after === before ? [] : [{ file: join(spec.dir, "progress.md"), text: after }];
}

function invalid(reason: string): TaskChange {
  return { kind: "invalid", reason };
}
