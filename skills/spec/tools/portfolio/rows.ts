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
}

export type SpecSummary = Pick<SpecRow, "progress" | "priority" | "due" | "overdue">;

const DAY_LENGTH = 10;

export function specRow(node: SpecNode, projectDir: string, today: string): SpecRow {
  const { area, domain, scope, updated } = node.meta;
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
