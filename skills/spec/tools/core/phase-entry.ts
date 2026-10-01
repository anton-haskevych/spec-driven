import { outlineMarkdown, type TaskItem } from "./markdown";
import type { CheckboxCount } from "./progress";

export interface PhaseEntrySummary {
  goal?: string;
  outcome?: string;
  work?: string;
  deliverables: CheckboxCount;
  nextRun: string[];
}

const DELIVERABLES = /^deliverables\b/i;
const IMPLEMENTATION = /^implementation guidance\b/i;
const SENTENCE_END = /\.\s+(?=[A-Z])/;
const RUN_LIMIT = 5;
const WORK_FALLBACK_ITEMS = 3;

export function summarizePhaseEntry(text: string): PhaseEntrySummary {
  const { tasks, paragraphs } = outlineMarkdown(text);
  const labelled = (label: string) => paragraphs.map((p) => labelledText(p.text, label)).find((match) => match !== undefined);
  const deliverableTasks = tasks.some((t) => DELIVERABLES.test(t.section))
    ? tasks.filter((t) => DELIVERABLES.test(t.section))
    : tasks;

  return {
    goal: labelled("Goal"),
    outcome: labelled("Outcome"),
    work: workSummary(paragraphs.filter((p) => IMPLEMENTATION.test(p.section)).map((p) => p.text), deliverableTasks),
    deliverables: count(deliverableTasks),
    nextRun: firstOpenRun(tasks),
  };
}

export function firstSentence(text: string): string | undefined {
  return text.split(SENTENCE_END)[0]?.replace(/[.\s]+$/, "");
}

// A label paragraph ("Goal: …") runs until the next "Label:" line, e.g. "Depends on:".
function labelledText(paragraph: string, label: string): string | undefined {
  const match = new RegExp(`^${label}:\\s*([\\s\\S]+?)(?=\\n[A-Z][\\w ]{2,30}:\\s|$)`).exec(paragraph);
  return match?.[1]?.trim();
}

function workSummary(guidance: string[], deliverables: TaskItem[]): string | undefined {
  const firstParagraph = guidance.find((text) => text.length > 0);
  if (firstParagraph) return firstSentence(firstParagraph);
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
