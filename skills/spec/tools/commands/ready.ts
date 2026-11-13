import { findSpecs } from "../core/spec-folders";
import { systemRunner, type Runner } from "../core/run";
import { loadNodes } from "../graph/nodes";
import { readPlansAt } from "../plan/read-plans";
import { readySet } from "../ready/ready-set";
import { renderPrGroups, renderReadySet } from "../ready/render";

export function readyReport(projectDir: string, specName: string | undefined, runner: Runner = systemRunner, now: Date = new Date()): string {
  if (!specName) return "usage: ready <spec-name>";
  const [spec] = findSpecs(projectDir, specName);
  if (!spec) return `ready: no spec named ${specName}`;
  const plans = readPlansAt(projectDir, runner, now);
  const state = plans.state(spec);
  return `${renderReadySet(readySet(state, loadNodes(projectDir, plans)))}\n\n${renderPrGroups(state)}`;
}
