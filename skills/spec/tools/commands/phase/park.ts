import { isoTimestamp } from "../../core/schedule";
import { renderPhaseOutcome } from "../../plan/phase-writer";
import { parseFlags } from "./args";
import type { PhaseContext } from "./context";

export const PARK_USAGE = 'phase park <spec> <phase> "<question>" [--recommend "<answer>"]';
export const UNPARK_USAGE = 'phase unpark <spec> <phase> "<answer>"';

export function phasePark(context: PhaseContext, args: readonly string[]): string {
  const parsed = parseFlags(args, { recommend: { type: "string" } });
  const [specName, phase, question] = parsed?.positionals ?? [];
  if (!parsed || !specName || !phase || !question?.trim()) return `usage: ${PARK_USAGE}`;
  const writer = context.writerFor(specName);
  if (typeof writer === "string") return `phase park: ${writer}`;
  const at = isoTimestamp(context.deps.now());
  return renderPhaseOutcome("park", writer.park({ phase, question, recommend: parsed.values.recommend, at }));
}

export function phaseUnpark(context: PhaseContext, args: readonly string[]): string {
  const parsed = parseFlags(args, {});
  const [specName, phase, answer] = parsed?.positionals ?? [];
  if (!parsed || !specName || !phase || !answer?.trim()) return `usage: ${UNPARK_USAGE}`;
  const writer = context.writerFor(specName);
  if (typeof writer === "string") return `phase unpark: ${writer}`;
  return renderPhaseOutcome("unpark", writer.unpark({ phase, answer, at: isoTimestamp(context.deps.now()) }));
}
