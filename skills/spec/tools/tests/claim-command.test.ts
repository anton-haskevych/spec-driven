import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { claimCommand, type ClaimDeps } from "../commands/claim";
import type { RunOptions } from "../core/run";
import { NOW } from "./board-factories";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { createTree, type Tree } from "./tree";

describe("claim command (real git)", () => {
  let repo: TestRepo;
  let claude: Tree;
  let main: string;
  const runner = { run: (argv: readonly string[], options?: RunOptions) => (argv[0] === "ps" ? { code: 0, stdout: `${process.pid} start\n`, stderr: "" } : isolatedRunner.run(argv, options)) };
  const deps = (sessionId?: string): ClaimDeps => ({
    runner,
    asyncRunner: isolatedAsyncRunner,
    claudeHome: claude.root,
    now: NOW,
    env: sessionId ? { CLAUDE_CODE_SESSION_ID: sessionId } : {},
  });
  const liveSession = (sessionId: string, name: string) =>
    claude.write(`sessions/${process.pid}.json`, JSON.stringify({ pid: process.pid, sessionId, cwd: main, procStart: "start", status: "busy", name, updatedAt: NOW.getTime() }));

  beforeAll(() => {
    repo = repoWithOrigin("spec-claim-command-");
    main = realpathSync(repo.dir);
    repo.write("docs/specs/a/CLAUDE.md", "---\nstatus: active\n---\n");
    repo.write("docs/specs/a/progress.md", "- [ ] Phase 1 — One → `phases/phase-1-one.md`\n- [ ] Phase 2 — Two → `phases/phase-2-two.md`\n");
    repo.write("docs/specs/a/phases/phase-1-one.md", "---\nneeds: []\n---\n- [ ] item\n");
    repo.write("docs/specs/a/phases/phase-2-two.md", "---\nneeds: []\n---\n- [ ] first\n- [ ] second\n");
    repo.commitAll("specs");
    repo.git("push", "-q", "origin", "main");
    const busy = repo.addWorktree("busy", "feat/busy");
    busy.write("docs/specs/a/phases/phase-2-two.md", "---\nneeds: []\n---\n- [x] first\n- [ ] second\n");
    busy.commitAll("tick phase 2 item");
  });

  afterEach(() => {
    rmSync(join(main, ".git", "spec-board", "claims"), { recursive: true, force: true });
    claude?.cleanup();
  });
  afterAll(() => repo.cleanup());

  test("takes a free phase, then answers the same session that it already holds it", async () => {
    claude = createTree("spec-claim-claude-");
    liveSession("s1", "a execute 1");
    expect(await claimCommand(repo.dir, ["take", "a", "1"], deps("s1"))).toBe("claim: took a phase 1");
    expect(await claimCommand(repo.dir, ["take", "a", "1"], deps("s1"))).toBe("claim: a phase 1 is already yours");
    expect(await claimCommand(repo.dir, ["list"], deps("s1"))).toBe(`a#1  live  a execute 1  ${main}`);
  });

  test("refuses a phase a live session holds, naming the holder and worktree", async () => {
    claude = createTree("spec-claim-claude-");
    liveSession("s1", "a execute 1");
    await claimCommand(repo.dir, ["take", "a", "1"], deps("s1"));
    expect(await claimCommand(repo.dir, ["take", "a", "1"], deps("s2"))).toBe(`claim refused: a phase 1 is claimed by a execute 1 in ${main}`);
  });

  test("takes over a claim whose session closed and names the old holder", async () => {
    claude = createTree("spec-claim-claude-");
    liveSession("s1", "a execute 1");
    await claimCommand(repo.dir, ["take", "a", "1"], deps("s1"));
    rmSync(join(claude.root, "sessions", `${process.pid}.json`));
    expect(await claimCommand(repo.dir, ["take", "a", "1"], deps("s2"))).toBe("claim: took over a phase 1 from a execute 1 (closed)");
  });

  test("never takes over when liveness is unknown", async () => {
    claude = createTree("spec-claim-claude-");
    liveSession("s1", "a execute 1");
    await claimCommand(repo.dir, ["take", "a", "1"], deps("s1"));
    rmSync(join(claude.root, "sessions"), { recursive: true });
    expect(await claimCommand(repo.dir, ["take", "a", "1"], deps("s2"))).toBe(`claim refused: a phase 1 is claimed by a execute 1 in ${main}`);
  });

  test("refuses an unknown phase and a phase in progress in another worktree", async () => {
    claude = createTree("spec-claim-claude-");
    expect(await claimCommand(repo.dir, ["take", "a", "9"], deps("s1"))).toBe("claim refused: phase 9 is not in a");
    expect(await claimCommand(repo.dir, ["take", "a", "2"], deps("s1"))).toBe(`claim refused: phase 2 is in progress in ${realpathSync(join(repo.root, "busy"))}`);
  });

  test("without a session id: claims nothing, but still refuses a held phase", async () => {
    claude = createTree("spec-claim-claude-");
    expect(await claimCommand(repo.dir, ["take", "a", "1"], deps())).toBe("claim: no session id; not claimed");
    liveSession("s1", "a execute 1");
    await claimCommand(repo.dir, ["take", "a", "1"], deps("s1"));
    expect(await claimCommand(repo.dir, ["take", "a", "1"], deps())).toBe(`claim refused: a phase 1 is claimed by a execute 1 in ${main}`);
  });

  test("release drops only the caller's claims", async () => {
    claude = createTree("spec-claim-claude-");
    liveSession("s2", "other");
    await claimCommand(repo.dir, ["take", "a", "1"], deps("s1"));
    expect(await claimCommand(repo.dir, ["release", "a"], deps("s2"))).toBe("claim: nothing to release for a");
    expect(await claimCommand(repo.dir, ["release", "a"], deps("s1"))).toBe("claim: released a phase 1");
    expect(await claimCommand(repo.dir, ["list"], deps("s1"))).toBe("claim: no claims");
  });

  test("bad arguments print the usage", async () => {
    claude = createTree("spec-claim-claude-");
    expect(await claimCommand(repo.dir, ["take", "a"], deps("s1"))).toStartWith("usage: claim take");
  });
});
