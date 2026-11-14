import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { treesCommand } from "../commands/trees";
import type { RunOptions } from "../core/run";
import type { PlaceDeps } from "../trees/place";
import type { TreesDeps } from "../commands/trees";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { cannedGh } from "./stub-runner";
import { createTree, type Tree } from "./tree";

describe("trees prune (real git, gh stubbed)", () => {
  let repo: TestRepo;
  let claude: Tree;
  let squashedHead: string;
  const runner = { run: (argv: readonly string[], options?: RunOptions) => (argv[0] === "ps" ? { code: 0, stdout: `${process.pid} start\n`, stderr: "" } : isolatedRunner.run(argv, options)) };
  const deps = (gh: string): PlaceDeps => ({
    runner,
    asyncRunner: cannedGh(isolatedAsyncRunner, [[["gh", "pr", "list"], { stdout: gh }]]),
    claudeHome: claude.root,
    env: { CLAUDE_CODE_SESSION_ID: "me" },
    home: repo.root,
  });
  const at = (name: string) => join(realpathSync(repo.root), name);

  beforeAll(() => {
    repo = repoWithOrigin("spec-trees-prune-");
    claude = createTree("spec-trees-prune-claude-");
    repo.write("README.md", "tracked");
    repo.commitAll("a tracked file to edit");
    repo.git("push", "-q", "origin", "main");
    const ff = repo.addWorktree("ff", "feat/ff");
    ff.write("ff.md", "x");
    ff.commitAll("fast-forwarded into main");
    ff.git("push", "-q", "origin", "HEAD:main");
    const squashed = repo.addWorktree("squashed", "feat/squashed");
    squashed.write("s.md", "x");
    squashed.commitAll("squash-merged as #8");
    squashedHead = squashed.git("rev-parse", "HEAD");
    const unpushed = repo.addWorktree("unpushed", "feat/unpushed");
    unpushed.write("u.md", "x");
    unpushed.commitAll("never pushed");
    const dirty = repo.addWorktree("dirty", "feat/dirty");
    dirty.write("README.md", "edited, not committed");
    repo.addWorktree("scratch", "feat/scratch").write("notes.md", "untracked");
    repo.addWorktree("busy", "feat/busy");
    const claimed = repo.addWorktree("claimed", "feat/claimed");
    repo.write(".git/spec-board/claims/x#2.json", JSON.stringify({ spec: "x", phase: "2", sessionId: "gone-session", workspace: realpathSync(claimed.dir), claimedAt: new Date().toISOString() }));
    claude.write(`sessions/${process.pid}.json`, JSON.stringify({ pid: process.pid, sessionId: "other", cwd: at("busy"), procStart: "start", status: "idle", name: "x execute 1", updatedAt: Date.now() }));
  });
  afterAll(() => {
    repo.cleanup();
    claude.cleanup();
  });

  const merged = () => JSON.stringify([{ number: 8, headRefName: "feat/squashed", headRefOid: squashedHead }]);

  test("lists merged trees nobody is in, with their evidence; leaves out unpushed ones, claimed ones, and one an idle tab is open in", async () => {
    expect((await treesCommand(repo.dir, ["prune"], deps(merged()))).split("\n")).toEqual([
      "prune 4 merged trees (idle, nothing unpushed; trees with edits are kept):",
      `  ${at("dirty")} · feat/dirty · in origin/main`,
      `  ${at("ff")} · feat/ff · in origin/main`,
      `  ${at("scratch")} · feat/scratch · in origin/main`,
      `  ${at("squashed")} · feat/squashed · #8 merged`,
    ]);
  });

  test("without gh only base ancestry counts, and it says so", async () => {
    const output = await treesCommand(repo.dir, ["prune"], { ...deps(""), asyncRunner: cannedGh(isolatedAsyncRunner, [[["gh"], { code: 1, stderr: "gh: not logged in" }]]) });
    expect(output.split("\n")).toEqual([
      "prune 3 merged trees (idle, nothing unpushed; trees with edits are kept):",
      `  ${at("dirty")} · feat/dirty · in origin/main`,
      `  ${at("ff")} · feat/ff · in origin/main`,
      `  ${at("scratch")} · feat/scratch · in origin/main`,
      "PR merges not checked (gh: not logged in); only trees already in base are listed.",
    ]);
  });

  test("unreadable sessions keep every tree, and it says why", async () => {
    const output = await treesCommand(repo.dir, ["prune"], { ...deps(merged()), claudeHome: join(repo.root, "no-claude-home") });
    expect(output.split("\n")).toEqual(["trees: nothing to prune", `Open sessions can't be read (no ${join(repo.root, "no-claude-home", "sessions")}), so every tree is kept.`]);
  });

  test("--apply removes the trees and their branches; git itself keeps edited ones", async () => {
    const lines = (await treesCommand(repo.dir, ["prune", "--apply"], deps(merged()))).split("\n");
    expect(lines[0]).toStartWith(`kept ${at("dirty")}: git worktree failed: fatal: `);
    expect(lines[1]).toBe(`removed ${at("ff")} and branch feat/ff`);
    expect(lines[2]).toStartWith(`kept ${at("scratch")}: git worktree failed: fatal: `);
    expect(lines[3]).toBe(`removed ${at("squashed")} and branch feat/squashed`);
    expect(["ff", "squashed"].map((name) => existsSync(at(name)))).toEqual([false, false]);
    expect(["unpushed", "dirty", "scratch", "busy", "claimed"].map((name) => existsSync(at(name)))).toEqual([true, true, true, true, true]);
    expect(repo.git("branch", "--list", "feat/ff", "feat/squashed")).toBe("");
  });
});

describe("trees prune --auto --wait (the background run)", () => {
  let repo: TestRepo;
  let claude: Tree;
  let squashedHead: string;
  const runner = { run: (argv: readonly string[], options?: RunOptions) => (argv[0] === "ps" ? { code: 0, stdout: `${process.pid} start\n`, stderr: "" } : isolatedRunner.run(argv, options)) };
  const deps = (): PlaceDeps => ({
    runner,
    asyncRunner: cannedGh(isolatedAsyncRunner, [[["gh", "pr", "list"], { stdout: JSON.stringify([{ number: 8, headRefName: "feat/squashed", headRefOid: squashedHead }]) }]]),
    claudeHome: claude.root,
    env: { CLAUDE_CODE_SESSION_ID: "me" },
    home: repo.root,
  });
  const at = (name: string) => join(realpathSync(repo.root), "trees", name);

  beforeAll(() => {
    repo = repoWithOrigin("spec-trees-prune-auto-");
    claude = createTree("spec-trees-prune-auto-claude-");
    repo.write("README.md", "tracked");
    repo.commitAll("a tracked file to edit");
    repo.git("push", "-q", "origin", "main");
    const ff = repo.addWorktree("trees/ff", "feat/ff");
    ff.write("ff.md", "x");
    ff.commitAll("fast-forwarded into main");
    ff.git("push", "-q", "origin", "HEAD:main");
    const squashed = repo.addWorktree("trees/squashed", "feat/squashed");
    squashed.write("s.md", "x");
    squashed.commitAll("squash-merged as #8");
    squashedHead = squashed.git("rev-parse", "HEAD");
    const unpushed = repo.addWorktree("trees/unpushed", "feat/unpushed");
    unpushed.write("u.md", "x");
    unpushed.commitAll("never pushed");
    repo.addWorktree("trees/dirty", "feat/dirty").write("README.md", "edited, not committed");
    repo.addWorktree("trees/busy", "feat/busy");
    mkdirSync(join(repo.root, "trees", "leftover", "node_modules"), { recursive: true });
    claude.write(`sessions/${process.pid}.json`, JSON.stringify({ pid: process.pid, sessionId: "other", cwd: at("busy"), procStart: "start", status: "idle", name: "x execute 1", updatedAt: Date.now() }));
  });
  afterAll(() => {
    repo.cleanup();
    claude.cleanup();
  });

  test("the list names folders git doesn't know as worktrees, apart from the trees", async () => {
    const lines = (await treesCommand(repo.dir, ["prune"], deps())).split("\n");
    expect(lines.slice(-2)).toEqual(["1 folder is not a registered worktree, left alone:", `  ${at("leftover")}`]);
  });

  test("removes merged, pushed, idle trees without asking and says so in one line; keeps everything else", async () => {
    expect(await treesCommand(repo.dir, ["prune", "--auto", "--wait"], deps())).toBe("Pruned 2 merged trees (ff, squashed) · kept 1, git refused (dirty) · 1 folder not a worktree, left alone (leftover)");
    expect(["ff", "squashed"].map((name) => existsSync(at(name)))).toEqual([false, false]);
    expect(["unpushed", "dirty", "busy", "leftover"].map((name) => existsSync(at(name)))).toEqual([true, true, true, true]);
    expect(repo.git("branch", "--list", "feat/ff", "feat/squashed")).toBe("");
  });

  test("a second run finds nothing left to remove", async () => {
    expect(await treesCommand(repo.dir, ["prune", "--auto", "--wait"], deps())).toBe("Pruned 0 merged trees · kept 1, git refused (dirty) · 1 folder not a worktree, left alone (leftover)");
  });

  test("unreadable sessions remove nothing, and the line says why", async () => {
    const output = await treesCommand(repo.dir, ["prune", "--auto", "--wait"], { ...deps(), claudeHome: join(repo.root, "no-claude-home") });
    expect(output).toBe(`Pruned 0 merged trees · 1 folder not a worktree, left alone (leftover) · open sessions unreadable (no ${join(repo.root, "no-claude-home", "sessions")}), every tree kept`);
  });
});

describe("trees prune --auto (what handoff runs)", () => {
  let repo: TestRepo;
  let claude: Tree;
  const spawned: (readonly string[])[] = [];
  const deps = (spawnedPid: number | undefined): TreesDeps => ({
    runner: isolatedRunner,
    asyncRunner: isolatedAsyncRunner,
    claudeHome: claude.root,
    env: {},
    home: repo.root,
    spawner: (argv) => {
      spawned.push(argv);
      return spawnedPid;
    },
  });

  beforeAll(() => {
    repo = repoWithOrigin("spec-trees-prune-bg-");
    claude = createTree("spec-trees-prune-bg-claude-");
  });
  afterAll(() => {
    repo.cleanup();
    claude.cleanup();
  });

  test("starts the work detached and returns at once", async () => {
    expect(await treesCommand(repo.dir, ["prune", "--auto"], deps(99_999_999))).toBe("Pruning merged trees in the background");
    const argv = spawned.at(-1) ?? [];
    expect(argv.slice(-4)).toEqual(["trees", "prune", "--auto", "--wait"]);
    expect(argv.at(-5)).toEndWith("/tools/spec.ts");
  });

  test("names the last run's result, and starts no second run while one is going", async () => {
    repo.write(".git/spec-board/prune/last.txt", "Pruned 2 merged trees (a, b)\n");
    const before = spawned.length;
    expect(await treesCommand(repo.dir, ["prune", "--auto"], deps(process.pid))).toBe("Pruning merged trees in the background · last run: Pruned 2 merged trees (a, b)");
    expect(await treesCommand(repo.dir, ["prune", "--auto"], deps(process.pid))).toBe("Pruning merged trees: still running from an earlier handoff · last run: Pruned 2 merged trees (a, b)");
    expect(spawned.length).toBe(before + 1);
  });
});
