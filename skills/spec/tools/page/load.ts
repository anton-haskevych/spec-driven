import { buildBoard } from "../board/lanes";
import { boardMe, loadBoardInputs, type BoardRunners } from "../board/load";
import type { Result } from "../core/result";
import { loadSettings } from "../playbook/settings";
import { buildPageModel, type PageModel } from "./model";

// A full board load: the base branch, open PRs, worktrees and the record. Too heavy for every tick (refresh.ts).
export async function loadPageModel(projectDir: string, runners: BoardRunners, now: Date): Promise<Result<PageModel>> {
  const inputs = await loadBoardInputs(projectDir, { local: false }, runners, now);
  if (!inputs.ok) return inputs;
  const board = buildBoard(inputs.value, now, boardMe(projectDir, runners.runner));
  return { ok: true, value: buildPageModel(inputs.value, board, { people: loadSettings(projectDir).board.people, now }) };
}
