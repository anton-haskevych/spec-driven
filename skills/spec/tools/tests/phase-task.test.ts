import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { phaseCommand } from "../commands/phase";
import { phaseDocPath, specDocPath, validateRecordDoc } from "../plan/kinds";
import { planChangePlan, type ChangeSeen } from "../plan/ops/change";
import { taskEdit, type TaskIntent } from "../plan/ops/task";
import type { PhaseDoc } from "../plan/docs/phase-doc";
import { readJoinedPlan } from "../plan/state-source";
import { planWrites } from "../record/plan-writes";
import { viewOf, viewOfTexts } from "./fake-record";
import { phaseDoc, specDoc, task } from "./record-factories";
import { createTree, type Tree } from "./tree";
import { phaseDeps } from "./command-deps";

const PROGRESS = ["## Phases", "- [ ] Phase 3 — Sync → `phases/phase-3-sync.md`", "- [x] Phase 4 — Report → `phases/phase-4-report.md`", ""].join("\n");
const SYNC = ["---", "needs: []", "---", "# Phase 3 — Sync", "", "## Deliverables", "", "- [x] schema", "- [ ] read path", "  - [ ] nested step", "- [ ] write path", "", "## Notes", "", "- keep", ""].join("\n");
const REPORT = ["---", "needs: [3]", "---", "# Phase 4 — Report", "", "## Deliverables", "", "- [x] totals", ""].join("\n");

let tree: Tree;
afterEach(() => tree?.cleanup());

function checkout() {
  tree = createTree("spec-task-");
  return tree.spec("checkout", { "progress.md": PROGRESS, "phases/phase-3-sync.md": SYNC, "phases/phase-4-report.md": REPORT });
}

const read = (dir: string, path: string) => readFileSync(join(dir, path), "utf8");
const phase = (args: string[]) => phaseCommand(tree.root, args, undefined, phaseDeps());

describe("phase task on a spec in files", () => {
  test("--add appends open items to Deliverables and reopens a done phase", () => {
    const spec = checkout();
    expect(phase(["task", "checkout", "4", "--add", "charts", "--add", "export"])).toBe("task: phase 4 · added 2 tasks");
    expect(read(spec.dir, "phases/phase-4-report.md")).toEndWith("- [x] totals\n- [ ] charts\n- [ ] export\n");
    expect(read(spec.dir, "progress.md")).toContain("- [ ] Phase 4 — Report");
  });

  test("--edit rewords an open item selected as tick selects it", () => {
    const spec = checkout();
    expect(phase(["task", "checkout", "3", "--edit", "write", "write path with retries"])).toBe('task: phase 3 · "write path" → "write path with retries"');
    expect(read(spec.dir, "phases/phase-3-sync.md")).toContain("- [ ] write path with retries\n\n## Notes");
  });

  test("--drop removes an open item with its nested lines; the last open one finishes the phase", () => {
    const spec = checkout();
    expect(phase(["task", "checkout", "3", "--drop", "#1"])).toBe('task: phase 3 · dropped "read path"');
    expect(read(spec.dir, "phases/phase-3-sync.md")).toContain("- [x] schema\n- [ ] write path\n\n## Notes");
    phase(["task", "checkout", "3", "--drop", "write"]);
    expect(read(spec.dir, "progress.md")).toContain("- [x] Phase 3 — Sync");
  });

  test("one action per call; a done item can't be selected", () => {
    checkout();
    expect(phase(["task", "checkout", "3", "--add", "x", "--drop", "#1"])).toStartWith("usage: phase task");
    expect(phase(["task", "checkout", "3", "--edit", "schema"])).toStartWith("usage: phase task");
    expect(phase(["task", "checkout", "3", "--drop", "schema"])).toStartWith('phase task: no open item starts with "schema"');
  });
});

const SPEC = "checkout";

function record(phases: PhaseDoc[]) {
  return viewOf({
    [specDocPath(SPEC)]: specDoc({ phases: phases.map((each) => each.id), planVersion: 2 }),
    ...Object.fromEntries(phases.map((each) => [phaseDocPath(SPEC, each.id), each])),
  });
}

const PHASES = [
  phaseDoc({ id: "3", tasks: [task({ id: "3.1", text: "schema", done: true }), task({ id: "3.2", text: "read path" })] }),
  phaseDoc({ id: "4", needs: ["3"], tasks: [task({ id: "3.3", text: "moved here" })] }),
];

function run(intent: TaskIntent) {
  const seen: ChangeSeen[] = [];
  const view = record(PHASES);
  const result = planChangePlan(SPEC, "task", taskEdit(intent), (each) => seen.push(each))(view);
  if (!("ops" in result)) return { result, seen, phases: undefined };
  const written = planWrites(view, result.ops, validateRecordDoc);
  if (written.kind !== "planned") throw new Error(JSON.stringify(written));
  const texts = new Map(view.paths().map((path) => [path, JSON.stringify(view.doc(path))]));
  for (const change of written.changes) if (change.text !== undefined) texts.set(change.path, change.text);
  return { result, seen, phases: readJoinedPlan(viewOfTexts(texts, view.tip), SPEC)?.phases };
}

describe("phase task on the record", () => {
  test("add gives fresh ids past any used with the phase's prefix, and raises the plan version", () => {
    const { phases, seen } = run({ spec: SPEC, phase: "3", action: "add", texts: ["write path", "Gate: design agreed"] });
    expect(phases?.[0]?.tasks.map((each) => each.id)).toEqual(["3.1", "3.2", "3.4", "3.5"]);
    expect(phases?.[0]?.tasks[3]?.gate).toBe(true);
    expect(seen[0]?.line).toBe("task: phase 3 · added 3.4 and 3.5 (plan v3)");
  });

  test("edit rewords an open task by id wherever it is; the same text is unchanged", () => {
    const { phases, seen } = run({ spec: SPEC, phase: "3", action: "edit", task: "3.3", text: "moved, reworded" });
    expect(phases?.[1]?.tasks[0]).toMatchObject({ id: "3.3", text: "moved, reworded" });
    expect(seen[0]?.line).toBe("task: phase 4 · 3.3 reworded (plan v3)");
    expect(run({ spec: SPEC, phase: "3", action: "edit", task: "3.2", text: "read path" }).seen[0]?.kind).toBe("unchanged");
  });

  test("drop removes an open task; a done or unknown one refuses", () => {
    expect(run({ spec: SPEC, phase: "3", action: "drop", task: "3.2" }).phases?.[0]?.tasks.map((each) => each.id)).toEqual(["3.1"]);
    expect(run({ spec: SPEC, phase: "3", action: "drop", task: "3.1" }).result).toEqual({ refused: "3.1 is done; a done task stays as the record of the work" });
    expect(run({ spec: SPEC, phase: "3", action: "drop", task: "3.9" }).result).toEqual({ refused: "no task 3.9 in checkout" });
  });
});
