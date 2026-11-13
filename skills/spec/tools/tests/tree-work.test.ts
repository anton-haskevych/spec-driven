import { afterEach, describe, expect, test } from "bun:test";
import { gitAt } from "../core/git";
import { treeWork } from "../workspaces/changes";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

let repo: TestRepo | undefined;
afterEach(() => repo?.cleanup());

function fresh(): TestRepo {
  repo = repoWithOrigin("tree-work-");
  return repo;
}

const workOf = (dir: string) => treeWork(gitAt(dir, isolatedRunner));

describe("treeWork", () => {
  test("a clean tree that matches the remote holds nothing", () => {
    expect(workOf(fresh().dir)).toEqual({ ok: true, value: { ahead: 0, edited: 0 } });
  });

  test("counts commits that are on no remote, and stops counting once they are pushed", () => {
    const work = fresh();
    work.write("a.txt", "a");
    work.commitAll("one");
    work.write("b.txt", "b");
    work.commitAll("two");
    expect(workOf(work.dir)).toEqual({ ok: true, value: { ahead: 2, edited: 0 } });
    work.git("push", "-q", "origin", "main");
    expect(workOf(work.dir)).toEqual({ ok: true, value: { ahead: 0, edited: 0 } });
  });

  test("a branch never pushed counts only its own commits, not the history it shares with the remote", () => {
    const work = fresh();
    work.git("checkout", "-q", "-b", "feat/x");
    work.write("a.txt", "a");
    work.commitAll("on the branch");
    expect(workOf(work.dir)).toEqual({ ok: true, value: { ahead: 1, edited: 0 } });
  });

  test("counts uncommitted paths: changed, new, renamed, and names git would quote", () => {
    const work = fresh();
    work.write("kept.txt", "1");
    work.write("old.txt", "1");
    work.commitAll("files");
    work.git("push", "-q", "origin", "main");
    work.write("kept.txt", "2");
    work.write("новий.txt", "x");
    work.git("mv", "old.txt", "new.txt");
    expect(workOf(work.dir)).toEqual({ ok: true, value: { ahead: 0, edited: 3 } });
  });

  test("a repo with no remote has no ahead to report", () => {
    const work = fresh();
    work.git("remote", "remove", "origin");
    work.write("a.txt", "a");
    expect(workOf(work.dir)).toEqual({ ok: true, value: { edited: 1 } });
  });

  test("outside a repository is a failure, not a count", () => {
    const result = workOf("/");
    expect(result.ok).toBe(false);
  });
});
