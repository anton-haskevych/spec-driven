import { afterEach, describe, expect, test } from "bun:test";
import { gitAt } from "../core/git";
import { CLAUDE_CODE_SOURCE } from "../sessions/session-doc";
import { sessionFactsOf } from "../sessions/facts";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

let repo: TestRepo | undefined;
afterEach(() => repo?.cleanup());

describe("sessionFactsOf", () => {
  test("names the session, the person, the tree, its branch and what it holds", () => {
    repo = repoWithOrigin("facts-");
    repo.write("a.txt", "a");
    const facts = sessionFactsOf(gitAt(repo.dir, isolatedRunner), { CLAUDE_CODE_SESSION_ID: "s1" }, "work", "mbp");
    expect(facts).toEqual({
      ref: { source: CLAUDE_CODE_SOURCE, id: "s1" },
      who: "spec-tests",
      host: "mbp",
      tree: "work",
      branch: "main",
      work: { ahead: 0, edited: 1 },
    });
  });

  test("without a session id there is nothing to stamp", () => {
    repo = repoWithOrigin("facts-");
    expect(sessionFactsOf(gitAt(repo.dir, isolatedRunner), {}, "work", "mbp")).toBeUndefined();
  });

  test("a tree git can't read still stamps, without its counts", () => {
    const facts = sessionFactsOf(gitAt("/", isolatedRunner), { CLAUDE_CODE_SESSION_ID: "s1" }, "root", "mbp");
    expect(facts).toMatchObject({ tree: "root" });
    expect(facts && "work" in facts).toBe(false);
  });
});
