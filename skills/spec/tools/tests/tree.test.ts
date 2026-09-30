import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createTree } from "./tree";

describe("createTree", () => {
  test("writes files under a fresh temp root, creating parent folders", () => {
    const tree = createTree();
    const path = tree.write("a/b/c.md", "hello");
    expect(path).toBe(join(tree.root, "a/b/c.md"));
    expect(readFileSync(path, "utf8")).toBe("hello");
    tree.cleanup();
    expect(existsSync(tree.root)).toBe(false);
  });

  test("spec() writes files inside docs/specs/<name>, with a minimal CLAUDE.md so it is findable", () => {
    const tree = createTree();
    const spec = tree.spec("checkout", { "progress.md": "- [ ] Phase 1 — One → `phases/p1.md`\n" });
    expect(spec).toEqual({ name: "checkout", dir: join(tree.root, "docs/specs/checkout") });
    expect(readFileSync(join(spec.dir, "progress.md"), "utf8")).toContain("Phase 1");
    expect(readFileSync(join(spec.dir, "CLAUDE.md"), "utf8")).toContain("status: active");
    tree.cleanup();
  });

  test("each tree gets its own root", () => {
    const [first, second] = [createTree(), createTree()];
    expect(first.root).not.toBe(second.root);
    first.cleanup();
    second.cleanup();
  });
});
