import { renderWritten } from "../../plan/phase-writer";
import type { TaskRequest } from "../../phases/task";
import { parseFlags } from "./args";
import type { PhaseContext } from "./context";

export const TASK_USAGE = 'phase task <spec> <phase> --add "<text>"… | --edit <task-id|#N|prefix> "<text>" | --drop <task-id|#N|prefix>';

const OPTIONS = { add: { type: "string", multiple: true }, edit: { type: "string" }, drop: { type: "string" } } as const;

export function phaseTask(context: PhaseContext, args: readonly string[]): string | Promise<string> {
  const parsed = parseFlags(args, OPTIONS);
  const [specName, phase, text, ...extra] = parsed?.positionals ?? [];
  if (!parsed || !specName || !phase || extra.length > 0) return `usage: ${TASK_USAGE}`;
  const request = requestOf(phase, parsed.values, text);
  if (!request) return `usage: ${TASK_USAGE}`;
  const writer = context.writerFor(specName);
  if (typeof writer === "string") return `phase task: ${writer}`;
  return renderWritten("task", writer.task(request));
}

function requestOf(phase: string, values: { add?: string[]; edit?: string; drop?: string }, text: string | undefined): TaskRequest | undefined {
  const texts = (values.add ?? []).map((each) => each.trim()).filter(Boolean);
  const given = [texts.length > 0, values.edit !== undefined, values.drop !== undefined].filter(Boolean).length;
  if (given !== 1) return undefined;
  if (texts.length > 0) return text === undefined ? { phase, action: "add", texts } : undefined;
  if (values.edit !== undefined) return text?.trim() ? { phase, action: "edit", task: values.edit, text: text.trim() } : undefined;
  return values.drop && text === undefined ? { phase, action: "drop", task: values.drop } : undefined;
}
