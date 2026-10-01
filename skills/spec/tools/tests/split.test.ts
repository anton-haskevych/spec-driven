import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { phaseCommand } from "../commands/phase";
import { loadSpecState } from "../core/spec-state";
import { createTree, type Tree } from "./tree";

const PROGRESS = [
  "## Phases",
  "- [x] Phase 6 — Base → `phases/phase-6-base.md`",
  "- [ ] Phase 7 — Sync → `phases/phase-7-sync.md`",
  "- [ ] Phase 7a — Sync extras → `phases/phase-7a-sync-extras.md`",
  "- [ ] Phase 8 — Report → `phases/phase-8-report.md`",
  "- [ ] Phase 9 — Folder → `phases/phase-9-folder/plan.md`",
  "",
].join("\n");

const SYNC = [
  "---",
  "needs: [6]",
  "pr: B",
  "---",
  "# Phase 7 — Sync",
  "",
  "Prose stays.",
  "",
  "## Deliverables",
  "- [x] schema",
  "- [ ] read path",
  "- [ ] write path",
  "- [ ] audit log",
  "",
].join("\n");

let tree: Tree;
afterEach(() => tree.cleanup());

function checkout() {
  tree = createTree("spec-split-");
  return tree.spec("checkout", {
    "progress.md": PROGRESS,
    "phases/phase-6-base.md": "---\nneeds: []\n---\n- [x] a\n",
    "phases/phase-7-sync.md": SYNC,
    "phases/phase-7a-sync-extras.md": "---\nneeds: [7]\n---\n- [ ] e\n",
    "phases/phase-8-report.md": "---\nneeds: [7]\n---\n- [ ] r\n",
    "phases/phase-9-folder/plan.md": "---\nneeds: []\n---\n- [ ] f\n",
  });
}

const read = (dir: string, path: string) => readFileSync(join(dir, path), "utf8");

describe("phase split", () => {
  test("keeps the original id, file, ticked items and prose; parts take the next free letters", () => {
    const spec = checkout();
    const output = phaseCommand(tree.root, ["split", "checkout", "7", "Write path", "Audit", "--items", "b:2 c:3"]);
    expect(output).toStartWith(
      "split Phase 7: kept 7, added 7b — Write path → phases/phase-7b-write-path.md, 7c — Audit → phases/phase-7c-audit.md",
    );
    expect(read(spec.dir, "phases/phase-7-sync.md")).toBe(SYNC.replace("- [ ] write path\n- [ ] audit log\n", ""));

    const part = read(spec.dir, "phases/phase-7b-write-path.md");
    expect(part).toStartWith("---\nneeds: [6]\npr: B\n---\n");
    expect(part).toContain("## Deliverables\n\n- [ ] write path\n");

    expect(loadSpecState(spec).phases.map((phase) => phase.id)).toEqual(["6", "7", "7a", "7b", "7c", "8", "9"]);
  });

  test("without --items, nothing moves and the parts get a placeholder deliverable", () => {
    const spec = checkout();
    phaseCommand(tree.root, ["split", "checkout", "7", "Later"]);
    expect(read(spec.dir, "phases/phase-7-sync.md")).toBe(SYNC);
    expect(read(spec.dir, "phases/phase-7b-later.md")).toContain("- [ ] <specific deliverable>");
  });

  test("moving every open item out flips the original's progress box", () => {
    const spec = checkout();
    phaseCommand(tree.root, ["split", "checkout", "7", "Rest", "--items", "b:1,2,3"]);
    expect(loadSpecState(spec).phases.find((phase) => phase.id === "7")?.done).toBe(true);
  });

  test("refuses done, folder-shape and unknown phases, writing nothing", () => {
    const spec = checkout();
    expect(phaseCommand(tree.root, ["split", "checkout", "6", "X"])).toBe(
      "phase split: Phase 6 is done; add a phase after it with phase add --after 6",
    );
    expect(phaseCommand(tree.root, ["split", "checkout", "9", "X"])).toBe(
      "phase split: Phase 9 is folder-shaped (phases/phase-9-folder/plan.md); split it by hand",
    );
    expect(phaseCommand(tree.root, ["split", "checkout", "5", "X"])).toStartWith("phase split: no Phase 5 in checkout");
    expect(read(spec.dir, "progress.md")).toBe(PROGRESS);
  });

  test("needs at least one new title", () => {
    checkout();
    expect(phaseCommand(tree.root, ["split", "checkout", "7"])).toStartWith("usage: phase split");
  });
});
