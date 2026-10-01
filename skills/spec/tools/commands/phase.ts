import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import { applyEdits } from "../core/apply-edits";
import { findSpecs } from "../core/spec-folders";
import { isoDay } from "../core/schedule";
import type { SpecFolder } from "../core/spec-folders";
import { loadNodes } from "../graph/nodes";
import { planAdd } from "../phases/add";
import { planDeployed } from "../phases/deployed";
import { parseItemAssignments } from "../phases/move-items";
import { refsToPhase } from "../phases/review-refs";
import { planSplit } from "../phases/split";
import { loadSpecState } from "../core/spec-state";
import { planTick } from "../phases/tick";

interface PhaseAction {
  usage: string;
  run(projectDir: string, args: string[]): string;
}

const ACTIONS: Record<string, PhaseAction> = {
  tick: { usage: 'phase tick <spec> <phase> "<item prefix>"|#N [--evidence <text>]', run: tick },
  deployed: { usage: "phase deployed <spec> <phase> [--date YYYY-MM-DD]", run: deployed },
  add: {
    usage: 'phase add <spec> "<title>" [--after <id>] [--needs a,b] [--pr X] [--code false]',
    run: add,
  },
  split: {
    usage: 'phase split <spec> <id> "<title b>" ["<title c>"…] [--items "b:1,2 c:3"]',
    run: split,
  },
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

function add(projectDir: string, args: string[]): string {
  const usage = `usage: ${ACTIONS.add?.usage}`;
  const options = { after: { type: "string" }, needs: { type: "string" }, pr: { type: "string" }, code: { type: "string" } } as const;
  const parsed = parseFlags(args, options);
  const [specName, title] = parsed?.positionals ?? [];
  if (!parsed || !specName || !title?.trim()) return usage;

  const spec = resolveSpec(projectDir, specName);
  if (typeof spec === "string") return `phase add: ${spec}`;
  const code = parseCodeFlag(parsed.values.code);
  if (typeof code === "string") return `phase add: ${code}`;

  const edges = { needs: idList(parsed.values.needs), pr: parsed.values.pr, code };
  const result = planAdd(spec, { title: title.trim(), after: parsed.values.after, edges }, loadNodes(projectDir));
  if (result.plan.kind !== "ok") return `phase add: ${result.plan.reason}`;
  applyEdits(result.plan);
  return `added Phase ${result.phaseId} — ${title.trim()} → ${result.pointer}\nFill in its Goal, Outcome, files and deliverables.`;
}

function split(projectDir: string, args: string[]): string {
  const usage = `usage: ${ACTIONS.split?.usage}`;
  const parsed = parseFlags(args, { items: { type: "string", multiple: true } });
  const [specName, id, ...rawTitles] = parsed?.positionals ?? [];
  const titles = rawTitles.map((title) => title.trim()).filter(Boolean);
  if (!parsed || !specName || !id || titles.length === 0) return usage;

  const spec = resolveSpec(projectDir, specName);
  if (typeof spec === "string") return `phase split: ${spec}`;
  const items = parseItemAssignments(parsed.values.items ?? [], titles.length);
  if (typeof items === "string") return `phase split: ${items}`;

  const nodes = loadNodes(projectDir);
  const result = planSplit(spec, { id, titles, items }, nodes);
  if (result.kind === "invalid") return `phase split: ${result.reason}`;
  applyEdits(result.plan);
  const kept = result.original.id;
  const added = result.parts.map((part) => `${part.id} — ${part.title} → ${part.pointer}`).join(", ");
  const refs = refsToPhase(loadSpecState(spec), kept, nodes);
  const review = refs.length === 0 ? "" : `\nThese still point at Phase ${kept}; keep them, or retarget to a new part:\n${refs.map((ref) => `- ${ref}`).join("\n")}`;
  return `split Phase ${kept}: kept ${kept}, added ${added}${review}`;
}

const CODE_FLAG_VALUES: Record<string, boolean> = { true: true, false: false };

function parseCodeFlag(raw: string | undefined): boolean | undefined | string {
  if (raw === undefined) return undefined;
  return Object.hasOwn(CODE_FLAG_VALUES, raw) ? CODE_FLAG_VALUES[raw] : `--code must be true or false, not "${raw}"`;
}

function idList(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((id) => id.trim()).filter(Boolean);
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
