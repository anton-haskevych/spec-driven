import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { phaseCommand } from "../commands/phase";
import { deployedMarker, parsePhaseLines } from "../core/progress";
import { loadSpecState } from "../core/spec-state";
import { createTree, type Tree } from "./tree";

const PROGRESS = [
  "## Phases",
  "- [x] Phase 1 — Aggregate → `phases/phase-1-aggregate.md` (closed 2026-09-08)",
  "- [x] Phase 2 — Bare → phases/phase-2-bare.md",
  "- [ ] Phase 3 — Open → `phases/phase-3-open.md`",
  "",
].join("\n");

let tree: Tree;
afterEach(() => tree.cleanup());

function billing() {
  tree = createTree("spec-deployed-");
  return tree.spec("billing", {
    "progress.md": PROGRESS,
    "phases/phase-1-aggregate.md": "- [x] a\n",
    "phases/phase-2-bare.md": "- [x] b\n",
    "phases/phase-3-open.md": "- [ ] c\n",
  });
}

const progressOf = (dir: string) => readFileSync(join(dir, "progress.md"), "utf8");

describe("phase deployed", () => {
  test("inserts the marker right after a backticked pointer, before trailing notes, and the reader sees it", () => {
    const spec = billing();
    expect(phaseCommand(tree.root, ["deployed", "billing", "1", "--date", "2026-09-20"])).toBe("Phase 1 marked deployed 2026-09-20");
    expect(progressOf(spec.dir)).toContain(
      "- [x] Phase 1 — Aggregate → `phases/phase-1-aggregate.md` · deployed 2026-09-20 (closed 2026-09-08)\n",
    );
    expect(loadSpecState(spec).phases.map((phase) => phase.deployed)).toEqual([true, false, false]);
  });

  test("handles a pointer without backticks", () => {
    const spec = billing();
    phaseCommand(tree.root, ["deployed", "billing", "2", "--date", "2026-09-21"]);
    expect(progressOf(spec.dir)).toContain("- [x] Phase 2 — Bare → phases/phase-2-bare.md · deployed 2026-09-21\n");
    expect(loadSpecState(spec).phases[1]?.deployed).toBe(true);
  });

  test("is idempotent: a second call changes nothing and says so", () => {
    const spec = billing();
    phaseCommand(tree.root, ["deployed", "billing", "1", "--date", "2026-09-20"]);
    const once = progressOf(spec.dir);
    expect(phaseCommand(tree.root, ["deployed", "billing", "1", "--date", "2026-09-22"])).toBe("Phase 1 is already marked deployed");
    expect(progressOf(spec.dir)).toBe(once);
  });

  test("refuses an unticked phase and a malformed date", () => {
    const spec = billing();
    expect(phaseCommand(tree.root, ["deployed", "billing", "3"])).toBe(
      "phase deployed: Phase 3 is not ticked; only a finished phase can be deployed",
    );
    expect(phaseCommand(tree.root, ["deployed", "billing", "1", "--date", "2026-13-01"])).toBe(
      'phase deployed: --date "2026-13-01" is not a date; use YYYY-MM-DD',
    );
    expect(progressOf(spec.dir)).toBe(PROGRESS);
  });

  test("defaults the date to today", () => {
    const spec = billing();
    const output = phaseCommand(tree.root, ["deployed", "billing", "2"]);
    expect(output).toMatch(/^Phase 2 marked deployed \d{4}-\d{2}-\d{2}$/);
    expect(loadSpecState(spec).phases[1]?.deployed).toBe(true);
  });
});

describe("deployedMarker", () => {
  test("is exactly what parsePhaseLines reads as deployed", () => {
    const line = `- [x] Phase 1 — One → \`phases/p1.md\`${deployedMarker("2026-09-20")}\n`;
    expect(parsePhaseLines(line)[0]?.deployed).toBe(true);
  });
});
