import { applyEdits } from "../../core/apply-edits";
import { isoDay } from "../../core/schedule";
import { resolveSpec } from "../../core/spec-folders";
import { planDeployed } from "../../phases/deployed";
import { deployedOnMain } from "../../phases/deployed-land";
import { parseFlags } from "./args";

export const DEPLOYED_USAGE = "phase deployed <spec> <phase> [--date YYYY-MM-DD] [--land]";

export function phaseDeployed(projectDir: string, args: readonly string[]): string | Promise<string> {
  const parsed = parseFlags(args, { date: { type: "string" }, land: { type: "boolean" } });
  const [specName, phase] = parsed?.positionals ?? [];
  if (!parsed || !specName || !phase) return `usage: ${DEPLOYED_USAGE}`;
  const day = parsed.values.date ?? isoDay(new Date());
  if (parsed.values.land) return deployedOnMain(projectDir, { spec: specName, phase, day });

  const spec = resolveSpec(projectDir, specName);
  if (typeof spec === "string") return `phase deployed: ${spec}`;

  const result = planDeployed(spec, { phase, day });
  if (result.plan.kind === "invalid") return `phase deployed: ${result.plan.reason}`;
  if (result.plan.kind === "unchanged") return result.plan.reason;
  applyEdits(result.plan);
  return `Phase ${result.phaseId} marked deployed ${day}`;
}
