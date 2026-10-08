import { describe, expect, test } from "bun:test";
import { deployWaits } from "../board/deploy-waits";
import { phaseEdges, phaseState } from "./factories";
import { boardInputs, specFixture } from "./board-factories";

const needsDeployed = (id: string, refs: string[], done = false) => phaseState({ id, done, edges: phaseEdges({ declared: true, needsDeployed: refs }) });

describe("deployWaits", () => {
  test("pairs each open phase with every done, undeployed phase it waits on, in spec and phase order", () => {
    const alpha = specFixture("alpha", { phases: [phaseState({ id: "1", done: true }), needsDeployed("2", ["1", "beta#1"]), needsDeployed("3", ["1"])] });
    const beta = specFixture("beta", { phases: [phaseState({ id: "1", done: true }), phaseState({ id: "2", done: true, deployed: true })] });
    const { nodes } = boardInputs([alpha, beta]);

    expect(deployWaits([alpha.state, beta.state], nodes)).toEqual([
      { waiter: "alpha#2", target: "alpha#1" },
      { waiter: "alpha#2", target: "beta#1" },
      { waiter: "alpha#3", target: "alpha#1" },
    ]);
  });

  test("skips done waiters, deployed targets and targets not done yet", () => {
    const alpha = specFixture("alpha", {
      phases: [phaseState({ id: "1", done: true, deployed: true }), phaseState({ id: "2" }), needsDeployed("3", ["1", "2"]), needsDeployed("4", ["1"], true)],
    });
    const { nodes } = boardInputs([alpha]);

    expect(deployWaits([alpha.state], nodes)).toEqual([]);
  });

  test("never waits on a whole spec: finishing it counts as deployed", () => {
    const alpha = specFixture("alpha", { phases: [needsDeployed("1", ["beta"])] });
    const beta = specFixture("beta", { status: "done" });
    const { nodes } = boardInputs([alpha, beta]);

    expect(deployWaits([alpha.state], nodes)).toEqual([]);
  });
});
