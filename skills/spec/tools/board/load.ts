import { basename, dirname, join } from "node:path";
import { readTextIfExists } from "../core/files";
import { gitAt, runnerName, type Git } from "../core/git";
import type { Result } from "../core/result";
import { defaultBranch, type AsyncRunner, type Runner } from "../core/run";
import type { SpecState } from "../core/spec-state";
import { loadMainline } from "../mainline/load";
import { fetchPrLists, type PrLists } from "../pr/gh-lists";
import type { PrDoc } from "../plan/docs/pr-doc";
import { linkedPrNumbers } from "../pr/resolve";
import { toPrRows, type PrRow } from "../pr/checks/rollup";
import { heldClaims, remoteHeldClaims, withoutTakenOver } from "../claims/held";
import { hostname } from "node:os";
import { readSessions, SESSION_KEPT_DAYS } from "../sessions/list";
import type { SessionDoc } from "../sessions/session-doc";
import type { PlanSource } from "../plan/read-plans";
import { recordViewOf } from "../record/read";
import { loadLiveSessions, type LiveSession } from "../sessions/live";
import { psProcStarts } from "../sessions/proc-starts";
import { scanWorkspaces, type WorkspaceScanResult } from "../workspaces/scan";
import { canonicalPath, loadWorkspaces } from "../workspaces/list";
import { loadWorkspaceViews } from "../workspaces/views";
import type { BoardInputs, WorkspaceView } from "./inputs";
import { joinedActivity } from "./joined-activity";
import { boardPrDocs } from "./pr-sync";
import { validateRecordDoc } from "../plan/kinds";
import { prSyncPlan } from "../plan/pr-sync";
import { gitRecordPort } from "../record/ref";
import { writeRecord } from "../record/write";
import { buildBoard } from "./lanes";
import type { Board } from "./model";

export const FETCH_TIMEOUT_MS = 10_000;

export interface BoardRequest {
  local: boolean;
  ownSessionId?: string;
}

export interface BoardRunners {
  runner: Runner;
  asyncRunner: AsyncRunner;
  claudeHome: string;
}

const LOCAL_LIVENESS: Result<LiveSession[]> = { ok: false, reason: "--local skips sessions" };
const NO_SCAN: WorkspaceScanResult = { scans: [], counts: { merged: 0, unknownBase: 0, unreadable: 0 } };

export async function loadBoard(projectDir: string, request: BoardRequest, runners: BoardRunners, now: Date): Promise<Result<Board>> {
  const inputs = await loadBoardInputs(projectDir, request, runners, now);
  if (!inputs.ok) return inputs;
  return { ok: true, value: buildBoard(inputs.value, now, boardMe(projectDir, runners.runner)) };
}

// Board.me: the configured git name, absent when git has none.
export function boardMe(projectDir: string, runner: Runner): string | undefined {
  const me = runnerName(gitAt(projectDir, runner));
  return me.ok ? me.value : undefined;
}

export async function loadBoardInputs(projectDir: string, request: BoardRequest, runners: BoardRunners, now: Date = new Date()): Promise<Result<BoardInputs>> {
  const branch = defaultBranch(projectDir, runners.runner);
  if (!branch) return { ok: false, reason: "no default branch (origin/HEAD is unset and gh did not answer)" };
  const prLists = request.local ? undefined : fetchPrLists(projectDir, runners.asyncRunner);
  const git = gitAt(projectDir, runners.runner);
  const mainline = await loadMainline(git, branch, { timeoutMs: FETCH_TIMEOUT_MS, local: request.local, now });
  if (!mainline.ok) return mainline;
  const { base, commonDir, nodes, states, stages, backlog, settings, duplicates, plans } = mainline.value;
  const sessions = request.local ? "local" : loadLiveSessions(runners.claudeHome, psProcStarts(runners.runner));
  const ownFiles = heldClaims(git, sessions === "local" ? LOCAL_LIVENESS : sessions, states);
  const remote = request.local ? [] : remoteHeldClaims(git, ownFiles);
  const local = withoutTakenOver(ownFiles, remote);
  const scanned = await scanWorkspaces(git, runners.asyncRunner, base.sha, new Set(local.map((held) => held.claim.workspace)));
  const { scans, counts } = scanned.ok ? scanned.value : NO_SCAN;
  const workspaces = loadWorkspaceViews(scans, nodes, plans.isJoined);
  // An unreadable worktree list falls back to the live ones, as claimContext falls back to claimed ones.
  const trees = loadWorkspaces(git);
  const prs = prLists ? prRows(await prLists, settings.checks.external) : "local";
  const prDocs = await syncedPrDocs(git, [...states.keys()], plans.prs, prs);
  return {
    ok: true,
    value: {
      repo: repoName(commonDir),
      currentPath: checkoutRoot(git, projectDir),
      base,
      nodes,
      states,
      stages,
      plans,
      joinedActivity: joinedActivity([...states.keys()].flatMap((name) => plans.joined(name) ?? []), trees.ok ? trees.value : [], (spec) => prDocs.get(spec)),
      workspaces,
      worktreePaths: trees.ok ? trees.value.map((worktree) => worktree.path) : workspaces.map((workspace) => workspace.path),
      counts: { ...counts, duplicates },
      backlogCount: backlog.length,
      sessions,
      claims: [...remote, ...local],
      prs,
      prDocs,
      prLinks: prLinks(states, workspaces, plans.prs),
      sessionDocs: recentSessionDocs(plans, now),
      thisHost: hostname(),
      ...(request.ownSessionId ? { ownSessionId: request.ownSessionId } : {}),
    },
  };
}

// Documents from the record that wrote within the week; what each board section does with their age is its own.
function recentSessionDocs(plans: PlanSource, now: Date): SessionDoc[] {
  const view = recordViewOf(plans.record);
  return view ? readSessions(view).filter((doc) => now.getTime() - Date.parse(doc.lastWriteAt) < SESSION_KEPT_DAYS * 24 * 60 * 60_000) : [];
}

function prRows(lists: Result<PrLists>, externalPatterns: readonly string[]): Result<PrRow[]> {
  return lists.ok ? { ok: true, value: toPrRows(lists.value.open, lists.value.recent, externalPatterns) } : lists;
}

// A branch's pr-opening.md often links its PR before the docs reach main; a spec on layout 2 links its PR documents.
function prLinks(states: ReadonlyMap<string, SpecState>, workspaces: readonly WorkspaceView[], prs: (spec: string) => PrDoc[] | undefined): Map<string, number[]> {
  const links = new Map<string, number[]>();
  for (const views of [states, ...workspaces.map((workspace) => workspace.states)]) {
    for (const [spec, state] of views) {
      const numbers = linkedPrNumbers(readTextIfExists(join(state.spec.dir, "pr-opening.md")), prs(spec));
      links.set(spec, [...new Set([...(links.get(spec) ?? []), ...numbers])]);
    }
  }
  return links;
}

// PRs opened or merged on github.com reach their documents here as well as at pr status. A write that
// doesn't land is retried by the next load.
async function syncedPrDocs(git: Git, specs: readonly string[], docsOf: (spec: string) => PrDoc[] | undefined, prs: Result<PrRow[]> | "local"): Promise<Map<string, PrDoc[]>> {
  const synced = boardPrDocs(specs, docsOf, prs !== "local" && prs.ok ? prs.value : []);
  const port = synced.sightings.length > 0 ? gitRecordPort(git) : undefined;
  if (port) await writeRecord(port, prSyncPlan(synced.sightings), { validate: validateRecordDoc });
  return synced.docs;
}

// Resolved like worktree paths, so the board can match it against them.
function checkoutRoot(git: Git, projectDir: string): string {
  const root = git.out(["rev-parse", "--show-toplevel"]);
  return canonicalPath(root.ok ? root.value : projectDir);
}

export function repoName(commonDir: string): string {
  const folder = basename(commonDir);
  return folder === ".git" ? basename(dirname(commonDir)) : folder.replace(/\.git$/, "");
}
