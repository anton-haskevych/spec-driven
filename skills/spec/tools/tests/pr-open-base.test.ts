import { describe, expect, test } from "bun:test";
import type { SpecState } from "../core/spec-state";
import { laneHeadRefusal } from "../pr/actions/lane-head";
import { specLayout } from "../pr/groups";
import { phaseEdges, phaseState } from "./factories";

const state: SpecState = {
  spec: { name: "x", dir: "/specs/x" },
  hasProgress: true,
  phases: [phaseState({ id: "1", edges: phaseEdges({ declared: true, pr: "A" }) }), phaseState({ id: "2", edges: phaseEdges({ declared: true, pr: "D" }) })],
};

describe("pr open in spec-branch mode", () => {
  const layout = specLayout(state, { cutFrom: "abc", shipAlone: ["D"] });

  test("refuses a lane head: its work reaches the final PR through merge-back", () => {
    expect(laneHeadRefusal(layout, "feat/x-pr-a")).toBe("pr open: x ships from feat/x; feat/x-pr-a is a lane, its work reaches the PR through merge-back");
  });

  test("a ship-alone group and the spec branch may open", () => {
    expect(laneHeadRefusal(layout, "feat/x-pr-d")).toBeUndefined();
    expect(laneHeadRefusal(layout, "feat/x")).toBeUndefined();
  });

  test("outside the mode every group opens its own PR", () => {
    expect(laneHeadRefusal(specLayout(state), "feat/x-pr-a")).toBeUndefined();
  });
});
