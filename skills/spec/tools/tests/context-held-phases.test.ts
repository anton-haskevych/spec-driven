import { describe, expect, test } from "bun:test";
import { firstUnheld, specsInFlight } from "../context/held-phases";
import { phaseState } from "./factories";

describe("firstUnheld", () => {
  const ready = [phaseState({ id: "5" }), phaseState({ id: "6" })];

  test("picks the first ready phase no other session holds and names the ones it skipped", () => {
    const picked = firstUnheld("spec-board", ready, new Map([["spec-board#5", "board execute 5"]]));
    expect(picked.phase?.id).toBe("6");
    expect(picked.skipped).toEqual(["5 (in flight: board execute 5)"]);
  });

  test("with nothing held it picks the first ready phase", () => {
    expect(firstUnheld("spec-board", ready, new Map())).toEqual({ phase: ready[0], skipped: [] });
  });

  test("when every ready phase is held it picks none", () => {
    const held = new Map([["spec-board#5", "a"], ["spec-board#6", "b"]]);
    expect(firstUnheld("spec-board", ready, held)).toEqual({ phase: undefined, skipped: ["5 (in flight: a)", "6 (in flight: b)"] });
  });

  test("another spec's claim on the same phase id is not this spec's", () => {
    expect(firstUnheld("spec-board", ready, new Map([["other#5", "x"]])).phase?.id).toBe("5");
  });
});

describe("specsInFlight", () => {
  test("names each other spec with a held phase, first holder wins", () => {
    const held = new Map([["a#1", "s1"], ["a#2", "s2"], ["b#3", "s3"], ["me#1", "s4"]]);
    expect([...specsInFlight(held, "me")]).toEqual([["a", "s1"], ["b", "s3"]]);
  });
});
