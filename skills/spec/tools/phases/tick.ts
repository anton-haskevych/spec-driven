import { join } from "node:path";
import type { EditPlan, FileEdit } from "../core/apply-edits";
import { formatTickedItem, hasEvidence } from "../core/checkbox";
import { isGateItem } from "../core/gate";
import { countCheckboxes } from "../core/progress";
import type { SpecFolder } from "../core/spec-folders";
import { diskReader, loadSpecState, type PhaseState } from "../core/spec-state";
import { findPhase } from "./find-phase";
import { locateOpenItem } from "./locate";
import { tickPhaseLine } from "./progress-lines";
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

export function planTick(spec: SpecFolder, request: TickRequest): Tick {
  const state = loadSpecState(spec);
  const phase = findPhase(state, request.phase);
  if (typeof phase === "string") return invalid(phase);
  if (phase.entry === undefined) return invalid(`Phase ${phase.id} points at ${phase.pointer}, which does not exist`);

  const location = locateOpenItem(phase.entry, request.selector);
  if (location.kind === "invalid") return invalid(location.reason);

  const evidenceProblem = checkEvidence(phase, location.text, request.evidence);
  if (evidenceProblem) return invalid(evidenceProblem);

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

// A task phase's items and any Gate: item are ticked with evidence: an approval box can't be ticked by a prefix match.
function checkEvidence(phase: PhaseState, item: string, evidence: string | undefined): string | undefined {
  const gate = isGateItem(item);
  if (phase.code && !gate) return undefined;
  if (evidence === undefined && gate) return `"${item}" records an approval; tick it with --evidence "<who approved, when>"`;
  if (evidence === undefined) return `Phase ${phase.id} is a task phase; tick it with --evidence <link, date or file>`;
  if (!hasEvidence(evidence)) return `"${evidence}" is not evidence; give a link, a date (YYYY-MM-DD) or a file path`;
  return undefined;
}

function progressFlip(spec: SpecFolder, phase: PhaseState): FileEdit[] {
  if (phase.done) return [];
  const progress = diskReader(spec.dir)("progress.md") ?? "";
  return [{ file: join(spec.dir, "progress.md"), text: tickPhaseLine(progress, phase.pointer) }];
}

function invalid(reason: string): Tick {
  return { plan: { kind: "invalid", reason }, phaseComplete: false };
}
