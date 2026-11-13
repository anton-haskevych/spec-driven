import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { phaseCommand } from "../commands/phase";
import { loadSpecStateFromFiles } from "../core/spec-state";
import { createTree, type Tree } from "./tree";

const PROGRESS = [
  "## Phases",
  "- [ ] Phase 3 — Sync → `phases/phase-3-sync.md`",
  "- [x] Phase 4 — Report → `phases/phase-4-report.md`",
  "- [ ] Phase 5 — Ship → `phases/phase-5-ship.md`",
  "",
].join("\n");

const SYNC = ["---", "needs: []", "pr: B", "---", "# Phase 3 — Sync", "", "**Goal:** sync.", "", "**Outcome:** data matches.", "", "## Deliverables", "", "- [x] schema", "- [ ] read path", "- [ ] write path", ""].join("\n");
const REPORT = ["---", "needs: [3]", "---", "# Phase 4 — Report", "", "## Deliverables", "", "- [x] totals", "", "## Notes", "", "- keep", ""].join("\n");
const SHIP = ["---", "needs: [4]", "---", "# Phase 5 — Ship", "", "- [ ] deploy", ""].join("\n");

let tree: Tree;
afterEach(() => tree.cleanup());

function checkout() {
  tree = createTree("spec-move-set-");
  return tree.spec("checkout", { "progress.md": PROGRESS, "phases/phase-3-sync.md": SYNC, "phases/phase-4-report.md": REPORT, "phases/phase-5-ship.md": SHIP });
}

const read = (dir: string, path: string) => readFileSync(join(dir, path), "utf8");
const phase = (args: string[]) => phaseCommand(tree.root, args);

describe("phase move on a spec in files", () => {
  test("moves items selected as tick selects them, into the target's Deliverables, reopening a done target", () => {
    const spec = checkout();
    expect(phase(["move", "checkout", "write", "#1", "--from", "3", "--to", "4"])).toBe("move: 2 items from Phase 3 → Phase 4");
    expect(read(spec.dir, "phases/phase-3-sync.md")).toEndWith("## Deliverables\n\n- [x] schema\n");
    expect(read(spec.dir, "phases/phase-4-report.md")).toContain("- [x] totals\n- [ ] write path\n- [ ] read path\n\n## Notes");
    const state = loadSpecStateFromFiles(spec);
    expect(state.phases.map((p) => [p.id, p.done])).toEqual([["3", true], ["4", false], ["5", false]]);
  });

  test("needs --from, and refuses a selector that matches nothing", () => {
    checkout();
    expect(phase(["move", "checkout", "#1", "--to", "4"])).toBe("phase move: on a spec in files, name the phase the items are in: --from <phase>");
    expect(phase(["move", "checkout", "nope", "--from", "3", "--to", "4"])).toStartWith('phase move: no open item starts with "nope"');
  });
});

describe("phase set on a spec in files", () => {
  test("edits frontmatter edges, gate, the heading, the progress line and the Outcome line", () => {
    const spec = checkout();
    expect(phase(["set", "checkout", "3", "--pr", "none", "--gate", "design", "--title", "Two-way sync", "--outcome", "Both sides match."])).toBe(
      'set: phase 3 · no PR group · gate design · title "Two-way sync" · outcome reworded',
    );
    const text = read(spec.dir, "phases/phase-3-sync.md");
    expect(text).toStartWith("---\nneeds: []\ngate: design\n---\n# Phase 3 — Two-way sync\n");
    expect(text).toContain("**Outcome:** Both sides match.");
    expect(read(spec.dir, "progress.md")).toContain("- [ ] Phase 3 — Two-way sync → `phases/phase-3-sync.md`");
  });

  test("rewords an Outcome wrapped over several lines, leaving nothing of the old one", () => {
    const spec = checkout();
    const path = join(spec.dir, "phases/phase-3-sync.md");
    writeFileSync(path, SYNC.replace("**Outcome:** data matches.", "**Outcome:** data matches · a day ·\nlow risk: reads only."));
    expect(phase(["set", "checkout", "3", "--outcome", "Both sides match."])).toBe("set: phase 3 · outcome reworded");
    const text = read(spec.dir, "phases/phase-3-sync.md");
    expect(text).toContain("**Outcome:** Both sides match.\n\n## Deliverables");
    expect(text).not.toContain("low risk: reads only.");
  });

  test("refuses a needs edge that makes a cycle; the same values are unchanged", () => {
    const spec = checkout();
    expect(phase(["set", "checkout", "3", "--needs", "5"])).toContain("needs cycle");
    expect(read(spec.dir, "phases/phase-3-sync.md")).toBe(SYNC);
    expect(phase(["set", "checkout", "3", "--pr", "B"])).toBe("set: phase 3 already has those values");
    expect(phase(["set", "checkout", "3", "--gate", "legal"])).toBe('phase set: --gate must be design, outward or none, not "legal"');
  });
});

describe("phase set --needs-deployed / --same-files-as on a spec in files", () => {
  test("writes both edges as frontmatter lists; none removes the line", () => {
    const spec = checkout();
    expect(phase(["set", "checkout", "5", "--needs-deployed", "3", "--same-files-as", "4"])).toBe("set: phase 5 · needs 3 deployed · same files as 4");
    expect(read(spec.dir, "phases/phase-5-ship.md")).toStartWith("---\nneeds: [4]\nneeds-deployed: [3]\nsame-files-as: [4]\n---\n");
    expect(phase(["set", "checkout", "5", "--needs-deployed", "none"])).toBe("set: phase 5 · needs nothing deployed");
    expect(read(spec.dir, "phases/phase-5-ship.md")).toStartWith("---\nneeds: [4]\nsame-files-as: [4]\n---\n");
  });
});

describe("phase add --task on a spec in files", () => {
  test("writes each task as a deliverable", () => {
    const spec = checkout();
    phase(["add", "checkout", "Polish", "--task", "copy", "--task", "icons"]);
    expect(read(spec.dir, "phases/phase-6-polish.md")).toContain("## Deliverables\n\n- [ ] copy\n- [ ] icons\n");
  });
});
