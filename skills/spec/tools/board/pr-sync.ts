import type { PrRow } from "../pr/checks/rollup";
import type { PrDoc } from "../plan/docs/pr-doc";
import { prObservedOfRow } from "../plan/pr-observed";
import { prDocAfter, type PrSighting } from "../plan/pr-sync";

export interface BoardPrDocs {
  // Spec → its PR documents as GitHub now has them; only specs on layout 2.
  docs: Map<string, PrDoc[]>;
  // The documents that differ from GitHub, to write back.
  sightings: PrSighting[];
}

export function boardPrDocs(specs: readonly string[], prs: (spec: string) => readonly PrDoc[] | undefined, rows: readonly PrRow[]): BoardPrDocs {
  const docs = new Map<string, PrDoc[]>();
  const sightings: PrSighting[] = [];
  for (const spec of specs) {
    const current = prs(spec);
    if (!current) continue;
    docs.set(
      spec,
      current.map((doc) => {
        const found = rowForDoc(doc, rows);
        const seen = found ? prObservedOfRow(found) : undefined;
        const after = seen ? prDocAfter(doc, seen) : undefined;
        if (seen && after) sightings.push({ spec, seen });
        return after ?? doc;
      }),
    );
  }
  return { docs, sightings };
}

// A branch can carry a closed PR and a newer one: the open one is the group's, else the newest.
export function rowForDoc(doc: PrDoc, rows: readonly PrRow[]): PrRow | undefined {
  const candidates = rows.filter((row) => row.branch === doc.branch || (doc.headRefOid !== undefined && row.headRefOid === doc.headRefOid));
  const open = candidates.find((row) => row.state === "OPEN");
  return open ?? candidates.toSorted((a, b) => b.number - a.number)[0];
}
