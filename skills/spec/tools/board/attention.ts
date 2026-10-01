import { isOverdue } from "../core/schedule";
import type { SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { resolvePhaseRef } from "../ready/refs";
import type { BoardInputs } from "./inputs";
import type { AttentionRow } from "./model";

export function needsYou(active: readonly SpecNode[], inputs: BoardInputs, today: string): AttentionRow[] {
  const states = active.flatMap((node) => inputs.states.get(node.spec.name) ?? []);
  return [...active.flatMap((node) => overdue(node, inputs.states.get(node.spec.name), today)), ...awaitingDeploy(states, inputs.nodes)];
}

function overdue(node: SpecNode, state: SpecState | undefined, today: string): AttentionRow[] {
  const spec = node.spec.name;
  const specRow: AttentionRow[] = node.meta.due && isOverdue(node.meta.due, today) ? [{ kind: "overdue", spec, due: node.meta.due }] : [];
  const phaseRows = (state?.phases ?? []).flatMap((phase): AttentionRow[] => {
    const due = phase.schedule.due;
    return !phase.done && due && isOverdue(due, today) ? [{ kind: "overdue", spec, phase: phase.id, due }] : [];
  });
  return [...specRow, ...phaseRows];
}

function awaitingDeploy(states: readonly SpecState[], nodes: ReadonlyMap<string, SpecNode>): AttentionRow[] {
  const waiting = new Map<string, string[]>();
  for (const state of states) {
    for (const phase of state.phases.filter((candidate) => !candidate.done)) {
      for (const ref of phase.edges.needsDeployed) {
        const resolution = resolvePhaseRef(ref, state, nodes);
        if (resolution.kind !== "ok") continue;
        for (const target of resolution.phases.filter((mark) => mark.done && !mark.deployed)) {
          const key = target.label.includes("#") ? target.label : `${state.spec.name}#${target.label}`;
          waiting.set(key, [...(waiting.get(key) ?? []), `${state.spec.name}#${phase.id}`]);
        }
      }
    }
  }
  return [...waiting].map(([key, by]) => {
    const [spec = "", phase = ""] = key.split("#");
    return { kind: "deploy", spec, phase, waiting: by };
  });
}
