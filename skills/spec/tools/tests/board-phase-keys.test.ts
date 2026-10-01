import { describe, expect, test } from "bun:test";
import { resolvedPhaseKeys } from "../board/phase-keys";
import { phaseState } from "./factories";
import { boardInputs, specFixture } from "./board-factories";

describe("resolvedPhaseKeys", () => {
  test("names each referenced phase as spec#id, and a whole-spec ref by the spec's name", () => {
    const alpha = specFixture("alpha", { phases: [phaseState({ id: "1", done: true }), phaseState({ id: "2" })] });
    const beta = specFixture("beta", { stage: "prep" });
    const { nodes } = boardInputs([alpha, beta]);

    expect(resolvedPhaseKeys(["1", "beta", "alpha#2", "nope#1"], alpha.state, nodes)).toEqual([
      { key: "alpha#1", done: true, deployed: false },
      { key: "beta", done: false, deployed: false },
      { key: "alpha#2", done: false, deployed: false },
    ]);
  });
});
