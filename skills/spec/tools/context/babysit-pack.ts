import type { SpecState } from "../core/spec-state";
import { treeName } from "../trees/naming";

export interface BabysitPackInput {
  state: SpecState;
  doctor: string;
  settings?: string;
}

export function babysitPack({ state, doctor, settings }: BabysitPackInput, group: string | undefined): string {
  const spec = state.spec.name;
  const groups = [...new Set(state.phases.flatMap((phase) => (phase.edges.pr === undefined ? [] : [phase.edges.pr])))];
  const known = groups.find((candidate) => candidate === group);
  const list = groups.length > 0 ? groups.join(", ") : "none";
  if (known === undefined) return group === undefined ? `No PR group named; its groups: ${list}. Ask which PR to babysit.` : `No PR group ${group} in ${spec}; its groups: ${list}. Tell the user and stop.`;

  const phases = state.phases.filter((phase) => phase.edges.pr === known);
  const open = phases.filter((phase) => !phase.done).map((phase) => phase.id);
  return [
    "Covers babysit.md's reads: the PR group's phases and the project settings. Read [babysit.md](babysit.md) now and follow it.",
    ...(settings ? [settings] : []),
    `### PR group ${known} · branch ${treeName(spec, known).branch}\n${phases.map((phase) => `- [${phase.done ? "x" : " "}] ${phase.id} — ${phase.name}`).join("\n")}`,
    ...(open.length > 0 ? [`Open phases in group ${known}: ${open.join(", ")}. The PR isn't ready: tell the user and stop.`] : []),
    `### Doctor\n${doctor}`,
  ].join("\n\n");
}
