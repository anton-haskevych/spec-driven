import type { Git } from "../core/git";
import { leasePush, NETWORK } from "../core/remote-push";
import type { Result } from "../core/result";
import type { Published } from "./publish";
import { pushBranch, SAVE } from "./push";

export interface LaneRef {
  spec: string;
  branch: string;
  specBranch: string;
  defaultBranch: string;
}

export type LaneMerge =
  | { kind: "refused"; reason: string }
  | { kind: "conflict"; with: string; paths: string[] }
  | { kind: "merged"; specBranch: number; main: number };

export type LanePush =
  | { kind: "refused"; reason: string }
  | { kind: "moved" }
  | { kind: "pushed"; commits: number; docs?: Result<Published> };

// The spec branch first, then main: main reaches the spec branch only through a lane, gated in its tree
// (ledger: decision-main-reaches-the-spec-branch-through-lanes).
export function mergeLane(git: Git, lane: LaneRef): LaneMerge {
  const blocked = notReady(git);
  if (blocked) return { kind: "refused", reason: blocked };
  const fetched = git.out(["fetch", "-q", "origin", lane.specBranch, lane.defaultBranch], NETWORK);
  if (!fetched.ok) return { kind: "refused", reason: `fetching ${lane.specBranch} and ${lane.defaultBranch} failed (${fetched.reason})` };
  const counts: number[] = [];
  for (const name of [lane.specBranch, lane.defaultBranch]) {
    const merged = mergeIn(git, name);
    if (typeof merged !== "number") return merged;
    counts.push(merged);
  }
  return { kind: "merged", specBranch: counts[0] ?? 0, main: counts[1] ?? 0 };
}

// The lane goes to its own name first, so nothing is lost when the spec branch moved. The lease is a forced push;
// checking HEAD holds the fetched tip first is what keeps it a fast-forward.
export function pushLane(git: Git, lane: LaneRef, publish?: () => Result<Published>): LanePush {
  const blocked = notReady(git);
  if (blocked) return { kind: "refused", reason: blocked };
  const fetched = git.out(["fetch", "-q", "origin", lane.specBranch], NETWORK);
  if (!fetched.ok) return { kind: "refused", reason: `fetching ${lane.specBranch} failed (${fetched.reason})` };
  const tip = git.out(["rev-parse", "--verify", "-q", `refs/remotes/origin/${lane.specBranch}^{commit}`]);
  if (!tip.ok) return { kind: "refused", reason: `no origin/${lane.specBranch}` };
  if (git.run(["merge-base", "--is-ancestor", tip.value, "HEAD"]).code !== 0) return { kind: "moved" };
  const saved = pushBranch(git, { defaultBranch: lane.defaultBranch, base: lane.specBranch }, SAVE);
  if (saved.kind !== "pushed") return { kind: "refused", reason: `pushing ${lane.branch} failed: ${saved.reason}` };
  const commits = count(git, `${tip.value}..HEAD`);
  if (commits > 0) {
    const ref = `refs/heads/${lane.specBranch}`;
    const landed = leasePush(git, ref, tip.value, `HEAD:${ref}`);
    if (landed.kind === "refused") return { kind: "moved" };
    if (landed.kind === "offline") return { kind: "refused", reason: `pushing to ${lane.specBranch} failed (${landed.reason})` };
  }
  return { kind: "pushed", commits, ...(publish ? { docs: publish() } : {}) };
}

// How many commits came in, or why none did.
function mergeIn(git: Git, name: string): number | Exclude<LaneMerge, { kind: "merged" }> {
  const ref = `refs/remotes/origin/${name}`;
  const commits = count(git, `HEAD..${ref}`);
  if (commits === 0) return 0;
  const merged = git.run(["merge", "-q", "--no-edit", ref]);
  if (merged.code === 0) return commits;
  const paths = conflictedPaths(git);
  if (paths.length > 0) return { kind: "conflict", with: name, paths };
  return { kind: "refused", reason: `git merge ${name} failed: ${merged.stderr.trim() || `exit ${merged.code}`}` };
}

function notReady(git: Git): string | undefined {
  if (git.run(["rev-parse", "-q", "--verify", "MERGE_HEAD"]).code === 0) return "a merge is in progress here; resolve it and commit first";
  const status = git.out(["status", "--porcelain", "-z", "--untracked-files=no"]);
  if (status.ok && status.value !== "") return "uncommitted changes here; commit them first";
  return undefined;
}

function conflictedPaths(git: Git): string[] {
  const listed = git.out(["diff", "--name-only", "-z", "--diff-filter=U"]);
  return listed.ok ? listed.value.split("\0").filter(Boolean) : [];
}

function count(git: Git, range: string): number {
  const counted = git.out(["rev-list", "--count", range]);
  return counted.ok ? Number(counted.value) : 0;
}
