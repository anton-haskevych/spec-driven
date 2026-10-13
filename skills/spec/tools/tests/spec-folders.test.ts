import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { findProjectDir, isSpecDocPath, resolveSpec, specRoots } from "../core/spec-folders";
import { createTree, type Tree } from "./tree";

let tree: Tree;
afterEach(() => tree.cleanup());

describe("resolveSpec", () => {
  test("finds the one spec with that name", () => {
    tree = createTree();
    const spec = tree.spec("alpha", {});
    expect(resolveSpec(tree.root, "alpha")).toEqual(spec);
  });

  test("explains a missing or ambiguous name", () => {
    tree = createTree();
    tree.spec("alpha", {});
    tree.write("web/docs/specs/alpha/CLAUDE.md", "---\nstatus: active\n---\n");
    expect(resolveSpec(tree.root, "beta")).toBe("no spec named beta");
    expect(resolveSpec(tree.root, "alpha")).toBe("2 specs are named alpha; run from the project that holds the one you mean");
  });
});

describe("isSpecDocPath", () => {
  test("root and one-level-nested spec roots, including _ledger and _playbook", () => {
    for (const path of ["docs/specs/a/progress.md", "landing/docs/specs/a/CLAUDE.md", "docs/specs/_ledger/INDEX.md", "docs/specs/_playbook/settings.md", "docs/specs/README.md"]) {
      expect(isSpecDocPath(path)).toBe(true);
    }
  });

  test("code, other docs, deeper nesting and the bare folder are not spec docs", () => {
    for (const path of ["src/docs/specs.ts", "docs/README.md", "docs/specs", "a/b/docs/specs/x/progress.md", "/abs/docs/specs/a/x.md"]) {
      expect(isSpecDocPath(path)).toBe(false);
    }
  });
});

describe("specRoots", () => {
  test("lists the spec roots that exist, top-level first, as repo-relative paths", () => {
    tree = createTree();
    tree.write("web/docs/specs/a/CLAUDE.md", "");
    tree.write("api/docs/specs/.keep", "");
    tree.write("docs/specs/b/CLAUDE.md", "");
    tree.write("docs/readme.md", "");
    tree.write(".hidden/docs/specs/c/CLAUDE.md", "");
    expect(specRoots(tree.root)).toEqual(["docs/specs", "api/docs/specs", "web/docs/specs"]);
  });

  test("returns nothing where no spec root exists", () => {
    tree = createTree();
    tree.write("src/index.ts", "");
    expect(specRoots(tree.root)).toEqual([]);
  });

  test("returns nothing for a directory that is gone, such as a deleted worktree", () => {
    tree = createTree();
    expect(specRoots(`${tree.root}/deleted`)).toEqual([]);
  });
});

describe("findProjectDir", () => {
  test("the project root resolves to itself", () => {
    tree = createTree();
    tree.write(".git/HEAD", "");
    tree.spec("alpha", {});
    expect(findProjectDir(tree.root)).toBe(tree.root);
  });

  test("a folder inside a spec resolves to the project root", () => {
    tree = createTree();
    tree.write(".git/HEAD", "");
    const spec = tree.spec("alpha", { "phases/phase-1.md": "" });
    expect(findProjectDir(`${spec.dir}/phases`)).toBe(tree.root);
  });

  test("a subproject with its own docs/specs resolves to the outermost one", () => {
    tree = createTree();
    tree.write(".git/HEAD", "");
    tree.write("docs/specs/_playbook/settings.md", "");
    tree.write("landing/docs/specs/hero/CLAUDE.md", "");
    tree.write("landing/src/app.ts", "");
    expect(findProjectDir(`${tree.root}/landing/src`)).toBe(tree.root);
  });

  test("stops at a worktree, whose .git is a file", () => {
    tree = createTree();
    tree.write("docs/specs/outer/CLAUDE.md", "");
    tree.write("tree/.git", "gitdir: /elsewhere\n");
    tree.write("tree/docs/specs/alpha/CLAUDE.md", "");
    tree.write("tree/skills/spec/SKILL.md", "");
    expect(findProjectDir(`${tree.root}/tree/skills/spec`)).toBe(`${tree.root}/tree`);
  });

  test("outside any spec tree, the start folder stays the project dir", () => {
    tree = createTree();
    tree.write(".git/HEAD", "");
    tree.write("src/app.ts", "");
    expect(findProjectDir(`${tree.root}/src`)).toBe(`${tree.root}/src`);
  });
});

describe("spec.ts from a subfolder", () => {
  test("finds the spec the way it does from the project root", () => {
    tree = createTree();
    tree.write(".git/HEAD", "");
    tree.spec("alpha", { "progress.md": "- [ ] Phase 1 — Start → `phases/phase-1.md`\n", "phases/phase-1.md": "- [ ] go\n" });
    tree.write("skills/spec/SKILL.md", "");
    const specTs = join(import.meta.dir, "..", "spec.ts");
    const output = Bun.spawnSync(["bun", specTs, "ready", "alpha"], { cwd: join(tree.root, "skills/spec") }).stdout.toString();
    expect(output).not.toContain("no spec named alpha");
    expect(output).toContain("Ready now: 1 Start");
  });
});
