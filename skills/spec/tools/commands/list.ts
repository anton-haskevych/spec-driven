import { relative } from "node:path";
import { loadBacklog, type BacklogItem } from "../backlog/items";
import { loadBoard } from "../board/load";
import { renderBoard } from "../board/render";
import { isOverdue, isoDay } from "../core/schedule";
import { loadNodes, type JoinedReads } from "../graph/nodes";
import { readLocalPlans, readPlansAt } from "../plan/read-plans";
import { supersededBy } from "../graph/lifecycle";
import { FINISHED_STATUSES, matchesItem, matchesSpec, orderBacklog, orderSpecs, STALE_FILTER } from "../portfolio/order";
import { renderPortfolio } from "../portfolio/render";
import { specRow } from "../portfolio/rows";
import { ownSessionId } from "../sessions/own";
import { cardIdeas, remainingFiles } from "../cards/backlog-card";
import { loadSettings } from "../playbook/settings";
import { recordViewOf } from "../record/read";
import type { RecordView } from "../record/view";
import type { PlanSource } from "../plan/read-plans";
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
  if (route.kind === "table") {
    const plans = readPlansAt(projectDir, deps.runner, deps.now);
    return portfolioTable(projectDir, route.args, today, plans, boardCards(projectDir, plans));
  }
  const board = await loadBoard(projectDir, { local: route.local, ownSessionId: ownSessionId(deps.env) }, deps, deps.now);
  if (board.ok) return fenced(renderBoard(board.value));
  const plans = readLocalPlans(projectDir, deps.runner, deps.now);
  return `${portfolioTable(projectDir, [], today, plans, boardCards(projectDir, plans))}\n\nboard unavailable: ${board.reason}`;
}

// With the board off, ideas stay files exactly as before, whatever record exists.
function boardCards(projectDir: string, plans: PlanSource): RecordView | undefined {
  return loadSettings(projectDir).board.record ? recordViewOf(plans.record) : undefined;
}

// --local only means something to the board; the table reads the checkout either way.
export function listRoute(args: readonly string[]): ListRoute | string {
  const flags = args.filter((arg) => arg.startsWith("--"));
  if (flags.some((flag) => flag !== JSON_FLAG && flag !== LOCAL_FLAG)) return `usage: ${LIST_USAGE}`;
  const tableArgs = args.filter((arg) => arg !== LOCAL_FLAG);
  return tableArgs.length === 0 ? { kind: "board", local: args.includes(LOCAL_FLAG) } : { kind: "table", args: tableArgs };
}

export function portfolioTable(projectDir: string, args: readonly string[], today: string, joined?: JoinedReads, cards?: RecordView): string {
  const filter = args.filter((arg) => arg !== ALL && arg !== JSON_FLAG && arg !== TABLE).join(" ").trim();
  // A finished status is a lifecycle filter: `list abandoned` shows abandoned specs without `all`.
  const showFinished = args.includes(ALL) || FINISHED_STATUSES.has(filter.toLowerCase());

  const nodes = loadNodes(projectDir, joined);
  const rows = [...nodes.values()].map((node) => specRow(node, projectDir, today, supersededBy(nodes, node.spec.name)));
  const matching = rows.filter((row) => !filter || matchesSpec(row, filter));
  const specs = orderSpecs(matching.filter((row) => showFinished || !row.finished));
  const backlog = isSpecOnlyFilter(filter) ? [] : orderBacklog(ideas(projectDir, cards).filter((item) => !filter || matchesItem(item, filter)));

  if (args.includes(JSON_FLAG)) {
    const ideas = backlog.map((item) => ideaForAgents(item, projectDir, today));
    return JSON.stringify({ today, filter: filter || undefined, specs, backlog: ideas }, null, 2);
  }
  const hiddenFinished = matching.length - specs.length;
  const shown = filter || showFinished ? specs : specs.slice(0, DEFAULT_SPEC_LIMIT);
  return renderPortfolio({ today, showFinished, hiddenFinished, notShown: specs.length - shown.length, specs: shown, backlog });
}

// Backlog ideas have no lifecycle: a lifecycle filter lists specs only.
function isSpecOnlyFilter(filter: string): boolean {
  const wanted = filter.toLowerCase();
  return wanted === STALE_FILTER || FINISHED_STATUSES.has(wanted);
}

function ideas(projectDir: string, cards: RecordView | undefined): BacklogItem[] {
  const files = loadBacklog(projectDir);
  return cards ? [...remainingFiles(files, cards, projectDir), ...cardIdeas(cards)] : files;
}

function ideaForAgents(item: BacklogItem, projectDir: string, today: string) {
  return { ...item, file: item.card ? "" : relative(projectDir, item.file), overdue: isOverdue(item.due, today) };
}
