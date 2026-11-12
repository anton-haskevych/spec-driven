import { applyEdits } from "../../core/apply-edits";
import { systemRunner } from "../../core/run";
import { resolveSpec } from "../../core/spec-folders";
import { loadSpecStateFromFiles } from "../../core/spec-state";
import { loadNodes } from "../../graph/nodes";
import { parseItemAssignments } from "../../phases/move-items";
import { refsToPhase } from "../../phases/review-refs";
import { planSplit } from "../../phases/split";
import { specStatesAt } from "../../plan/read-plans";
import { parseFlags } from "./args";

export const SPLIT_USAGE = 'phase split <spec> <id> "<title b>" ["<title c>"…] [--items "b:1,2 c:3"]';

export function phaseSplit(projectDir: string, args: readonly string[]): string {
  const parsed = parseFlags(args, { items: { type: "string", multiple: true } });
  const [specName, id, ...rawTitles] = parsed?.positionals ?? [];
  const titles = rawTitles.map((title) => title.trim()).filter(Boolean);
  if (!parsed || !specName || !id || titles.length === 0) return `usage: ${SPLIT_USAGE}`;

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
  const refs = refsToPhase(loadSpecStateFromFiles(spec), kept, nodes, specStatesAt(projectDir, systemRunner, new Date()));
  const review = refs.length === 0 ? "" : `\nThese still point at Phase ${kept}; keep them, or retarget to a new part:\n${refs.map((ref) => `- ${ref}`).join("\n")}`;
  return `split Phase ${kept}: kept ${kept}, added ${added}${review}`;
}
