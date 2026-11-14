import { join } from "node:path";
import type { EditPlan, FileEdit } from "../core/apply-edits";
import { removeFrontmatterLine, setFrontmatterLine, type FrontmatterPatch } from "../core/frontmatter-patch";
import type { GateKind } from "../core/gate";
import type { SpecFolder } from "../core/spec-folders";
import { diskReader, loadSpecStateFromFiles, type PhaseState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { findPhase } from "./find-phase";
import { replaceInPhaseLine } from "./progress-lines";
import { issuesIntroducedBy } from "./validate";

// A field left out is kept; `null` clears `pr` or `gate`, and `needs: []` clears the needs.
export interface PhaseFields {
  needs?: string[];
  needsDeployed?: string[];
  sameFilesAs?: string[];
  pr?: string | null;
  gate?: GateKind | null;
  title?: string;
  outcome?: string;
}

export interface SetRequest {
  phase: string;
  fields: PhaseFields;
}

export interface PlanFields {
  needs: string[];
  needsDeployed: string[];
  sameFilesAs: string[];
  pr?: string;
  gate?: GateKind;
  title: string;
  outcome: string;
}

export type PhaseSet = { kind: "ok"; plan: Extract<EditPlan, { kind: "ok" }>; phaseId: string; said: string[] } | { kind: "unchanged"; reason: string } | { kind: "invalid"; reason: string };

const HEADING = /^#\s+Phase\s+\S+\s+—\s+.*$/m;
// The Outcome paragraph: its first line and any wrapped lines up to the next blank line.
const OUTCOME = /^\*\*Outcome:\*\*.*(?:\n.+)*/m;
const LINE_TITLE = /^(\s*[-*+]\s+\[.\]\s+Phase\s+\S+\s+—\s+)(.*?)(\s+→.*)$/;

// Frontmatter for the edges, the heading and progress line for the title, the **Outcome:** line.
export function planSet(spec: SpecFolder, request: SetRequest, nodes: ReadonlyMap<string, SpecNode> = new Map()): PhaseSet {
  const phase = findPhase(loadSpecStateFromFiles(spec), request.phase);
  if (typeof phase === "string") return { kind: "invalid", reason: phase };
  if (phase.entry === undefined) return { kind: "invalid", reason: `Phase ${phase.id} points at ${phase.pointer}, which does not exist` };
  const before = fieldsOf(phase);
  const said = describeFields(before, withFields(before, request.fields));
  if (said.length === 0) return { kind: "unchanged", reason: `set: phase ${phase.id} already has those values` };

  const entry = editEntry(phase.entry, phase.id, request.fields);
  if (entry.kind === "invalid") return { kind: "invalid", reason: `Phase ${phase.id}: ${entry.reason}` };
  const edits: FileEdit[] = [{ file: join(spec.dir, phase.pointer), text: entry.text }];
  if (request.fields.title) {
    const progress = diskReader(spec.dir)("progress.md") ?? "";
    const titled = replaceInPhaseLine(progress, phase.pointer, (line) => line.replace(LINE_TITLE, `$1${request.fields.title}$3`));
    if (titled !== progress) edits.push({ file: join(spec.dir, "progress.md"), text: titled });
  }
  const introduced = issuesIntroducedBy(spec, edits, nodes);
  if (introduced.length > 0) return { kind: "invalid", reason: introduced.map((issue) => issue.problem).join("; ") };
  return { kind: "ok", plan: { kind: "ok", edits }, phaseId: phase.id, said };
}

export function withFields(before: PlanFields, fields: PhaseFields): PlanFields {
  const pr = fields.pr === undefined ? before.pr : (fields.pr ?? undefined);
  const gate = fields.gate === undefined ? before.gate : (fields.gate ?? undefined);
  return {
    needs: fields.needs ?? before.needs,
    needsDeployed: fields.needsDeployed ?? before.needsDeployed,
    sameFilesAs: fields.sameFilesAs ?? before.sameFilesAs,
    title: fields.title ?? before.title,
    outcome: fields.outcome ?? before.outcome,
    ...(pr ? { pr } : {}),
    ...(gate ? { gate } : {}),
  };
}

export function describeFields(before: PlanFields, after: PlanFields): string[] {
  const same = (key: keyof PlanFields) => JSON.stringify(before[key]) === JSON.stringify(after[key]);
  return [
    same("needs") ? undefined : after.needs.length === 0 ? "needs nothing" : `needs ${after.needs.join(", ")}`,
    same("needsDeployed") ? undefined : after.needsDeployed.length === 0 ? "needs nothing deployed" : `needs ${after.needsDeployed.join(", ")} deployed`,
    same("sameFilesAs") ? undefined : after.sameFilesAs.length === 0 ? "no same-files edge" : `same files as ${after.sameFilesAs.join(", ")}`,
    same("pr") ? undefined : after.pr ? `PR ${after.pr}` : "no PR group",
    same("gate") ? undefined : after.gate ? `gate ${after.gate}` : "no gate",
    same("title") ? undefined : `title "${after.title}"`,
    same("outcome") ? undefined : "outcome reworded",
  ].filter((part): part is string => part !== undefined);
}

function fieldsOf(phase: PhaseState): PlanFields {
  const outcome = OUTCOME.exec(phase.entry ?? "")?.[0].replace(/^\*\*Outcome:\*\*\s*/, "") ?? "";
  const { needs, needsDeployed, sameFilesAs } = phase.edges;
  return { needs, needsDeployed, sameFilesAs, title: phase.name, outcome, ...(phase.edges.pr ? { pr: phase.edges.pr } : {}), ...(phase.gate ? { gate: phase.gate } : {}) };
}

function editEntry(entry: string, id: string, fields: PhaseFields): FrontmatterPatch {
  let text = entry;
  const steps: Array<(current: string) => FrontmatterPatch> = [];
  if (fields.needs) steps.push((current) => setFrontmatterLine(current, "needs", `[${fields.needs?.join(", ")}]`));
  for (const [key, list] of [["needs-deployed", fields.needsDeployed], ["same-files-as", fields.sameFilesAs]] as const) {
    if (list) steps.push((current) => frontmatterValue(current, key, list.length === 0 ? null : `[${list.join(", ")}]`));
  }
  if (fields.pr !== undefined) steps.push((current) => frontmatterValue(current, "pr", fields.pr));
  if (fields.gate !== undefined) steps.push((current) => frontmatterValue(current, "gate", fields.gate));
  if (fields.title) steps.push((current) => ({ kind: "ok", text: HEADING.test(current) ? current.replace(HEADING, `# Phase ${id} — ${fields.title}`) : current }));
  if (fields.outcome !== undefined) steps.push((current) => (OUTCOME.test(current) ? { kind: "ok", text: current.replace(OUTCOME, `**Outcome:** ${fields.outcome}`) } : { kind: "invalid", reason: "no **Outcome:** line to reword" }));
  for (const step of steps) {
    const patched = step(text);
    if (patched.kind === "invalid") return patched;
    text = patched.text;
  }
  return { kind: "ok", text };
}

function frontmatterValue(text: string, key: string, value: string | null | undefined): FrontmatterPatch {
  return value ? setFrontmatterLine(text, key, value) : removeFrontmatterLine(text, key);
}
