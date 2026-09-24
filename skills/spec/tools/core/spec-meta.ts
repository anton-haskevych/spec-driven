import { stringField, stringList, type FrontmatterData } from "./frontmatter";
import { readSchedule, type Priority } from "./schedule";

export interface SpecMeta {
  area: string[];
  domain: string[];
  scope: string[];
  updated?: string;
  priority?: Priority;
  due?: string;
}

export function readSpecMeta(data: FrontmatterData): SpecMeta {
  const { priority, due } = readSchedule(data);
  return {
    area: stringList(data, "area"),
    domain: stringList(data, "domain"),
    scope: stringList(data, "scope"),
    updated: stringField(data, "updated"),
    priority,
    due,
  };
}
