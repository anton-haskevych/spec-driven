import type { FrontmatterData } from "../../core/frontmatter";
import { optionalText, requiredText, stringArray, wholeNumber, withoutUndefined } from "../../core/read-fields";
import { readFocusFields, readLifecycleFields, readShipField, type FocusBand, type ShipMode } from "../../core/spec-meta";
import { readObject, type DocRead } from "./read";

// A spec on the record. Fields from `focus` on are read with the same readers as CLAUDE.md, so a value
// reads the same from a file and from the record.
export interface SpecDoc {
  name: string;
  // +1 on every change to the phase list, edges, PR groups or tasks; a tick never raises it.
  planVersion: number;
  phases: string[];
  joinedAt: string;
  joinedFrom: string;
  layout: number;
  // From layout 2: the spec's stage, as CLAUDE.md's `status:` held it before.
  status?: string;
  focus?: FocusBand;
  owner?: string;
  ship?: ShipMode;
  stale?: string;
  dropped?: string;
}

export function readSpecDoc(value: unknown): DocRead<SpecDoc> {
  return readObject(value, "spec", readSpecFields);
}

function readSpecFields(fields: FrontmatterData, problems: string[]): SpecDoc {
  if (fields.phases === undefined) problems.push("phases must be a list of phase ids");
  const focus = readFocusFields(fields);
  const ship = readShipField(fields);
  const { problems: lifecycleProblems, ...notes } = readLifecycleFields(fields);
  problems.push(...focus.problems, ...ship.problems, ...lifecycleProblems);
  return withoutUndefined({
    name: requiredText(fields.name, "name", problems) ?? "",
    planVersion: wholeNumber(fields.planVersion, "planVersion", problems, 1) ?? 1,
    phases: stringArray(fields.phases, "phases", problems),
    joinedAt: requiredText(fields.joinedAt, "joinedAt", problems) ?? "",
    joinedFrom: requiredText(fields.joinedFrom, "joinedFrom", problems) ?? "",
    layout: wholeNumber(fields.layout, "layout", problems) ?? 0,
    status: optionalText(fields.status, "status", problems),
    focus: focus.focus,
    owner: focus.owner,
    ship: ship.ship,
    ...notes,
  });
}
