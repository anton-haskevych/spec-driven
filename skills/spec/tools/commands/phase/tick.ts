import { renderWritten } from "../../plan/phase-writer";
import { parseFlags } from "./args";
import type { PhaseContext } from "./context";

export const TICK_USAGE = 'phase tick <spec> <phase> "<item prefix>"|#N|<task-id> [--evidence <text>]';

export function phaseTick(context: PhaseContext, args: readonly string[]): string | Promise<string> {
  const parsed = parseFlags(args, { evidence: { type: "string" } });
  const [specName, phase, selector] = parsed?.positionals ?? [];
  if (!parsed || !specName || !phase || !selector) return `usage: ${TICK_USAGE}`;
  const writer = context.writerFor(specName);
  if (typeof writer === "string") return `phase tick: ${writer}`;
  return renderWritten("tick", writer.tick({ phase, selector, evidence: parsed.values.evidence }));
}
