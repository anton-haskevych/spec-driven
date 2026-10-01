import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { createExclusive, displaceIfUnchanged, readIfPresent, sweepLeftovers } from "../claims/atomic-file";
import { createTree, type Tree } from "./tree";

let tree: Tree;
afterEach(() => tree?.cleanup());

describe("createExclusive", () => {
  test("creates the file once; a second create finds it taken", () => {
    tree = createTree("spec-claims-");
    const file = join(tree.root, "a#1.json");
    expect(createExclusive(file, "first", "s1")).toBe(true);
    expect(createExclusive(file, "second", "s2")).toBe(false);
    expect(readFileSync(file, "utf8")).toBe("first");
    expect(readdirSync(tree.root)).toEqual(["a#1.json"]);
  });
});

describe("displaceIfUnchanged", () => {
  test("moves the file away when it still holds the judged text", () => {
    tree = createTree("spec-claims-");
    const file = tree.write("a#1.json", "old");
    expect(displaceIfUnchanged(file, "old", "s2")).toBe(true);
    expect(existsSync(file)).toBe(false);
    expect(readdirSync(tree.root)).toEqual([]);
  });

  test("puts a newer file back instead of displacing it", () => {
    tree = createTree("spec-claims-");
    const file = tree.write("a#1.json", "taken a moment ago");
    expect(displaceIfUnchanged(file, "what we judged", "s2")).toBe(false);
    expect(readFileSync(file, "utf8")).toBe("taken a moment ago");
    expect(readdirSync(tree.root)).toEqual(["a#1.json"]);
  });

  test("a file already gone is not displaced", () => {
    tree = createTree("spec-claims-");
    expect(displaceIfUnchanged(join(tree.root, "a#1.json"), "old", "s2")).toBe(false);
  });
});

describe("readIfPresent", () => {
  test("reads a file, and a missing one as undefined", () => {
    tree = createTree("spec-claims-");
    expect(readIfPresent(tree.write("a#1.json", "x"))).toBe("x");
    expect(readIfPresent(join(tree.root, "a#2.json"))).toBeUndefined();
  });
});

describe("sweepLeftovers", () => {
  test("removes temp and displaced files older than a minute, keeps fresh ones and claims", () => {
    tree = createTree("spec-claims-");
    const now = new Date("2026-10-01T20:00:00Z");
    const old = new Date(now.getTime() - 120_000);
    for (const name of ["a#1.json.tmp-s1", "a#2.json.stale-s2"]) utimesSync(tree.write(name, "x"), old, old);
    utimesSync(tree.write("a#4.json.tmp-s4", "x"), now, now);
    utimesSync(tree.write("a#5.json", "x"), old, old);
    sweepLeftovers(tree.root, now);
    expect(readdirSync(tree.root).sort()).toEqual(["a#4.json.tmp-s4", "a#5.json"]);
  });
});
