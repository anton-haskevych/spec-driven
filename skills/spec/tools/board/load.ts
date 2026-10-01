import { basename, dirname, join } from "node:path";
import { readTextIfExists } from "../core/files";
import { gitAt, type Git } from "../core/git";
import type { Result } from "../core/result";
import { defaultBranch, type AsyncRunner, type Runner } from "../core/run";
import type { SpecState } from "../core/spec-state";
import { loadMainline } from "../mainline/load";
import { fetchPrLists, type PrLists } from "../pr/gh-lists";
import { specPrNumbers } from "../pr/resolve";
import { toPrRows, type PrRow } from "../pr/rollup";
import { loadLiveSessions } from "../sessions/live";
import { psProcStarts } from "../sessions/proc-starts";
import { scanWorkspaces, type WorkspaceScanResult } from "../workspaces/scan";
import { canonicalPath } from "../workspaces/list";
import { loadWorkspaceViews } from "../workspaces/views";
import type { BoardInputs, WorkspaceView } from "./inputs";
import { buildBoard } from "./lanes";
import type { Board } from "./model";

export const FETCH_TIMEOUT_MS = 10_000;

export interface BoardRequest {
  local: boolean;
}

export interface BoardRunners {
  runner: Runner;
  asyncRunner: AsyncRunner;
  claudeHome: string;
}

const NO_SCAN: WorkspaceScanResult = { scans: [], counts: { merged: 0, unknownBase: 0, unreadable: 0 } };

export async function loadBoard(projectDir: string, request: BoardRequest, runners: BoardRunners, now: Date): Promise<Result<Board>> {
  const inputs = await loadBoardInputs(projectDir, request, runners);
  return inputs.ok ? { ok: true, value: buildBoard(inputs.value, now) } : inputs;
}

export async function loadBoardInputs(projectDir: string, request: BoardRequest, runners: BoardRunners): Promise<Result<BoardInputs>> {
  const branch = defaultBranch(projectDir, runners.runner);
  if (!branch) return { ok: false, reason: "no default branch (origin/HEAD is unset and gh did not answer)" };
  const prLists = request.local ? undefined : fetchPrLists(projectDir, runners.asyncRunner);
  const git = gitAt(projectDir, runners.runner);
  const mainline = await loadMainline(git, branch, { timeoutMs: FETCH_TIMEOUT_MS, local: request.local });
  if (!mainline.ok) return mainline;
  const { base, commonDir, nodes, states, stages, backlog, settings, duplicates } = mainline.value;
  const scanned = await scanWorkspaces(git, runners.asyncRunner, base.sha, new Set());
  const { scans, counts } = scanned.ok ? scanned.value : NO_SCAN;
  const workspaces = loadWorkspaceViews(scans, nodes);
  return {
    ok: true,
    value: {
      repo: repoName(commonDir),
      currentPath: checkoutRoot(git, projectDir),
      base,
      nodes,
      states,
      stages,
      workspaces,
      counts: { ...counts, duplicates },
      backlogCount: backlog.length,
      sessions: request.local ? "local" : loadLiveSessions(runners.claudeHome, psProcStarts(runners.runner)),
      prs: prLists ? prRows(await prLists, settings.checks.external) : "local",
      prLinks: prLinks(states, workspaces),
    },
  };
}

function prRows(lists: Result<PrLists>, externalPatterns: readonly string[]): Result<PrRow[]> {
  return lists.ok ? { ok: true, value: toPrRows(lists.value.open, lists.value.recent, externalPatterns) } : lists;
}

// A branch's pr-opening.md often links its PR before the docs reach main.
function prLinks(states: ReadonlyMap<string, SpecState>, workspaces: readonly WorkspaceView[]): Map<string, number[]> {
  const links = new Map<string, number[]>();
  for (const views of [states, ...workspaces.map((workspace) => workspace.states)]) {
    for (const [spec, state] of views) {
      const numbers = specPrNumbers(readTextIfExists(join(state.spec.dir, "pr-opening.md")) ?? "");
      links.set(spec, [...new Set([...(links.get(spec) ?? []), ...numbers])]);
    }
  }
  return links;
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
