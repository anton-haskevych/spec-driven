import { isRecord, stringField, type FrontmatterData } from "../core/frontmatter";
import { numericPart, samePhase } from "../core/phase-title";

export type RelationType = "part-of" | "needs" | "supersedes" | "related";

export interface Relation {
  type: RelationType;
  target: string;
  phases?: string;
  note?: string;
}

const LIST_TYPES: RelationType[] = ["needs", "supersedes", "related"];
const RANGE = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/;

export function parseRelations(data: FrontmatterData): Relation[] {
  const parent = stringField(data, "part-of");
  const relations: Relation[] = parent ? [{ type: "part-of", ...parseRef(parent) }] : [];
  for (const type of LIST_TYPES) {
    for (const item of asList(data[type])) relations.push({ type, ...item });
  }
  return relations;
}

function asList(value: unknown): Array<Omit<Relation, "type">> {
  const items = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return items.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [parseRef(item.trim())];
    if (!isRecord(item)) return [];
    return Object.entries(item).map(([ref, note]) => ({ ...parseRef(ref), note: typeof note === "string" ? note : undefined }));
  });
}

export function parseRef(raw: string): { target: string; phases?: string } {
  const [target = "", phases] = raw.split("#", 2).map((part) => part.trim());
  return phases ? { target, phases } : { target };
}

export function phasesInRef(ref: string, phaseIds: readonly string[]): string[] {
  const exact = phaseIds.filter((id) => samePhase(id, ref));
  if (exact.length > 0) return exact;
  const range = RANGE.exec(ref);
  if (!range) return [];
  const from = Number(range[1]);
  const to = Number(range[2]);
  return phaseIds.filter((id) => {
    const value = numericPart(id);
    return value !== undefined && value >= from && value <= to;
  });
}
