import type { BacklogItem } from "../backlog/items";
import { isOverdue } from "../core/schedule";
import type { SpecRow } from "./rows";

export interface PortfolioView {
  today: string;
  showFinished: boolean;
  hiddenFinished: number;
  notShown: number;
  specs: SpecRow[];
  backlog: BacklogItem[];
}

const DEFAULT_ROOT = "docs/specs";
const EMPTY = "—";
const SPEC_HEADER = "| Spec | Status | Priority | Due | Area | Domain | Updated | Progress |\n|------|--------|----------|-----|------|--------|---------|----------|";
const BACKLOG_HEADER = "| Idea | Priority | Due | Tags | Title |\n|------|----------|-----|------|-------|";

export function renderPortfolio(view: PortfolioView): string {
  if (view.specs.length === 0 && view.backlog.length === 0) {
    return view.showFinished ? "No specs or backlog items." : "No open specs or backlog items.";
  }
  const sections = [];
  if (view.specs.length > 0) {
    const heading = view.showFinished ? "Specs" : "Open specs";
    sections.push(`## ${heading} (${view.specs.length})\n\n${SPEC_HEADER}\n${view.specs.map(specLine).join("\n")}`);
  }
  if (view.backlog.length > 0) {
    const lines = view.backlog.map((item) => ideaLine(item, view.today));
    sections.push(`## Backlog (${view.backlog.length})\n\n${BACKLOG_HEADER}\n${lines.join("\n")}`);
  }
  return [...sections, summaryLine(view)].join("\n\n");
}

function specLine(row: SpecRow): string {
  const name = row.root === DEFAULT_ROOT ? row.name : `${row.name} (${row.root.split("/")[0]})`;
  const progress = row.progress.total > 0 ? `${row.progress.done}/${row.progress.total}` : EMPTY;
  return cells([name, row.status, row.priority, dueCell(row.due, row.overdue), list(row.area), list(row.domain), row.updated, progress]);
}

function ideaLine(item: BacklogItem, today: string): string {
  return cells([item.slug, item.priority, dueCell(item.due, isOverdue(item.due, today)), list(item.tags), item.title]);
}

function dueCell(due: string | undefined, overdue: boolean): string | undefined {
  return due && overdue ? `${due} ⚠ overdue` : due;
}

function list(values: readonly string[]): string | undefined {
  return values.length > 0 ? values.join(", ") : undefined;
}

function cells(values: ReadonlyArray<string | undefined>): string {
  return `| ${values.map((value) => (value ?? EMPTY).replaceAll("|", "\\|")).join(" | ")} |`;
}

function summaryLine(view: PortfolioView): string {
  const overdue = view.specs.filter((row) => row.overdue).length + view.backlog.filter((item) => isOverdue(item.due, view.today)).length;
  const counts = [plural(view.specs.length, view.showFinished ? "spec" : "open spec"), plural(view.backlog.length, "idea")].join(", ");
  const late = overdue > 0 ? ` ${overdue} overdue.` : "";
  const hidden = view.hiddenFinished > 0 ? ` ${plural(view.hiddenFinished, "finished spec")} hidden; \`/spec list all\` shows them.` : "";
  const cut = view.notShown > 0 ? ` ${plural(view.notShown, "more open spec")} not shown; filter by priority, domain, area or name to see them.` : "";
  return `**${counts}.${late}**${hidden}${cut}`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
