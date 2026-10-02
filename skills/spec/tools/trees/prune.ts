import { existsSync } from "node:fs";
import { heldClaims } from "../claims/held";
import { gitAt, type Git } from "../core/git";
import { isRecord, numberField, stringField } from "../core/frontmatter";
import type { Result } from "../core/result";
import { defaultBranch, runAll, type AsyncRunner } from "../core/run";
import { GH_TIMEOUT_MS } from "../pr/gh-lists";
import { parseJson } from "../pr/gh-records";
import { originTip, pinDefault } from "../publish/snapshot";
import { loadLiveSessions, type LiveSession } from "../sessions/live";
import { ownSessionId } from "../sessions/own";
import { psProcStarts } from "../sessions/proc-starts";
import { canonicalPath, loadWorkspaces, type Workspace } from "../workspaces/list";
import { ownerOf } from "../workspaces/owner";
import { treeOccupant } from "./find";
import type { PlaceDeps } from "./place";
import { PLACE_FETCH_TIMEOUT_MS } from "./place";
import { pruneCandidates, type MergedHead, type PruneCandidate, type TreeFacts } from "./prune-rules";

export type PruneDeps = Omit<PlaceDeps, "home">;

export interface PruneReport {
  candidates: PruneCandidate[];
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
  const sessions = loadLiveSessions(deps.claudeHome, psProcStarts(deps.runner));
  const facts = await treeFacts(git, worktrees.value, base.value, projectDir, { sessions, deps });
  const prs = await merged;
  const candidates = pruneCandidates(facts, prs.ok ? prs.value : undefined, branch);
  return { ok: true, value: { candidates, ...(prs.ok ? {} : { prsUnchecked: prs.reason }), ...(sessions.ok ? {} : { sessionsUnread: sessions.reason }) } };
}

// `worktree remove` without --force refuses a tree with edited or untracked files: that is the clean check.
export function applyPrune(git: Git, candidates: readonly PruneCandidate[]): string[] {
  return candidates.map(({ path, branch }) => {
    const removed = git.out(["worktree", "remove", path]);
    if (!removed.ok) return `kept ${path}: ${removed.reason}`;
    if (!branch) return `removed ${path}`;
    const deleted = git.out(["branch", "-D", branch]);
    return deleted.ok ? `removed ${path} and branch ${branch}` : `removed ${path}; branch ${branch} kept: ${deleted.reason}`;
  });
}

async function treeFacts(git: Git, worktrees: readonly Workspace[], baseSha: string, projectDir: string, around: { sessions: Result<LiveSession[]>; deps: PruneDeps }): Promise<TreeFacts[]> {
  const { sessions, deps } = around;
  const paths = worktrees.map((worktree) => worktree.path);
  const here = ownerOf(canonicalPath(projectDir), paths);
  const eligible = worktrees.filter((worktree) => !worktree.isMain && !worktree.prunable && worktree.path !== here && existsSync(worktree.path));
  const jobs = eligible.map((worktree) => ({ argv: ["git", "merge-base", "--is-ancestor", worktree.head, baseSha], options: { cwd: projectDir } }));
  const results = await runAll(deps.asyncRunner, jobs, SCAN_CONCURRENCY);
  const claims = heldClaims(git, sessions, new Map());
  const view = { sessions, claims, worktreePaths: paths, ownSessionId: ownSessionId(deps.env) };
  // A closed claim's phase is still pending in that tree; placement would hand it to the next session.
  const pending = new Map(claims.filter(({ status }) => status === "closed").map(({ claim }) => [claim.workspace, `pending ${claim.spec} ${claim.phase}`]));
  return eligible.map((worktree, index) => {
    const busy = treeOccupant(worktree.path, view) ?? pending.get(worktree.path);
    return { worktree, inBase: results[index]?.code === 0, ...(busy ? { busy } : {}) };
  });
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
