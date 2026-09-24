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

const DAY_LENGTH = 10;

export function specRow(node: SpecNode, projectDir: string, today: string): SpecRow {
  const finished = isFinished(node);
  const { area, domain, scope, priority, due, updated } = node.meta;
  return {
    name: node.spec.name,
    root: relative(projectDir, dirname(node.spec.dir)),
    status: node.status,
    finished,
    area,
    domain,
    scope,
    priority,
    due,
    overdue: !finished && isOverdue(due, today),
    updated: updated?.slice(0, DAY_LENGTH),
    progress: { done: node.phases.filter((phase) => phase.done).length, total: node.phases.length },
  };
}
