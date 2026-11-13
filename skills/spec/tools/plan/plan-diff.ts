import type { JoinedPlan } from "./state-source";

// What a session needs to remember of a plan to tell, later, what changed in it: the record keeps no
// history to diff an old version against.
export interface PlanShape {
  version: number;
  phases: PhaseShape[];
}

export interface PhaseShape {
  id: string;
  pr?: string;
  needs: string[];
  tasks: string[];
}

const MAX_CHANGES = 5;

export function planShapeOf(plan: JoinedPlan): PlanShape {
  return {
    version: plan.spec.planVersion,
    phases: plan.phases.map((phase) => ({ id: phase.id, ...(phase.pr ? { pr: phase.pr } : {}), needs: [...phase.needs], tasks: phase.tasks.map((task) => task.id) })),
  };
}

export function planChangedLine(from: PlanShape, to: PlanShape): string | undefined {
  if (from.version === to.version) return undefined;
  const changes = planChanges(from, to);
  const shown = changes.length === 0 ? ["plan edited"] : changes.slice(0, MAX_CHANGES);
  const more = changes.length > MAX_CHANGES ? [`+${changes.length - MAX_CHANGES} more`] : [];
  return `Plan changed since this session loaded it (v${from.version} → v${to.version}): ${[...shown, ...more].join(" · ")}`;
}

export function planChanges(from: PlanShape, to: PlanShape): string[] {
  const before = new Map(from.phases.map((phase) => [phase.id, phase]));
  const homeBefore = taskHomes(from);
  const kept = to.phases.filter((phase) => before.has(phase.id));
  return [
    ...to.phases.filter((phase) => !before.has(phase.id)).map((phase) => newPhaseLine(phase, homeBefore)),
    ...from.phases.filter((phase) => !to.phases.some((each) => each.id === phase.id)).map((phase) => `phase ${phase.id} removed`),
    ...kept.flatMap((phase) => prLine(before.get(phase.id), phase)),
    ...movedTaskLines(kept, homeBefore),
    ...kept.flatMap((phase) => addedTaskLine(phase, homeBefore)),
    ...removedTaskLines(from, taskHomes(to)),
    ...kept.flatMap((phase) => needsLine(before.get(phase.id), phase)),
  ];
}

function taskHomes(shape: PlanShape): Map<string, string> {
  return new Map(shape.phases.flatMap((phase) => phase.tasks.map((id): [string, string] => [id, phase.id])));
}

// A new phase holding tasks that were another phase's is that phase split.
function newPhaseLine(phase: PhaseShape, homeBefore: Map<string, string>): string {
  const source = phase.tasks.map((id) => homeBefore.get(id)).find((home) => home !== undefined);
  return source ? `phase ${source} split into ${source} and ${phase.id}` : `phase ${phase.id} added`;
}

function prLine(before: PhaseShape | undefined, phase: PhaseShape): string[] {
  if (!before || before.pr === phase.pr) return [];
  return [phase.pr ? `phase ${phase.id} moved to PR ${phase.pr}` : `phase ${phase.id} left PR ${before.pr}`];
}

function movedTaskLines(kept: readonly PhaseShape[], homeBefore: Map<string, string>): string[] {
  return kept.flatMap((phase) => {
    const arrived = phase.tasks.filter((id) => {
      const home = homeBefore.get(id);
      return home !== undefined && home !== phase.id;
    });
    return arrived.length === 0 ? [] : [`${arrived.join(", ")} moved to phase ${phase.id}`];
  });
}

function addedTaskLine(phase: PhaseShape, homeBefore: Map<string, string>): string[] {
  const added = phase.tasks.filter((id) => !homeBefore.has(id));
  return added.length === 0 ? [] : [`${added.join(", ")} added to phase ${phase.id}`];
}

function removedTaskLines(from: PlanShape, homeAfter: Map<string, string>): string[] {
  const gone = from.phases.flatMap((phase) => phase.tasks).filter((id) => !homeAfter.has(id));
  return gone.length === 0 ? [] : [`${gone.join(", ")} removed`];
}

function needsLine(before: PhaseShape | undefined, phase: PhaseShape): string[] {
  if (!before || before.needs.join(",") === phase.needs.join(",")) return [];
  return [phase.needs.length === 0 ? `phase ${phase.id} needs nothing now` : `phase ${phase.id} now needs ${phase.needs.join(", ")}`];
}
