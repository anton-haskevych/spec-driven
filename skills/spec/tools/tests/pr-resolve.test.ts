import { afterEach, describe, expect, test } from "bun:test";
import { specStateFrom } from "../core/spec-state";
import { ghClient } from "../pr/gh";
import { pickGroup, prGroups } from "../pr/groups";
import { resolvePr } from "../pr/resolve";
import { phasedSpecFiles, prView, type PhaseSketch } from "./pr-factories";
import { stubRunner, type CannedRuns } from "./stub-runner";
import { createTree, type Tree } from "./tree";

const TWO_GROUPS: PhaseSketch[] = [
  { id: "1", title: "Schema", pr: "A" },
  { id: "2", title: "Import", pr: "B" },
  { id: "3", title: "Record the demo", code: false },
  { id: "4", title: "Export", pr: "A" },
];

function stateOf(phases: readonly PhaseSketch[]) {
  const files = phasedSpecFiles(phases);
  return specStateFrom({ name: "billing", dir: "/x/docs/specs/billing" }, (path) => files[path]);
}

describe("prGroups", () => {
  test("groups code phases by pr in progress order; task phases open no PR", () => {
    expect(prGroups(stateOf(TWO_GROUPS)).map((group) => [group.name, group.phases.map((phase) => phase.id)])).toEqual([
      ["A", ["1", "4"]],
      ["B", ["2"]],
    ]);
  });

  test("phases without a pr field form one unnamed group", () => {
    expect(prGroups(stateOf([{ id: "1", title: "Schema" }, { id: "2", title: "Import" }])).map((group) => group.name)).toEqual([undefined]);
  });
});

describe("pickGroup", () => {
  test("a named group matches case-insensitively and keeps the declared spelling", () => {
    expect(pickGroup(stateOf(TWO_GROUPS), "b")).toMatchObject({ ok: true, value: { name: "B" } });
  });

  test("no group named: the only group, else refuse naming the groups", () => {
    expect(pickGroup(stateOf([{ id: "1", title: "Schema", pr: "A" }]), undefined)).toMatchObject({ ok: true, value: { name: "A" } });
    expect(pickGroup(stateOf(TWO_GROUPS), undefined)).toEqual({ ok: false, reason: "billing has PR groups A, B — name one" });
  });

  test("an unknown group is refused with the ones that exist", () => {
    expect(pickGroup(stateOf(TWO_GROUPS), "C")).toEqual({ ok: false, reason: "billing has no PR group C (groups: A, B)" });
  });

  test("a spec with no phases yet stands for its one unnamed group", () => {
    expect(pickGroup(stateOf([]), undefined)).toEqual({ ok: true, value: { name: undefined, phases: [] } });
  });
});

describe("resolvePr", () => {
  let tree: Tree;
  afterEach(() => tree?.cleanup());

  const view = (number: number, state = "OPEN") => ({ stdout: JSON.stringify(prView({ number, state })) });
  const resolve = (args: string[], canned: CannedRuns) => {
    const runner = stubRunner(canned);
    return { result: resolvePr(ghClient(tree.root, runner), tree.root, args), calls: runner.calls };
  };

  test("<spec> <group> finds the PR by the group's branch, even with two groups open", () => {
    tree = createTree();
    tree.spec("billing", { ...phasedSpecFiles(TWO_GROUPS), "pr-opening.md": "## Spec state\n\nPR #900 (A), PR #901 (B)\n" });
    const { result, calls } = resolve(["billing", "a"], [[["gh", "pr", "view", "feat/billing-pr-a"], view(900)], [["gh", "pr", "view", "feat/billing-pr-b"], view(901)]]);
    expect(result).toMatchObject({ ok: true, value: { view: { number: 900 }, otherPrs: [901] } });
    expect(calls).toEqual([["gh", "pr", "view", "feat/billing-pr-a", "--json", expect.any(String)]]);
  });

  test("<spec> alone refuses when the spec has several PR groups", () => {
    tree = createTree();
    tree.spec("billing", phasedSpecFiles(TWO_GROUPS));
    expect(resolve(["billing"], []).result).toEqual({ ok: false, reason: "billing has PR groups A, B — name one" });
  });

  test("<spec> alone with one group uses its branch", () => {
    tree = createTree();
    tree.spec("billing", phasedSpecFiles([{ id: "1", title: "Schema", pr: "A" }]));
    expect(resolve(["billing"], [[["gh", "pr", "view", "feat/billing-pr-a"], view(902)]]).result).toMatchObject({ ok: true, value: { view: { number: 902 } } });
  });

  test("a single-group spec whose branch has no PR falls back to its Spec-state links", () => {
    tree = createTree();
    tree.spec("billing", { ...phasedSpecFiles([{ id: "1", title: "Schema", pr: "A" }]), "pr-opening.md": "## Spec state\n\nPR #779 merged.\n" });
    const { result } = resolve(["billing"], [[["gh", "pr", "view", "feat/billing-pr-a"], { code: 1, stderr: "no pull requests found" }], [["gh", "pr", "view", "779"], view(779, "MERGED")]]);
    expect(result).toMatchObject({ ok: true, value: { view: { number: 779 } } });
  });

  test("with several groups a missing branch PR never falls back to another group's link", () => {
    tree = createTree();
    tree.spec("billing", { ...phasedSpecFiles(TWO_GROUPS), "pr-opening.md": "## Spec state\n\nPR #901 (B)\n" });
    const { result } = resolve(["billing", "A"], [[["gh", "pr", "view", "feat/billing-pr-a"], { code: 1, stderr: 'no pull requests found for branch "feat/billing-pr-a"' }], [["gh", "pr", "view", "901"], view(901)]]);
    expect(result).toEqual({ ok: false, reason: 'no pull requests found for branch "feat/billing-pr-a"' });
  });

  test("an unknown spec is refused", () => {
    tree = createTree();
    expect(resolve(["nope"], []).result).toEqual({ ok: false, reason: "no spec named nope" });
  });
});
