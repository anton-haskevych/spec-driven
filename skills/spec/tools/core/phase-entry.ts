import { outlineMarkdown, type TaskItem } from "./markdown";
import type { CheckboxCount } from "./progress";

export interface PhaseEntrySummary {
  goal?: string;
  work?: string;
  deliverables: CheckboxCount;
  nextRun: string[];
}

const GOAL = /^Goal:\s*([\s\S]+?)(?=\n[A-Z][\w ]{2,30}:\s|$)/;
const DELIVERABLES = /^deliverables\b/i;
const IMPLEMENTATION = /^implementation guidance\b/i;
const SENTENCE_END = /\.\s+(?=[A-Z])/;
const RUN_LIMIT = 5;
const WORK_FALLBACK_ITEMS = 3;

export function summarizePhaseEntry(text: string): PhaseEntrySummary {
  const { tasks, paragraphs } = outlineMarkdown(text);
  const goal = paragraphs.map((p) => GOAL.exec(p.text)?.[1]).find((match) => match !== undefined);
  const deliverableTasks = tasks.some((t) => DELIVERABLES.test(t.section))
    ? tasks.filter((t) => DELIVERABLES.test(t.section))
    : tasks;

  return {
    goal: goal?.trim(),
    work: workSummary(paragraphs.filter((p) => IMPLEMENTATION.test(p.section)).map((p) => p.text), deliverableTasks),
    deliverables: count(deliverableTasks),
    nextRun: firstOpenRun(tasks),
  };
}

function workSummary(guidance: string[], deliverables: TaskItem[]): string | undefined {
  const firstParagraph = guidance.find((text) => text.length > 0);
  if (firstParagraph) return firstParagraph.split(SENTENCE_END)[0]?.replace(/[.\s]+$/, "");
  const titles = deliverables.slice(0, WORK_FALLBACK_ITEMS).map((t) => t.text);
  return titles.length > 0 ? titles.join("; ") : undefined;
}

function count(tasks: TaskItem[]): CheckboxCount {
  const checked = tasks.filter((t) => t.checked).length;
  return { checked, unchecked: tasks.length - checked };
}

function firstOpenRun(tasks: TaskItem[]): string[] {
  const topDepth = Math.min(...tasks.map((t) => t.depth));
  const top = tasks.filter((t) => t.depth === topDepth);
  const start = top.findIndex((t) => !t.checked);
  if (start === -1) return [];

  const section = top[start]?.section;
  const run: string[] = [];
  for (const task of top.slice(start)) {
    if (task.checked || task.section !== section || run.length === RUN_LIMIT) break;
    run.push(task.text);
  }
  return run;
}
