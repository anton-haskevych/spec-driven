import { describe, expect, test } from "bun:test";
import { gitAt } from "../core/git";
import { cutSpecBranch, existingSpecBranches, isSpecBranchName, specBranchRefusal, startPlan, type ExistingBranch, type StartSeen } from "../crew/spec-branch-start";
import type { PhaseDoc } from "../plan/docs/phase-doc";
import type { SpecDoc } from "../plan/docs/spec-doc";
import { phaseDocPath, specDocPath } from "../plan/kinds";
import { viewOf } from "./fake-record";
import { phaseDoc, specDoc } from "./record-factories";
import { strictRunner } from "./stub-runner";

const SPEC = "checkout";
const CUT = "c0ffee1234567890";
const INTENT = { spec: SPEC, cutFrom: CUT, shipAlone: ["D"] };
const OLD_LANE: ExistingBranch = { branch: "feat/checkout-pr-a", where: ["origin", "tree"] };

function record(spec: Partial<SpecDoc> = {}, phases: PhaseDoc[] = [phaseDoc({ id: "1", pr: "A" }), phaseDoc({ id: "2", pr: "D" })]) {
  return viewOf({
    [specDocPath(SPEC)]: specDoc({ name: SPEC, phases: phases.map((phase) => phase.id), ...spec }),
    ...Object.fromEntries(phases.map((phase) => [phaseDocPath(SPEC, phase.id), phase])),
  });
}

describe("specBranchRefusal", () => {
  const world = { spec: SPEC, defaultDoc: undefined, specBranch: { cutFrom: CUT, shipAlone: ["D"] }, existing: [] };

  test("a spec off the record can't start the mode", () => {
    expect(specBranchRefusal({ ...world, plan: undefined })).toBe(`${SPEC} is not on the board; spec-branch mode needs the record (spec.ts join ${SPEC})`);
  });

  test("names every old branch and where it is", () => {
    const plan = { spec: specDoc({ name: SPEC, phases: ["1"] }), phases: [phaseDoc({ id: "1", pr: "A" })] };
    const existing = [OLD_LANE, { branch: "feat/checkout", where: ["local branch" as const] }];
    expect(specBranchRefusal({ ...world, specBranch: { cutFrom: CUT, shipAlone: [] }, plan, existing })).toBe(
      "feat/checkout-pr-a already exists (origin, tree); remove or merge it first; feat/checkout already exists (local branch); remove or merge it first",
    );
  });
});

describe("isSpecBranchName", () => {
  test("the spec branch and its lanes, not another spec's", () => {
    expect(["feat/checkout", "feat/checkout-pr-a", "feat/checkout-v2", "feat/checkout-v2-pr-a", "main"].filter((branch) => isSpecBranchName(SPEC, branch))).toEqual(["feat/checkout", "feat/checkout-pr-a"]);
  });
});

describe("startPlan", () => {
  const run = (view: ReturnType<typeof record>, existing: ExistingBranch[] = []) => {
    const seen: StartSeen[] = [];
    return { result: startPlan(INTENT, existing, (each) => seen.push(each))(view), seen };
  };

  test("mode off and nothing in the way: started, written", () => {
    const { result, seen } = run(record());
    expect(seen).toEqual([{ kind: "started", cutFrom: CUT }]);
    expect("ops" in result && result.ops.length).toBe(2);
  });

  test("mode on: a takeover, with the recorded cut and no checks", () => {
    const { result, seen } = run(record({ specBranch: { cutFrom: "0ld5ha", shipAlone: ["D"] } }), [OLD_LANE]);
    expect(result).toEqual({ unchanged: true });
    expect(seen).toEqual([{ kind: "taken-over", cutFrom: "0ld5ha" }]);
  });

  test("an old lane branch refuses the start and nothing is seen", () => {
    const { result, seen } = run(record(), [OLD_LANE]);
    expect(result).toEqual({ refused: "feat/checkout-pr-a already exists (origin, tree); remove or merge it first" });
    expect(seen).toEqual([]);
  });
});

describe("existingSpecBranches", () => {
  test("gathers the spec's branches from origin, local branches and trees", () => {
    const runner = strictRunner([
      [["git", "ls-remote", "--heads", "origin"], { stdout: `aaa\trefs/heads/main\nbbb\trefs/heads/feat/checkout-pr-a\nccc\trefs/heads/feat/checkout-v2\n` }],
      [["git", "for-each-ref", "--format=%(refname:short)", "refs/heads/"], { stdout: "main\nfeat/checkout-pr-a\nfeat/checkout\n" }],
      [["git", "--no-optional-locks", "worktree", "list", "--porcelain"], { stdout: "worktree /nowhere/main\nHEAD aaa\nbranch refs/heads/main\n\nworktree /nowhere/lane\nHEAD bbb\nbranch refs/heads/feat/checkout-pr-a\n\n" }],
    ]);
    expect(existingSpecBranches(gitAt("/nowhere", runner), SPEC)).toEqual({
      ok: true,
      value: [
        { branch: "feat/checkout-pr-a", where: ["origin", "local branch", "tree"] },
        { branch: "feat/checkout", where: ["local branch"] },
      ],
    });
  });

  test("origin not answering is a refusal, not an empty list", () => {
    const runner = strictRunner([[["git", "ls-remote", "--heads", "origin"], { code: 128, stderr: "fatal: unable to access" }]]);
    const found = existingSpecBranches(gitAt("/nowhere", runner), SPEC);
    expect(found.ok).toBe(false);
  });
});

describe("cutSpecBranch", () => {
  test("pushes the cut create-only to feat/<spec>", () => {
    const runner = strictRunner([
      [["git", "push", "--porcelain", "--no-verify", "--force-with-lease=refs/heads/feat/checkout:", "origin", `${CUT}:refs/heads/feat/checkout`], { stdout: `*\t${CUT}:refs/heads/feat/checkout\t[new branch]\nDone\n` }],
    ]);
    expect(cutSpecBranch(gitAt("/nowhere", runner), SPEC, CUT)).toEqual({ kind: "pushed" });
  });
});
