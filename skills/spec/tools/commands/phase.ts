import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import { applyEdits } from "../core/apply-edits";
import { findSpecs } from "../core/spec-folders";
import { planTick } from "../phases/tick";

interface PhaseAction {
  usage: string;
  run(projectDir: string, args: string[]): string;
}

const ACTIONS: Record<string, PhaseAction> = {
  tick: { usage: 'phase tick <spec> <phase> "<item prefix>"|#N [--evidence <text>]', run: tick },
};

export const PHASE_USAGE = Object.values(ACTIONS)
  .map((action) => action.usage)
  .join(" | ");

export function phaseCommand(projectDir: string, args: readonly string[]): string {
  const [name, ...rest] = args;
  const action = name !== undefined && Object.hasOwn(ACTIONS, name) ? ACTIONS[name] : undefined;
  return action ? action.run(projectDir, rest) : `usage: ${PHASE_USAGE}`;
}

function tick(projectDir: string, args: string[]): string {
  const usage = `usage: ${ACTIONS.tick?.usage}`;
  const parsed = parseFlags(args, { evidence: { type: "string" } });
  const [specName, phase, selector] = parsed?.positionals ?? [];
  if (!parsed || !specName || !phase || !selector) return usage;

  const specs = findSpecs(projectDir, specName);
  const [spec] = specs;
  if (!spec) return `phase tick: no spec named ${specName}`;
  if (specs.length > 1) return `phase tick: ${specs.length} specs are named ${specName}; run from the project that holds the one you mean`;

  const result = planTick(spec, { phase, selector, evidence: parsed.values.evidence });
  if (result.plan.kind !== "ok") return `phase tick: ${result.plan.reason}`;
  applyEdits(result.plan);
  const ticked = `ticked "${result.item}" in Phase ${result.phaseId}`;
  return result.phaseComplete ? `${ticked}\nPhase ${result.phaseId} complete — run update.md → Close the phase` : ticked;
}

function parseFlags<T extends ParseArgsOptionsConfig>(args: string[], options: T) {
  try {
    return parseArgs({ args, options, allowPositionals: true, strict: true } as const);
  } catch {
    return undefined;
  }
}
