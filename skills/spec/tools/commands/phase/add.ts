import { renderPhaseOutcome } from "../../plan/phase-writer";
import { idList, parseCodeFlag, parseFlags } from "./args";
import type { PhaseContext } from "./context";

export const ADD_USAGE = 'phase add <spec> "<title>" [--after <id>] [--needs a,b] [--pr X] [--code false]';

const OPTIONS = { after: { type: "string" }, needs: { type: "string" }, pr: { type: "string" }, code: { type: "string" } } as const;

export function phaseAdd(context: PhaseContext, args: readonly string[]): string {
  const parsed = parseFlags(args, OPTIONS);
  const [specName, title] = parsed?.positionals ?? [];
  if (!parsed || !specName || !title?.trim()) return `usage: ${ADD_USAGE}`;
  const writer = context.writerFor(specName);
  if (typeof writer === "string") return `phase add: ${writer}`;
  const code = parseCodeFlag(parsed.values.code);
  if (typeof code === "string") return `phase add: ${code}`;
  const edges = { needs: idList(parsed.values.needs), pr: parsed.values.pr, code };
  return renderPhaseOutcome("add", writer.add({ title: title.trim(), after: parsed.values.after, edges }));
}
