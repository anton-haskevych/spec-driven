import type { FrontmatterData } from "../../core/frontmatter";
import { oneOf, optionalText, requiredText, wholeNumber, withoutUndefined } from "../../core/read-fields";
import { MERGE_METHODS, type MergeMethod } from "../../playbook/settings";
import { treeName } from "../../trees/naming";
import type { PhaseDoc } from "./phase-doc";
import { readObject, type DocRead } from "./read";

export const PR_STATES = ["not-opened", "draft", "open", "green", "merged", "closed"] as const;
export type PrState = (typeof PR_STATES)[number];

// The group of a spec whose code phases declare no `pr:`; its branch is feat/<spec>.
export const DEFAULT_PR_GROUP = "default";

// One PR group of a joined spec. `headRefOid` is what an outside open or merge is matched by.
export interface PrDoc {
  group: string;
  branch: string;
  state: PrState;
  number?: number;
  headRefOid?: string;
  mergedAt?: string;
  mergedSha?: string;
  method?: MergeMethod;
}

export function readPrDoc(value: unknown): DocRead<PrDoc> {
  return readObject(value, "PR", readPrFields);
}

function readPrFields(fields: FrontmatterData, problems: string[]): PrDoc {
  const doc = withoutUndefined({
    group: requiredText(fields.group, "group", problems) ?? "",
    branch: requiredText(fields.branch, "branch", problems) ?? "",
    number: fields.number === undefined ? undefined : wholeNumber(fields.number, "number", problems, 1),
    state: fields.state === undefined ? missingState(problems) : (oneOf(fields.state, PR_STATES, "state", problems) ?? "not-opened"),
    headRefOid: optionalText(fields.headRefOid, "headRefOid", problems),
    mergedAt: optionalText(fields.mergedAt, "mergedAt", problems),
    mergedSha: optionalText(fields.mergedSha, "mergedSha", problems),
    method: oneOf(fields.method, MERGE_METHODS, "method", problems),
  });
  if (problems.length === 0 && doc.state !== "not-opened" && doc.number === undefined) problems.push(`${doc.state === "open" ? "an" : "a"} ${doc.state} PR needs its number`);
  return doc;
}

function missingState(problems: string[]): PrState {
  problems.push(`state must be one of ${PR_STATES.join(", ")}`);
  return "not-opened";
}

export function prGroupOf(phase: Pick<PhaseDoc, "pr">): string {
  return phase.pr ?? DEFAULT_PR_GROUP;
}

export function prBranch(spec: string, group: string): string {
  return treeName(spec, group === DEFAULT_PR_GROUP ? undefined : group).branch;
}

export function notOpenedPrDoc(spec: string, group: string): PrDoc {
  return { group, branch: prBranch(spec, group), state: "not-opened" };
}

// Task phases open no PR.
export function missingPrDocs(spec: string, phases: readonly PhaseDoc[], has: (group: string) => boolean): PrDoc[] {
  const groups = [...new Set(phases.filter((phase) => phase.code).map(prGroupOf))];
  return groups.filter((group) => !has(group)).map((group) => notOpenedPrDoc(spec, group));
}
