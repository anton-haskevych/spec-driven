import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { copyIncludedFiles } from "../trees/setup";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

describe("copyIncludedFiles", () => {
  let repo: TestRepo;
  afterEach(() => repo.cleanup());

  const repoWith = (tracked: Record<string, string>, untracked: Record<string, string>) => {
    repo = repoWithOrigin("spec-trees-setup-");
    for (const [path, text] of Object.entries(tracked)) repo.write(path, text);
    repo.commitAll("tracked");
    for (const [path, text] of Object.entries(untracked)) repo.write(path, text);
    return repo.addWorktree("tree", "feat/tree");
  };

  test("copies the gitignored files .worktreeinclude lists, nothing it lists that git tracks or shows", () => {
    const tree = repoWith(
      { ".gitignore": ".env*\nnode_modules/\napps/web/.env\n", ".worktreeinclude": ".env*\napps/*/.env\nNOTES*\n" },
      { ".env": "A=1", ".env.local": "B=2", "apps/web/.env": "C=3", "NOTES.md": "untracked, not ignored", "node_modules/x": "y" },
    );
    expect(copyIncludedFiles(isolatedRunner, repo.dir, tree.dir)).toEqual({ copied: [".env", ".env.local", "apps/web/.env"] });
    expect(readFileSync(join(tree.dir, "apps/web/.env"), "utf8")).toBe("C=3");
    expect(existsSync(join(tree.dir, "NOTES.md"))).toBe(false);
  });

  test("no .worktreeinclude → .env and .env.local when present", () => {
    const tree = repoWith({ ".gitignore": ".env*\n" }, { ".env": "A=1", ".env.production": "P=1" });
    expect(copyIncludedFiles(isolatedRunner, repo.dir, tree.dir)).toEqual({ copied: [".env"] });
  });

  test("never overwrites a file the tree already has", () => {
    const tree = repoWith({ ".gitignore": ".env\n" }, { ".env": "main" });
    tree.write(".env", "tree's own");
    expect(copyIncludedFiles(isolatedRunner, repo.dir, tree.dir)).toEqual({ copied: [] });
    expect(readFileSync(join(tree.dir, ".env"), "utf8")).toBe("tree's own");
  });

  test("a failed copy names the file and stops", () => {
    const tree = repoWith({ ".gitignore": ".env*\n" }, { ".env": "A=1" });
    chmodSync(join(repo.dir, ".env"), 0o000);
    const report = copyIncludedFiles(isolatedRunner, repo.dir, tree.dir);
    chmodSync(join(repo.dir, ".env"), 0o644);
    expect(report.copied).toEqual([]);
    expect(report.failed).toStartWith("copy .env: ");
  });
});
