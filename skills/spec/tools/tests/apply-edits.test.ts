import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { applyEdits, readThroughEdits } from "../core/apply-edits";
import { createTree, type Tree } from "./tree";

let tree: Tree;
afterEach(() => tree.cleanup());

describe("applyEdits", () => {
  test("renames first, then writes, creating parent folders", () => {
    tree = createTree();
    const old = tree.write("phases/phase-7.md", "old");
    const moved = join(tree.root, "phases/phase-7/plan.md");
    applyEdits({
      kind: "ok",
      renames: [{ from: old, to: moved }],
      edits: [{ file: moved, text: "rewritten" }, { file: join(tree.root, "new/file.md"), text: "fresh" }],
    });
    expect(existsSync(old)).toBe(false);
    expect(readFileSync(moved, "utf8")).toBe("rewritten");
    expect(readFileSync(join(tree.root, "new/file.md"), "utf8")).toBe("fresh");
  });
});

describe("readThroughEdits", () => {
  test("reads planned text where an edit exists and disk everywhere else", () => {
    tree = createTree();
    tree.write("progress.md", "on disk");
    tree.write("phases/p1.md", "entry on disk");
    const read = readThroughEdits(tree.root, [{ file: join(tree.root, "progress.md"), text: "planned" }]);
    expect(read("progress.md")).toBe("planned");
    expect(read("phases/p1.md")).toBe("entry on disk");
    expect(read("missing.md")).toBeUndefined();
  });
});
