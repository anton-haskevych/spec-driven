import { existsSync } from "node:fs";
import { join, sep } from "node:path";
import { repoName } from "../board/load";
import { heldClaims } from "../claims/held";
import { gitAt, gitCommonDir, type Git } from "../core/git";
import { isRecord, numberField, stringField } from "../core/frontmatter";
import type { Result } from "../core/result";
import { defaultBranch, runAll, type AsyncRunner } from "../core/run";
import { loadMainline } from "../mainline/load";
import { GH_TIMEOUT_MS } from "../pr/gh-lists";
import { specLayout } from "../pr/groups";
import { parseJson } from "../pr/gh-records";
import { originTip, pinDefault } from "../publish/snapshot";
import { loadLiveSessions, type LiveSession } from "../sessions/live";
import { ownSessionId } from "../sessions/own";
import { psProcStarts } from "../sessions/proc-starts";
import { procStartDirs } from "../sessions/procfs";
import { canonicalPath, loadWorkspaces, type Workspace } from "../workspaces/list";
import { ownerOf } from "../workspaces/owner";
import { treeOccupant } from "./find";
import type { PlaceDeps } from "./place";
import { PLACE_FETCH_TIMEOUT_MS } from "./place";
import { laneTreeFacts } from "./lane-facts";
import { recordedTreeRoot } from "./local-settings";
import { laneBranches, pruneCandidates, type LaneInfo, type MergedHead, type PruneCandidate, type TreeFacts } from "./prune-rules";
import { strayFolders } from "./strays";

export type PruneDeps = PlaceDeps;

const OWN_COMMIT = /^(commit|cherry-pick|revert)\b|^merge .*: Merge made/;

export interface PruneReport {
  candidates: PruneCandidate[];
  // Folders beside the trees that git doesn't list as worktrees; never removed.
  strays: string[];
  // Why PR merges weren't checked; then only trees already in base are listed.
  prsUnchecked?: string;
  // Why open sessions couldn't be read; then every tree is kept.
  sessionsUnread?: string;
}

const SCAN_CONCURRENCY = 8;
const MERGED_PR_LIMIT = "200";

export async function findPrunable(projectDir: string, deps: PruneDeps): Promise<Result<PruneReport>> {
  const git = gitAt(projectDir, deps.runner);
  const branch = defaultBranch(projectDir, deps.runner);
  if (!branch) return { ok: false, reason: "no default branch (origin/HEAD is unset and gh did not answer)" };
  const worktrees = loadWorkspaces(git);
  if (!worktrees.ok) return worktrees;
  const pinned = pinDefault(git, branch, { timeoutMs: PLACE_FETCH_TIMEOUT_MS });
  const base = pinned.ok ? pinned : originTip(git, branch);
  if (!base.ok || !base.value) return { ok: false, reason: `no origin/${branch} ref` };

  const merged = mergedHeads(projectDir, deps.asyncRunner);
  const sessions = loadLiveSessions(deps.claudeHome, psProcStarts(deps.runner), procStartDirs());
  const facts = await treeFacts(git, worktrees.value, base.value, projectDir, { sessions, deps });
  const lanes = await laneMap(git, branch);
  const withLanes = facts.map((tree) => withLaneFacts(git, tree, lanes, branch));
  const prs = await merged;
  const candidates = pruneCandidates(withLanes, prs.ok ? prs.value : undefined, branch);
  return { ok: true, value: { candidates, strays: strayFolders(worktrees.value), ...(prs.ok ? {} : { prsUnchecked: prs.reason }), ...(sessions.ok ? {} : { sessionsUnread: sessions.reason }) } };
}

export interface PruneOutcome {
  path: string;
  branch?: string;
  // Why the tree is still there; unset when it was removed.
  kept?: string;
  // Why its branch is still there after the tree went.
  branchKept?: string;
}

// `worktree remove` without --force refuses a tree with edited or untracked files: that is the clean check.
export function applyPrune(git: Git, candidates: readonly PruneCandidate[]): PruneOutcome[] {
  return candidates.map(({ path, branch }) => {
    const removed = git.out(["worktree", "remove", path]);
    if (!removed.ok) return { path, ...(branch ? { branch } : {}), kept: removed.reason };
    if (!branch) return { path };
    const deleted = git.out(["branch", "-D", branch]);
    return deleted.ok ? { path, branch } : { path, branch, branchKept: deleted.reason };
  });
}

async function treeFacts(git: Git, worktrees: readonly Workspace[], baseSha: string, projectDir: string, around: { sessions: Result<LiveSession[]>; deps: PruneDeps }): Promise<TreeFacts[]> {
  const { sessions, deps } = around;
  const paths = worktrees.map((worktree) => worktree.path);
  const here = ownerOf(canonicalPath(projectDir), paths);
  const eligible = worktrees.filter((worktree) => !worktree.isMain && !worktree.prunable && worktree.path !== here && existsSync(worktree.path));
  const jobs = eligible.map((worktree) => ({ argv: ["git", "merge-base", "--is-ancestor", worktree.head, baseSha], options: { cwd: projectDir } }));
  const results = await runAll(deps.asyncRunner, jobs, SCAN_CONCURRENCY);
  const root = placementRoot(git, deps.home);
  const upstreams = branchUpstreams(git);
  const claims = heldClaims(git, sessions, new Map());
  const view = { sessions, claims, worktreePaths: paths, ownSessionId: ownSessionId(deps.env) };
  // A closed claim's phase is still pending in that tree; placement would hand it to the next session.
  const pending = new Map(claims.filter(({ status }) => status === "closed").map(({ claim }) => [claim.workspace, `pending ${claim.spec} ${claim.phase}`]));
  return eligible.map((worktree, index) => {
    const busy = treeOccupant(worktree.path, view) ?? pending.get(worktree.path);
    const inBase = results[index]?.code === 0;
    const placed = root !== undefined && isInside(canonicalPath(worktree.path), root);
    const carriesWork = inBase && placed && carriesOwnWork(gitAt(worktree.path, deps.runner), worktree, upstreams);
    return { worktree, inBase, placed, carriesWork, ...(busy ? { busy } : {}) };
  });
}

function placementRoot(git: Git, home: string): string | undefined {
  const commonDir = gitCommonDir(git);
  if (!commonDir.ok) return undefined;
  return canonicalPath(recordedTreeRoot(commonDir.value, home) ?? join(home, "claude-worktrees", repoName(commonDir.value)));
}

function isInside(path: string, root: string): boolean {
  return path === root || path.startsWith(root + sep);
}

function branchUpstreams(git: Git): Map<string, string> {
  const listed = git.out(["for-each-ref", "--format=%(refname:short)%09%(upstream:short)", "refs/heads/"]);
  const pairs = listed.ok ? listed.value.split("\n").map((line) => line.split("\t")) : [];
  return new Map(pairs.filter(([branch, upstream]) => branch && upstream).map(([branch, upstream]) => [branch as string, upstream as string]));
}

function carriesOwnWork(tree: Git, worktree: Workspace, upstreams: ReadonlyMap<string, string>): boolean {
  const { branch } = worktree;
  if (branch && upstreams.get(branch)?.endsWith(`/${branch}`)) return true;
  const reflog = tree.out(["reflog", "show", "--format=%gs", branch ? `refs/heads/${branch}` : "HEAD"]);
  return reflog.ok && reflog.value.split("\n").some((subject) => OWN_COMMIT.test(subject));
}

// Specs as origin/<default> and this clone's copy of the record hold them; the pin above just fetched main.
// An unreadable spec set leaves only today's rules: a lane tree is kept, never guessed at.
async function laneMap(git: Git, defaultBranch: string): Promise<Map<string, LaneInfo>> {
  const mainline = await loadMainline(git, defaultBranch, { local: true, timeoutMs: PLACE_FETCH_TIMEOUT_MS, now: new Date() });
  if (!mainline.ok) return new Map();
  const { states, nodes, plans } = mainline.value;
  return laneBranches(new Map([...states].map(([name, state]) => [name, specLayout(state, nodes.get(name)?.specBranch)])), plans.prs);
}

function withLaneFacts(git: Git, tree: TreeFacts, lanes: ReadonlyMap<string, LaneInfo>, defaultBranch: string): TreeFacts {
  const { branch, head } = tree.worktree;
  const lane = branch && !tree.inBase && !tree.busy ? lanes.get(branch) : undefined;
  return lane && branch ? { ...tree, lane: laneTreeFacts(git, { branch, head }, lane, defaultBranch) } : tree;
}

async function mergedHeads(cwd: string, runner: AsyncRunner): Promise<Result<Map<string, MergedHead[]>>> {
  const listed = await runner.run(["gh", "pr", "list", "--state", "merged", "--limit", MERGED_PR_LIMIT, "--json", "number,headRefName,headRefOid"], { cwd, timeoutMs: GH_TIMEOUT_MS });
  const value = listed.code === 0 ? parseJson(listed.stdout) : undefined;
  if (!Array.isArray(value)) return { ok: false, reason: listed.stderr.trim().split("\n")[0] || "gh pr list gave no usable output" };
  const heads = new Map<string, MergedHead[]>();
  for (const record of value.filter(isRecord)) {
    const [branch, head, number] = [stringField(record, "headRefName"), stringField(record, "headRefOid"), numberField(record, "number")];
    if (branch && head && number !== undefined) heads.set(branch, [...(heads.get(branch) ?? []), { number, head }]);
  }
  return { ok: true, value: heads };
}
