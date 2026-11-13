import { samePhase } from "../../core/phase-title";
import { normalizePhaseHint } from "../../context/request";
import type { RecordOp } from "../../record/plan-writes";
import type { RecordView } from "../../record/view";
import type { RecordPlan } from "../../record/write";
import type { PhaseDoc } from "../docs/phase-doc";
import type { SpecDoc } from "../docs/spec-doc";
import { specPlanProblems } from "../docs/spec-plan";
import { missingPrDocs, prGroupOf } from "../docs/pr-doc";
import { phaseDocPath, prDocPath, specDocPath } from "../kinds";
import { readJoinedPlan, type JoinedPlan } from "../state-source";

// A plan change's new phase list, in order, and the line it reports at the version it lands as.
export interface PlanChange {
  phases: PhaseDoc[];
  line(version: number): string;
}

// A change to one phase's state (deployed, parks): not a plan change, so `planVersion` stays.
export interface PhaseStateChange {
  phase: PhaseDoc;
  line: string;
}

export type Edit<T> = T | { refused: string } | { unchanged: string };

export type ChangeSeen = { kind: "changed" | "unchanged"; line: string; added: PhaseDoc[] };

type See = (seen: ChangeSeen) => void;

const ignore: See = () => {};

// Re-run against every tip: ids, `planVersion + 1` and the edge checks all come from the record as it is now.
export function planChangePlan(spec: string, action: string, edit: (plan: JoinedPlan) => Edit<PlanChange>, see: See = ignore): RecordPlan {
  return (view) => {
    const plan = readJoinedPlan(view, spec);
    if (!plan) return { refused: `${spec} is not on the board` };
    const change = edit(plan);
    if ("refused" in change) return change;
    if ("unchanged" in change) return unchanged(see, change.unchanged);
    const version = plan.spec.planVersion + 1;
    const next: SpecDoc = { ...plan.spec, phases: change.phases.map((phase) => phase.id), planVersion: version };
    const introduced = newProblems(specPlanProblems(plan.spec, plan.phases), specPlanProblems(next, change.phases));
    if (introduced.length > 0) return { refused: introduced.join("; ") };
    const ops = [specOp(plan.spec, next), ...phaseOps(spec, plan.phases, change.phases), ...newGroupOps(view, plan, change.phases)];
    see({ kind: "changed", line: change.line(version), added: change.phases.filter((phase) => !plan.phases.some((old) => old.id === phase.id)) });
    return { ops, message: `record: ${action} ${spec} (plan v${version})` };
  };
}

export function phaseStatePlan(spec: string, action: string, phaseId: string, edit: (phase: PhaseDoc, plan: JoinedPlan) => Edit<PhaseStateChange>, see: See = ignore): RecordPlan {
  return (view) => {
    const plan = readJoinedPlan(view, spec);
    if (!plan) return { refused: `${spec} is not on the board` };
    const phase = findPhaseDoc(plan, phaseId);
    if (typeof phase === "string") return { refused: phase };
    const change = edit(phase, plan);
    if ("refused" in change) return change;
    if ("unchanged" in change) return unchanged(see, change.unchanged);
    see({ kind: "changed", line: change.line, added: [] });
    return { ops: phaseOps(spec, [phase], [change.phase]), message: `record: ${action} ${spec} ${phase.id}` };
  };
}

export function findPhaseDoc(plan: JoinedPlan, rawId: string): PhaseDoc | string {
  const id = normalizePhaseHint(rawId);
  return plan.phases.find((phase) => samePhase(phase.id, id)) ?? `no Phase ${id} in ${plan.spec.name}; phases: ${plan.spec.phases.join(", ")}`;
}

// Where a new phase goes: after the last phase of `base`'s family (3, 3a, 3b …), else at the end.
export function insertAfter(phases: readonly PhaseDoc[], familyIds: readonly string[], added: readonly PhaseDoc[]): PhaseDoc[] {
  const last = Math.max(-1, ...familyIds.map((id) => phases.findIndex((phase) => phase.id === id)));
  const at = last === -1 ? phases.length : last + 1;
  return [...phases.slice(0, at), ...added, ...phases.slice(at)];
}

// RFC 7386: a field the new document drops is sent as null.
export function docPatch(before: object, after: object): Record<string, unknown> {
  const was = before as Record<string, unknown>;
  const now = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(was), ...Object.keys(now)]);
  return Object.fromEntries([...keys].filter((key) => JSON.stringify(was[key]) !== JSON.stringify(now[key])).map((key) => [key, now[key] ?? null]));
}

function unchanged(see: See, line: string): { unchanged: true } {
  see({ kind: "unchanged", line, added: [] });
  return { unchanged: true };
}

function newProblems(before: readonly string[], after: readonly string[]): string[] {
  const had = new Set(before);
  return after.filter((problem) => !had.has(problem));
}

function specOp(before: SpecDoc, after: SpecDoc): RecordOp {
  return { op: "update", path: specDocPath(after.name), patch: docPatch(before, after) };
}

// Only a group the plan didn't have: a spec joined before PR documents existed gets its others at upgrade.
function newGroupOps(view: RecordView, plan: JoinedPlan, phases: readonly PhaseDoc[]): RecordOp[] {
  const known = new Set(plan.phases.filter((phase) => phase.code).map(prGroupOf));
  const has = (group: string) => known.has(group) || view.doc(prDocPath(plan.spec.name, group)) !== undefined;
  return missingPrDocs(plan.spec.name, phases, has).map((doc) => ({ op: "create", path: prDocPath(plan.spec.name, doc.group), doc }));
}

function phaseOps(spec: string, before: readonly PhaseDoc[], after: readonly PhaseDoc[]): RecordOp[] {
  return after.flatMap((phase): RecordOp[] => {
    const old = before.find((candidate) => candidate.id === phase.id);
    if (!old) return [{ op: "create", path: phaseDocPath(spec, phase.id), doc: phase }];
    const patch = docPatch(old, phase);
    return Object.keys(patch).length === 0 ? [] : [{ op: "update", path: phaseDocPath(spec, phase.id), patch }];
  });
}
