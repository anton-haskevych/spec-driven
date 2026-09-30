import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import { applyEdits } from "../core/apply-edits";
import { findSpecs } from "../core/spec-folders";
import { isoDay } from "../core/schedule";
import type { SpecFolder } from "../core/spec-folders";
import { planDeployed } from "../phases/deployed";
import { planTick } from "../phases/tick";

interface PhaseAction {
  usage: string;
  run(projectDir: string, args: string[]): string;
}

const ACTIONS: Record<string, PhaseAction> = {
  tick: { usage: 'phase tick <spec> <phase> "<item prefix>"|#N [--evidence <text>]', run: tick },
  deployed: { usage: "phase deployed <spec> <phase> [--date YYYY-MM-DD]", run: deployed },
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

  const spec = resolveSpec(projectDir, specName);
  if (typeof spec === "string") return `phase tick: ${spec}`;

  const result = planTick(spec, { phase, selector, evidence: parsed.values.evidence });
  if (result.plan.kind !== "ok") return `phase tick: ${result.plan.reason}`;
  applyEdits(result.plan);
  const ticked = `ticked "${result.item}" in Phase ${result.phaseId}`;
  return result.phaseComplete ? `${ticked}\nPhase ${result.phaseId} complete — run update.md → Close the phase` : ticked;
}

function deployed(projectDir: string, args: string[]): string {
  const usage = `usage: ${ACTIONS.deployed?.usage}`;
  const parsed = parseFlags(args, { date: { type: "string" } });
  const [specName, phase] = parsed?.positionals ?? [];
  if (!parsed || !specName || !phase) return usage;

  const spec = resolveSpec(projectDir, specName);
  if (typeof spec === "string") return `phase deployed: ${spec}`;

  const day = parsed.values.date ?? isoDay(new Date());
  const result = planDeployed(spec, { phase, day });
  if (result.plan.kind === "invalid") return `phase deployed: ${result.plan.reason}`;
  if (result.plan.kind === "unchanged") return result.plan.reason;
  applyEdits(result.plan);
  return `Phase ${result.phaseId} marked deployed ${day}`;
}

function resolveSpec(projectDir: string, name: string): SpecFolder | string {
  const specs = findSpecs(projectDir, name);
  const [spec] = specs;
  if (!spec) return `no spec named ${name}`;
  if (specs.length > 1) return `${specs.length} specs are named ${name}; run from the project that holds the one you mean`;
  return spec;
}

function parseFlags<T extends ParseArgsOptionsConfig>(args: string[], options: T) {
  try {
    return parseArgs({ args, options, allowPositionals: true, strict: true } as const);
  } catch {
    return undefined;
  }
}
