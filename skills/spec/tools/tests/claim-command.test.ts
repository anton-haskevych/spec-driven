import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pushClaim } from "../claims/remote";
import { claimCommand, type ClaimDeps } from "../commands/claim";
import { gitAt } from "../core/git";
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
    host: "laptop",
    env: sessionId ? { CLAUDE_CODE_SESSION_ID: sessionId } : {},
  });
  const originClaims = () => repo.git("--git-dir", repo.origin, "for-each-ref", "--format=%(refname) %(contents:subject)", "refs/spec-claims");
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
    for (const ref of repo.git("--git-dir", repo.origin, "for-each-ref", "--format=%(refname)", "refs/spec-claims").split("\n").filter(Boolean)) {
      repo.git("--git-dir", repo.origin, "update-ref", "-d", ref);
    }
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

  test("a take is mirrored on origin as the session's ref, and release deletes it", async () => {
    claude = createTree("spec-claim-claude-");
    liveSession("s1", "a execute 1");
    await claimCommand(repo.dir, ["take", "a", "1"], deps("s1"));
    expect(originClaims()).toContain(`refs/spec-claims/a/1 {"spec":"a","phase":"1","sessionId":"s1"`);
    expect(await claimCommand(repo.dir, ["release", "a"], deps("s1"))).toBe("claim: released a phase 1");
    expect(originClaims()).toBe("");
  });

  test("a phase claimed from another machine is refused, and the local claim is rolled back", async () => {
    claude = createTree("spec-claim-claude-");
    const desktop = gitAt(repo.clone(`desktop-${Date.now()}`).dir, isolatedRunner);
    const theirs = { spec: "a", phase: "1", sessionId: "t1", sessionName: "a execute 1", workspace: "/Users/taras/crm", claimedAt: NOW.toISOString() };
    pushClaim(desktop, { claim: theirs, holder: { user: "spec-tests", host: "desktop" } }, { kind: "absent" });
    expect(await claimCommand(repo.dir, ["take", "a", "1"], deps("s1"))).toBe(
      'claim refused: a phase 1 is claimed by spec-tests@desktop (a execute 1) <1m ago; say "take it over" to take it anyway',
    );
    expect(await claimCommand(repo.dir, ["list"], deps("s1"))).toBe("claim: no claims");
  });

  test("taking over a closed same-machine claim replaces its ref on origin too", async () => {
    claude = createTree("spec-claim-claude-");
    liveSession("s1", "a execute 1");
    await claimCommand(repo.dir, ["take", "a", "1"], deps("s1"));
    rmSync(join(claude.root, "sessions", `${process.pid}.json`));
    expect(await claimCommand(repo.dir, ["take", "a", "1"], deps("s2"))).toBe("claim: took over a phase 1 from a execute 1 (closed)");
    expect(originClaims()).toContain(`"sessionId":"s2"`);
    expect(originClaims()).toContain(`"takenFrom":"s1"`);
  });

  test("release after another machine took the phase over says who, and exits clean", async () => {
    claude = createTree("spec-claim-claude-");
    await claimCommand(repo.dir, ["take", "a", "1"], deps("s1"));
    const sha = repo.git("--git-dir", repo.origin, "rev-parse", "refs/spec-claims/a/1");
    const desktop = gitAt(repo.clone(`desktop-${Date.now()}`).dir, isolatedRunner);
    const theirs = { spec: "a", phase: "1", sessionId: "t1", workspace: "/Users/taras/crm", claimedAt: NOW.toISOString(), takenFrom: "s1" };
    pushClaim(desktop, { claim: theirs, holder: { user: "spec-tests", host: "desktop" } }, { kind: "at", sha });
    expect(await claimCommand(repo.dir, ["release", "a"], deps("s1"))).toBe("claim: phase 1 was taken over by spec-tests@desktop <1m ago; your work is on main");
    expect(originClaims()).toContain(`"sessionId":"t1"`);
  });

  test("an unreachable origin keeps the local claim and says so", async () => {
    claude = createTree("spec-claim-claude-");
    const stray = repo.clone(`stray-${Date.now()}`);
    stray.git("remote", "set-url", "origin", join(repo.root, "missing.git"));
    expect(await claimCommand(stray.dir, ["take", "a", "1"], deps("s1"))).toBe("claim: took a phase 1\nclaim: origin unreachable; claimed locally only");
    expect(await claimCommand(stray.dir, ["release", "a"], deps("s1"))).toBe("claim: released a phase 1\nclaim: origin unreachable; released locally only");
  });

  test("bad arguments print the usage", async () => {
    claude = createTree("spec-claim-claude-");
    expect(await claimCommand(repo.dir, ["take", "a"], deps("s1"))).toStartWith("usage: claim take");
  });
});
