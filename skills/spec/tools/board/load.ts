import { existsSync, realpathSync } from "node:fs";
import { basename, dirname } from "node:path";
import { gitAt, type Git } from "../core/git";
import type { Result } from "../core/result";
import { defaultBranch, type AsyncRunner, type Runner } from "../core/run";
import { loadMainline } from "../mainline/load";
import { scanWorkspaces, type WorkspaceScanResult } from "../workspaces/scan";
import { loadWorkspaceViews } from "../workspaces/views";
import type { BoardInputs } from "./inputs";
import { buildBoard } from "./lanes";
import type { Board } from "./model";

export const FETCH_TIMEOUT_MS = 10_000;

export interface BoardRequest {
  local: boolean;
}

export interface BoardRunners {
  runner: Runner;
  asyncRunner: AsyncRunner;
}

const NO_SCAN: WorkspaceScanResult = { scans: [], counts: { merged: 0, unknownBase: 0, unreadable: 0 } };

export async function loadBoard(projectDir: string, request: BoardRequest, runners: BoardRunners, now: Date): Promise<Result<Board>> {
  const inputs = await loadBoardInputs(projectDir, request, runners);
  return inputs.ok ? { ok: true, value: buildBoard(inputs.value, now) } : inputs;
}

export async function loadBoardInputs(projectDir: string, request: BoardRequest, runners: BoardRunners): Promise<Result<BoardInputs>> {
  const branch = defaultBranch(projectDir, runners.runner);
  if (!branch) return { ok: false, reason: "no default branch (origin/HEAD is unset and gh did not answer)" };
  const git = gitAt(projectDir, runners.runner);
  const mainline = await loadMainline(git, branch, { timeoutMs: FETCH_TIMEOUT_MS, local: request.local });
  if (!mainline.ok) return mainline;
  const { base, commonDir, nodes, states, stages, backlog, duplicates } = mainline.value;
  const scanned = await scanWorkspaces(git, runners.asyncRunner, base.sha, new Set());
  const { scans, counts } = scanned.ok ? scanned.value : NO_SCAN;
  return {
    ok: true,
    value: {
      repo: repoName(commonDir),
      currentPath: checkoutRoot(git, projectDir),
      base,
      nodes,
      states,
      stages,
      workspaces: loadWorkspaceViews(scans, nodes),
      counts: { ...counts, duplicates },
      backlogCount: backlog.length,
    },
  };
}

// Resolved like worktree paths, so the board can match it against them.
function checkoutRoot(git: Git, projectDir: string): string {
  const root = git.out(["rev-parse", "--show-toplevel"]);
  const path = root.ok ? root.value : projectDir;
  return existsSync(path) ? realpathSync(path) : path;
}

export function repoName(commonDir: string): string {
  const folder = basename(commonDir);
  return folder === ".git" ? basename(dirname(commonDir)) : folder.replace(/\.git$/, "");
}
