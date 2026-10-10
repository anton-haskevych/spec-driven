import { afterEach, describe, expect, test } from "bun:test";
import { doctorReport } from "../commands/doctor";
import { checkSettings } from "../doctor/settings";
import { hookResponse } from "../hooks/spec-file-check";
import { SETTINGS_FILE } from "../playbook/settings";
import { stubRunner } from "./stub-runner";
import { createTree, type Tree } from "./tree";

const GATES = new Map([["merge-main", ["bun install"]]]);

describe("checkSettings", () => {
  test("type and unknown-key problems are warnings", () => {
    const issues = checkSettings("settings.md", "---\ndocs: trunk\ncolor: x\n---\n", GATES);
    expect(issues.map((issue) => [issue.severity, issue.problem])).toEqual([
      ["warning", 'docs must be main or branch, not "trunk"'],
      ["warning", "unknown key: color"],
    ]);
  });

  test("a gate name that gates.md lacks is an error", () => {
    const text = "---\ngates:\n  after-merge-main: merge-main\n  bootstrap: setup\n  per-commit: quick\n  ci-triage: triage\n---\n";
    expect(checkSettings("settings.md", text, GATES).map((issue) => [issue.severity, issue.problem])).toEqual([
      ["error", "gates.bootstrap: setup is not defined in docs/specs/_playbook/gates.md"],
      ["error", "gates.per-commit: quick is not defined in docs/specs/_playbook/gates.md"],
      ["error", "gates.ci-triage: triage is not defined in docs/specs/_playbook/gates.md"],
    ]);
    expect(checkSettings("settings.md", text, undefined).map((issue) => issue.problem)).toEqual([
      "names gates (merge-main, setup, quick, triage) but docs/specs/_playbook/gates.md does not exist",
    ]);
  });

  test("broken YAML is an error", () => {
    expect(checkSettings("settings.md", "---\n: [\n---\n", GATES)[0]?.severity).toBe("error");
  });
});

describe("settings in the doctor and the spec-file hook", () => {
  let tree: Tree;
  afterEach(() => tree.cleanup());

  test("spec-scoped doctor lists settings issues after the spec's own", () => {
    tree = createTree();
    tree.spec("alpha", { "CLAUDE.md": "---\nstatus: active\n---\n", "ledger/INDEX.md": "# Ledger\n- `gotcha-x.md` — [general] — x\n" });
    tree.write(SETTINGS_FILE, "---\ngates:\n  bootstrap: setup\n---\n");
    const lines = doctorReport(tree.root, "alpha").split("\n");
    expect(lines.slice(1, -1).every((line) => line.includes("docs/specs/alpha/"))).toBe(true);
    expect(lines).toContainEqual(expect.stringContaining("alpha/ledger/INDEX.md: lists gotcha-x.md"));
    expect(lines.at(-1)).toContain("settings.md: names gates (setup) but docs/specs/_playbook/gates.md does not exist");
  });

  test("the union-merge check runs only in projects with settings.md", () => {
    tree = createTree();
    tree.spec("alpha", {});
    const notUnion = stubRunner([[["git", "check-attr"], { stdout: "a: merge: unspecified\nb: merge: unspecified\n" }]]);
    expect(doctorReport(tree.root, "alpha", notUnion)).not.toContain(".gitattributes");
    tree.write(SETTINGS_FILE, "---\ndocs: branch\n---\n");
    expect(doctorReport(tree.root, "alpha", notUnion).split("\n").at(-1)).toContain(".gitattributes: spec INDEX.md files don't merge with union");
  });

  test("writing settings.md with an unknown gate blocks", () => {
    tree = createTree();
    const file = tree.write(SETTINGS_FILE, "---\ngates:\n  bootstrap: setup\n---\n");
    const response = hookResponse({ tool_name: "Write", tool_input: { file_path: file }, cwd: tree.root }, tree.root);
    expect(JSON.parse(response ?? "{}").reason).toContain("names gates (setup)");
  });
});
