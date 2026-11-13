import type { FrontmatterData } from "../core/frontmatter";
import { oneOf, optionalText, requiredText, withoutUndefined } from "../core/read-fields";
import { readSchedule, type Priority } from "../core/schedule";
import { readObject, type DocRead } from "../plan/docs/read";

export const TAG_KINDS = ["customer", "area", "other"] as const;
export type TagKind = (typeof TAG_KINDS)[number];

// The detail behind a tag a card carries; a card's tag needs no document of its own.
export interface TagDoc {
  name: string;
  kind: TagKind;
  priority?: Priority;
  summary?: string;
}

export function readTagDoc(value: unknown): DocRead<TagDoc> {
  return readObject(value, "tag", readTagFields);
}

function readTagFields(fields: FrontmatterData, problems: string[]): TagDoc {
  const schedule = readSchedule({ priority: fields.priority });
  problems.push(...schedule.problems);
  return withoutUndefined({
    name: requiredText(fields.name, "name", problems) ?? "",
    kind: oneOf(fields.kind, TAG_KINDS, "kind", problems) ?? "other",
    priority: schedule.priority,
    summary: optionalText(fields.summary, "summary", problems),
  });
}
