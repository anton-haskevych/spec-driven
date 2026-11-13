import type { PrView } from "../pr/checks/types";
import type { PrRow } from "../pr/checks/rollup";
import { githubPrState, type PrObserved } from "./pr-sync";
import type { PrSeen } from "./upgrade";

export function prSeenOf(view: PrView): PrSeen {
  const state = githubPrState(view.state, view.isDraft, false);
  return { branch: view.headRefName, state: state === "ready" ? "open" : state, headRefOid: view.headRefOid, ...(view.mergeCommit ? { mergedSha: view.mergeCommit } : {}) };
}

// `green` undefined: CI wasn't read, so a green document stays green.
export function prObservedOf(view: PrView, green?: boolean): PrObserved {
  return { ...prSeenOf(view), number: view.number, state: githubPrState(view.state, view.isDraft, green) };
}

export function prObservedOfRow(row: PrRow): PrObserved {
  return {
    number: row.number,
    branch: row.branch,
    state: githubPrState(row.state, row.draft),
    ...(row.headRefOid ? { headRefOid: row.headRefOid } : {}),
    ...(row.mergeCommit ? { mergedSha: row.mergeCommit } : {}),
    ...(row.mergedAt ? { mergedAt: row.mergedAt.slice(0, 10) } : {}),
  };
}
