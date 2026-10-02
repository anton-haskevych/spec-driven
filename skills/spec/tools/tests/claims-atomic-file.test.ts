import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readdirSync, readFileSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { createExclusive, readIfPresent, removeIfUnchanged, sweepLeftovers } from "../claims/atomic-file";
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

describe("removeIfUnchanged", () => {
  test("removes the file when it still holds the judged text", () => {
    tree = createTree("spec-claims-");
    const file = tree.write("a#1.json", "old");
    expect(removeIfUnchanged(file, "old")).toBe(true);
    expect(readdirSync(tree.root)).toEqual([]);
  });

  test("leaves a newer file untouched: it was never moved, so nothing has to go back", () => {
    tree = createTree("spec-claims-");
    const file = tree.write("a#1.json", "taken a moment ago");
    expect(removeIfUnchanged(file, "what we judged")).toBe(false);
    expect(readFileSync(file, "utf8")).toBe("taken a moment ago");
    expect(readdirSync(tree.root)).toEqual(["a#1.json"]);
  });

  test("a file already gone is not removed", () => {
    tree = createTree("spec-claims-");
    expect(removeIfUnchanged(join(tree.root, "a#1.json"), "old")).toBe(false);
  });

  test("while another session holds the claim's lock, nothing is removed", () => {
    tree = createTree("spec-claims-");
    const file = tree.write("a#1.json", "old");
    mkdirSync(`${file}.lock`);
    expect(removeIfUnchanged(file, "old")).toBe(false);
    expect(readFileSync(file, "utf8")).toBe("old");
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
  test("removes temp files and locks older than a minute, keeps fresh ones and claims", () => {
    tree = createTree("spec-claims-");
    const now = new Date("2026-10-01T20:00:00Z");
    const old = new Date(now.getTime() - 120_000);
    utimesSync(tree.write("a#1.json.tmp-s1", "x"), old, old);
    mkdirSync(join(tree.root, "a#2.json.lock"));
    utimesSync(join(tree.root, "a#2.json.lock"), old, old);
    utimesSync(tree.write("a#4.json.tmp-s4", "x"), now, now);
    mkdirSync(join(tree.root, "a#6.json.lock"));
    utimesSync(tree.write("a#5.json", "x"), old, old);
    sweepLeftovers(tree.root, now);
    expect(readdirSync(tree.root).sort()).toEqual(["a#4.json.tmp-s4", "a#5.json", "a#6.json.lock"]);
  });
});
