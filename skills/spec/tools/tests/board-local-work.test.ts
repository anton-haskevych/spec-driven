import { afterEach, describe, expect, test } from "bun:test";
import { basename } from "node:path";
import { withLocalWork } from "../board/local-work";
import { CLAUDE_CODE_SOURCE, type SessionDoc } from "../sessions/session-doc";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { sessionDoc } from "./record-factories";

let repo: TestRepo | undefined;
afterEach(() => repo?.cleanup());

const doc = (tree: string, overrides: Partial<SessionDoc> = {}): SessionDoc =>
  sessionDoc({ ref: { source: CLAUDE_CODE_SOURCE, id: `s-${tree}` }, host: "laptop", tree, ahead: 3, edited: 5, ...overrides });

describe("withLocalWork", () => {
  test("a tree on this machine is counted as it is now, not as the session last saw it", () => {
    repo = repoWithOrigin("local-work-");
    repo.write("a.txt", "a");
    const [refreshed] = withLocalWork([doc(basename(repo.dir))], "laptop", [repo.dir], isolatedRunner);
    expect(refreshed).toMatchObject({ ahead: 0, edited: 1 });
  });

  test("another machine's document, a tree that is gone and a document with nothing to check stay as written", () => {
    repo = repoWithOrigin("local-work-");
    const other = doc("their-tree", { host: "desktop" });
    const gone = doc("gone");
    const clean = doc(basename(repo.dir), { ahead: 0, edited: 0 });
    expect(withLocalWork([other, gone, clean], "laptop", [repo.dir], isolatedRunner)).toEqual([other, gone, clean]);
  });

  test("a repo with no remote drops ahead", () => {
    repo = repoWithOrigin("local-work-");
    repo.git("remote", "remove", "origin");
    const [refreshed] = withLocalWork([doc(basename(repo.dir))], "laptop", [repo.dir], isolatedRunner);
    expect(refreshed && "ahead" in refreshed).toBe(false);
  });
});
