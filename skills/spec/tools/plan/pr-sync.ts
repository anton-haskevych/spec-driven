import { withoutUndefined } from "../core/read-fields";
import type { MergeMethod } from "../playbook/settings";
import type { RecordOp } from "../record/plan-writes";
import type { RecordView } from "../record/view";
import type { RecordPlan } from "../record/write";
import { DEFAULT_PR_GROUP, readPrDoc, type PrDoc, type PrState } from "./docs/pr-doc";
import { isLaneGroup } from "./docs/spec-branch-rules";
import { readSpecDoc, type SpecDoc } from "./docs/spec-doc";
import { prDocPath, prDocsFolder, specDocPath } from "./kinds";

// `ready`: open, with CI not read; a green document stays green while its PR and head are the same.
export type PrSeenState = Exclude<PrState, "not-opened"> | "ready";

// `branch` and `headRefOid` find the PR group; the rest is copied onto its document.
export interface PrObserved {
  number: number;
  branch: string;
  state: PrSeenState;
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

export function githubPrState(state: string, isDraft: boolean, green?: boolean): PrSeenState {
  if (state === "MERGED") return "merged";
  if (state === "CLOSED") return "closed";
  if (isDraft) return "draft";
  if (green === undefined) return "ready";
  return green ? "green" : "open";
}

// A merged PR comes from its own state and head, never from ancestry: a squash merge isn't an ancestor.
export function prDocAfter(doc: PrDoc, seen: PrObserved): PrDoc | undefined {
  const base: PrDoc = seen.number === doc.number ? doc : { group: doc.group, branch: doc.branch, state: doc.state };
  const synced = { ...seen, state: stateAfter(doc, seen) };
  const after: PrDoc = withoutUndefined({ ...base, ...Object.fromEntries(SYNCED.map((key) => [key, synced[key] ?? base[key]])) });
  const same = Object.keys(after).length === Object.keys(doc).length && SYNCED.every((key) => after[key] === doc[key]);
  return same ? undefined : after;
}

function stateAfter(doc: PrDoc, seen: PrObserved): PrState {
  if (seen.state !== "ready") return seen.state;
  const sameHead = doc.number === seen.number && doc.headRefOid !== undefined && doc.headRefOid === seen.headRefOid;
  return doc.state === "green" && sameHead ? "green" : "open";
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
    let ended = false;
    for (const { spec, seen } of sightings) {
      const specDoc = readSpecDoc(view.doc(specDocPath(spec))).doc;
      if (!specDoc) return { refused: `${spec} is not on the board` };
      const docs = readSpecPrDocs(view, spec);
      const doc = matchPrDoc(docs, seen);
      if (!doc) return { refused: `PR #${seen.number} (${seen.branch}) matches no PR group of ${spec}` };
      const after = prDocAfter(doc, seen);
      if (after) ops.push({ op: "replace", path: prDocPath(spec, doc.group), doc: after });
      const modeEnd = modeEndOps(specDoc, docs, after ?? doc);
      ended ||= modeEnd.length > 0;
      ops.push(...modeEnd);
    }
    return ops.length === 0 ? { unchanged: true } : { ops, message: `${messageOf(sightings)}${ended ? " · spec-branch mode ended" : ""}` };
  };
}

// The final PR merged: every lane's work shipped in it, so each lane document becomes that merge (stage, cards and
// prune read their own lane's document, mode on or off) and the mode ends in the same write, whoever merged.
// A closed final PR keeps the mode: a reopen or a new PR from feat/<spec> still ships it.
function modeEndOps(spec: SpecDoc, docs: readonly PrDoc[], final: PrDoc): RecordOp[] {
  if (!spec.specBranch || final.group !== DEFAULT_PR_GROUP || final.state !== "merged") return [];
  const lanes = docs.filter((doc) => isLaneGroup(spec.specBranch, doc.group));
  return [
    ...lanes.flatMap((lane): RecordOp[] => {
      const merged = laneMergedBy(lane, final);
      return sameDoc(lane, merged) ? [] : [{ op: "replace", path: prDocPath(spec.name, lane.group), doc: merged }];
    }),
    { op: "update", path: specDocPath(spec.name), patch: { specBranch: null } },
  ];
}

// The final PR's head stays off the lane: a later sighting matched by head belongs to the final PR's document.
function laneMergedBy(lane: PrDoc, final: PrDoc): PrDoc {
  return withoutUndefined({ group: lane.group, branch: lane.branch, state: final.state, number: final.number, mergedAt: final.mergedAt, mergedSha: final.mergedSha, method: final.method });
}

function sameDoc(a: PrDoc, b: PrDoc): boolean {
  const keys = Object.keys(a) as Array<keyof PrDoc>;
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

function messageOf(sightings: readonly PrSighting[]): string {
  const [first, ...rest] = sightings;
  if (!first || rest.length > 0) return `record: ${sightings.length} PRs synced from GitHub`;
  return `record: PR #${first.seen.number} of ${first.spec} is ${first.seen.state}`;
}
