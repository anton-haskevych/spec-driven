import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createTree, type Tree } from "../tree";
import { importScanner, testFilesUnder, TEST_SUFFIX } from "./scan";

let tree: Tree;
afterEach(() => tree.cleanup());

function project(files: Record<string, string>): string {
  tree = createTree("real-git-scan-");
  for (const [path, text] of Object.entries(files)) tree.write(path, text);
  return tree.root;
}

describe("importScanner", () => {
  test("follows imports through helpers to the end of the chain", () => {
    const root = project({
      "a.test.ts": 'import { joined } from "./joined";\n',
      "joined.ts": 'import { repo } from "./repo";\nexport const joined = repo;\n',
      "repo.ts": "export const repo = 1;\n",
    });
    expect(importScanner(root).reaches(join(root, "a.test.ts"), [join(root, "repo.ts")])).toBe(true);
  });

  test("a type-only import doesn't count", () => {
    const root = project({ "a.test.ts": 'import type { Repo } from "./repo";\n', "repo.ts": "export type Repo = 1;\n" });
    expect(importScanner(root).reaches(join(root, "a.test.ts"), [join(root, "repo.ts")])).toBe(false);
  });

  test("survives shebangs, JSON imports, packages and import cycles", () => {
    const root = project({
      "a.test.ts": 'import data from "./data.json";\nimport { b } from "./b";\nimport { expect } from "bun:test";\n',
      "b.ts": '#!/usr/bin/env bun\nimport { a } from "./c";\nexport const b = a;\n',
      "c.ts": 'import { b } from "./b";\nexport const a = 1;\n',
      "data.json": '{ "key": "value" }\n',
      "repo.ts": "export const repo = 1;\n",
    });
    expect(importScanner(root).reaches(join(root, "a.test.ts"), [join(root, "repo.ts")])).toBe(false);
  });
});

describe("testFilesUnder", () => {
  test("lists every file bun collects as a test, outside fixtures", () => {
    const root = project({
      "skills/a.test.ts": "",
      "skills/b_test.ts": "",
      "skills/c.spec.tsx": "",
      "skills/d.git.test.ts": "",
      "skills/helper.ts": "",
      "skills/x/fixtures/e.test.ts": "",
    });
    expect(testFilesUnder(join(root, "skills")).map((file) => file.slice(root.length + 1)).sort()).toEqual([
      "skills/a.test.ts",
      "skills/b_test.ts",
      "skills/c.spec.tsx",
      "skills/d.git.test.ts",
    ]);
  });

  test("TEST_SUFFIX tells the .test.ts files from the other suffixes", () => {
    expect(["a.test.ts", "a.git.test.ts", "a_test.ts", "a.spec.ts"].map((name) => TEST_SUFFIX.test(name))).toEqual([true, true, false, false]);
  });
});
