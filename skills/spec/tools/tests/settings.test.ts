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
  per-commit: quick
  ci-triage: ci-triage
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
        gates: { afterMergeMain: "merge-main", bootstrap: "bootstrap", perCommit: "quick", ciTriage: "ci-triage" },
        crew: DEFAULT_SETTINGS.crew,
      },
      problems: [],
    });
  });

  test("missing keys take the defaults", () => {
    expect(parseSettings("---\ndocs: branch\n---\n")).toEqual({ settings: DEFAULT_SETTINGS, problems: [] });
    expect(DEFAULT_SETTINGS).toEqual({ docs: "branch", pr: { draft: true }, checks: { external: [] }, gates: {}, crew: { workers: 3, babysitters: 2, selfApprove: [] } });
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
      "unknown key: nudge-at",
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
    expect(loadSettings(tree.root)).toMatchObject({ file, docs: "main" });
    expect(file).toBe(join(tree.root, "docs/specs/_playbook/settings.md"));
  });
});

describe("describeSettings", () => {
  test("one line, unset parts left out", () => {
    expect(describeSettings(parseSettings(CRM).settings)).toBe(
      "docs on main · PRs ready · merge squash · external checks Vercel* · each commit: gate quick · after merging main: gate merge-main · fresh worktree: gate bootstrap · CI triage: gate ci-triage",
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

describe("deploy setting", () => {
  const INFRA = "---\ndeploy:\n  paths: [\"infra/**\", \"cdk/**\"]\n  gate: crm-prod\n---\n";

  test("names the infra paths and the gate that proves a deploy", () => {
    expect(parseSettings(INFRA)).toEqual({ settings: { ...DEFAULT_SETTINGS, deploy: { paths: ["infra/**", "cdk/**"], gate: "crm-prod" } }, problems: [] });
    expect(describeSettings(parseSettings(INFRA).settings)).toBe("docs on branch · PRs draft · merge: ask the user · deploy: gate crm-prod for 2 paths");
  });

  test("half a deploy setting is a problem and no deploy", () => {
    expect(parseSettings("---\ndeploy:\n  paths: [\"infra/**\"]\n---\n")).toEqual({ settings: DEFAULT_SETTINGS, problems: ["deploy needs both paths and gate"] });
    expect(parseSettings("---\ndeploy:\n  gate: crm-prod\n  when: always\n---\n").problems).toEqual(["deploy has an unknown key: when", "deploy needs both paths and gate"]);
  });
});

describe("standing go: pr.ship and crew", () => {
  const STANDING = "---\npr:\n  ship: hold-for-review\ncrew:\n  workers: 4\n  babysitters: 1\n  self-approve: [design]\n---\n";

  test("a default ship mode and the crew's caps and self-approvable gate kinds", () => {
    expect(parseSettings(STANDING)).toEqual({
      settings: { ...DEFAULT_SETTINGS, pr: { draft: true, ship: "hold-for-review" }, crew: { workers: 4, babysitters: 1, selfApprove: ["design"] } },
      problems: [],
    });
    expect(describeSettings(parseSettings(STANDING).settings)).toBe(
      "docs on branch · PRs draft · merge: ask the user · ship hold-for-review · crew 4 workers, 1 babysitters · self-approve gates design",
    );
  });

  test("default caps stay off the line", () => {
    const text = "---\ncrew:\n  self-approve: [design, outward]\n---\n";
    expect(describeSettings(parseSettings(text).settings)).toBe("docs on branch · PRs draft · merge: ask the user · self-approve gates design, outward");
  });

  test("wrong values are problems and fall back to the defaults; an unknown gate kind is left to the doctor", () => {
    const text = "---\npr:\n  ship: later\ncrew:\n  workers: -1\n  babysitters: two\n  self-approve: [design, deploy]\n  approve-all: true\n---\n";
    const { settings, problems } = parseSettings(text);
    expect(settings).toEqual({ ...DEFAULT_SETTINGS, crew: { ...DEFAULT_SETTINGS.crew, selfApprove: ["design"] } });
    expect(problems.toSorted()).toEqual([
      'pr.ship must be auto or hold-for-review, not "later"',
      "crew.workers must be a whole number, 0 or more",
      "crew.babysitters must be a whole number, 0 or more",
      "crew has an unknown key: approve-all",
    ].toSorted());
    expect(parseSettings("---\ncrew:\n  self-approve: design\n---\n").problems).toEqual(['crew.self-approve must be a list of strings, e.g. crew.self-approve: ["Vercel*"]']);
  });
});
