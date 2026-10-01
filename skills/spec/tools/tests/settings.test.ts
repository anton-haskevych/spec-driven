import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { DEFAULT_SETTINGS, describeSettings, loadSettings, parseSettings, SETTINGS_FILE } from "../playbook/settings";
import { settingsReport } from "../commands/settings";
import { createTree, type Tree } from "./tree";

const CRM = `---
docs: main
pr:
  draft: false
  merge: squash
checks:
  external: ["Vercel*"]
gates:
  after-merge-main: merge-main
  bootstrap: bootstrap
nudge-at: 500000
---

Why: CRM drafts run no CI.
`;

describe("parseSettings", () => {
  test("reads every key", () => {
    expect(parseSettings(CRM)).toEqual({
      settings: {
        docs: "main",
        pr: { draft: false, merge: "squash" },
        checks: { external: ["Vercel*"] },
        gates: { afterMergeMain: "merge-main", bootstrap: "bootstrap" },
        nudgeAt: 500000,
      },
      problems: [],
    });
  });

  test("missing keys take the defaults", () => {
    expect(parseSettings("---\ndocs: branch\n---\n")).toEqual({ settings: DEFAULT_SETTINGS, problems: [] });
    expect(DEFAULT_SETTINGS).toEqual({ docs: "branch", pr: { draft: true }, checks: { external: [] }, gates: {} });
  });

  test("wrong types and unknown keys become problems and fall back to defaults", () => {
    const text = "---\ndocs: trunk\npr:\n  draft: no-thanks\n  merge: fast\n  label: x\nnudge-at: -5\ncolor: blue\ngates: merge-main\n---\n";
    const { settings, problems } = parseSettings(text);
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(problems.toSorted()).toEqual([
      'docs must be main or branch, not "trunk"',
      "pr.draft must be true or false",
      'pr.merge must be squash, merge or rebase, not "fast"',
      "pr has an unknown key: label",
      "gates must be a map, e.g. gates: { after-merge-main: <value> }",
      "nudge-at must be a positive number of tokens",
      "unknown key: color",
    ].toSorted());
  });

  test("a file without frontmatter is a problem, not a crash", () => {
    expect(parseSettings("just prose\n").problems).toEqual(["settings.md has no frontmatter; put the settings between --- lines"]);
    expect(parseSettings("---\n: [\n---\n").problems[0]).toStartWith("frontmatter is not valid YAML");
  });
});

describe("loadSettings", () => {
  let tree: Tree;
  afterEach(() => tree.cleanup());

  test("returns the defaults without a file and the file's values with one", () => {
    tree = createTree();
    expect(loadSettings(tree.root)).toEqual(DEFAULT_SETTINGS);
    const file = tree.write(SETTINGS_FILE, CRM);
    expect(loadSettings(tree.root)).toMatchObject({ file, docs: "main", nudgeAt: 500000 });
    expect(file).toBe(join(tree.root, "docs/specs/_playbook/settings.md"));
  });
});

describe("describeSettings", () => {
  test("one line, unset parts left out", () => {
    expect(describeSettings(parseSettings(CRM).settings)).toBe(
      "docs on main · PRs ready · merge squash · external checks Vercel* · after merging main: gate merge-main · fresh worktree: gate bootstrap · nudge at 500000 tokens",
    );
    expect(describeSettings(DEFAULT_SETTINGS)).toBe("docs on branch · PRs draft · merge: ask the user");
  });
});

describe("settingsReport", () => {
  let tree: Tree;
  afterEach(() => tree.cleanup());

  test("names where the values come from", () => {
    tree = createTree();
    expect(settingsReport(tree.root)).toBe(
      "Settings: plugin defaults (no docs/specs/_playbook/settings.md): docs on branch · PRs draft · merge: ask the user",
    );
    tree.write(SETTINGS_FILE, "---\npr:\n  draft: false\n---\n");
    expect(settingsReport(tree.root)).toBe("Settings (docs/specs/_playbook/settings.md): docs on branch · PRs ready · merge: ask the user");
  });
});
