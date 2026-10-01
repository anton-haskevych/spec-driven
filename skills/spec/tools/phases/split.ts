import { join } from "node:path";
import type { EditPlan, FileEdit } from "../core/apply-edits";
import { countCheckboxes } from "../core/progress";
import type { SpecFolder } from "../core/spec-folders";
import { diskReader, loadSpecState, type PhaseState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { findPhase } from "./find-phase";
import { familyOf, nextLetterIds } from "./ids";
import { takeOpenItems } from "./move-items";
import { insertAfterPhases, tickPhaseLine } from "./progress-lines";
import { phaseFileText, phasePointer, progressLine, type PhaseFileEdges } from "./template";
import { issuesIntroducedBy } from "./validate";

export interface SplitRequest {
  id: string;
  titles: readonly string[];
  items: ReadonlyMap<number, readonly number[]>;
}

export interface SplitPart {
  id: string;
  title: string;
  pointer: string;
}

export interface Split {
  plan: EditPlan;
  original?: PhaseState;
  parts: SplitPart[];
}

const FOLDER_PLAN = /\/plan\.md$/;

export function planSplit(spec: SpecFolder, request: SplitRequest, nodes: ReadonlyMap<string, SpecNode>): Split {
  const state = loadSpecState(spec);
  const phase = findPhase(state, request.id);
  if (typeof phase === "string") return invalid(phase);
  const refusal = splitRefusal(phase);
  if (refusal) return invalid(refusal);

  const ids = state.phases.map((candidate) => candidate.id);
  const newIds = nextLetterIds(phase.id, ids, request.titles.length);
  if (newIds.length < request.titles.length) return invalid(`Phase ${phase.id} has only ${newIds.length} free letters left`);
  const parts = request.titles.map((title, index) => {
    const id = newIds[index] ?? "";
    return { id, title, pointer: phasePointer(id, title) };
  });
  const read = diskReader(spec.dir);
  const clash = parts.find((part) => read(part.pointer) !== undefined);
  if (clash) return invalid(`${clash.pointer} already exists`);

  const taken = takeOpenItems(phase.entry ?? "", [...request.items.values()].flat());
  if (taken.kind === "invalid") return invalid(taken.reason);

  const familyPointers = state.phases.filter((p) => familyOf(phase.id, ids).includes(p.id)).map((p) => p.pointer);
  const remaining = countCheckboxes(taken.remaining);
  const progressBefore = read("progress.md") ?? "";
  const progressTicked = remaining.unchecked === 0 && remaining.checked > 0 ? tickPhaseLine(progressBefore, phase.pointer) : progressBefore;
  const progress = insertAfterPhases(progressTicked, familyPointers, parts.map((part) => progressLine(part.id, part.title, part.pointer)));

  const edits: FileEdit[] = [
    { file: join(spec.dir, phase.pointer), text: taken.remaining },
    ...parts.map((part, index) => ({
      file: join(spec.dir, part.pointer),
      text: phaseFileText({ ...part, edges: copiedEdges(phase), items: movedLines(request.items.get(index), taken.moved) }),
    })),
    { file: join(spec.dir, "progress.md"), text: progress },
  ];
  const introduced = issuesIntroducedBy(spec, edits, nodes);
  if (introduced.length > 0) return invalid(introduced.map((issue) => issue.problem).join("; "));
  return { plan: { kind: "ok", edits }, original: phase, parts };
}

function splitRefusal(phase: PhaseState): string | undefined {
  if (phase.done) return `Phase ${phase.id} is done; add a phase after it with phase add --after ${phase.id}`;
  if (FOLDER_PLAN.test(phase.pointer)) return `Phase ${phase.id} is folder-shaped (${phase.pointer}); split it by hand`;
  if (phase.entry === undefined) return `Phase ${phase.id} points at ${phase.pointer}, which does not exist`;
  return undefined;
}

function copiedEdges(phase: PhaseState): PhaseFileEdges {
  const { needs, needsDeployed, sameFilesAs, pr } = phase.edges;
  return { needs, needsDeployed, sameFilesAs, pr, code: phase.code ? undefined : false };
}

function movedLines(items: readonly number[] | undefined, moved: ReadonlyMap<number, string[]>): string[] {
  return (items ?? []).flatMap((item) => moved.get(item) ?? []);
}

function invalid(reason: string): Split {
  return { plan: { kind: "invalid", reason }, parts: [] };
}
