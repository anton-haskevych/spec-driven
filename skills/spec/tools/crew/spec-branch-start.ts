import type { Git } from "../core/git";
import { leasePush, NETWORK, type PushOutcome } from "../core/remote-push";
import type { Result } from "../core/result";
import type { RecordPlan } from "../record/write";
import { DEFAULT_PR_GROUP, prBranch, type PrDoc } from "../plan/docs/pr-doc";
import type { SpecBranch } from "../plan/docs/spec-doc";
import { defaultPrDoc, specBranchPlan, specBranchStartProblems, type SpecBranchIntent } from "../plan/ops/spec-branch";
import { readJoinedPlan, type JoinedPlan } from "../plan/state-source";
import { loadWorkspaces } from "../workspaces/list";

export type BranchPlace = "origin" | "local branch" | "tree";

export interface ExistingBranch {
  branch: string;
  where: BranchPlace[];
}

export interface StartWorld {
  spec: string;
  plan: JoinedPlan | undefined;
  defaultDoc: PrDoc | undefined;
  specBranch: SpecBranch;
  existing: readonly ExistingBranch[];
}

// An old feat/<spec>-pr-* would be reused on its old base (trees/acquire.ts), and an old feat/<spec> would become
// the spec branch with whatever it holds.
export function specBranchRefusal(world: StartWorld): string | undefined {
  const { spec, plan } = world;
  if (!plan) return `${spec} is not on the board; spec-branch mode needs the record (spec.ts join ${spec})`;
  const problems = [...specBranchStartProblems(plan, world.specBranch, world.defaultDoc), ...world.existing.map(existingProblem)];
  return problems.length > 0 ? problems.join("; ") : undefined;
}

export type StartSeen = { kind: "started" | "taken-over"; cutFrom: string };

// Read at the tip: the mode already on is a takeover, which skips every check.
export function startPlan(intent: SpecBranchIntent, existing: readonly ExistingBranch[], see: (seen: StartSeen) => void): RecordPlan {
  return (view) => {
    const plan = readJoinedPlan(view, intent.spec);
    const on = plan?.spec.specBranch;
    if (on) {
      see({ kind: "taken-over", cutFrom: on.cutFrom });
      return { unchanged: true };
    }
    const specBranch = { cutFrom: intent.cutFrom, shipAlone: intent.shipAlone };
    const refused = specBranchRefusal({ spec: intent.spec, plan, defaultDoc: defaultPrDoc(view, intent.spec), specBranch, existing });
    if (refused) return { refused };
    see({ kind: "started", cutFrom: intent.cutFrom });
    return specBranchPlan(intent)(view);
  };
}

function existingProblem({ branch, where }: ExistingBranch): string {
  return `${branch} already exists (${where.join(", ")}); remove or merge it first`;
}

export function isSpecBranchName(spec: string, branch: string): boolean {
  const head = prBranch(spec, DEFAULT_PR_GROUP);
  return branch === head || branch.startsWith(`${head}-pr-`);
}

export function existingSpecBranches(git: Git, spec: string): Result<ExistingBranch[]> {
  const remote = git.out(["ls-remote", "--heads", "origin"], NETWORK);
  if (!remote.ok) return { ok: false, reason: `can't list origin's branches (${remote.reason})` };
  const local = git.out(["for-each-ref", "--format=%(refname:short)", "refs/heads/"]);
  if (!local.ok) return local;
  const trees = loadWorkspaces(git);
  if (!trees.ok) return trees;
  const found = new Map<string, BranchPlace[]>();
  const note = (place: BranchPlace) => (branch: string | undefined) => {
    if (branch !== undefined && isSpecBranchName(spec, branch)) found.set(branch, [...(found.get(branch) ?? []), place]);
  };
  remote.value.split("\n").map((line) => line.split("\trefs/heads/")[1]).forEach(note("origin"));
  local.value.split("\n").forEach(note("local branch"));
  trees.value.map((tree) => tree.branch).forEach(note("tree"));
  return { ok: true, value: [...found].map(([branch, where]) => ({ branch, where })) };
}

// Create-only: a branch someone else cut first is left as it is.
export function cutSpecBranch(git: Git, spec: string, cutFrom: string): PushOutcome {
  const ref = `refs/heads/${prBranch(spec, DEFAULT_PR_GROUP)}`;
  return leasePush(git, ref, "", `${cutFrom}:${ref}`);
}
