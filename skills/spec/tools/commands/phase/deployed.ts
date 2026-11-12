import { isoDay } from "../../core/schedule";
import { deployedOnMain } from "../../phases/deployed-land";
import { renderWritten } from "../../plan/phase-writer";
import { parseFlags } from "./args";
import type { PhaseContext } from "./context";

export const DEPLOYED_USAGE = "phase deployed <spec> <phase> [--date YYYY-MM-DD] [--land]";

export function phaseDeployed(context: PhaseContext, args: readonly string[]): string | Promise<string> {
  const parsed = parseFlags(args, { date: { type: "string" }, land: { type: "boolean" } });
  const [specName, phase] = parsed?.positionals ?? [];
  if (!parsed || !specName || !phase) return `usage: ${DEPLOYED_USAGE}`;
  const day = parsed.values.date ?? isoDay(context.deps.now());
  // A joined spec's marker is on the record, which every tree reads: nothing lands on main.
  if (parsed.values.land && !context.isJoined(specName)) return deployedOnMain(context.projectDir, { spec: specName, phase, day });
  const writer = context.writerFor(specName);
  if (typeof writer === "string") return `phase deployed: ${writer}`;
  return renderWritten("deployed", writer.deployed({ phase, day }));
}
