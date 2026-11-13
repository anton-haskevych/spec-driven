import type { PrView } from "../pr/checks/types";
import type { PrRow } from "../pr/checks/rollup";
import type { PrDoc } from "./docs/pr-doc";
import { githubPrState, type PrObserved } from "./pr-sync";
import type { PrSeen } from "./upgrade";

export function prSeenOf(view: PrView): PrSeen {
  return { branch: view.headRefName, state: githubPrState(view.state, view.isDraft, false), headRefOid: view.headRefOid, ...(view.mergeCommit ? { mergedSha: view.mergeCommit } : {}) };
}

export function prObservedOf(view: PrView, green: boolean): PrObserved {
  return { ...prSeenOf(view), number: view.number, state: githubPrState(view.state, view.isDraft, green) };
}

// The board's lists carry no verdict: an open PR keeps its green until its head moves.
export function prObservedOfRow(row: PrRow, doc: PrDoc): PrObserved {
  const stillGreen = doc.state === "green" && doc.number === row.number && doc.headRefOid !== undefined && doc.headRefOid === row.headRefOid;
  return {
    number: row.number,
    branch: row.branch,
    state: githubPrState(row.state, row.draft, stillGreen),
    ...(row.headRefOid ? { headRefOid: row.headRefOid } : {}),
    ...(row.mergeCommit ? { mergedSha: row.mergeCommit } : {}),
    ...(row.mergedAt ? { mergedAt: row.mergedAt.slice(0, 10) } : {}),
  };
}
