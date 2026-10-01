import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { phaseCommand } from "../commands/phase";
import { loadSpecState } from "../core/spec-state";
import { createTree, type Tree } from "./tree";

const PROGRESS = [
  "## Phases",
  "",
  "- [x] Phase 1 — One → `phases/phase-1-one.md`",
  "- [ ] Phase 2 — Two → `phases/phase-2-two.md`",
  "- [ ] Phase 2a — Two more → `phases/phase-2a-two-more.md`",
  "- [ ] Phase 3 — Three → `phases/phase-3-three.md`",
  "",
  "## Notes",
  "",
].join("\n");

let tree: Tree;
afterEach(() => tree.cleanup());

function checkout() {
  tree = createTree("spec-add-");
  return tree.spec("checkout", {
    "progress.md": PROGRESS,
    "phases/phase-1-one.md": "---\nneeds: []\n---\n- [x] a\n",
    "phases/phase-2-two.md": "---\nneeds: [1]\n---\n- [ ] b\n",
    "phases/phase-2a-two-more.md": "---\nneeds: [2]\n---\n- [ ] c\n",
    "phases/phase-3-three.md": "---\nneeds: [2]\n---\n- [ ] d\n",
  });
}

const read = (dir: string, path: string) => readFileSync(join(dir, path), "utf8");
const ids = (dir: string) => loadSpecState({ name: "checkout", dir }).phases.map((phase) => phase.id);

describe("phase add", () => {
  test("without --after: next integer, line after the last phase, file from the template", () => {
    const spec = checkout();
    const output = phaseCommand(tree.root, ["add", "checkout", "Export CSV", "--needs", "2,3", "--pr", "C"]);
    expect(output).toStartWith("added Phase 4 — Export CSV → phases/phase-4-export-csv.md");
    expect(read(spec.dir, "progress.md")).toContain(
      "- [ ] Phase 3 — Three → `phases/phase-3-three.md`\n- [ ] Phase 4 — Export CSV → `phases/phase-4-export-csv.md`\n\n## Notes",
    );
    const entry = read(spec.dir, "phases/phase-4-export-csv.md");
    expect(entry).toStartWith("---\nneeds: [2, 3]\npr: C\n---\n");
    expect(entry).toContain("**Outcome:**");

    const added = loadSpecState(spec).phases.at(-1);
    expect(added).toMatchObject({ id: "4", name: "Export CSV", done: false, code: true });
    expect(added?.edges.needs).toEqual(["2", "3"]);
  });

  test("--after: first free letter, inserted after the base's last lettered line", () => {
    const spec = checkout();
    expect(phaseCommand(tree.root, ["add", "checkout", "Backfill", "--after", "2"])).toStartWith(
      "added Phase 2b — Backfill → phases/phase-2b-backfill.md",
    );
    expect(ids(spec.dir)).toEqual(["1", "2", "2a", "2b", "3"]);
  });

  test("--code false writes a task phase", () => {
    const spec = checkout();
    phaseCommand(tree.root, ["add", "checkout", "Record demo", "--code", "false"]);
    expect(loadSpecState(spec).phases.at(-1)?.code).toBe(false);
  });

  test("refuses a needs ref that resolves nowhere, an unknown --after, and a bad --code, writing nothing", () => {
    const spec = checkout();
    expect(phaseCommand(tree.root, ["add", "checkout", "X", "--needs", "99"])).toBe(
      "phase add: needs 99: no phase 99 in this spec",
    );
    expect(phaseCommand(tree.root, ["add", "checkout", "X", "--after", "9"])).toStartWith("phase add: no Phase 9 in checkout");
    expect(phaseCommand(tree.root, ["add", "checkout", "X", "--code", "maybe"])).toBe(
      'phase add: --code must be true or false, not "maybe"',
    );
    expect(read(spec.dir, "progress.md")).toBe(PROGRESS);
    expect(existsSync(join(spec.dir, "phases/phase-4-x.md"))).toBe(false);
  });

  test("a spec with no phases yet gets phase 1 appended", () => {
    tree = createTree("spec-add-");
    const spec = tree.spec("fresh", { "progress.md": "## Phases\n" });
    phaseCommand(tree.root, ["add", "fresh", "First"]);
    expect(read(spec.dir, "progress.md")).toBe("## Phases\n- [ ] Phase 1 — First → `phases/phase-1-first.md`\n");
  });
});
