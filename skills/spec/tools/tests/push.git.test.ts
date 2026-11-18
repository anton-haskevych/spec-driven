import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gitAt } from "../core/git";
import { pathsOutsideSpecDocs, pushBranch, pushResult, SAVE } from "../publish/push";
import { syncLine, syncMain } from "../publish/sync-main";
import { pushReport } from "../commands/push";
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

  const push = () => pushResult(pushBranch(gitAt(repo.dir, isolatedRunner), { defaultBranch: "main" }));
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

  test("counts the branch's own commits: a merge of main is one, not everything it brought in", () => {
    repo.git("checkout", "-q", "-b", "feat");
    repo.write("src/a.ts", "a\n");
    repo.commitAll("mine");
    expect(push().ok).toBe(true);
    const other = repo.clone("other");
    for (const name of ["x", "y", "z"]) {
      other.write(`src/${name}.ts`, `${name}\n`);
      other.commitAll(name);
    }
    other.git("push", "-q", "origin", "main");
    repo.git("fetch", "-q", "origin");
    repo.git("merge", "-q", "--no-edit", "origin/main");

    expect(push()).toEqual({ ok: true, value: { branch: "feat", commits: 1, behind: 0 } });
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

  test("tells an unreachable origin from a push origin rejected, and names the branch", () => {
    repo.git("checkout", "-q", "-b", "feat");
    repo.write("src/a.ts", "a\n");
    repo.commitAll("mine");
    const other = repo.clone("other");
    other.git("checkout", "-q", "-b", "feat");
    other.write("src/b.ts", "b\n");
    other.commitAll("theirs");
    other.git("push", "-q", "origin", "feat");
    const git = gitAt(repo.dir, isolatedRunner);

    expect(pushBranch(git, { defaultBranch: "main" }, SAVE)).toMatchObject({ kind: "rejected", branch: "feat" });
    repo.git("remote", "set-url", "origin", join(repo.root, "nowhere.git"));
    expect(pushBranch(git, { defaultBranch: "main" }, SAVE)).toMatchObject({ kind: "offline", branch: "feat" });
  });

  test("a lane counts its commits and how far behind it is against its base, not the default branch", () => {
    repo.git("checkout", "-q", "-b", "feat/s");
    repo.write("src/spec.ts", "s\n");
    repo.commitAll("on the spec branch");
    repo.git("push", "-q", "origin", "feat/s");
    repo.git("checkout", "-q", "-b", "feat/s-pr-a");
    repo.write("src/lane.ts", "l\n");
    repo.commitAll("lane work");
    const other = repo.clone("other");
    other.git("checkout", "-q", "feat/s");
    other.write("src/other-lane.ts", "o\n");
    other.commitAll("another lane merged back");
    other.git("push", "-q", "origin", "feat/s");

    const git = gitAt(repo.dir, isolatedRunner);
    expect(pushBranch(git, { defaultBranch: "main", base: "feat/s" }, SAVE)).toEqual({ kind: "pushed", branch: "feat/s-pr-a", commits: 1, behind: 1 });
  });

  test("a save skips pre-push hooks; a plain push still runs them", () => {
    repo.git("checkout", "-q", "-b", "feat");
    repo.write(".git/hooks/pre-push", "#!/bin/sh\ntouch \"$GIT_DIR/../hook-ran\"\nexit 1\n");
    chmodSync(join(repo.dir, ".git/hooks/pre-push"), 0o755);
    repo.write("src/a.ts", "a\n");
    repo.commitAll("mine");
    const git = gitAt(repo.dir, isolatedRunner);

    expect(pushBranch(git, { defaultBranch: "main" }, SAVE)).toEqual({ kind: "pushed", branch: "feat", commits: 1, behind: 0 });
    expect(existsSync(join(repo.dir, "hook-ran"))).toBe(false);
    repo.write("src/b.ts", "b\n");
    repo.commitAll("two");
    expect(pushBranch(git, { defaultBranch: "main" })).toMatchObject({ kind: "rejected", branch: "feat" });
  });
});

describe("syncMain (real git)", () => {
  let repo: TestRepo;

  beforeEach(() => {
    repo = repoWithOrigin("spec-sync-");
    repo.write("docs/specs/a/design.md", "one\n");
    repo.write("src/app.ts", "app\n");
    repo.commitAll("base");
    repo.git("push", "-q", "origin", "main");
  });

  afterEach(() => repo.cleanup());

  const sync = () => syncMain(gitAt(repo.dir, isolatedRunner), "main");
  const head = () => repo.git("rev-parse", "HEAD");
  const originMain = () => repo.git("--git-dir", repo.origin, "rev-parse", "main");
  const originMoves = (path: string, text: string) => {
    const other = repo.clone(`other-${Math.random().toString(36).slice(2)}`);
    other.write(path, text);
    other.commitAll(`edit ${path}`);
    other.git("push", "-q", "origin", "main");
  };

  test("does nothing off the default branch", () => {
    repo.git("checkout", "-q", "-b", "feat");
    expect(sync()).toEqual({ kind: "not-default", branch: "feat" });
    expect(syncLine(sync())).toBeUndefined();
  });

  test("says so when main already matches origin", () => {
    expect(syncLine(sync())).toBe("Synced: main already matches origin");
  });

  test("fast-forwards past edits that origin's commits don't touch", () => {
    originMoves("docs/specs/b/design.md", "b\n");
    repo.write("src/app.ts", "dirty\n");
    repo.write("scratch.txt", "untracked\n");

    expect(sync()).toEqual({ kind: "updated", branch: "main", commits: 1, merged: false });
    expect(head()).toBe(originMain());
    expect(repo.git("status", "--porcelain")).toBe("M src/app.ts\n?? scratch.txt");
  });

  test("merges its own spec-doc commits with origin's tip as the first parent, and push sends them", () => {
    repo.write("docs/specs/a/design.md", "reviewed\n");
    repo.commitAll("[review] a");
    const review = head();
    originMoves("src/other.ts", "x\n");
    const tipBefore = originMain();

    expect(pushReport(repo.dir, [], isolatedRunner)).toBe("Synced: main merged with origin/main (+1 commit)\nRemote: pushed main (+1)");
    expect(repo.git("rev-parse", "HEAD^1", "HEAD^2")).toBe(`${tipBefore}\n${review}`);
    expect(originMain()).toBe(head());
    expect(repo.git("--git-dir", repo.origin, "show", "main:docs/specs/a/design.md")).toBe("reviewed");
  });

  test("refuses, untouched, when a local edit is in the way, and push stops there", () => {
    originMoves("src/app.ts", "theirs\n");
    repo.write("src/app.ts", "mine\n");
    const before = head();

    expect(pushReport(repo.dir, [], isolatedRunner)).toBe(
      "sync-main: local edits are in the way (src/app.ts); commit or stash them, then run sync-main — main left as it was, 1 commit behind origin; spec files here may be stale\npush: nothing pushed — sync-main refused (above)",
    );
    expect(head()).toBe(before);
    expect(repo.git("status", "--porcelain")).toBe("M src/app.ts");
  });

  test("never leaves conflict markers behind, even with merge.autoStash on", () => {
    originMoves("src/app.ts", "theirs\n");
    repo.write("src/app.ts", "mine\n");
    repo.git("config", "merge.autoStash", "true");

    expect(sync()).toMatchObject({ kind: "refused" });
    expect(repo.git("show", ":src/app.ts")).toBe("app");
    expect(repo.git("status", "--porcelain")).toBe("M src/app.ts");
  });

  test("a conflict with origin refuses without touching the checkout", () => {
    repo.write("docs/specs/a/design.md", "mine\n");
    repo.commitAll("[review] a");
    originMoves("docs/specs/a/design.md", "theirs\n");
    const before = head();

    expect(sync()).toMatchObject({ kind: "refused", reason: "origin changed the same lines in docs/specs/a/design.md" });
    expect(head()).toBe(before);
    expect(repo.git("status", "--porcelain")).toBe("");
  });

  test("never merges into code commits on main", () => {
    repo.write("src/app.ts", "code on main\n");
    repo.commitAll("oops");
    originMoves("docs/specs/b/design.md", "b\n");

    expect(sync()).toMatchObject({ kind: "refused", reason: expect.stringContaining("not pushing code to main") });
  });
});
