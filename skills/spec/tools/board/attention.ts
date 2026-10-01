import { isOverdue } from "../core/schedule";
import type { SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { holderName } from "../claims/rules";
import type { BoardInputs } from "./inputs";
import type { AttentionRow, FlightRow } from "./model";
import { resolvedPhaseKeys, rowKey } from "./phase-keys";

export function needsYou(active: readonly SpecNode[], inputs: BoardInputs, today: string, inFlight: readonly FlightRow[]): AttentionRow[] {
  const states = active.flatMap((node) => inputs.states.get(node.spec.name) ?? []);
  return [...prAttention(inFlight), ...closedClaims(inputs, inFlight), ...active.flatMap((node) => overdue(node, inputs.states.get(node.spec.name), today)), ...awaitingDeploy(states, inputs.nodes)];
}

export function prAttention(inFlight: readonly FlightRow[]): AttentionRow[] {
  const byPr = new Map<number, AttentionRow>();
  for (const row of inFlight) {
    const attention = prVerdictRow(row);
    if (attention && "pr" in attention && !byPr.has(attention.pr)) byPr.set(attention.pr, attention);
  }
  return [...byPr.values()];
}

function prVerdictRow(row: FlightRow): AttentionRow | undefined {
  if (!row.pr || row.pr === "unknown") return undefined;
  const where = { spec: row.spec, ...(row.phase ? { phase: row.phase } : {}), ...(row.prGroup ? { prGroup: row.prGroup } : {}) };
  if (row.next === "fix CI") return { kind: "fix", ...where, pr: row.pr.number, failing: row.pr.failing ?? 0 };
  return row.next === "merge" ? { kind: "merge", ...where, pr: row.pr.number } : undefined;
}

function closedClaims(inputs: BoardInputs, inFlight: readonly FlightRow[]): AttentionRow[] {
  const shown = new Set(inFlight.map(rowKey));
  return inputs.claims
    .filter((held) => held.status === "closed" && shown.has(rowKey(held.claim)))
    .map(({ claim }) => ({ kind: "claim", spec: claim.spec, phase: claim.phase, holder: holderName(claim) }));
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
      const undeployed = resolvedPhaseKeys(phase.edges.needsDeployed, state, nodes).filter((target) => target.done && !target.deployed);
      for (const { key } of undeployed) waiting.set(key, [...(waiting.get(key) ?? []), `${state.spec.name}#${phase.id}`]);
    }
  }
  return [...waiting].map(([key, by]) => {
    const [spec = "", phase = ""] = key.split("#");
    return { kind: "deploy", spec, phase, waiting: by };
  });
}
