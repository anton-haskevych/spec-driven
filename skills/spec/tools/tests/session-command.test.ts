import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { contextPack } from "../commands/context";
import { phaseCommand } from "../commands/phase";
import { sessionCommand, SESSION_USAGE } from "../commands/session";
import { claudeSessionRef, sessionDocPath, type SessionDoc } from "../sessions/session-doc";
import { contextDeps } from "./context-fixture";
import { isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";
import { joinedRepo } from "./joined-repo";

const NOW = new Date("2026-11-13T10:00:00+00:00");
const REAL_GIT_MS = 30_000;
const TRACKING = "refs/spec-board-remote/record";

describe("session register (real git)", () => {
  let repo: TestRepo;
  let tree: WorkingCopy;
  const deps = (id: string | undefined) => ({ runner: isolatedRunner, env: id ? { CLAUDE_CODE_SESSION_ID: id } : {}, now: () => NOW });
  const run = (id: string | undefined, ...args: string[]) => Promise.resolve(sessionCommand(tree.dir, args, deps(id)));
  const doc = (id: string): SessionDoc => {
    repo.git("fetch", "-q", "origin", `+refs/spec-board/record:${TRACKING}`);
    return JSON.parse(repo.git("show", `${TRACKING}:${sessionDocPath(claudeSessionRef({ CLAUDE_CODE_SESSION_ID: id })!)}`)) as SessionDoc;
  };

  beforeAll(() => {
    repo = joinedRepo("spec-session-");
    tree = repo.clone("pr-a");
  });
  afterAll(() => repo.cleanup());

  test("a review session registers its mode, spec and title", async () => {
    expect(await run("s1", "register", "review", "alpha", "--title", "review alpha")).toBe("session: review alpha registered (s1 in pr-a)");
    expect(doc("s1")).toMatchObject({ mode: "review", spec: "alpha", title: "review alpha", tree: "pr-a", who: "spec-tests" });
  }, REAL_GIT_MS);

  test("a later write by that session keeps the registration", async () => {
    await phaseCommand(tree.dir, ["park", "alpha", "3", "Ship?"], undefined, deps("s1"));
    expect(doc("s1")).toMatchObject({ mode: "review", spec: "alpha", title: "review alpha" });
  }, REAL_GIT_MS);

  test("registering again changes the mode: prep hands on to create", async () => {
    await run("s2", "register", "prep", "alpha");
    expect(await run("s2", "register", "create", "alpha")).toStartWith("session: create alpha registered");
    expect(doc("s2").mode).toBe("create");
  }, REAL_GIT_MS);

  test("usage, bad mode, no session id and a spec name that isn't one are refused", async () => {
    expect(await run("s1", "register", "review")).toBe(`usage: ${SESSION_USAGE}`);
    expect(await run("s1", "register", "dream", "alpha")).toBe(`usage: ${SESSION_USAGE}`);
    expect(await run(undefined, "register", "review", "alpha")).toBe("session: nothing registered; this session has no id");
    expect(await run("s1", "register", "review", "../x")).toBe(`usage: ${SESSION_USAGE}`);
  }, REAL_GIT_MS);
});

describe("session register where the board is off (real git)", () => {
  test("says so in one line and writes nothing", async () => {
    const repo = repoWithOrigin("spec-session-off-");
    try {
      const line = await sessionCommand(repo.dir, ["register", "review", "alpha"], { runner: isolatedRunner, env: { CLAUDE_CODE_SESSION_ID: "s1" }, now: () => NOW });
      expect(line).toStartWith("session: nothing registered. The board is off here");
    } finally {
      repo.cleanup();
    }
  }, REAL_GIT_MS);
});

describe("the pack lists the other sessions on its spec (real git)", () => {
  let repo: TestRepo;
  let tree: WorkingCopy;
  const as = (id: string) => ({ runner: isolatedRunner, env: { CLAUDE_CODE_SESSION_ID: id }, now: () => NOW });
  const packFor = (env: Record<string, string>) => contextPack(tree.dir, { mode: "execute", name: "alpha" }, contextDeps({ runner: isolatedRunner, now: () => NOW, env }));

  beforeAll(async () => {
    repo = joinedRepo("spec-session-pack-");
    tree = repo.clone("pr-a");
    await sessionCommand(tree.dir, ["register", "review", "alpha"], as("rev"));
    await phaseCommand(tree.dir, ["park", "alpha", "3", "Ship?"], undefined, as("exe"));
  }, REAL_GIT_MS);
  afterAll(() => repo.cleanup());

  test("a session sees the other one, with its mode, and not itself", async () => {
    const pack = await packFor({ CLAUDE_CODE_SESSION_ID: "exe" });
    expect(pack).toContain("Session: review by spec-tests on ");
    expect(pack).toContain("a review can change this spec's plan");
    expect(pack.match(/^Session: /gm)).toHaveLength(1);
  }, REAL_GIT_MS);

  test("the review sees the execute session", async () => {
    const pack = await packFor({ CLAUDE_CODE_SESSION_ID: "rev" });
    expect(pack).toContain("Session: execute by spec-tests on ");
    expect(pack.match(/^Session: /gm)).toHaveLength(1);
  }, REAL_GIT_MS);
});
