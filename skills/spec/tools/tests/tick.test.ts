import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { phaseCommand } from "../commands/phase";
import { loadSpecState } from "../core/spec-state";
import { taskPhaseIssues } from "../doctor/task-phases";
import { planTick } from "../phases/tick";
import { createTree, type Tree } from "./tree";

const PROGRESS = [
  "## Phases",
  "- [x] Phase 1 — Harness → `phases/phase-1-harness.md`",
  "- [ ] Phase 2 — Tick → `phases/phase-2-tick.md` (notes)",
  "",
].join("\n");

const ENTRY = ["---", "needs: [1]", "---", "## Deliverables", "- [ ] `core/checkbox.ts` patterns", "- [ ] locator", ""].join("\n");

let tree: Tree;
afterEach(() => tree.cleanup());

function checkout() {
  tree = createTree("spec-tick-");
  return tree.spec("checkout", {
    "progress.md": PROGRESS,
    "phases/phase-1-harness.md": "- [x] done\n",
    "phases/phase-2-tick.md": ENTRY,
  });
}

const read = (dir: string, path: string) => readFileSync(join(dir, path), "utf8");

describe("phase tick (code phase)", () => {
  test("ticks the matching item and leaves the phase open while items remain", () => {
    const spec = checkout();
    const output = phaseCommand(tree.root, ["tick", "checkout", "2", "core/checkbox"]);
    expect(output).toBe('ticked "core/checkbox.ts patterns" in Phase 2');
    expect(read(spec.dir, "phases/phase-2-tick.md")).toContain("- [x] `core/checkbox.ts` patterns\n- [ ] locator");
    expect(read(spec.dir, "progress.md")).toBe(PROGRESS);
  });

  test("ticking the last open item flips the progress box and says to close the phase", () => {
    const spec = checkout();
    phaseCommand(tree.root, ["tick", "checkout", "2", "#1"]);
    const output = phaseCommand(tree.root, ["tick", "checkout", "phase 2", "#1"]);
    expect(output).toBe('ticked "locator" in Phase 2\nPhase 2 complete — run update.md → Close the phase');
    expect(read(spec.dir, "progress.md")).toContain("- [x] Phase 2 — Tick → `phases/phase-2-tick.md` (notes)");

    const phase = loadSpecState(spec).phases[1];
    expect(phase?.done).toBe(true);
    expect(phase?.summary?.deliverables).toEqual({ checked: 2, unchecked: 0 });
  });

  test("an unknown phase or item is invalid and writes nothing", () => {
    const spec = checkout();
    expect(phaseCommand(tree.root, ["tick", "checkout", "9", "#1"])).toStartWith("phase tick: no Phase 9 in checkout");
    expect(phaseCommand(tree.root, ["tick", "checkout", "2", "ghost"])).toStartWith("phase tick: no open item");
    expect(read(spec.dir, "phases/phase-2-tick.md")).toBe(ENTRY);
  });

  test("a phase with no open items is invalid", () => {
    const spec = checkout();
    const tick = planTick(spec, { phase: "1", selector: "#1" });
    expect(tick.plan.kind).toBe("invalid");
  });

  test("an unknown spec or a bad flag prints why", () => {
    tree = createTree("spec-tick-");
    expect(phaseCommand(tree.root, ["tick", "ghost", "1", "#1"])).toBe("phase tick: no spec named ghost");
    expect(phaseCommand(tree.root, ["tick", "checkout", "1", "#1", "--bogus"])).toStartWith("usage: phase tick");
    expect(phaseCommand(tree.root, ["tick"])).toStartWith("usage: phase tick");
  });
});

describe("phase tick (task phase)", () => {
  function ballroom() {
    tree = createTree("spec-tick-task-");
    return tree.spec("ballroom", {
      "progress.md": "- [ ] Phase 1 — Record → `phases/phase-1-record.md`\n",
      "phases/phase-1-record.md": "---\nneeds: []\ncode: false\n---\n- [ ] record the interview\n- [ ] publish the page\n",
    });
  }

  test("refuses without --evidence and writes nothing", () => {
    const spec = ballroom();
    expect(phaseCommand(tree.root, ["tick", "ballroom", "1", "#1"])).toBe(
      "phase tick: Phase 1 is a task phase; tick it with --evidence <link, date or file>",
    );
    expect(read(spec.dir, "phases/phase-1-record.md")).toContain("- [ ] record the interview");
  });

  test("refuses evidence that is not a link, date or file", () => {
    ballroom();
    expect(phaseCommand(tree.root, ["tick", "ballroom", "1", "#1", "--evidence", "done"])).toStartWith(
      'phase tick: "done" is not evidence',
    );
  });

  test("appends valid evidence to the ticked item, which the doctor then accepts", () => {
    const spec = ballroom();
    phaseCommand(tree.root, ["tick", "ballroom", "1", "record", "--evidence", "2026-09-30, Drive/rec.mp4"]);
    expect(read(spec.dir, "phases/phase-1-record.md")).toContain("- [x] record the interview — 2026-09-30, Drive/rec.mp4\n");
    expect(taskPhaseIssues(loadSpecState(spec))).toEqual([]);
  });
});
