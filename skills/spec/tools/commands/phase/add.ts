import { applyEdits } from "../../core/apply-edits";
import { resolveSpec } from "../../core/spec-folders";
import { loadNodes } from "../../graph/nodes";
import { planAdd } from "../../phases/add";
import { idList, parseCodeFlag, parseFlags } from "./args";

export const ADD_USAGE = 'phase add <spec> "<title>" [--after <id>] [--needs a,b] [--pr X] [--code false]';

const OPTIONS = { after: { type: "string" }, needs: { type: "string" }, pr: { type: "string" }, code: { type: "string" } } as const;

export function phaseAdd(projectDir: string, args: readonly string[]): string {
  const parsed = parseFlags(args, OPTIONS);
  const [specName, title] = parsed?.positionals ?? [];
  if (!parsed || !specName || !title?.trim()) return `usage: ${ADD_USAGE}`;

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
