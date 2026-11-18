import { describe, expect, test } from "bun:test";
import { babysitPack } from "../context/babysit-pack";
import type { SpecState } from "../core/spec-state";
import { specLayout } from "../pr/groups";
import { phaseEdges, phaseState } from "./factories";

const state: SpecState = {
  spec: { name: "pr-babysit", dir: "/specs/pr-babysit" },
  hasProgress: true,
  phases: [phaseState({ id: "1", done: true, edges: phaseEdges({ pr: "B" }) })],
};

describe("babysitPack", () => {
  test("`<group> hold` names group B and says the PR is held for review", () => {
    const pack = babysitPack({ state, doctor: "doctor: clean" }, "B hold");
    expect(pack).toContain("### PR group B · branch feat/pr-babysit-pr-b");
    expect(pack).toContain("Mode: hold-for-review (`hold`)");
  });

  test("without `hold` the mode line is absent", () => {
    const pack = babysitPack({ state, doctor: "doctor: clean" }, "B");
    expect(pack).toContain("### PR group B");
    expect(pack).not.toContain("Mode:");
  });

  test("an unknown group still says so", () => {
    expect(babysitPack({ state, doctor: "" }, "C hold")).toBe("No PR group C in pr-babysit; its groups: B. Tell the user and stop.");
  });

  test("in spec-branch mode `default`, or no group, is the final PR on feat/<spec> over every lane phase", () => {
    const lanes: SpecState = { ...state, phases: [phaseState({ id: "1", done: true, edges: phaseEdges({ pr: "A" }) }), phaseState({ id: "2", done: true, edges: phaseEdges({ pr: "B" }) }), phaseState({ id: "3", edges: phaseEdges({ pr: "D" }) })] };
    const layout = specLayout(lanes, { cutFrom: "abc", shipAlone: ["D"] });
    for (const hint of ["default hold", "hold", undefined]) {
      const pack = babysitPack({ state: lanes, doctor: "", layout }, hint);
      expect(pack).toContain("### PR group default · branch feat/pr-babysit");
      expect(pack).toContain("final PR");
      expect(pack).not.toContain("Open phases");
    }
  });

  test("a ship-alone group in the mode keeps its own branch", () => {
    const lanes: SpecState = { ...state, phases: [phaseState({ id: "1", edges: phaseEdges({ pr: "A" }) }), phaseState({ id: "3", done: true, edges: phaseEdges({ pr: "D" }) })] };
    const pack = babysitPack({ state: lanes, doctor: "", layout: specLayout(lanes, { cutFrom: "abc", shipAlone: ["D"] }) }, "D");
    expect(pack).toContain("### PR group D · branch feat/pr-babysit-pr-d");
  });
});
