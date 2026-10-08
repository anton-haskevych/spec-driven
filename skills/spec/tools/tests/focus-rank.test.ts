import { describe, expect, test } from "bun:test";
import { focusEntries, focusPosition, rankFor, type FocusEntry } from "../focus/rank";
import { specMeta, specNode } from "./factories";

const set = (...pairs: [string, number][]): FocusEntry[] => pairs.map(([spec, rank]) => ({ spec, rank }));

describe("rankFor", () => {
  test("an empty set starts at 10, whatever the place", () => {
    expect(rankFor([], "a", { kind: "end" })).toBe(10);
    expect(rankFor([], "a", { kind: "top" })).toBe(10);
  });

  test("appends after the highest rank", () => {
    expect(rankFor(set(["a", 10], ["b", 35]), "c", { kind: "end" })).toBe(45);
  });

  test("--top goes 10 below the lowest, or halves it when that would drop below 0", () => {
    expect(rankFor(set(["a", 30], ["b", 40]), "c", { kind: "top" })).toBe(20);
    expect(rankFor(set(["a", 10]), "c", { kind: "top" })).toBe(0);
    expect(rankFor(set(["a", 6]), "c", { kind: "top" })).toBe(3);
    expect(rankFor(set(["a", 0]), "c", { kind: "top" })).toBe(0);
  });

  test("--after takes the midpoint to the next entry, or 10 past the last", () => {
    expect(rankFor(set(["a", 10], ["b", 20]), "c", { kind: "after", spec: "a" })).toBe(15);
    expect(rankFor(set(["a", 10], ["b", 20]), "c", { kind: "after", spec: "b" })).toBe(30);
  });

  test("--after skips an equal-rank neighbour to the next greater rank", () => {
    expect(rankFor(set(["a", 10], ["b", 10], ["c", 20]), "d", { kind: "after", spec: "a" })).toBe(15);
  });

  test("the moved spec leaves the set before its neighbour is found", () => {
    expect(rankFor(set(["a", 10], ["b", 20], ["c", 30]), "b", { kind: "after", spec: "a" })).toBe(20);
    expect(rankFor(set(["a", 10], ["b", 20]), "b", { kind: "end" })).toBe(20);
    expect(rankFor(set(["a", 10], ["b", 20]), "a", { kind: "top" })).toBe(10);
  });

  test("--after a spec that is not in the set has no rank", () => {
    expect(rankFor(set(["a", 10]), "c", { kind: "after", spec: "z" })).toBeUndefined();
    expect(rankFor(set(["a", 10]), "a", { kind: "after", spec: "a" })).toBeUndefined();
  });
});

describe("focusPosition", () => {
  test("orders by rank, then name, counting from 1", () => {
    const entries = set(["b", 10], ["a", 10], ["c", 5]);
    expect(focusPosition(entries, "c")).toEqual({ position: 1, total: 3 });
    expect(focusPosition(entries, "a")).toEqual({ position: 2, total: 3 });
    expect(focusPosition(entries, "z")).toBeUndefined();
  });
});

describe("focusEntries", () => {
  test("takes specs whose meta has a rank; a malformed focus reads as none", () => {
    const nodes = new Map([
      ["a", specNode({ spec: { name: "a", dir: "/a" }, meta: specMeta({ focus: 20 }) })],
      ["b", specNode({ spec: { name: "b", dir: "/b" }, meta: specMeta() })],
    ]);
    expect(focusEntries(nodes)).toEqual([{ spec: "a", rank: 20 }]);
  });
});
