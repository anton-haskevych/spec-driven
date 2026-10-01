import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { gitAt } from "../core/git";
import { pathsOutsideSpecDocs, pushBranch } from "../publish/push";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

describe("pathsOutsideSpecDocs", () => {
  test("lists each non-spec path once, in order", () => {
    expect(pathsOutsideSpecDocs(["docs/specs/a/x.md", "src/a.ts", "README.md", "src/a.ts"])).toEqual(["src/a.ts", "README.md"]);
  });
});

describe("pushBranch (real git)", () => {
  let repo: TestRepo;

  beforeEach(() => {
    repo = repoWithOrigin("spec-push-");
  });

  afterEach(() => repo.cleanup());

  const push = () => pushBranch(gitAt(repo.dir, isolatedRunner), "main");
  const onOrigin = (ref: string) => repo.git("--git-dir", repo.origin, "rev-parse", "--verify", "-q", ref);

  test("pushes a new branch to its own name, sets the upstream and counts the commits", () => {
    repo.git("checkout", "-q", "-b", "feat");
    repo.write("src/a.ts", "a\n");
    repo.commitAll("one");
    repo.write("src/b.ts", "b\n");
    repo.commitAll("two");

    expect(push()).toEqual({ ok: true, value: { branch: "feat", commits: 2, behind: 0 } });
    expect(onOrigin("refs/heads/feat")).toBe(repo.git("rev-parse", "HEAD"));
    expect(repo.git("rev-parse", "--abbrev-ref", "@{u}")).toBe("origin/feat");
    expect(push()).toEqual({ ok: true, value: { branch: "feat", commits: 0, behind: 0 } });
  });

  test("a branch tracking origin/main (a fresh worktree branch) goes to its own name, not main", () => {
    const mainBefore = onOrigin("refs/heads/main");
    repo.git("checkout", "-q", "-b", "wt", "--track", "origin/main");
    repo.write("src/a.ts", "a\n");
    repo.commitAll("work");

    expect(push().ok).toBe(true);
    expect(onOrigin("refs/heads/main")).toBe(mainBefore);
    expect(repo.git("rev-parse", "--abbrev-ref", "@{u}")).toBe("origin/wt");
  });

  test("reports how far the branch is behind the default branch", () => {
    repo.git("checkout", "-q", "-b", "feat");
    const other = repo.clone("other");
    other.write("src/x.ts", "x\n");
    other.commitAll("x");
    other.write("src/y.ts", "y\n");
    other.commitAll("y");
    other.git("push", "-q", "origin", "main");

    expect(push()).toEqual({ ok: true, value: { branch: "feat", commits: 0, behind: 2 } });
  });

  test("refuses a detached HEAD", () => {
    repo.git("checkout", "-q", "--detach");
    expect(push()).toEqual({ ok: false, reason: "detached HEAD — check out a branch before pushing" });
  });

  test("on the default branch, pushes spec-doc commits but refuses code", () => {
    repo.write("docs/specs/a/progress.md", "- [x] Phase 1\n");
    repo.commitAll("tick");
    expect(push()).toEqual({ ok: true, value: { branch: "main", commits: 1, behind: 0 } });

    const before = onOrigin("refs/heads/main");
    repo.write("src/app.ts", "code\n");
    repo.commitAll("code on main");
    expect(push()).toEqual({
      ok: false,
      reason: "main has unpushed changes outside docs/specs (src/app.ts) — not pushing code to main; ask the user",
    });
    expect(onOrigin("refs/heads/main")).toBe(before);
  });
});
