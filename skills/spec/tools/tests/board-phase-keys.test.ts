import { describe, expect, test } from "bun:test";
import { resolvedPhaseKeys, rowKey, splitKey } from "../board/phase-keys";
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

describe("splitKey", () => {
  test("splits a phase key at its #", () => {
    expect(splitKey("alpha#2b")).toEqual({ spec: "alpha", phase: "2b" });
  });

  test("reads a whole-spec key as the spec alone", () => {
    expect(splitKey("beta")).toEqual({ spec: "beta" });
  });

  test("inverts rowKey", () => {
    for (const row of [{ spec: "alpha", phase: "9.10" }, { spec: "beta" }]) expect(splitKey(rowKey(row))).toEqual(row);
  });
});
