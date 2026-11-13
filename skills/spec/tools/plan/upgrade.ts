import { parseFrontmatter, stringField } from "../core/frontmatter";
import { readFocusFields, readShipField } from "../core/spec-meta";
import { withoutUndefined } from "../core/read-fields";
import { RECORD_LAYOUT } from "../record/layout";
import type { RecordOp } from "../record/plan-writes";
import type { RecordPlan } from "../record/write";
import { MERGE_METHODS, type MergeMethod } from "../playbook/settings";
import { specPrNumbers } from "../pr/resolve";
import type { PhaseDoc } from "./docs/phase-doc";
import { missingPrDocs, type PrDoc, type PrState } from "./docs/pr-doc";
import { readSpecDoc, type SpecDoc } from "./docs/spec-doc";
import { prDocPath, specDocPath } from "./kinds";

// The spec fields layout 2 moves onto the record: the ones a command writes. Relations, `stale` and
// `dropped` stay in CLAUDE.md, where review and prep edit them by hand.
export type MovedFields = Pick<SpecDoc, "status" | "owner" | "focus" | "ship">;

export interface CopiedFromFiles {
  fields: MovedFields;
  prs: PrDoc[];
}

// What GitHub says about a PR number the files link.
export interface PrSeen {
  branch: string;
  state: Exclude<PrState, "not-opened">;
  headRefOid?: string;
  mergedSha?: string;
}

interface FileLinks {
  branches: Map<number, string>;
  merges: Map<number, { date: string; sha: string; method?: MergeMethod }>;
}

const PR_BRANCH_LINE = /^PR #(\d+) · (\S+)\s*$/gm;
const MERGE_LINE = /^PR #(\d+) merged (\d{4}-\d{2}-\d{2}) as ([0-9a-f]+)(?: \((\w+)\))?\.\s*$/gm;

export function specFieldsFromFiles(claudeMd: string): MovedFields {
  const parsed = parseFrontmatter(claudeMd);
  if (parsed.kind !== "ok") return {};
  const { focus, owner } = readFocusFields(parsed.data);
  return withoutUndefined({ status: stringField(parsed.data, "status"), owner, focus, ship: readShipField(parsed.data).ship });
}

export function prDocsFromFiles(spec: string, phases: readonly PhaseDoc[], prOpening: string, seen: (pr: number) => PrSeen | undefined): { prs: PrDoc[]; left: string[] } {
  const prs = missingPrDocs(spec, phases, () => false);
  const links = fileLinks(prOpening);
  const left: string[] = [];
  for (const number of specPrNumbers(prOpening).toSorted((a, b) => a - b)) {
    const github = seen(number);
    const branch = github?.branch ?? links.branches.get(number) ?? (prs.length === 1 ? prs[0]?.branch : undefined);
    const at = prs.findIndex((doc) => doc.branch === branch);
    const doc = prs[at];
    if (!doc) left.push(`PR #${number} matched no PR group of ${spec}; pr status ${spec} <group> records it`);
    else prs[at] = withPr(doc, number, github, links.merges.get(number));
  }
  return { prs, left };
}

function withPr(doc: PrDoc, number: number, github: PrSeen | undefined, merge: { date: string; sha: string; method?: MergeMethod } | undefined): PrDoc {
  const state: PrState = github?.state ?? (merge ? "merged" : "open");
  return withoutUndefined({
    group: doc.group,
    branch: doc.branch,
    state,
    number,
    headRefOid: github?.headRefOid,
    mergedAt: merge?.date,
    mergedSha: github?.mergedSha ?? merge?.sha,
    method: merge?.method,
  });
}

function fileLinks(prOpening: string): FileLinks {
  const branches = new Map([...prOpening.matchAll(PR_BRANCH_LINE)].map((match) => [Number(match[1]), match[2] ?? ""]));
  const merges = new Map(
    [...prOpening.matchAll(MERGE_LINE)].map((match) => {
      const method = MERGE_METHODS.find((candidate) => candidate === match[4]);
      return [Number(match[1]), withoutUndefined({ date: match[2] ?? "", sha: match[3] ?? "", method })] as const;
    }),
  );
  return { branches, merges };
}

// Planned at the tip like any write: a spec another session already upgraded is left alone, and a PR
// document a plan change created meanwhile is kept.
export function upgradePlan(spec: string, copied: CopiedFromFiles): RecordPlan {
  return (view) => {
    const current = readSpecDoc(view.doc(specDocPath(spec))).doc;
    if (!current) return { refused: `${spec} is not on the board` };
    if (current.layout >= RECORD_LAYOUT) return { unchanged: true };
    const prs: RecordOp[] = copied.prs.filter((doc) => view.doc(prDocPath(spec, doc.group)) === undefined).map((doc) => ({ op: "create", path: prDocPath(spec, doc.group), doc }));
    return {
      ops: [{ op: "update", path: specDocPath(spec), patch: { ...copied.fields, layout: RECORD_LAYOUT } }, ...prs],
      message: `record: upgrade ${spec} to layout ${RECORD_LAYOUT}`,
    };
  };
}
