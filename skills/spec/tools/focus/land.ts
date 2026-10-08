import { join, relative } from "node:path";
import { readTextIfExists } from "../core/files";
import { gitFailureReason, type Git } from "../core/git";
import { findSpecs } from "../core/spec-folders";
import { baseProject } from "../mainline/load";
import { commitOnto } from "../publish/commit-onto";
import { NON_FAST_FORWARD } from "../publish/publish";
import { pinDefault } from "../publish/snapshot";
import { planFocus, type FocusAction, type FocusLanded } from "./plan";

export interface FocusRequest {
  defaultBranch: string;
  action: FocusAction;
}

// `refused`: the request itself can't apply (said as `focus <action>: …`); `failed`: git or origin said no.
export type LandOutcome =
  | { kind: "landed"; sha: string; landed: FocusLanded }
  | { kind: "refused"; reason: string }
  | { kind: "failed"; reason: string };

type Attempt = LandOutcome | { kind: "retry" };

const ATTEMPTS = 2;

export async function landFocus(git: Git, request: FocusRequest): Promise<LandOutcome> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const outcome = await landAttempt(git, request);
    if (outcome.kind !== "retry") return outcome;
  }
  return { kind: "failed", reason: `${request.defaultBranch} moved twice while writing; nothing pushed — run it again` };
}

async function landAttempt(git: Git, { defaultBranch: branch, action }: FocusRequest): Promise<Attempt> {
  const tip = pinDefault(git, branch);
  if (!tip.ok) return { kind: "failed", reason: `can't read origin/${branch}: ${tip.reason}; nothing written` };
  const project = await baseProject(git, tip.value);
  if (!project.ok) return { kind: "failed", reason: project.reason };

  const specs = findSpecs(project.value.dir, action.spec);
  const [spec] = specs;
  if (!spec) return { kind: "refused", reason: `no spec named ${action.spec} on origin/${branch}; land the spec first` };
  if (specs.length > 1) return { kind: "refused", reason: `${specs.length} specs are named ${action.spec} on origin/${branch}` };

  const file = join(spec.dir, "CLAUDE.md");
  const plan = planFocus(action, readTextIfExists(file) ?? "");
  if (plan.kind === "refused") return plan;

  const blob = git.out(["hash-object", "-w", "--stdin"], { stdin: plan.text });
  if (!blob.ok) return { kind: "failed", reason: blob.reason };
  const commit = commitOnto(git, tip.value, `100644 blob ${blob.value}\t${relative(project.value.root, file)}\0`, plan.message);
  if (!commit.ok) return { kind: "failed", reason: commit.reason };

  const pushed = git.run(["push", "-q", "origin", `${commit.value}:refs/heads/${branch}`]);
  if (pushed.code !== 0 && NON_FAST_FORWARD.test(pushed.stderr)) return { kind: "retry" };
  if (pushed.code !== 0) return { kind: "failed", reason: `push to ${branch} refused: ${gitFailureReason(pushed.stderr)}` };
  return { kind: "landed", sha: commit.value, landed: plan.landed };
}
