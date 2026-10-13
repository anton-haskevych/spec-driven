import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { phaseCommand } from "../commands/phase";
import { loadSpecState } from "../core/spec-state";
import { parkOf } from "../core/park";
import { planPark, planUnpark } from "../phases/park";
import { createTree, type Tree } from "./tree";

let tree: Tree;
afterEach(() => tree.cleanup());

function studio() {
  tree = createTree("spec-park-");
  return tree.spec("studio", {
    "progress.md": "- [ ] Phase 1 — Design → `phases/phase-1-design.md`\n- [x] Phase 2 — Old → `phases/phase-2-old.md`\n",
    "phases/phase-1-design.md": "---\nneeds: []\ngate: design\n---\n- [ ] Gate: design agreed with Anton\n",
    "phases/phase-2-old.md": "---\nneeds: []\n---\n- [x] done\n",
    "in-flight/phase-1.md": "# In-flight — phase 1\n\n## Where things stand\n- recon done\n",
  });
}

const AT = "2026-10-13T10:00:00-07:00";
const note = (dir: string) => readFileSync(join(dir, "in-flight/phase-1.md"), "utf8");

describe("phase park", () => {
  test("adds the question under Needs you and keeps the rest of the note", () => {
    const spec = studio();
    const park = planPark(spec, { phase: "1", question: "Grid or list\nfor the schedule?", recommend: "grid", at: AT });
    expect(park.plan.kind).toBe("ok");
    if (park.plan.kind !== "ok") return;
    expect(park.plan.edits[0]?.text).toBe(`# In-flight — phase 1\n\n## Where things stand\n- recon done\n\n## Needs you\n- Parked ${AT}: Grid or list for the schedule? · recommend: grid\n`);
  });

  test("the command writes the note and says what to do next", () => {
    const spec = studio();
    const output = phaseCommand(tree.root, ["park", "studio", "1", "Grid or list?", "--recommend", "grid"]);
    expect(output).toBe('parked Phase 1 in in-flight/phase-1.md: "Grid or list?" · recommend: grid\nCommit and push the note, then hand off.');
    expect(parkOf(loadSpecState(spec).inFlight ?? [], "1")?.question).toBe("Grid or list?");
  });

  test("refuses a done phase, a second open question and an empty one", () => {
    const spec = studio();
    expect(phaseCommand(tree.root, ["park", "studio", "2", "Why?"])).toBe("phase park: Phase 2 is done; nothing to park");
    expect(phaseCommand(tree.root, ["park", "studio", "1", "  "])).toStartWith("usage: phase park");
    phaseCommand(tree.root, ["park", "studio", "1", "Grid or list?"]);
    expect(phaseCommand(tree.root, ["park", "studio", "1", "Colors?"])).toBe('phase park: Phase 1 is already parked on "Grid or list?"; ask both in one question');
    expect(note(spec.dir)).not.toContain("Colors?");
  });
});

describe("phase unpark", () => {
  test("records the answer under the open question", () => {
    const spec = studio();
    phaseCommand(tree.root, ["park", "studio", "1", "Grid or list?", "--recommend", "grid"]);
    const unpark = planUnpark(spec, { phase: "1", answer: "grid, Anton", at: AT });
    expect(unpark.plan.kind === "ok" && unpark.plan.edits[0]?.text).toContain(`\n  - Answered ${AT}: grid, Anton\n`);
    expect(phaseCommand(tree.root, ["unpark", "studio", "1", "grid"])).toBe('answered Phase 1: "grid"');
    expect(parkOf(loadSpecState(spec).inFlight ?? [], "1")).toBeUndefined();
  });

  test("refuses a phase that is not parked", () => {
    studio();
    expect(phaseCommand(tree.root, ["unpark", "studio", "1", "grid"])).toBe("phase unpark: Phase 1 is not parked");
    expect(phaseCommand(tree.root, ["unpark", "studio", "1"])).toStartWith("usage: phase unpark");
  });
});
