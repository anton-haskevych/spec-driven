import type { Result } from "../core/result";
import type { PhaseState, SpecState } from "../core/spec-state";
import { DEFAULT_PR_GROUP, prBranch } from "../plan/docs/pr-doc";
import { shipsAloneIn } from "../plan/docs/spec-branch-rules";
import type { SpecBranch } from "../plan/docs/spec-doc";

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

// With a layout, group `default` is the final PR in spec-branch mode (and what a spec in the mode ships when no
// group is named), else the phases with no `pr:`.
export function pickGroup(state: SpecState, requested: string | undefined, layout?: SpecLayout): Result<PrGroup> {
  const isDefault = requested?.toLowerCase() === DEFAULT_PR_GROUP;
  if (layout?.finalPr && (requested === undefined || isDefault)) return { ok: true, value: { name: DEFAULT_PR_GROUP, phases: layout.finalPr.phases } };
  const groups = prGroups(state);
  const unnamed = groups.find((group) => group.name === undefined);
  if (isDefault && layout && unnamed) return { ok: true, value: unnamed };
  const names = groups.map((group) => group.name ?? "(no pr field)").join(", ");
  const spec = state.spec.name;
  if (requested !== undefined) {
    const match = groups.find((group) => group.name?.toLowerCase() === requested.toLowerCase());
    return match ? { ok: true, value: match } : { ok: false, reason: `${spec} has no PR group ${requested} (groups: ${names || "none"})` };
  }
  if (groups.length > 1) return { ok: false, reason: `${spec} has PR groups ${names} — name one` };
  return { ok: true, value: groups[0] ?? { name: undefined, phases: [] } };
}

export type GroupBase = { kind: "default" } | { kind: "spec-branch"; branch: string };

export interface GroupLayout {
  branch: string;
  base: GroupBase;
  shipsAlone: boolean;
  phases: PhaseState[];
}

// The one answer to "which branch, which base, ships alone?" (ledger: principle-one-spec-layout).
// In spec-branch mode every lane is cut from feat/<spec>, which group `default` names and the final PR ships.
export interface SpecLayout {
  spec: string;
  mode: "spec-branch" | "per-group";
  groups: Map<string, GroupLayout>;
  // Open code phases with no pr: in a spec that has groups: they have no lane.
  ungrouped: PhaseState[];
  finalPr?: { head: string; phases: PhaseState[] };
}

const DEFAULT_BASE: GroupBase = { kind: "default" };

export function specLayout(state: SpecState, specBranch?: SpecBranch): SpecLayout {
  const spec = state.spec.name;
  const named = prGroups(state).filter((group): group is PrGroup & { name: string } => group.name !== undefined);
  const ungrouped = named.length === 0 ? [] : state.phases.filter((phase) => phase.code && !phase.done && phase.edges.pr === undefined);
  if (!specBranch || named.length === 0) {
    const groups = new Map(prGroups(state).map((group) => [group.name ?? DEFAULT_PR_GROUP, layoutOf(spec, group.name ?? DEFAULT_PR_GROUP, DEFAULT_BASE, false, group.phases)]));
    return { spec, mode: "per-group", groups, ungrouped };
  }
  const head = prBranch(spec, DEFAULT_PR_GROUP);
  const groups = new Map(
    named.map((group) => {
      const shipsAlone = shipsAloneIn(specBranch, group.name);
      const base: GroupBase = shipsAlone ? DEFAULT_BASE : { kind: "spec-branch", branch: head };
      return [group.name, layoutOf(spec, group.name, base, shipsAlone, group.phases)];
    }),
  );
  const lanePhases = [...groups.values()].filter((group) => !group.shipsAlone).flatMap((group) => group.phases);
  const finalPr = { head, phases: state.phases.filter((phase) => lanePhases.includes(phase)) };
  return { spec, mode: "spec-branch", groups, ungrouped, finalPr };
}

// The one group-to-branch lookup: `default` is feat/<spec>, never treeName's feat/<spec>-pr-default.
export function branchOf(layout: SpecLayout, group: string): string {
  return layout.groups.get(group)?.branch ?? prBranch(layout.spec, group);
}

export function isFinalPrGroup(layout: SpecLayout | undefined, group: string | undefined): boolean {
  return layout?.finalPr !== undefined && group?.toLowerCase() === DEFAULT_PR_GROUP;
}

export function groupBranch(layout: SpecLayout, group: PrGroup): string {
  return branchOf(layout, group.name ?? DEFAULT_PR_GROUP);
}

// The group whose branch this is, when it is a lane: spec-branch mode, cut from feat/<spec>, not shipping alone.
export function laneOf(layout: SpecLayout, branch: string): string | undefined {
  if (layout.mode !== "spec-branch") return undefined;
  return [...layout.groups].find(([, group]) => group.branch === branch && group.base.kind === "spec-branch")?.[0];
}

// The branch a group's new tree is cut from: feat/<spec> for a lane and for the final PR itself (whose tree only ever
// takes over origin/feat/<spec>), else the default branch.
export function baseBranchOf(layout: SpecLayout | undefined, group: string | undefined, defaultBranch: string): string {
  if (layout?.finalPr && isFinalPrGroup(layout, group)) return layout.finalPr.head;
  const base = layout?.groups.get(group ?? DEFAULT_PR_GROUP)?.base;
  return base?.kind === "spec-branch" ? base.branch : defaultBranch;
}

function layoutOf(spec: string, group: string, base: GroupBase, shipsAlone: boolean, phases: PhaseState[]): GroupLayout {
  return { branch: prBranch(spec, group), base, shipsAlone, phases };
}
