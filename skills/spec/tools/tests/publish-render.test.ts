import { describe, expect, test } from "bun:test";
import { publishLines, remoteLine } from "../publish/render";

describe("remoteLine", () => {
  test("the design's full line", () => {
    const line = remoteLine({ branch: "feat/x", commits: 3, behind: 12 }, "main", "1a2b3c4d5e6f");
    expect(line).toBe("Remote: pushed feat/x (+3) · docs → main 1a2b3c4 · behind main 12");
  });

  test("omits parts that don't apply", () => {
    expect(remoteLine({ branch: "feat", commits: 0, behind: 0 }, "main")).toBe("Remote: feat already on origin");
    expect(remoteLine({ branch: "main", commits: 1, behind: 0 }, "main")).toBe("Remote: pushed main (+1)");
  });
});

describe("publishLines", () => {
  const published = {
    kind: "published" as const,
    sha: "abcdef0123",
    main: "m",
    snapshot: "fedcba9876",
    files: ["docs/specs/a/progress.md", "docs/specs/a/ledger/INDEX.md"],
    deleted: ["docs/specs/a/old.md"],
    mergeBack: { ok: true as const, value: undefined },
  };

  test("names what landed and what was not published", () => {
    expect(publishLines(published, "main")).toEqual([
      "published 2 files to main (abcdef0): docs/specs/a/progress.md, docs/specs/a/ledger/INDEX.md",
      "not published (deleted on the branch): docs/specs/a/old.md",
    ]);
  });

  test("a failed merge-back is reported after the publish, with the command to run", () => {
    const lines = publishLines({ ...published, deleted: [], mergeBack: { ok: false, reason: "git merge failed: x; run git merge --no-edit fedcba9876" } }, "main");
    expect(lines[1]).toBe("merge-back failed: git merge failed: x; run git merge --no-edit fedcba9876");
  });

  test("nothing to publish", () => {
    expect(publishLines({ kind: "nothing", main: "m", deleted: [] }, "main")).toEqual(["no spec doc changes since the last publish"]);
  });
});
