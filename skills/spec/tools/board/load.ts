import { basename, dirname } from "node:path";
import { gitAt } from "../core/git";
import type { Result } from "../core/result";
import { defaultBranch, type Runner } from "../core/run";
import { loadMainline } from "../mainline/load";
import type { BoardInputs } from "./inputs";
import { buildBoard } from "./lanes";
import type { Board } from "./model";

export const FETCH_TIMEOUT_MS = 10_000;

export interface BoardRequest {
  local: boolean;
}

export async function loadBoard(projectDir: string, request: BoardRequest, runner: Runner, now: Date): Promise<Result<Board>> {
  const inputs = await loadBoardInputs(projectDir, request, runner);
  return inputs.ok ? { ok: true, value: buildBoard(inputs.value, now) } : inputs;
}

export async function loadBoardInputs(projectDir: string, request: BoardRequest, runner: Runner): Promise<Result<BoardInputs>> {
  const branch = defaultBranch(projectDir, runner);
  if (!branch) return { ok: false, reason: "no default branch (origin/HEAD is unset and gh did not answer)" };
  const mainline = await loadMainline(gitAt(projectDir, runner), branch, { timeoutMs: FETCH_TIMEOUT_MS, local: request.local });
  if (!mainline.ok) return mainline;
  const { base, commonDir, nodes, states, stages, backlog, duplicates } = mainline.value;
  return {
    ok: true,
    value: {
      repo: repoName(commonDir),
      base,
      nodes,
      states,
      stages,
      counts: { merged: 0, unknownBase: 0, unreadable: 0, duplicates },
      backlogCount: backlog.length,
    },
  };
}

export function repoName(commonDir: string): string {
  const folder = basename(commonDir);
  return folder === ".git" ? basename(dirname(commonDir)) : folder.replace(/\.git$/, "");
}
