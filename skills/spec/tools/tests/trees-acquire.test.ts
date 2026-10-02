import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { gitAt } from "../core/git";
import { addTree } from "../trees/acquire";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

describe("addTree (real git)", () => {
  let repo: TestRepo;
  let root: string;
  const name = { branch: "feat/s-pr-b", folder: "s-pr-b" };
  const git = () => gitAt(repo.dir, isolatedRunner);
  const headOf = (dir: string) => isolatedRunner.run(["git", "rev-parse", "HEAD"], { cwd: dir }).stdout.trim();

  beforeEach(() => {
    repo = repoWithOrigin("spec-trees-acquire-");
    root = join(repo.root, "trees");
  });
  afterEach(() => repo.cleanup());

  test("cuts a new branch from freshly fetched origin, never from local HEAD", () => {
    const other = repo.clone("other");
    other.write("moved.md", "x");
    other.commitAll("main moved on");
    other.git("push", "-q", "origin", "main");
    repo.write("local-only.md", "x");
    repo.commitAll("unpushed local work");

    const added = addTree(git(), name, root, "main", 10_000);
    expect(added).toEqual({ ok: true, value: { kind: "created", path: join(root, "s-pr-b") } });
    expect(headOf(join(root, "s-pr-b"))).toBe(other.git("rev-parse", "HEAD"));
  });

  test("offline: cuts from the last fetched origin and says so", () => {
    repo.git("remote", "set-url", "origin", join(repo.root, "missing.git"));
    const added = addTree(git(), name, root, "main", 10_000);
    expect(added.ok && added.value.kind).toBe("created");
    expect(added.ok && added.value.offline).toStartWith("git fetch failed");
  });

  test("a local branch without a tree keeps its commits", () => {
    repo.git("branch", "feat/s-pr-b");
    const tip = repo.git("rev-parse", "feat/s-pr-b");
    expect(addTree(git(), name, root, "main", 10_000)).toEqual({ ok: true, value: { kind: "reused-branch", path: join(root, "s-pr-b") } });
    expect(headOf(join(root, "s-pr-b"))).toBe(tip);
  });

  test("a branch only on origin is taken over and tracks it", () => {
    const other = repo.clone("other");
    other.git("checkout", "-q", "-b", "feat/s-pr-b");
    other.write("their.md", "x");
    other.commitAll("their work");
    other.git("push", "-q", "origin", "feat/s-pr-b");

    expect(addTree(git(), name, root, "main", 10_000)).toEqual({ ok: true, value: { kind: "took-over", path: join(root, "s-pr-b") } });
    const tree = join(root, "s-pr-b");
    expect(headOf(tree)).toBe(other.git("rev-parse", "HEAD"));
    expect(isolatedRunner.run(["git", "rev-parse", "--abbrev-ref", "@{upstream}"], { cwd: tree }).stdout.trim()).toBe("origin/feat/s-pr-b");
  });

  test("a folder already taken gets a numbered one", () => {
    mkdirSync(join(root, "s-pr-b"), { recursive: true });
    const added = addTree(git(), name, root, "main", 10_000);
    expect(added.ok && added.value.path).toBe(join(root, "s-pr-b-2"));
  });
});
