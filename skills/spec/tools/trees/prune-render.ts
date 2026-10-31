import { basename } from "node:path";
import type { PruneOutcome, PruneReport } from "./prune";

const NAMED_AT_MOST = 10;

export function renderPruneList(report: PruneReport): string {
  const { candidates } = report;
  const head = candidates.length === 0
    ? ["trees: nothing to prune"]
    : [`prune ${candidates.length} merged ${plural(candidates.length, "tree")} (idle, nothing unpushed; trees with edits are kept):`, ...candidates.map(({ path, branch, evidence }) => `  ${[path, branch, evidence].filter(Boolean).join(" · ")}`)];
  return [...head, ...strayLines(report.strays), ...uncheckedLines(report)].join("\n");
}

export function renderPruneApplied(outcomes: readonly PruneOutcome[], report: PruneReport): string {
  return [...outcomes.map(appliedLine), ...strayLines(report.strays), ...uncheckedLines(report)].join("\n");
}

export function renderPruneSummaryLine(outcomes: readonly PruneOutcome[], report: PruneReport): string {
  const removed = outcomes.filter(({ kept }) => kept === undefined);
  const kept = outcomes.filter(({ kept }) => kept !== undefined);
  const branchesKept = removed.filter(({ branchKept }) => branchKept !== undefined);
  return [
    `Pruned ${removed.length} merged ${plural(removed.length, "tree")}${named(folderNames(removed))}`,
    ...(kept.length > 0 ? [`kept ${kept.length}, git refused${named(folderNames(kept))}`] : []),
    ...(branchesKept.length > 0 ? [`${branchesKept.length} ${plural(branchesKept.length, "branch", "branches")} kept${named(branchesKept.map(({ branch }) => branch ?? ""))}`] : []),
    ...(report.strays.length > 0 ? [`${report.strays.length} ${report.strays.length === 1 ? "folder not a worktree" : "folders not worktrees"}, left alone${named(report.strays.map((path) => basename(path)))}`] : []),
    ...(report.prsUnchecked ? [`PR merges not checked (${report.prsUnchecked})`] : []),
    ...(report.sessionsUnread ? [`open sessions unreadable (${report.sessionsUnread}), every tree kept`] : []),
  ].join(" · ");
}

function appliedLine({ path, branch, kept, branchKept }: PruneOutcome): string {
  if (kept !== undefined) return `kept ${path}: ${kept}`;
  if (!branch) return `removed ${path}`;
  return branchKept === undefined ? `removed ${path} and branch ${branch}` : `removed ${path}; branch ${branch} kept: ${branchKept}`;
}

function strayLines(strays: readonly string[]): string[] {
  if (strays.length === 0) return [];
  return [`${strays.length} ${strays.length === 1 ? "folder is" : "folders are"} not a registered worktree, left alone:`, ...strays.map((path) => `  ${path}`)];
}

function uncheckedLines({ prsUnchecked, sessionsUnread }: PruneReport): string[] {
  return [
    ...(prsUnchecked ? [`PR merges not checked (${prsUnchecked}); only trees already in base are listed.`] : []),
    ...(sessionsUnread ? [`Open sessions can't be read (${sessionsUnread}), so every tree is kept.`] : []),
  ];
}

function folderNames(outcomes: readonly PruneOutcome[]): string[] {
  return outcomes.map(({ path }) => basename(path));
}

function named(names: readonly string[]): string {
  if (names.length === 0) return "";
  const more = names.length > NAMED_AT_MOST ? ` +${names.length - NAMED_AT_MOST} more` : "";
  return ` (${names.slice(0, NAMED_AT_MOST).join(", ")}${more})`;
}

function plural(count: number, one: string, many = `${one}s`): string {
  return count === 1 ? one : many;
}
