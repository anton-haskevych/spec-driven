import { afterEach, describe, expect, test } from "bun:test";
import { resolveSpec } from "../core/spec-folders";
import { createTree, type Tree } from "./tree";

let tree: Tree;
afterEach(() => tree.cleanup());

describe("resolveSpec", () => {
  test("finds the one spec with that name", () => {
    tree = createTree();
    const spec = tree.spec("alpha", {});
    expect(resolveSpec(tree.root, "alpha")).toEqual(spec);
  });

  test("explains a missing or ambiguous name", () => {
    tree = createTree();
    tree.spec("alpha", {});
    tree.write("web/docs/specs/alpha/CLAUDE.md", "---\nstatus: active\n---\n");
    expect(resolveSpec(tree.root, "beta")).toBe("no spec named beta");
    expect(resolveSpec(tree.root, "alpha")).toBe("2 specs are named alpha; run from the project that holds the one you mean");
  });
});
