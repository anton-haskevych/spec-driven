import { describe, expect, test } from "bun:test";
import { parsePorcelainZ } from "../core/git-status";

describe("parsePorcelainZ", () => {
  test("returns the path of modified, added, deleted and untracked entries", () => {
    const output = " M docs/a.md\0A  docs/b.md\0 D docs/c.md\0?? docs/new dir/d.md\0";
    expect(parsePorcelainZ(output)).toEqual(["docs/a.md", "docs/b.md", "docs/c.md", "docs/new dir/d.md"]);
  });

  test("keeps the new path of a rename and skips its source", () => {
    expect(parsePorcelainZ("R  docs/new.md\0docs/old.md\0 M docs/x.md\0")).toEqual(["docs/new.md", "docs/x.md"]);
  });

  test("treats a copy, or a rename in the worktree column, like a rename", () => {
    expect(parsePorcelainZ("C  docs/copy.md\0docs/orig.md\0 R docs/moved.md\0docs/was.md\0")).toEqual(["docs/copy.md", "docs/moved.md"]);
  });

  test("keeps non-ASCII paths unquoted", () => {
    expect(parsePorcelainZ(" M docs/specs/café/CLAUDE.md\0")).toEqual(["docs/specs/café/CLAUDE.md"]);
  });

  test("returns nothing for a clean tree", () => {
    expect(parsePorcelainZ("")).toEqual([]);
  });
});
