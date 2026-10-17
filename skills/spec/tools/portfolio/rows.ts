import { dirname, relative } from "node:path";
import { isOverdue, type Priority } from "../core/schedule";
import { isFinished, type SpecNode } from "../graph/nodes";

export interface SpecRow {
  name: string;
  root: string;
  status?: string;
  finished: boolean;
  area: string[];
  domain: string[];
  scope: string[];
  priority?: Priority;
  due?: string;
  overdue: boolean;
  updated?: string;
  progress: { done: number; total: number };
  stale?: string;
  dropped?: string;
  // Specs that declare `supersedes:` this one (computed).
  supersededBy?: string[];
}

export type SpecSummary = Pick<SpecRow, "progress" | "priority" | "due" | "overdue">;

const DAY_LENGTH = 10;

export function specRow(node: SpecNode, projectDir: string, today: string, supersededBy: readonly string[] = []): SpecRow {
  const { area, domain, scope, updated, stale, dropped } = node.meta;
  const { progress, priority, due, overdue } = specSummary(node, today);
  return {
    name: node.spec.name,
    root: relative(projectDir, dirname(node.spec.dir)),
    status: node.status,
    finished: isFinished(node),
    area,
    domain,
    scope,
    priority,
    due,
    overdue,
    updated: updated?.slice(0, DAY_LENGTH),
    progress,
    ...(stale ? { stale } : {}),
    ...(dropped ? { dropped } : {}),
    ...(supersededBy.length > 0 ? { supersededBy: [...supersededBy] } : {}),
  };
}

export function specSummary(node: SpecNode, today: string): SpecSummary {
  const { priority, due } = node.meta;
  return {
    progress: { done: node.phases.filter((phase) => phase.done).length, total: node.phases.length },
    priority,
    due,
    overdue: !isFinished(node) && isOverdue(due, today),
  };
}
