import { afterEach, describe, expect, test } from "bun:test";
import { isSpecDocPath, resolveSpec } from "../core/spec-folders";
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

describe("isSpecDocPath", () => {
  test("root and one-level-nested spec roots, including _ledger and _playbook", () => {
    for (const path of ["docs/specs/a/progress.md", "landing/docs/specs/a/CLAUDE.md", "docs/specs/_ledger/INDEX.md", "docs/specs/_playbook/settings.md", "docs/specs/README.md"]) {
      expect(isSpecDocPath(path)).toBe(true);
    }
  });

  test("code, other docs, deeper nesting and the bare folder are not spec docs", () => {
    for (const path of ["src/docs/specs.ts", "docs/README.md", "docs/specs", "a/b/docs/specs/x/progress.md", "/abs/docs/specs/a/x.md"]) {
      expect(isSpecDocPath(path)).toBe(false);
    }
  });
});
