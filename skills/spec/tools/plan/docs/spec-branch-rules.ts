import { phaseDocDone } from "../state-source";
import type { PhaseDoc } from "./phase-doc";
import { DEFAULT_PR_GROUP } from "./pr-doc";
import type { SpecBranch, SpecDoc } from "./spec-doc";

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

// Group names match ignoring case, as `pr:` values do everywhere.
export function shipsAloneIn(specBranch: SpecBranch | undefined, group: string | undefined): boolean {
  return group !== undefined && (specBranch?.shipAlone ?? []).some((name) => name.toLowerCase() === group.toLowerCase());
}

// A lane: a named group of a spec in spec-branch mode that doesn't ship alone. Its PR is the final PR.
export function isLaneGroup(specBranch: SpecBranch | undefined, group: string): boolean {
  return specBranch !== undefined && group !== DEFAULT_PR_GROUP && !shipsAloneIn(specBranch, group);
}

function shipAloneTest(spec: SpecDoc): (phase: PhaseDoc) => boolean {
  return (phase) => shipsAloneIn(spec.specBranch, phase.pr);
}

function crossGroupNeeds(phase: PhaseDoc, open: readonly PhaseDoc[]): string[] {
  const group = phase.pr?.toLowerCase();
  const needed = [...phase.needs, ...(phase.needsDeployed ?? [])];
  return open
    .filter((other) => needed.includes(other.id) && other.code && other.pr?.toLowerCase() !== group)
    .map((other) => `ship-alone PR group ${phase.pr} can't need phase ${other.id} of ${other.pr === undefined ? "no group" : `PR group ${other.pr}`}: its code reaches main only with the final PR`);
}
