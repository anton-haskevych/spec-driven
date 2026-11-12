import { applyEdits } from "../../core/apply-edits";
import { resolveSpec } from "../../core/spec-folders";
import { planTick } from "../../phases/tick";
import { parseFlags } from "./args";

export const TICK_USAGE = 'phase tick <spec> <phase> "<item prefix>"|#N [--evidence <text>]';

export function phaseTick(projectDir: string, args: readonly string[]): string {
  const parsed = parseFlags(args, { evidence: { type: "string" } });
  const [specName, phase, selector] = parsed?.positionals ?? [];
  if (!parsed || !specName || !phase || !selector) return `usage: ${TICK_USAGE}`;

  const spec = resolveSpec(projectDir, specName);
  if (typeof spec === "string") return `phase tick: ${spec}`;

  const result = planTick(spec, { phase, selector, evidence: parsed.values.evidence });
  if (result.plan.kind !== "ok") return `phase tick: ${result.plan.reason}`;
  applyEdits(result.plan);
  const ticked = `ticked "${result.item}" in Phase ${result.phaseId}`;
  return result.phaseComplete ? `${ticked}\nPhase ${result.phaseId} complete — run update.md → Close the phase` : ticked;
}
