import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { createTree, type Tree } from "./tree";

const SCRIPT = join(import.meta.dir, "..", "..", "scripts", "spec-bump.sh");
const STALE = "---\nstatus: active\nupdated: 2020-01-01T00:00:00+00:00\n---\n";
const ZONE = { ...process.env, TZ: Intl.DateTimeFormat().resolvedOptions().timeZone };

let tree: Tree;
afterEach(() => tree.cleanup());

function bump(name: string, cwd: string) {
  const result = Bun.spawnSync(["bash", SCRIPT, name], { cwd, env: ZONE });
  return { code: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

function expectBumped(file: string, result: ReturnType<typeof bump>) {
  expect(result.code).toBe(0);
  // macOS: the temp dir is a symlink (/var → /private/var), and bash prints the real path.
  expect(result.stdout).toStartWith(`Updated: ${realpathSync(file)} → `);
  expect(readFileSync(file, "utf8")).not.toContain("2020-01-01");
}

describe("spec-bump.sh <name>", () => {
  test("bumps the spec from the project root", () => {
    tree = createTree();
    tree.write(".git/HEAD", "");
    const file = tree.write("docs/specs/alpha/CLAUDE.md", STALE);
    expectBumped(file, bump("alpha", tree.root));
  });

  test("finds it from inside a spec folder", () => {
    tree = createTree();
    tree.write(".git/HEAD", "");
    const file = tree.write("docs/specs/alpha/CLAUDE.md", STALE);
    tree.write("docs/specs/alpha/phases/phase-1.md", "");
    expectBumped(file, bump("alpha", join(tree.root, "docs/specs/alpha/phases")));
  });

  test("from a subproject with its own docs/specs, resolves from the outermost root", () => {
    tree = createTree();
    tree.write(".git/HEAD", "");
    tree.write("docs/specs/_playbook/settings.md", "");
    const file = tree.write("landing/docs/specs/hero/CLAUDE.md", STALE);
    tree.write("landing/src/app.ts", "");
    expectBumped(file, bump("hero", join(tree.root, "landing/src")));
  });

  test("stops at a worktree, whose .git is a file", () => {
    tree = createTree();
    tree.write("docs/specs/alpha/CLAUDE.md", STALE);
    tree.write("tree/.git", "gitdir: /elsewhere\n");
    const file = tree.write("tree/docs/specs/alpha/CLAUDE.md", STALE);
    tree.write("tree/skills/spec/SKILL.md", "");
    expectBumped(file, bump("alpha", join(tree.root, "tree/skills/spec")));
    expect(readFileSync(join(tree.root, "docs/specs/alpha/CLAUDE.md"), "utf8")).toContain("2020-01-01");
  });

  test("outside any spec tree, says the spec is not found", () => {
    tree = createTree();
    tree.write(".git/HEAD", "");
    tree.write("src/app.ts", "");
    const result = bump("alpha", join(tree.root, "src"));
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("spec 'alpha' not found");
  });
});
