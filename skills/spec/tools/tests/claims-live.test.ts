import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { heldByOthers } from "../claims/live";
import { claimsDir, takeClaim, type Claim } from "../claims/store";
import { gitAt } from "../core/git";
import type { RunOptions } from "../core/run";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { createTree, type Tree } from "./tree";

describe("heldByOthers", () => {
  let repo: TestRepo;
  let claude: Tree;
  let dir = "";
  const runner = { run: (argv: readonly string[], options?: RunOptions) => (argv[0] === "ps" ? { code: 0, stdout: `${process.pid} start\n`, stderr: "" } : isolatedRunner.run(argv, options)) };
  const claim = (spec: string, phase: string, sessionId: string, sessionName?: string): Claim => ({ spec, phase, sessionId, ...(sessionName ? { sessionName } : {}), workspace: "/w", claimedAt: "t" });
  const live = (sessionId: string) =>
    claude.write(`sessions/${process.pid}.json`, JSON.stringify({ pid: process.pid, sessionId, cwd: "/w", procStart: "start", status: "busy", updatedAt: 1 }));

  beforeAll(() => {
    repo = repoWithOrigin("spec-claims-live-");
    const resolved = claimsDir(gitAt(repo.dir, isolatedRunner));
    if (!resolved.ok) throw new Error(resolved.reason);
    dir = resolved.value;
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    claude?.cleanup();
  });
  afterAll(() => repo.cleanup());

  test("lists phases held by another live session, not the caller's own or a closed session's", () => {
    claude = createTree("spec-claims-live-claude-");
    live("s-other");
    takeClaim(dir, claim("a", "1", "s-other", "a execute 1"), () => false);
    takeClaim(dir, claim("a", "2", "s-me"), () => false);
    takeClaim(dir, claim("a", "3", "s-closed"), () => false);
    const held = heldByOthers(repo.dir, { runner, claudeHome: claude.root, env: { CLAUDE_CODE_SESSION_ID: "s-me" } });
    expect([...held]).toEqual([["a#1", "a execute 1"]]);
  });

  test("when liveness is unknown every other session's claim counts as held", () => {
    claude = createTree("spec-claims-live-claude-");
    takeClaim(dir, claim("a", "1", "s-other"), () => false);
    const held = heldByOthers(repo.dir, { runner, claudeHome: join(claude.root, "missing"), env: {} });
    expect([...held]).toEqual([["a#1", "session s-other"]]);
  });

  test("outside a git repo nothing is held", () => {
    claude = createTree("spec-claims-live-claude-");
    expect(heldByOthers(claude.root, { runner, claudeHome: claude.root, env: {} }).size).toBe(0);
  });
});
