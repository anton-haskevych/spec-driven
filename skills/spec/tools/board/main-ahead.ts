import type { Git } from "../core/git";
import type { AttentionRow } from "./model";
import type { BaseRef, BoardInputs } from "./inputs";

// The default branch only ever holds spec docs that a review, prep or spin-off committed and has yet to publish:
// a short grace for a session between its commit and its publish, then it is work only this laptop has.
export const MAIN_AHEAD_MINUTES = 30;
const MINUTE_MS = 60_000;

export interface MainAhead {
  branch: string;
  commits: number;
  since: string;
}

export type MainAheadRow = Extract<AttentionRow, { kind: "main-ahead" }>;

// From the local branch ref itself, not session documents: another session in the same checkout can't hide it.
export function mainAhead(git: Git, base: Pick<BaseRef, "branch" | "sha">): MainAhead | undefined {
  const log = git.out(["log", "--format=%cI", `${base.sha}..refs/heads/${base.branch}`]);
  if (!log.ok || !log.value) return undefined;
  const dates = log.value.split("\n").toSorted();
  return { branch: base.branch, commits: dates.length, since: dates[0] ?? "" };
}

export function mainAheadRows(inputs: Pick<BoardInputs, "mainAhead">, now: Date): MainAheadRow[] {
  const ahead = inputs.mainAhead;
  if (!ahead || now.getTime() - Date.parse(ahead.since) < MAIN_AHEAD_MINUTES * MINUTE_MS) return [];
  return [{ kind: "main-ahead", ...ahead }];
}
