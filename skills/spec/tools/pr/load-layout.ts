import { join } from "node:path";
import { gitAt } from "../core/git";
import type { Runner } from "../core/run";
import { resolveSpec } from "../core/spec-folders";
import { readPlans } from "../plan/read-plans";
import { specOfBranch } from "../trees/naming";
import { laneOf, specLayout, type SpecLayout } from "./groups";

// From the record, never from git: no tool asks git whether spec-branch mode is on (principle-one-spec-layout).
// `fetch: false` reads what the last fetch left, for commands that must stay fast.
export function loadSpecLayout(projectDir: string, runner: Runner, spec: string, options: { fetch: boolean; now: Date }): SpecLayout | undefined {
  const plans = readPlans(gitAt(projectDir, runner), options);
  const joined = plans.joined(spec);
  if (!joined) return undefined;
  const folder = resolveSpec(projectDir, spec);
  const state = plans.state(typeof folder === "string" ? { name: spec, dir: join(projectDir, "docs", "specs", spec) } : folder);
  return specLayout(state, joined.spec.specBranch);
}

// A checkout on a lane of a spec in spec-branch mode: its work leaves through merge-back, not push or publish-docs.
export function laneRefusal(projectDir: string, runner: Runner, command: string, now = new Date()): string | undefined {
  const head = gitAt(projectDir, runner).out(["symbolic-ref", "--short", "-q", "HEAD"]);
  const spec = head.ok ? specOfBranch(head.value) : undefined;
  if (!head.ok || spec === undefined) return undefined;
  const layout = loadSpecLayout(projectDir, runner, spec, { fetch: false, now });
  if (!layout || laneOf(layout, head.value) === undefined) return undefined;
  return `${command}: ${head.value} is a lane of ${spec}; use merge-back ${spec} --push`;
}
