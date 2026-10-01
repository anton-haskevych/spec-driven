import { join } from "node:path";
import type { EditPlan } from "../core/apply-edits";
import type { SpecFolder } from "../core/spec-folders";
import { diskReader, loadSpecState, type PhaseState, type SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { findPhase } from "./find-phase";
import { familyOf, nextIntegerId, nextLetterIds } from "./ids";
import { insertAfterPhases } from "./progress-insert";
import { phaseFileText, phasePointer, progressLine, type PhaseFileEdges } from "./template";
import { issuesIntroducedBy } from "./validate";

export interface AddRequest {
  title: string;
  after?: string;
  edges: PhaseFileEdges;
}

export interface Added {
  plan: EditPlan;
  phaseId?: string;
  pointer?: string;
}

interface Placement {
  id: string;
  anchors: string[];
}

export function planAdd(spec: SpecFolder, request: AddRequest, nodes: ReadonlyMap<string, SpecNode>): Added {
  const state = loadSpecState(spec);
  const placement = request.after === undefined ? atEnd(state.phases) : afterFamily(state, request.after);
  if (typeof placement === "string") return invalid(placement);

  const pointer = phasePointer(placement.id, request.title);
  const read = diskReader(spec.dir);
  if (read(pointer) !== undefined) return invalid(`${pointer} already exists`);

  const progress = insertAfterPhases(read("progress.md") ?? "", placement.anchors, [progressLine(placement.id, request.title, pointer)]);
  const edits = [
    { file: join(spec.dir, pointer), text: phaseFileText({ id: placement.id, title: request.title, edges: request.edges }) },
    { file: join(spec.dir, "progress.md"), text: progress },
  ];
  const introduced = issuesIntroducedBy(spec, edits, nodes);
  if (introduced.length > 0) return invalid(introduced.map((issue) => issue.problem).join("; "));
  return { plan: { kind: "ok", edits }, phaseId: placement.id, pointer };
}

function atEnd(phases: readonly PhaseState[]): Placement {
  return { id: nextIntegerId(phases.map((phase) => phase.id)), anchors: phases.map((phase) => phase.pointer) };
}

function afterFamily(state: SpecState, after: string): Placement | string {
  const base = findPhase(state, after);
  if (typeof base === "string") return base;
  const ids = state.phases.map((phase) => phase.id);
  const [id] = nextLetterIds(base.id, ids, 1);
  if (!id) return `Phase ${base.id} has no free letter left`;
  const family = familyOf(base.id, ids);
  return { id, anchors: state.phases.filter((phase) => family.includes(phase.id)).map((phase) => phase.pointer) };
}

function invalid(reason: string): Added {
  return { plan: { kind: "invalid", reason } };
}
