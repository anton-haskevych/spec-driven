import { phaseDocDone } from "../state-source";
import type { PhaseDoc } from "./phase-doc";
import type { SpecDoc } from "./spec-doc";

// What keeps specLayout whole in spec-branch mode (ledger: principle-one-spec-layout): every open code phase has a
// lane, and a ship-alone group, cut from the default branch, never waits on code that only reaches feat/<spec>.
// Checked at the start and by every plan write while the mode is on; empty outside it.
export function specBranchProblems(spec: SpecDoc, phases: readonly PhaseDoc[]): string[] {
  if (!spec.specBranch) return [];
  const shipsAlone = shipAloneTest(spec);
  const open = phases.filter((phase) => !phaseDocDone(phase));
  return [
    ...open.filter((phase) => phase.code && phase.pr === undefined).map((phase) => `phase ${phase.id} has no pr: group; spec-branch mode needs one (phase set ${spec.name} ${phase.id} --pr <g>)`),
    ...phases.filter((phase) => phase.code && shipsAlone(phase)).flatMap((phase) => crossGroupNeeds(phase, open)),
  ];
}

// A phase moving into or out of a ship-alone group changes what ships alone, which is fixed when the mode starts.
export function shipAloneMoves(spec: SpecDoc, before: readonly PhaseDoc[], after: readonly PhaseDoc[]): string[] {
  if (!spec.specBranch) return [];
  const shipsAlone = shipAloneTest(spec);
  return after.flatMap((phase) => {
    const old = before.find((candidate) => candidate.id === phase.id);
    if (!old || shipsAlone(old) === shipsAlone(phase)) return [];
    const [from, to] = [old.pr ?? "none", phase.pr ?? "none"];
    return [`phase ${phase.id} can't move from PR group ${from} to ${to}: ship-alone groups are fixed while ${spec.name} is in spec-branch mode`];
  });
}

function shipAloneTest(spec: SpecDoc): (phase: PhaseDoc) => boolean {
  const alone = new Set((spec.specBranch?.shipAlone ?? []).map((group) => group.toLowerCase()));
  return (phase) => phase.pr !== undefined && alone.has(phase.pr.toLowerCase());
}

function crossGroupNeeds(phase: PhaseDoc, open: readonly PhaseDoc[]): string[] {
  const group = phase.pr?.toLowerCase();
  const needed = [...phase.needs, ...(phase.needsDeployed ?? [])];
  return open
    .filter((other) => needed.includes(other.id) && other.code && other.pr?.toLowerCase() !== group)
    .map((other) => `ship-alone PR group ${phase.pr} can't need phase ${other.id} of ${other.pr === undefined ? "no group" : `PR group ${other.pr}`}: its code reaches main only with the final PR`);
}
