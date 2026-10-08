import { relative } from "node:path";
import { loadBacklog, type BacklogItem } from "../backlog/items";
import { loadBoard } from "../board/load";
import { renderBoard } from "../board/render";
import { isOverdue, isoDay } from "../core/schedule";
import { loadNodes } from "../graph/nodes";
import { matchesItem, matchesSpec, orderBacklog, orderSpecs } from "../portfolio/order";
import { renderPortfolio } from "../portfolio/render";
import { specRow } from "../portfolio/rows";
import { ownSessionId } from "../sessions/own";
import { fenced, type BoardDeps } from "./board";

export const LIST_USAGE = "list [table] [all] [filter] [--json] [--local]";

export type ListRoute = { kind: "board"; local: boolean } | { kind: "table"; args: string[] };

const ALL = "all";
const TABLE = "table";
const JSON_FLAG = "--json";
const LOCAL_FLAG = "--local";
const DEFAULT_SPEC_LIMIT = 30;

export async function listCommand(projectDir: string, args: readonly string[], deps: BoardDeps): Promise<string> {
  const today = isoDay(deps.now);
  const route = listRoute(args);
  if (typeof route === "string") return route;
  if (route.kind === "table") return portfolioTable(projectDir, route.args, today);
  const board = await loadBoard(projectDir, { local: route.local, ownSessionId: ownSessionId(deps.env) }, deps, deps.now);
  if (board.ok) return fenced(renderBoard(board.value));
  return `${portfolioTable(projectDir, [], today)}\n\nboard unavailable: ${board.reason}`;
}

// --local only means something to the board; the table reads the checkout either way.
export function listRoute(args: readonly string[]): ListRoute | string {
  const flags = args.filter((arg) => arg.startsWith("--"));
  if (flags.some((flag) => flag !== JSON_FLAG && flag !== LOCAL_FLAG)) return `usage: ${LIST_USAGE}`;
  const tableArgs = args.filter((arg) => arg !== LOCAL_FLAG);
  return tableArgs.length === 0 ? { kind: "board", local: args.includes(LOCAL_FLAG) } : { kind: "table", args: tableArgs };
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
