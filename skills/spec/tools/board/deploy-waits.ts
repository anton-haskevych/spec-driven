import type { SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { resolvedPhaseKeys, rowKey } from "./phase-keys";

export interface DeployWait {
  waiter: string;
  target: string;
}

export function deployWaits(states: readonly SpecState[], nodes: ReadonlyMap<string, SpecNode>): DeployWait[] {
  return states.flatMap((state) =>
    state.phases
      .filter((phase) => !phase.done)
      .flatMap((phase) =>
        resolvedPhaseKeys(phase.edges.needsDeployed, state, nodes)
          .filter((target) => target.done && !target.deployed)
          .map(({ key }) => ({ waiter: rowKey({ spec: state.spec.name, phase: phase.id }), target: key })),
      ),
  );
}
