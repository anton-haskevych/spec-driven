import type { Result } from "../core/result";
import type { PhaseState, SpecState } from "../core/spec-state";

// `name` is the phases' `pr:` value; undefined for a spec whose phases declare none (branch feat/<spec>).
export interface PrGroup {
  name: string | undefined;
  phases: PhaseState[];
}

export function prGroups(state: SpecState): PrGroup[] {
  const groups = new Map<string | undefined, PhaseState[]>();
  for (const phase of state.phases.filter((p) => p.code)) {
    groups.set(phase.edges.pr, [...(groups.get(phase.edges.pr) ?? []), phase]);
  }
  return [...groups.entries()].map(([name, phases]) => ({ name, phases }));
}

export function pickGroup(state: SpecState, requested: string | undefined): Result<PrGroup> {
  const groups = prGroups(state);
  const names = groups.map((group) => group.name ?? "(no pr field)").join(", ");
  const spec = state.spec.name;
  if (requested !== undefined) {
    const match = groups.find((group) => group.name?.toLowerCase() === requested.toLowerCase());
    return match ? { ok: true, value: match } : { ok: false, reason: `${spec} has no PR group ${requested} (groups: ${names || "none"})` };
  }
  if (groups.length > 1) return { ok: false, reason: `${spec} has PR groups ${names} — name one` };
  return { ok: true, value: groups[0] ?? { name: undefined, phases: [] } };
}
