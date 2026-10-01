import type { BacklogItem } from "../backlog/items";
import { compareSchedule } from "../core/schedule";
import type { SpecRow } from "./rows";

export function orderSpecs(rows: readonly SpecRow[]): SpecRow[] {
  return [...rows].sort(
    (a, b) =>
      Number(a.finished) - Number(b.finished) ||
      compareSchedule(a, b) ||
      (b.updated ?? "").localeCompare(a.updated ?? "") ||
      a.name.localeCompare(b.name),
  );
}

export function orderBacklog(items: readonly BacklogItem[]): BacklogItem[] {
  return [...items].sort((a, b) => compareSchedule(a, b) || a.slug.localeCompare(b.slug));
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
