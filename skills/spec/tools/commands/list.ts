import { relative } from "node:path";
import { loadBacklog, type BacklogItem } from "../backlog/items";
import { loadBoard } from "../board/load";
import { renderBoard } from "../board/render";
import { isOverdue, isoDay } from "../core/schedule";
import { loadNodes } from "../graph/nodes";
import { matchesItem, matchesSpec, orderBacklog, orderSpecs } from "../portfolio/order";
import { renderPortfolio } from "../portfolio/render";
import { specRow } from "../portfolio/rows";
import { fenced, type BoardDeps } from "./board";

const ALL = "all";
const TABLE = "table";
const JSON_FLAG = "--json";
const DEFAULT_SPEC_LIMIT = 30;

export async function listCommand(projectDir: string, args: readonly string[], deps: BoardDeps): Promise<string> {
  const today = isoDay(deps.now);
  if (args.length > 0) return portfolioTable(projectDir, args, today);
  const board = await loadBoard(projectDir, { local: false }, deps, deps.now);
  if (board.ok) return fenced(renderBoard(board.value));
  return `${portfolioTable(projectDir, args, today)}\n\nboard unavailable: ${board.reason}`;
}

export function portfolioTable(projectDir: string, args: readonly string[], today: string): string {
  const showFinished = args.includes(ALL);
  const filter = args.filter((arg) => arg !== ALL && arg !== JSON_FLAG && arg !== TABLE).join(" ").trim();

  const rows = [...loadNodes(projectDir).values()].map((node) => specRow(node, projectDir, today));
  const matching = rows.filter((row) => !filter || matchesSpec(row, filter));
  const specs = orderSpecs(matching.filter((row) => showFinished || !row.finished));
  const backlog = orderBacklog(loadBacklog(projectDir).filter((item) => !filter || matchesItem(item, filter)));

  if (args.includes(JSON_FLAG)) {
    const ideas = backlog.map((item) => ideaForAgents(item, projectDir, today));
    return JSON.stringify({ today, filter: filter || undefined, specs, backlog: ideas }, null, 2);
  }
  const hiddenFinished = matching.length - specs.length;
  const shown = filter || showFinished ? specs : specs.slice(0, DEFAULT_SPEC_LIMIT);
  return renderPortfolio({ today, showFinished, hiddenFinished, notShown: specs.length - shown.length, specs: shown, backlog });
}

function ideaForAgents(item: BacklogItem, projectDir: string, today: string) {
  return { ...item, file: relative(projectDir, item.file), overdue: isOverdue(item.due, today) };
}
