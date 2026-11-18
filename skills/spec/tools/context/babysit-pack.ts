import type { PhaseState, SpecState } from "../core/spec-state";
import { DEFAULT_PR_GROUP, prBranch } from "../plan/docs/pr-doc";
import { branchOf, type SpecLayout } from "../pr/groups";

export interface BabysitPackInput {
  state: SpecState;
  doctor: string;
  settings?: string;
  layout?: SpecLayout;
}

interface PackGroup {
  name: string;
  branch: string;
  phases: PhaseState[];
  final: boolean;
}

const FINAL_PR_LINE = "The final PR: every phase outside the ship-alone groups ships here, from feat/<spec>. Follow babysit.md → *The final PR*.";

// `rest` after the spec is `<group> [hold]`; `hold` is a flag, never part of the group.
export function babysitPack({ state, doctor, settings, layout }: BabysitPackInput, hint: string | undefined): string {
  const words = hint?.split(/\s+/).filter(Boolean) ?? [];
  const hold = words.some((word) => word.toLowerCase() === "hold");
  const requested = words.filter((word) => word.toLowerCase() !== "hold").join(" ") || undefined;
  const spec = state.spec.name;
  const groups = [...new Set(state.phases.flatMap((phase) => (phase.edges.pr === undefined ? [] : [phase.edges.pr])))];
  const group = packGroup(state, groups, requested, layout);
  const list = groups.length > 0 ? groups.join(", ") : "none";
  if (group === undefined) return requested === undefined ? `No PR group named; its groups: ${list}. Ask which PR to babysit.` : `No PR group ${requested} in ${spec}; its groups: ${list}. Tell the user and stop.`;

  const open = group.phases.filter((phase) => !phase.done).map((phase) => phase.id);
  return [
    "Covers babysit.md's reads: the PR group's phases and the project settings. Read [babysit.md](babysit.md) now and follow it.",
    ...(hold ? ["Mode: hold-for-review (`hold`)."] : []),
    ...(settings ? [settings] : []),
    ...(group.final ? [FINAL_PR_LINE] : []),
    `### PR group ${group.name} · branch ${group.branch}\n${group.phases.map((phase) => `- [${phase.done ? "x" : " "}] ${phase.id} — ${phase.name}`).join("\n")}`,
    ...(open.length > 0 ? [`Open phases in group ${group.name}: ${open.join(", ")}. The PR isn't ready: tell the user and stop.`] : []),
    `### Doctor\n${doctor}`,
  ].join("\n\n");
}

function packGroup(state: SpecState, groups: readonly string[], requested: string | undefined, layout: SpecLayout | undefined): PackGroup | undefined {
  const spec = state.spec.name;
  if (layout?.finalPr && (requested === undefined || requested.toLowerCase() === DEFAULT_PR_GROUP)) {
    return { name: DEFAULT_PR_GROUP, branch: branchOf(layout, DEFAULT_PR_GROUP), phases: layout.finalPr.phases, final: true };
  }
  const known = groups.find((candidate) => candidate === requested);
  if (known === undefined) return undefined;
  const branch = layout ? branchOf(layout, known) : prBranch(spec, known);
  return { name: known, branch, phases: state.phases.filter((phase) => phase.edges.pr === known), final: false };
}
