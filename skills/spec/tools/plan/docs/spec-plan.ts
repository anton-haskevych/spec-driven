import type { PhaseDoc } from "./phase-doc";
import type { SpecDoc } from "./spec-doc";

// A ref to this spec's own phase: no `spec#`, and phase ids start with a digit (`3`, `2b-pre`, `9.10`).
const LOCAL_PHASE_REF = /^\d[^#]*$/;

// What no single document can check: the spec's phase list against its phase documents, local edges,
// and task ids across phases.
export function specPlanProblems(spec: SpecDoc, phases: readonly PhaseDoc[]): string[] {
  const listed = new Set(spec.phases);
  const documented = new Set(phases.map((phase) => phase.id));
  return [
    ...spec.phases.filter((id) => !documented.has(id)).map((id) => `phase ${id} is listed in spec.json but has no document`),
    ...phases.filter((phase) => !listed.has(phase.id)).map((phase) => `phase ${phase.id} has a document but is not in spec.json's phases`),
    ...phases.flatMap((phase) => unresolvedEdges(phase, listed, spec.name)),
    ...repeatedTaskIds(phases),
  ];
}

function unresolvedEdges(phase: PhaseDoc, listed: ReadonlySet<string>, spec: string): string[] {
  const edges: [string, readonly string[]][] = [
    ["needs", phase.needs],
    ["needs-deployed", phase.needsDeployed ?? []],
    ["same-files-as", phase.sameFilesAs ?? []],
  ];
  return edges.flatMap(([kind, refs]) =>
    refs.filter((ref) => LOCAL_PHASE_REF.test(ref) && !listed.has(ref)).map((ref) => `phase ${phase.id} ${kind} ${ref}, which is not a phase of ${spec}`),
  );
}

function repeatedTaskIds(phases: readonly PhaseDoc[]): string[] {
  const owners = new Map<string, string[]>();
  for (const phase of phases) {
    for (const id of new Set(phase.tasks.map((task) => task.id))) owners.set(id, [...(owners.get(id) ?? []), phase.id]);
  }
  return [...owners].filter(([, ids]) => ids.length > 1).map(([id, ids]) => `task id ${id} is in phases ${ids.join(" and ")}`);
}
