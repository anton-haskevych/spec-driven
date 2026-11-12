import { describe, expect, test } from "bun:test";
import { needsCycle } from "../core/phase-edges";

const graph = (edges: Record<string, string[]>) => (id: string) => edges[id];

describe("needsCycle", () => {
  test("returns the loop back to the start", () => {
    expect(needsCycle(graph({ "3": ["5"], "5": ["4", "3"], "4": [] }), "3")).toEqual(["3", "5", "3"]);
  });

  test("none when the start is not on a loop, even if one exists further on", () => {
    expect(needsCycle(graph({ "1": ["2"], "2": ["3"], "3": ["2"] }), "1")).toBeUndefined();
  });

  test("ignores refs that are not phases of the graph", () => {
    expect(needsCycle(graph({ "1": ["gift-cards#3", "9"] }), "1")).toBeUndefined();
  });
});
