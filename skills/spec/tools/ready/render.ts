import type { SpecState } from "../core/spec-state";
import { isWip, type ReadySet } from "./ready-set";

export function renderReadySet(set: ReadySet): string {
  const ready = set.ready.map((phase) => `${phase.id} ${phase.name}${isWip(phase) ? " (in progress)" : ""}`);
  const head = `Ready now: ${ready.length > 0 ? ready.join(" · ") : "none"}`;
  if (!set.edgesDeclared) {
    const rest = set.waiting.length > 0 ? `\nWaiting: the other ${set.waiting.length} open phases, in progress.md order` : "";
    return `${head}${rest}\n(No phase file declares needs / same-files-as yet, so the order is linear.)`;
  }
  const lines = set.waiting.map((wait) => `Waiting: ${wait.phase.id} ${wait.phase.name}: ${wait.reasons.join("; ")}`);
  return [head, ...lines].join("\n");
}

export function renderPrGroups(state: SpecState): string {
  const groups = new Map<string, string[]>();
  for (const phase of state.phases) {
    const key = phase.edges.pr ?? "(no pr field)";
    groups.set(key, [...(groups.get(key) ?? []), `${phase.id}${phase.done ? " ✓" : ""}`]);
  }
  return [...groups.entries()].map(([pr, ids]) => `PR ${pr}: phases ${ids.join(", ")}`).join("\n");
}
