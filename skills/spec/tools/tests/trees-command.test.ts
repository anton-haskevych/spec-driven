import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { treesCommand } from "../commands/trees";
import type { RunOptions } from "../core/run";
import { placeTree, type PlaceDeps } from "../trees/place";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { createTree, type Tree } from "./tree";

describe("trees place (real git)", () => {
  let repo: TestRepo;
  let claude: Tree;
  let home: string;
  const runner = { run: (argv: readonly string[], options?: RunOptions) => (argv[0] === "ps" ? { code: 0, stdout: `${process.pid} start\n`, stderr: "" } : isolatedRunner.run(argv, options)) };
  const deps = (sessionId = "me"): PlaceDeps => ({ runner, asyncRunner: isolatedAsyncRunner, claudeHome: claude.root, env: { CLAUDE_CODE_SESSION_ID: sessionId }, home });
  const phase = (pr: string) => `---\nneeds: []\npr: ${pr}\n---\n- [ ] item\n`;

  beforeAll(() => {
    repo = repoWithOrigin("spec-trees-command-");
    home = realpathSync(repo.root);
    claude = createTree("spec-trees-claude-");
    repo.write(".gitignore", ".env\n");
    repo.write("docs/specs/a/CLAUDE.md", "---\nstatus: active\n---\n");
    repo.write("docs/specs/a/progress.md", ["1 — One", "2 — Two", "3 — Three"].map((title, index) => `- [ ] Phase ${title} → \`phases/phase-${index + 1}.md\``).join("\n") + "\n");
    repo.write("docs/specs/a/phases/phase-1.md", phase("A"));
    repo.write("docs/specs/a/phases/phase-2.md", phase("A"));
    repo.write("docs/specs/a/phases/phase-3.md", phase("B"));
    repo.write("docs/specs/_playbook/settings.md", "---\ngates:\n  bootstrap: bootstrap\n---\n");
    repo.commitAll("spec a");
    repo.git("push", "-q", "origin", "main");
    repo.write(".env", "SECRET=1");
  });
  afterAll(() => {
    repo.cleanup();
    claude.cleanup();
  });

  const treePath = () => join(home, "claude-worktrees", "work", "a-pr-a");

  test("first placement cuts the group's tree, copies .env, names the bootstrap gate and records the root", async () => {
    const output = await treesCommand(repo.dir, ["place", "a", "1"], deps());
    expect(output.split("\n")).toEqual([
      `Trees: ${join(home, "claude-worktrees", "work")} (default, no trees yet; say "put my trees in X" to change)`,
      `Tree: ${treePath()} · feat/a-pr-a · new branch from origin`,
      "Copied: .env",
      "Fresh tree: work through gate bootstrap (spec.ts gates --name bootstrap) before coding.",
    ]);
    expect(readFileSync(join(treePath(), ".env"), "utf8")).toBe("SECRET=1");
    expect(existsSync(join(repo.dir, ".git", "spec-driven", "local.md"))).toBe(true);
  });

  test("another phase of the same PR group lands in the same tree", async () => {
    expect(await treesCommand(repo.dir, ["place", "a", "2"], deps())).toBe(`Tree: ${treePath()} · feat/a-pr-a · existing`);
  });

  test("a babysitter's PR claim id places in its group's existing tree, and existing-only never cuts one", async () => {
    expect(await placeTree(repo.dir, "a", "pr-A", deps(), { existingOnly: true })).toEqual({ ok: true, value: { kind: "found", branch: "feat/a-pr-a", path: treePath() } });
    expect(await placeTree(repo.dir, "a", "pr-B", deps(), { existingOnly: true })).toEqual({ ok: false, reason: "no tree for feat/a-pr-b" });
    expect(existsSync(join(home, "claude-worktrees", "work", "a-pr-b"))).toBe(false);
    expect(await placeTree(repo.dir, "a", "pr-Z", deps(), { existingOnly: true })).toEqual({ ok: false, reason: "PR group Z is not in a" });
  });

  const sessionInTree = (status: "busy" | "idle") =>
    claude.write(`sessions/${process.pid}.json`, JSON.stringify({ pid: process.pid, sessionId: "other", cwd: treePath(), procStart: "start", status, name: "a execute 1", updatedAt: Date.now() }));

  test("a session mid-task in the tree makes it busy for everyone else", async () => {
    sessionInTree("busy");
    expect(await treesCommand(repo.dir, ["place", "a", "2"], deps())).toBe(`trees: ${treePath()} is busy, a execute 1 is mid-task there; not placed`);
    expect(await treesCommand(repo.dir, ["place", "a", "2"], deps("other"))).toBe(`Tree: ${treePath()} · feat/a-pr-a · existing`);
  });

  test("an idle session that left the tree clean doesn't hold it: it handed off and stayed open", async () => {
    sessionInTree("idle");
    expect(await treesCommand(repo.dir, ["place", "a", "2"], deps())).toBe(`Tree: ${treePath()} · feat/a-pr-a · existing`);
  });

  test("an idle session holds the tree while it has uncommitted changes", async () => {
    sessionInTree("idle");
    writeFileSync(join(treePath(), "half-done.md"), "not committed");
    expect(await treesCommand(repo.dir, ["place", "a", "2"], deps())).toBe(`trees: ${treePath()} is busy, a execute 1 left uncommitted changes there; not placed`);
    rmSync(join(treePath(), "half-done.md"));
  });

  test("--json carries the placement; unknown phases are refused", async () => {
    const parsed = JSON.parse(await treesCommand(repo.dir, ["place", "a", "3", "--json"], deps()));
    expect(parsed.placement).toMatchObject({ kind: "added", branch: "feat/a-pr-b", how: "created", path: join(home, "claude-worktrees", "work", "a-pr-b") });
    expect(await treesCommand(repo.dir, ["place", "a", "9"], deps())).toBe("trees: phase 9 is not in a");
  });
});
