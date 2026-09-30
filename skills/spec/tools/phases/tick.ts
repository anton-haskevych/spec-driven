import { join } from "node:path";
import type { EditPlan, FileEdit } from "../core/apply-edits";
import { formatTickedItem, hasEvidence } from "../core/checkbox";
import { samePhase } from "../core/phase-title";
import { countCheckboxes } from "../core/progress";
import type { SpecFolder } from "../core/spec-folders";
import { diskReader, loadSpecState, type PhaseState } from "../core/spec-state";
import { normalizePhaseHint } from "../context/request";
import { locateOpenItem, locatePhaseLine } from "./locate";
import { issuesIntroducedBy } from "./validate";

export interface TickRequest {
  phase: string;
  selector: string;
  evidence?: string;
}

export interface Tick {
  plan: EditPlan;
  phaseId?: string;
  item?: string;
  phaseComplete: boolean;
}

const OPEN_BOX = "[ ]";
const TICKED_BOX = "[x]";

export function planTick(spec: SpecFolder, request: TickRequest): Tick {
  const state = loadSpecState(spec);
  const id = normalizePhaseHint(request.phase);
  const phase = state.phases.find((candidate) => samePhase(candidate.id, id));
  if (!phase) return invalid(`no Phase ${id} in ${spec.name}; phases: ${state.phases.map((p) => p.id).join(", ")}`);
  if (phase.entry === undefined) return invalid(`Phase ${phase.id} points at ${phase.pointer}, which does not exist`);

  const evidenceProblem = checkEvidence(phase, request.evidence);
  if (evidenceProblem) return invalid(evidenceProblem);

  const location = locateOpenItem(phase.entry, request.selector);
  if (location.kind === "invalid") return invalid(location.reason);

  const lines = phase.entry.split("\n");
  lines[location.line] = formatTickedItem(lines[location.line] ?? "", request.evidence);
  const entry = lines.join("\n");
  const phaseComplete = countCheckboxes(entry).unchecked === 0;

  const edits: FileEdit[] = [{ file: join(spec.dir, phase.pointer), text: entry }];
  if (phaseComplete) edits.push(...progressFlip(spec, phase));

  const introduced = issuesIntroducedBy(spec, edits);
  if (introduced.length > 0) return invalid(introduced.map((issue) => issue.problem).join("; "));
  return { plan: { kind: "ok", edits }, phaseId: phase.id, item: location.text, phaseComplete };
}

function checkEvidence(phase: PhaseState, evidence: string | undefined): string | undefined {
  if (phase.code) return undefined;
  if (evidence === undefined) return `Phase ${phase.id} is a task phase; tick it with --evidence <link, date or file>`;
  if (!hasEvidence(evidence)) return `"${evidence}" is not evidence; give a link, a date (YYYY-MM-DD) or a file path`;
  return undefined;
}

function progressFlip(spec: SpecFolder, phase: PhaseState): FileEdit[] {
  const progress = diskReader(spec.dir)("progress.md") ?? "";
  const lineIndex = locatePhaseLine(progress, phase.pointer);
  if (lineIndex === undefined || phase.done) return [];
  const lines = progress.split("\n");
  lines[lineIndex] = (lines[lineIndex] ?? "").replace(OPEN_BOX, TICKED_BOX);
  return [{ file: join(spec.dir, "progress.md"), text: lines.join("\n") }];
}

function invalid(reason: string): Tick {
  return { plan: { kind: "invalid", reason }, phaseComplete: false };
}
