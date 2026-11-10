import type { SpecState } from "../core/spec-state";
import { treeName } from "../trees/naming";

export interface BabysitPackInput {
  state: SpecState;
  doctor: string;
  settings?: string;
}

// `rest` after the spec is `<group> [hold]`; `hold` is a flag, never part of the group.
export function babysitPack({ state, doctor, settings }: BabysitPackInput, hint: string | undefined): string {
  const words = hint?.split(/\s+/).filter(Boolean) ?? [];
  const hold = words.some((word) => word.toLowerCase() === "hold");
  const group = words.filter((word) => word.toLowerCase() !== "hold").join(" ") || undefined;
  const spec = state.spec.name;
  const groups = [...new Set(state.phases.flatMap((phase) => (phase.edges.pr === undefined ? [] : [phase.edges.pr])))];
  const known = groups.find((candidate) => candidate === group);
  const list = groups.length > 0 ? groups.join(", ") : "none";
  if (known === undefined) return group === undefined ? `No PR group named; its groups: ${list}. Ask which PR to babysit.` : `No PR group ${group} in ${spec}; its groups: ${list}. Tell the user and stop.`;

  const phases = state.phases.filter((phase) => phase.edges.pr === known);
  const open = phases.filter((phase) => !phase.done).map((phase) => phase.id);
  return [
    "Covers babysit.md's reads: the PR group's phases and the project settings. Read [babysit.md](babysit.md) now and follow it.",
    ...(hold ? ["Mode: hold-for-review (`hold`)."] : []),
    ...(settings ? [settings] : []),
    `### PR group ${known} · branch ${treeName(spec, known).branch}\n${phases.map((phase) => `- [${phase.done ? "x" : " "}] ${phase.id} — ${phase.name}`).join("\n")}`,
    ...(open.length > 0 ? [`Open phases in group ${known}: ${open.join(", ")}. The PR isn't ready: tell the user and stop.`] : []),
    `### Doctor\n${doctor}`,
  ].join("\n\n");
}
