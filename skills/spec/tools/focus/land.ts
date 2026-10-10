import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import type { Git } from "../core/git";
import { landOnMain, type MainEditPlan, type MainLanding } from "../core/land-on-main";
import { findSpecs } from "../core/spec-folders";
import { planFocus, type FocusAction, type FocusLanded } from "./plan";

export interface FocusRequest {
  defaultBranch: string;
  action: FocusAction;
}

export type LandOutcome = MainLanding<FocusLanded>;

export function landFocus(git: Git, { defaultBranch: branch, action }: FocusRequest): Promise<LandOutcome> {
  return landOnMain(git, branch, (projectDir) => focusEdit(projectDir, branch, action));
}

function focusEdit(projectDir: string, branch: string, action: FocusAction): MainEditPlan<FocusLanded> {
  const specs = findSpecs(projectDir, action.spec);
  const [spec] = specs;
  if (!spec) return { kind: "refused", reason: `no spec named ${action.spec} on origin/${branch}; land the spec first` };
  if (specs.length > 1) return { kind: "refused", reason: `${specs.length} specs are named ${action.spec} on origin/${branch}` };

  const file = join(spec.dir, "CLAUDE.md");
  const plan = planFocus(action, readTextIfExists(file) ?? "");
  return plan.kind === "refused" ? plan : { ...plan, file };
}
