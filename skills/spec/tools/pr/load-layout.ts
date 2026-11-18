import { join } from "node:path";
import { gitAt } from "../core/git";
import type { Runner } from "../core/run";
import { resolveSpec } from "../core/spec-folders";
import { readPlans } from "../plan/read-plans";
import { specLayout, type SpecLayout } from "./groups";

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
