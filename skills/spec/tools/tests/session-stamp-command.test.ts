import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { cardCommand } from "../commands/card";
import { phaseCommand } from "../commands/phase";
import { sessionDocPath, claudeSessionRef, type SessionDoc } from "../sessions/session-doc";
import { isolatedRunner, type TestRepo, type WorkingCopy } from "./git-repo";
import { joinedRepo } from "./joined-repo";

const NOW = new Date("2026-11-13T10:00:00+00:00");
const REAL_GIT_MS = 30_000;
const TRACKING = "refs/spec-board-remote/record";

describe("every phase write stamps its session (real git)", () => {
  let repo: TestRepo;
  let tree: WorkingCopy;
  const as = (id: string | undefined) => ({ runner: isolatedRunner, env: id ? { CLAUDE_CODE_SESSION_ID: id } : {}, now: () => NOW });
  const phase = (id: string | undefined, ...args: string[]) => Promise.resolve(phaseCommand(tree.dir, args, undefined, as(id)));
  const sessionPaths = () => {
    repo.git("fetch", "-q", "origin", `+refs/spec-board/record:${TRACKING}`);
    return repo.git("ls-tree", "-r", "--name-only", TRACKING).split("\n").filter((path) => path.startsWith("sessions/"));
  };
  const stamped = (id: string) => JSON.parse(repo.git("show", `${TRACKING}:${sessionDocPath(claudeSessionRef({ CLAUDE_CODE_SESSION_ID: id })!)}`)) as SessionDoc;

  beforeAll(() => {
    repo = joinedRepo("spec-stamp-");
    tree = repo.clone("pr-a");
    tree.git("checkout", "-q", "-b", "feat/alpha-pr-a");
  });
  afterAll(() => repo.cleanup());

  test("a park leaves the session's document: who, where, mode, time and what the tree holds", async () => {
    await phase("s1", "park", "alpha", "3", "Ship today?");
    expect(sessionPaths()).toHaveLength(1);
    expect(stamped("s1")).toMatchObject({ who: "spec-tests", tree: "pr-a", branch: "feat/alpha-pr-a", mode: "execute", lastWriteAt: "2026-11-13T10:00:00+00:00", ahead: 0, edited: 0 });
  }, REAL_GIT_MS);

  test("a second session on the machine gets its own document", async () => {
    tree.write("scratch.txt", "x");
    await phase("s2", "park", "alpha", "2", "Which copy?");
    expect(sessionPaths()).toHaveLength(2);
    expect(stamped("s2").edited).toBe(1);
    expect(stamped("s1").edited).toBe(0);
  }, REAL_GIT_MS);

  test("a session with no id writes the change and no document", async () => {
    await phase(undefined, "unpark", "alpha", "3", "yes");
    expect(sessionPaths()).toHaveLength(2);
  }, REAL_GIT_MS);

  test("a card added directly, never queued, stamps too", async () => {
    const quote = ["--quote", "Please add it", "--app", "imessage", "--at", "2026-11-11", "--ref", "msg 1"];
    expect(await cardCommand(tree.dir, ["add", "A new card", ...quote], as("s3"))).toStartWith("card: c1 added");
    expect(sessionPaths()).toHaveLength(3);
    expect(stamped("s3").mode).toBe("execute");
  }, REAL_GIT_MS);
});
