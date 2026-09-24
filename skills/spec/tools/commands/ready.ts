import { findSpecs } from "../core/spec-folders";
import { loadSpecState } from "../core/spec-state";
import { loadNodes } from "../graph/nodes";
import { readySet } from "../ready/ready-set";
import { renderPrGroups, renderReadySet } from "../ready/render";

export function readyReport(projectDir: string, specName: string | undefined): string {
  if (!specName) return "usage: ready <spec-name>";
  const [spec] = findSpecs(projectDir, specName);
  if (!spec) return `ready: no spec named ${specName}`;
  const state = loadSpecState(spec);
  return `${renderReadySet(readySet(state, loadNodes(projectDir)))}\n\n${renderPrGroups(state)}`;
}
