import type { SpecNode } from "../graph/nodes";
import { DEFAULT_PR_GROUP, type PrDoc } from "../plan/docs/pr-doc";
import type { AttentionRow, FlightRow } from "./model";

// One row per PR group, however many of its phases are built.
export function unopenedPrs(inFlight: readonly FlightRow[]): AttentionRow[] {
  const groups = new Map<string, Extract<AttentionRow, { kind: "open-pr" }>>();
  for (const row of inFlight) {
    if (row.next !== "built, PR not opened" || row.phase === undefined) continue;
    const key = `${row.spec}\u0000${row.prGroup ?? ""}`;
    const found = groups.get(key) ?? { kind: "open-pr", spec: row.spec, ...(row.prGroup ? { prGroup: row.prGroup } : {}), phases: [] };
    groups.set(key, { ...found, phases: [...found.phases, row.phase] });
  }
  return [...groups.values()];
}

// Every node, not only open ones: a spec whose lanes are all done reads finished while its final PR waits.
export function closedFinalPrs(nodes: readonly SpecNode[], prDocs: ReadonlyMap<string, readonly PrDoc[]>): AttentionRow[] {
  return nodes.flatMap((node): AttentionRow[] => {
    if (!node.specBranch) return [];
    const final = prDocs.get(node.spec.name)?.find((doc) => doc.group === DEFAULT_PR_GROUP);
    return final?.state === "closed" && final.number !== undefined ? [{ kind: "final-pr-closed", spec: node.spec.name, pr: final.number }] : [];
  });
}
