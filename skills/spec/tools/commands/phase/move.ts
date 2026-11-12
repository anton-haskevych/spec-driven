import { renderWritten } from "../../plan/phase-writer";
import { parseFlags } from "./args";
import type { PhaseContext } from "./context";

export const MOVE_USAGE = "phase move <spec> <task-id|#N|prefix>… --to <phase> [--from <phase>]";

// On the board a task is named by its id; in files, as `phase tick` selects it, from `--from`.
export function phaseMove(context: PhaseContext, args: readonly string[]): string | Promise<string> {
  const parsed = parseFlags(args, { to: { type: "string" }, from: { type: "string" } });
  const [specName, ...tasks] = parsed?.positionals ?? [];
  const to = parsed?.values.to;
  if (!parsed || !specName || tasks.length === 0 || !to) return `usage: ${MOVE_USAGE}`;
  const writer = context.writerFor(specName);
  if (typeof writer === "string") return `phase move: ${writer}`;
  return renderWritten("move", writer.move({ tasks, to, ...(parsed.values.from ? { from: parsed.values.from } : {}) }));
}
