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
