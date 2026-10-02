import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { treesCommand } from "../commands/trees";
import type { RunOptions } from "../core/run";
import type { PlaceDeps } from "../trees/place";
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
    claude.write(`sessions/${process.pid}.json`, JSON.stringify({ pid: process.pid, sessionId: "other", cwd: at("busy"), procStart: "start", status: "busy", name: "x execute 1", updatedAt: Date.now() }));
  });
  afterAll(() => {
    repo.cleanup();
    claude.cleanup();
  });

  const merged = () => JSON.stringify([{ number: 8, headRefName: "feat/squashed", headRefOid: squashedHead }]);

  test("lists merged, idle trees with their evidence; leaves out unpushed, busy and claimed ones", async () => {
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
