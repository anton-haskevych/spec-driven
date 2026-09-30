import { join } from "node:path";
import type { EditPlan } from "../core/apply-edits";
import { deployedMarker, PHASE_POINTER } from "../core/progress";
import { isCalendarDay } from "../core/schedule";
import type { SpecFolder } from "../core/spec-folders";
import { diskReader, loadSpecState } from "../core/spec-state";
import { findPhase } from "./find-phase";
import { locatePhaseLine } from "./locate";
import { issuesIntroducedBy } from "./validate";

export interface DeployedRequest {
  phase: string;
  day: string;
}

export interface Deployed {
  plan: EditPlan;
  phaseId?: string;
}

const CODE_SPAN_CLOSE = "`";

export function planDeployed(spec: SpecFolder, request: DeployedRequest): Deployed {
  if (!isCalendarDay(request.day)) return invalid(`--date "${request.day}" is not a date; use YYYY-MM-DD`);
  const phase = findPhase(loadSpecState(spec), request.phase);
  if (typeof phase === "string") return invalid(phase);
  if (!phase.done) return invalid(`Phase ${phase.id} is not ticked; only a finished phase can be deployed`);
  if (phase.deployed) return { plan: { kind: "unchanged", reason: `Phase ${phase.id} is already marked deployed` }, phaseId: phase.id };

  const progress = diskReader(spec.dir)("progress.md") ?? "";
  const lineIndex = locatePhaseLine(progress, phase.pointer);
  const lines = progress.split("\n");
  const line = lineIndex === undefined ? undefined : lines[lineIndex];
  if (lineIndex === undefined || line === undefined) return invalid(`no progress.md line points at ${phase.pointer}`);
  lines[lineIndex] = withMarker(line, deployedMarker(request.day));

  const edits = [{ file: join(spec.dir, "progress.md"), text: lines.join("\n") }];
  const introduced = issuesIntroducedBy(spec, edits);
  if (introduced.length > 0) return invalid(introduced.map((issue) => issue.problem).join("; "));
  return { plan: { kind: "ok", edits }, phaseId: phase.id };
}

function withMarker(line: string, marker: string): string {
  const pointer = PHASE_POINTER.exec(line);
  if (!pointer) return `${line}${marker}`;
  const pointerEnd = pointer.index + pointer[0].length;
  const insertAt = line[pointerEnd] === CODE_SPAN_CLOSE ? pointerEnd + 1 : pointerEnd;
  return `${line.slice(0, insertAt)}${marker}${line.slice(insertAt)}`;
}

function invalid(reason: string): Deployed {
  return { plan: { kind: "invalid", reason } };
}
