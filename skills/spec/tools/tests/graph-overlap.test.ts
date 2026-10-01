import { describe, expect, test } from "bun:test";
import type { SpecNode } from "../graph/nodes";
import { inFlightOverlaps, sharedPaths, undeclaredOverlaps } from "../graph/overlap";
import { specNode } from "./factories";

const node = (name: string, codeMapPaths: string[], overrides: Partial<SpecNode> = {}): SpecNode =>
  specNode({ spec: { name, dir: `/specs/${name}` }, codeMapPaths, ...overrides });
const nodesOf = (...list: SpecNode[]) => new Map(list.map((entry) => [entry.spec.name, entry]));
const hubUsers = (path: string) => Array.from({ length: 5 }, (_, index) => node(`hub-${index}`, [path]));

describe("sharedPaths", () => {
  test("keeps paths both specs list, minus hubs used by more than 5 open specs", () => {
    const usage = new Map([["src/a.ts", 2], ["src/hub.ts", 6]]);
    expect(sharedPaths(node("x", ["src/a.ts", "src/hub.ts", "src/x.ts"]), node("y", ["src/hub.ts", "src/a.ts"]), usage)).toEqual(["src/a.ts"]);
  });
});

describe("inFlightOverlaps", () => {
  test("names in-flight specs that share files, declared relations included", () => {
    const nodes = nodesOf(
      node("ready", ["src/a.ts"], { relations: [{ type: "related", target: "linked" }] }),
      node("linked", ["src/a.ts"]),
      node("busy", ["src/a.ts", "src/b.ts"]),
      node("idle", ["src/a.ts"]),
    );
    expect(inFlightOverlaps(nodes, "ready", new Set(["linked", "busy"]))).toEqual([
      { other: "linked", shared: ["src/a.ts"] },
      { other: "busy", shared: ["src/a.ts"] },
    ]);
  });

  test("ignores hub paths, counting usage over open specs only", () => {
    const finished = node("old", ["src/shared.ts"], { status: "done" });
    const nodes = nodesOf(node("ready", ["src/hub.ts", "src/shared.ts"]), node("busy", ["src/hub.ts", "src/shared.ts"]), ...hubUsers("src/hub.ts"), finished);
    expect(inFlightOverlaps(nodes, "ready", new Set(["busy"]))).toEqual([{ other: "busy", shared: ["src/shared.ts"] }]);
  });

  test("skips itself, finished specs, and a finished or missing ready spec", () => {
    const nodes = nodesOf(node("ready", ["src/a.ts"]), node("old", ["src/a.ts"], { status: "done" }), node("closed", ["src/a.ts"], { status: "done" }));
    expect(inFlightOverlaps(nodes, "ready", new Set(["ready", "old"]))).toEqual([]);
    expect(inFlightOverlaps(nodes, "closed", new Set(["ready"]))).toEqual([]);
    expect(inFlightOverlaps(nodes, "missing", new Set(["ready"]))).toEqual([]);
  });
});

describe("undeclaredOverlaps", () => {
  test("still skips declared pairs and hubs", () => {
    const nodes = nodesOf(
      node("a", ["src/x.ts", "src/hub.ts"], { relations: [{ type: "related", target: "b" }] }),
      node("b", ["src/x.ts"]),
      node("c", ["src/x.ts", "src/hub.ts"]),
      ...hubUsers("src/hub.ts"),
    );
    expect(undeclaredOverlaps(nodes, "a")).toEqual([{ other: "c", shared: ["src/x.ts"] }]);
  });
});
