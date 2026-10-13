import { gitAt } from "../core/git";
import { landOnMain, type MainEditPlan } from "../core/land-on-main";
import { defaultBranch, systemRunner, type Runner } from "../core/run";
import { findSpecs } from "../core/spec-folders";
import { NO_DEFAULT_BRANCH } from "../commands/push";
import { planDeployed, type DeployedRequest } from "./deployed";

export interface DeployedOnMainRequest extends DeployedRequest {
  spec: string;
}

// After a squash merge the phase is ticked on main, not in the merged tree, and a commit there would
// keep `trees prune` from removing it; so the marker lands on origin's main directly, like a merge line.
export async function deployedOnMain(projectDir: string, request: DeployedOnMainRequest, runner: Runner = systemRunner): Promise<string> {
  const branch = defaultBranch(projectDir, runner);
  if (!branch) return `phase deployed: ${NO_DEFAULT_BRANCH}`;
  const landing = await landOnMain(gitAt(projectDir, runner), branch, (dir) => deployedEdit(dir, branch, request));
  if (landing.kind === "landed") return `Phase ${landing.landed} marked deployed ${request.day} on ${branch} (${landing.sha.slice(0, 7)})`;
  return landing.kind === "unchanged" ? landing.reason : `phase deployed: ${landing.reason}`;
}

function deployedEdit(projectDir: string, branch: string, request: DeployedOnMainRequest): MainEditPlan<string> {
  const [spec, ...others] = findSpecs(projectDir, request.spec);
  if (!spec) return { kind: "refused", reason: `no spec named ${request.spec} on origin/${branch}` };
  if (others.length > 0) return { kind: "refused", reason: `${others.length + 1} specs are named ${request.spec} on origin/${branch}` };

  const { plan, phaseId } = planDeployed(spec, request);
  if (plan.kind === "invalid") return { kind: "refused", reason: plan.reason };
  if (plan.kind === "unchanged") return plan;
  const [edit] = plan.edits;
  if (!edit || !phaseId) return { kind: "refused", reason: "no progress.md edit to land" };
  return { kind: "write", file: edit.file, text: edit.text, message: `[deployed] ${request.spec} phase ${phaseId}`, landed: phaseId };
}
