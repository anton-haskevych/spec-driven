import { describe, expect, test } from "bun:test";
import type { PhaseState, SpecState } from "../core/spec-state";
import { baseBranchOf, branchOf, specLayout } from "../pr/groups";
import { phaseEdges, phaseState } from "./factories";

function spec(phases: PhaseState[]): SpecState {
  return { spec: { name: "x", dir: "/specs/x" }, hasProgress: true, phases };
}

const grouped = (id: string, pr: string | undefined, extra: Partial<PhaseState> = {}) => phaseState({ id, edges: phaseEdges({ declared: true, ...(pr ? { pr } : {}) }), ...extra });
const ids = (phases: readonly PhaseState[] | undefined) => phases?.map((phase) => phase.id);

describe("specLayout outside spec-branch mode", () => {
  test("a spec with no pr: groups has no mode and one group on feat/<spec>", () => {
    const layout = specLayout(spec([grouped("1", undefined), grouped("2", undefined)]), { cutFrom: "abc", shipAlone: [] });
    expect(layout.mode).toBe("per-group");
    expect([...layout.groups.keys()]).toEqual(["default"]);
    expect(layout.groups.get("default")).toMatchObject({ branch: "feat/x", base: { kind: "default" }, shipsAlone: false });
    expect(layout.ungrouped).toEqual([]);
    expect(layout.finalPr).toBeUndefined();
  });

  test("without specBranch every group ships to the default branch on its own branch", () => {
    const layout = specLayout(spec([grouped("1", "A"), grouped("2", "B")]));
    expect(layout.mode).toBe("per-group");
    expect(layout.groups.get("B")).toMatchObject({ branch: "feat/x-pr-b", base: { kind: "default" }, shipsAlone: false });
  });
});

describe("specLayout in spec-branch mode", () => {
  const mixed = spec([
    grouped("1", "A", { done: true }),
    grouped("2", "A"),
    grouped("3", "D"),
    grouped("4", undefined),
    grouped("5", undefined, { done: true }),
    grouped("6", undefined, { code: false }),
  ]);
  const layout = specLayout(mixed, { cutFrom: "abc", shipAlone: ["d"] });

  test("lanes are cut from feat/<spec>; ship-alone groups from the default branch", () => {
    expect(layout.mode).toBe("spec-branch");
    expect(layout.groups.get("A")).toMatchObject({ branch: "feat/x-pr-a", base: { kind: "spec-branch", branch: "feat/x" }, shipsAlone: false });
    expect(layout.groups.get("D")).toMatchObject({ branch: "feat/x-pr-d", base: { kind: "default" }, shipsAlone: true });
  });

  test("open code phases with no pr: are ungrouped, not a group; done and task phases are left alone", () => {
    expect(ids(layout.ungrouped)).toEqual(["4"]);
    expect(layout.groups.has("default")).toBe(false);
  });

  test("the final PR goes from feat/<spec> and carries every lane phase, not the ship-alone ones", () => {
    expect(layout.finalPr?.head).toBe("feat/x");
    expect(ids(layout.finalPr?.phases)).toEqual(["1", "2"]);
  });
});

describe("branchOf", () => {
  test("group default is feat/<spec> in either mode; any other group is its lane branch", () => {
    const on = specLayout(spec([grouped("1", "A")]), { cutFrom: "abc", shipAlone: [] });
    const off = specLayout(spec([grouped("1", undefined)]));
    expect(branchOf(on, "default")).toBe("feat/x");
    expect(branchOf(off, "default")).toBe("feat/x");
    expect(branchOf(on, "A")).toBe("feat/x-pr-a");
  });
});

describe("baseBranchOf", () => {
  const phases = [grouped("1", "A"), grouped("2", "D")];

  test("a lane is cut from feat/<spec>, a ship-alone group from the default branch", () => {
    const layout = specLayout(spec(phases), { cutFrom: "abc", shipAlone: ["D"] });
    expect([baseBranchOf(layout, "A", "main"), baseBranchOf(layout, "D", "main")]).toEqual(["feat/x", "main"]);
  });

  test("outside the mode, an unknown group or no layout, the default branch", () => {
    expect(baseBranchOf(specLayout(spec(phases)), "A", "main")).toBe("main");
    expect(baseBranchOf(specLayout(spec(phases), { cutFrom: "abc", shipAlone: [] }), "Z", "main")).toBe("main");
    expect(baseBranchOf(undefined, undefined, "trunk")).toBe("trunk");
  });
});
