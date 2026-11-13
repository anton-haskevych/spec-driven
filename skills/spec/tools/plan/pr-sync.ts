import { withoutUndefined } from "../core/read-fields";
import type { MergeMethod } from "../playbook/settings";
import type { RecordOp } from "../record/plan-writes";
import type { RecordView } from "../record/view";
import type { RecordPlan } from "../record/write";
import { readPrDoc, type PrDoc, type PrState } from "./docs/pr-doc";
import { readSpecDoc } from "./docs/spec-doc";
import { prDocPath, prDocsFolder, specDocPath } from "./kinds";

// `branch` and `headRefOid` find the PR group; the rest is copied onto its document.
export interface PrObserved {
  number: number;
  branch: string;
  state: Exclude<PrState, "not-opened">;
  headRefOid?: string;
  mergedAt?: string;
  mergedSha?: string;
  method?: MergeMethod;
}

export interface PrSighting {
  spec: string;
  seen: PrObserved;
}

const SYNCED = ["number", "state", "headRefOid", "mergedAt", "mergedSha", "method"] as const;

export function githubPrState(state: string, isDraft: boolean, green: boolean): PrObserved["state"] {
  if (state === "MERGED") return "merged";
  if (state === "CLOSED") return "closed";
  if (isDraft) return "draft";
  return green ? "green" : "open";
}

// A merged PR comes from its own state and head, never from ancestry: a squash merge isn't an ancestor.
export function prDocAfter(doc: PrDoc, seen: PrObserved): PrDoc | undefined {
  const base: PrDoc = seen.number === doc.number ? doc : { group: doc.group, branch: doc.branch, state: doc.state };
  const after: PrDoc = withoutUndefined({ ...base, ...Object.fromEntries(SYNCED.map((key) => [key, seen[key] ?? base[key]])) });
  const same = Object.keys(after).length === Object.keys(doc).length && SYNCED.every((key) => after[key] === doc[key]);
  return same ? undefined : after;
}

export function matchPrDoc(docs: readonly PrDoc[], seen: Pick<PrObserved, "branch" | "headRefOid">): PrDoc | undefined {
  return docs.find((doc) => doc.branch === seen.branch) ?? docs.find((doc) => doc.headRefOid !== undefined && doc.headRefOid === seen.headRefOid);
}

export function readSpecPrDocs(view: RecordView, spec: string): PrDoc[] {
  const folder = prDocsFolder(spec);
  return view.paths().flatMap((path) => {
    if (!path.startsWith(folder) || path.slice(folder.length).includes("/")) return [];
    const doc = readPrDoc(view.doc(path)).doc;
    return doc ? [doc] : [];
  });
}

// Planned at the tip, so an open or merge someone else recorded meanwhile is compared, not overwritten blind.
export function prSyncPlan(sightings: readonly PrSighting[]): RecordPlan {
  return (view) => {
    const ops: RecordOp[] = [];
    for (const { spec, seen } of sightings) {
      if (!readSpecDoc(view.doc(specDocPath(spec))).doc) return { refused: `${spec} is not on the board` };
      const doc = matchPrDoc(readSpecPrDocs(view, spec), seen);
      if (!doc) return { refused: `PR #${seen.number} (${seen.branch}) matches no PR group of ${spec}` };
      const after = prDocAfter(doc, seen);
      if (after) ops.push({ op: "replace", path: prDocPath(spec, doc.group), doc: after });
    }
    return ops.length === 0 ? { unchanged: true } : { ops, message: messageOf(sightings) };
  };
}

function messageOf(sightings: readonly PrSighting[]): string {
  const [first, ...rest] = sightings;
  if (!first || rest.length > 0) return `record: ${sightings.length} PRs synced from GitHub`;
  return `record: PR #${first.seen.number} of ${first.spec} is ${first.seen.state}`;
}
