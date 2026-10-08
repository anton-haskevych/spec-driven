import { numberField, stringField, stringList, type FrontmatterData } from "./frontmatter";
import { readSchedule, type Priority } from "./schedule";

export interface SpecMeta {
  area: string[];
  domain: string[];
  scope: string[];
  updated?: string;
  priority?: Priority;
  due?: string;
  focus?: number;
  owner?: string;
}

export interface FocusFields {
  focus?: number;
  owner?: string;
  problems: string[];
}

export function readSpecMeta(data: FrontmatterData): SpecMeta {
  const { priority, due } = readSchedule(data);
  const { focus, owner } = readFocusFields(data);
  return {
    area: stringList(data, "area"),
    domain: stringList(data, "domain"),
    scope: stringList(data, "scope"),
    updated: stringField(data, "updated"),
    priority,
    due,
    focus,
    owner,
  };
}

export function readFocusFields(data: FrontmatterData): FocusFields {
  const fields: FocusFields = { problems: [] };
  if (Object.hasOwn(data, "focus")) {
    const focus = numberField(data, "focus");
    if (focus !== undefined && focus >= 0) fields.focus = focus;
    else fields.problems.push(`focus ${JSON.stringify(data.focus)} is not a number ≥ 0`);
  }
  if (Object.hasOwn(data, "owner")) {
    const owner = stringField(data, "owner");
    if (owner !== undefined) fields.owner = owner;
    else fields.problems.push(`owner ${JSON.stringify(data.owner)} is not a name`);
  }
  return fields;
}
