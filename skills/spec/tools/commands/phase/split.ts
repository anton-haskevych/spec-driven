import { parseItemAssignments } from "../../phases/move-items";
import { renderWritten } from "../../plan/phase-writer";
import { parseFlags } from "./args";
import type { PhaseContext } from "./context";

export const SPLIT_USAGE = 'phase split <spec> <id> "<title b>" ["<title c>"…] [--items "b:1,2 c:3"]';

export function phaseSplit(context: PhaseContext, args: readonly string[]): string | Promise<string> {
  const parsed = parseFlags(args, { items: { type: "string", multiple: true } });
  const [specName, id, ...rawTitles] = parsed?.positionals ?? [];
  const titles = rawTitles.map((title) => title.trim()).filter(Boolean);
  if (!parsed || !specName || !id || titles.length === 0) return `usage: ${SPLIT_USAGE}`;
  const writer = context.writerFor(specName);
  if (typeof writer === "string") return `phase split: ${writer}`;
  const items = parseItemAssignments(parsed.values.items ?? [], titles.length);
  if (typeof items === "string") return `phase split: ${items}`;
  return renderWritten("split", writer.split({ id, titles, items }));
}
