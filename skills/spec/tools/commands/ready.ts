import { parseArgs } from "node:util";
import { findSpecs } from "../core/spec-folders";
import { systemRunner, type Runner } from "../core/run";
import { loadNodes } from "../graph/nodes";
import { readPlansAt } from "../plan/read-plans";
import { specLayout } from "../pr/groups";
import { buildOrder, shipAloneSuggestions } from "../ready/build-order";
import { readySet } from "../ready/ready-set";
import { renderBuildOrder, renderPrGroups, renderReadySet } from "../ready/render";

export const READY_USAGE = "ready <spec-name> [--order]";

export interface ReadyRequest {
  spec: string;
  order: boolean;
}

export function parseReadyArgs(args: readonly string[]): ReadyRequest | string {
  try {
    const { values, positionals } = parseArgs({ args: [...args], options: { order: { type: "boolean" } }, allowPositionals: true, strict: true });
    const [spec, ...extra] = positionals;
    return spec === undefined || extra.length > 0 ? `usage: ${READY_USAGE}` : { spec, order: values.order === true };
  } catch {
    return `usage: ${READY_USAGE}`;
  }
}

export function readyCommand(projectDir: string, args: readonly string[]): string {
  const request = parseReadyArgs(args);
  if (typeof request === "string") return request;
  return request.order ? orderReport(projectDir, request.spec) : readyReport(projectDir, request.spec);
}

export function readyReport(projectDir: string, specName: string | undefined, runner: Runner = systemRunner, now: Date = new Date()): string {
  if (!specName) return `usage: ${READY_USAGE}`;
  const [spec] = findSpecs(projectDir, specName);
  if (!spec) return `ready: no spec named ${specName}`;
  const plans = readPlansAt(projectDir, { runner }, now);
  const state = plans.state(spec);
  return `${renderReadySet(readySet(state, loadNodes(projectDir, plans)))}\n\n${renderPrGroups(state)}`;
}

export function orderReport(projectDir: string, specName: string, runner: Runner = systemRunner, now: Date = new Date()): string {
  const [spec] = findSpecs(projectDir, specName);
  if (!spec) return `ready: no spec named ${specName}`;
  const plans = readPlansAt(projectDir, { runner }, now);
  const state = plans.state(spec);
  const nodes = loadNodes(projectDir, plans);
  return renderBuildOrder(buildOrder(state, nodes), specLayout(state, nodes.get(spec.name)?.specBranch), shipAloneSuggestions(state, nodes));
}
