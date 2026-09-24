import type { BacklogItem } from "../backlog/items";
import { priorityRank } from "../core/schedule";
import type { SpecRow } from "./rows";

const NO_DUE = "9999-99-99";

export function orderSpecs(rows: readonly SpecRow[]): SpecRow[] {
  return [...rows].sort(
    (a, b) =>
      Number(a.finished) - Number(b.finished) ||
      priorityRank(a.priority) - priorityRank(b.priority) ||
      (a.due ?? NO_DUE).localeCompare(b.due ?? NO_DUE) ||
      (b.updated ?? "").localeCompare(a.updated ?? "") ||
      a.name.localeCompare(b.name),
  );
}

export function orderBacklog(items: readonly BacklogItem[]): BacklogItem[] {
  return [...items].sort(
    (a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) ||
      (a.due ?? NO_DUE).localeCompare(b.due ?? NO_DUE) ||
      a.slug.localeCompare(b.slug),
  );
}

export function matchesSpec(row: SpecRow, filter: string): boolean {
  const values = [row.status, row.priority, ...row.area, ...row.domain, ...row.scope];
  return matchesValue(values, filter) || includesText([row.name], filter);
}

export function matchesItem(item: BacklogItem, filter: string): boolean {
  return matchesValue([item.priority, ...item.tags], filter) || includesText([item.slug, item.title], filter);
}

function matchesValue(values: ReadonlyArray<string | undefined>, filter: string): boolean {
  const wanted = filter.toLowerCase();
  return values.some((value) => value?.toLowerCase() === wanted);
}

function includesText(texts: readonly string[], filter: string): boolean {
  const wanted = filter.toLowerCase();
  return texts.some((text) => text.toLowerCase().includes(wanted));
}
