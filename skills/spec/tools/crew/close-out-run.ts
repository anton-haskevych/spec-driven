import { prClaimId } from "../claims/pr-claim";
import type { HeldClaim } from "../claims/rules";
import { gitAt, type Git } from "../core/git";
import type { Runner } from "../core/run";
import { parseLaunchTitle, type LaunchTitle } from "../launch/title";
import type { Agent } from "../sessions/agents";
import { lastTurnText } from "../sessions/transcript";
import { babysitterVerdict, closeOutVerdict, type CloseOut } from "./close-out";
import { findCrewLine } from "./crew-line";
import type { LaunchedEntry } from "./run-state";

export interface CloseOutWorld {
  agents: readonly Agent[];
  claims: readonly HeldClaim[];
  claudeHome: string;
  runner: Runner;
}

// Claims carry the session id they were taken under, which can go stale (a parked tab), so a
// launched session's claim is found by its key, never by session id.
export function claimKey(title: LaunchTitle): string | undefined {
  if (title.sub === "babysit" && title.group) return `${title.spec}#${prClaimId(title.group)}`;
  if (title.sub === "execute" && title.phase) return `${title.spec}#${title.phase}`;
  return undefined;
}

export function claimFor(title: LaunchTitle, claims: readonly HeldClaim[]): HeldClaim | undefined {
  const key = claimKey(title);
  return claims.find((held) => held.status !== "remote" && `${held.claim.spec}#${held.claim.phase}` === key);
}

// Unknown liveness counts as live: nothing is closed out over a claim that can't be judged.
export function isClaimLive(held: HeldClaim | undefined): boolean {
  return held !== undefined && (held.status === "live" || held.status === "unknown");
}

export function closeOut(entry: LaunchedEntry, world: CloseOutWorld): CloseOut | undefined {
  const title = parseLaunchTitle(entry.title);
  if (!title) return undefined;
  const agent = world.agents.find((candidate) => candidate.id === entry.id);
  const held = claimFor(title, world.claims);
  const lastTurn = lastTurnText(world.claudeHome, agent?.sessionId ?? entry.id) ?? "";
  if (title.sub === "babysit" && title.group) return babysitterVerdict(title.group, isClaimLive(held), lastTurn);
  const tree = agent?.cwd ?? held?.claim.workspace;
  if (tree === undefined) return closeOutVerdict({ dirty: false, pushed: false, handedOff: false, claimLive: isClaimLive(held) });
  const git = gitAt(tree, world.runner);
  const branch = held?.claim.branch ?? currentBranch(git);
  const crewLine = findCrewLine(lastTurn);
  return closeOutVerdict({
    tree,
    dirty: isDirty(git),
    pushed: branch !== undefined && isPushed(git, branch),
    handedOff: branch !== undefined && hasHandoffSince(git, branch, entry.at),
    ...(crewLine ? { crewLine } : {}),
    claimLive: isClaimLive(held),
  });
}

function currentBranch(git: Git): string | undefined {
  const branch = git.out(["branch", "--show-current"]);
  return branch.ok && branch.value ? branch.value : undefined;
}

// An unreadable status counts as dirty: a tree that can't be checked is never handed on.
function isDirty(git: Git): boolean {
  const status = git.out(["status", "--porcelain"]);
  return !status.ok || status.value !== "";
}

function isPushed(git: Git, branch: string): boolean {
  if (git.run(["fetch", "-q", "origin", branch]).code !== 0) return false;
  const head = git.out(["rev-parse", "HEAD"]);
  const remote = git.out(["rev-parse", `origin/${branch}`]);
  return head.ok && remote.ok && head.value === remote.value;
}

function hasHandoffSince(git: Git, branch: string, launchedAt: string): boolean {
  const handoff = git.out(["log", `origin/${branch}`, `--since=${launchedAt}`, "--grep=^\\[handoff\\]", "--format=%H", "-1"]);
  return handoff.ok && handoff.value !== "";
}
