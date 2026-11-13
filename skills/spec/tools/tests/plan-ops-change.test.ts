import { describe, expect, test } from "bun:test";
import { phaseDocPath, prDocPath, specDocPath, validateRecordDoc } from "../plan/kinds";
import { addEdit } from "../plan/ops/add";
import { planChangePlan, phaseStatePlan, type ChangeSeen } from "../plan/ops/change";
import { listIds } from "../plan/ops/id-list";
import { moveEdit } from "../plan/ops/move";
import { deployedEdit, parkEdit, unparkEdit } from "../plan/ops/phase-state";
import { setEdit } from "../plan/ops/set";
import { splitEdit } from "../plan/ops/split";
import { readJoinedPlan } from "../plan/state-source";
import { planWrites } from "../record/plan-writes";
import type { RecordView } from "../record/view";
import type { RecordPlan } from "../record/write";
import { viewOf, viewOfTexts } from "./fake-record";
import { phaseDoc, prDoc, specDoc, task } from "./record-factories";
import type { PhaseDoc } from "../plan/docs/phase-doc";

const SPEC = "checkout";

function record(phases: PhaseDoc[] = defaultPhases(), planVersion = 4): RecordView {
  return viewOf({
    [specDocPath(SPEC)]: specDoc({ phases: phases.map((phase) => phase.id), planVersion }),
    ...Object.fromEntries(phases.map((phase) => [phaseDocPath(SPEC, phase.id), phase])),
  });
}

function defaultPhases(): PhaseDoc[] {
  return [
    phaseDoc({ id: "2", tasks: [task({ id: "2.1", text: "one", done: true }), task({ id: "2.2", text: "two", done: true })] }),
    phaseDoc({ id: "3", needs: ["2"], pr: "B", tasks: [task({ id: "3.1", text: "a", done: true }), task({ id: "3.2", text: "b" }), task({ id: "3.3", text: "c" }), task({ id: "3.4", text: "d" })] }),
    phaseDoc({ id: "5", needs: ["3"], tasks: [task({ id: "5.1", text: "e" })] }),
  ];
}

// Runs a plan and applies its ops: what the record holds after the write, and what the plan saw.
function run(plan: (see: (seen: ChangeSeen) => void) => RecordPlan, view = record()) {
  const seen: ChangeSeen[] = [];
  const result = plan((each) => seen.push(each))(view);
  if (!("ops" in result)) return { result, seen, after: undefined };
  const written = planWrites(view, result.ops, validateRecordDoc);
  if (written.kind !== "planned") throw new Error(JSON.stringify(written));
  const texts = new Map(view.paths().map((path) => [path, JSON.stringify(view.doc(path))]));
  for (const change of written.changes) if (change.text !== undefined) texts.set(change.path, change.text);
  return { result, seen, after: readJoinedPlan(viewOfTexts(texts, view.tip), SPEC), ops: result.ops };
}

const change = (edit: Parameters<typeof planChangePlan>[2]) => (see: (seen: ChangeSeen) => void) => planChangePlan(SPEC, "test", edit, see);

describe("a PR group that first appears", () => {
  test("a phase added to a new group creates that group's PR document, not opened", () => {
    const { ops } = run(change(addEdit({ spec: SPEC, title: "Ship it", edges: { needs: ["5"], pr: "C" }, tasks: [] })));
    expect(ops?.filter((op) => op.path.includes("/prs/"))).toEqual([{ op: "create", path: prDocPath(SPEC, "C"), doc: prDoc({ group: "C" }) }]);
  });

  test("a group the plan already had, or that already has a document, creates nothing", () => {
    const { ops } = run(change(setEdit({ spec: SPEC, phase: "5", fields: { pr: "B" } })));
    expect(ops?.filter((op) => op.path.includes("/prs/"))).toEqual([]);
    const withDoc = viewOf({ [specDocPath(SPEC)]: specDoc({ phases: ["2", "3", "5"], planVersion: 4 }), ...Object.fromEntries(defaultPhases().map((phase) => [phaseDocPath(SPEC, phase.id), phase])), [prDocPath(SPEC, "C")]: prDoc({ group: "C", number: 7, state: "open" }) });
    const again = run(change(addEdit({ spec: SPEC, title: "Ship it", edges: { needs: ["5"], pr: "C" }, tasks: [] })), withDoc);
    expect(again.ops?.filter((op) => op.path.includes("/prs/"))).toEqual([]);
  });
});

describe("phase add on the record", () => {
  test("adds the next integer at the end, raises the plan version, and gives its tasks fresh ids", () => {
    const { after, seen } = run(change(addEdit({ spec: SPEC, title: "Ship it", edges: { needs: ["5"], pr: "C" }, tasks: ["first", "second"] })));
    expect(after?.spec.planVersion).toBe(5);
    expect(after?.spec.phases).toEqual(["2", "3", "5", "6"]);
    expect(after?.phases.at(-1)).toEqual({ id: "6", title: "Ship it", outcome: "", file: "phases/phase-6-ship-it.md", needs: ["5"], pr: "C", code: true, tasks: [task({ id: "6.1", text: "first" }), task({ id: "6.2", text: "second" })] });
    expect(seen).toEqual([{ kind: "changed", line: "add: phase 6 — Ship it → phases/phase-6-ship-it.md · 2 tasks (plan v5)", added: after?.phases.slice(-1) ?? [] }]);
  });

  test("--after puts the lettered phase after its family, and its task ids skip ones already used", () => {
    const phases = [...defaultPhases().slice(0, 2), phaseDoc({ id: "3a", tasks: [task({ id: "4.1", text: "moved" })] }), defaultPhases()[2] ?? phaseDoc()];
    const { after } = run(change(addEdit({ spec: SPEC, title: "Later", after: "3", edges: {}, tasks: [] })), record(phases));
    expect(after?.spec.phases).toEqual(["2", "3", "3a", "3b", "5"]);
    expect(run(change(addEdit({ spec: SPEC, title: "Four", edges: {}, tasks: ["x"] })), record([...phases, phaseDoc({ id: "4", tasks: [] })])).after?.phases.at(-1)?.tasks[0]?.id).toBe("6.1");
    expect(run(change(addEdit({ spec: SPEC, title: "x", after: "3", edges: {}, tasks: ["y"] })), record(phases)).after?.phases.find((p) => p.id === "3b")?.tasks[0]?.id).toBe("3b.1");
  });

  test("refuses a needs edge to a phase the spec doesn't have", () => {
    expect(run(change(addEdit({ spec: SPEC, title: "x", edges: { needs: ["9"] }, tasks: [] }))).result).toEqual({ refused: "phase 6 needs 9, which is not a phase of checkout" });
  });
});

describe("phase split on the record", () => {
  test("keeps the id, moves open tasks by position with their ids, copies edges", () => {
    const { after, seen } = run(change(splitEdit({ spec: SPEC, id: "3", titles: ["Rest"], items: [[2, 3]] })));
    expect(after?.spec.phases).toEqual(["2", "3", "3a", "5"]);
    expect(after?.phases.find((p) => p.id === "3")?.tasks.map((t) => t.id)).toEqual(["3.1", "3.2"]);
    expect(after?.phases.find((p) => p.id === "3a")).toMatchObject({ needs: ["2"], pr: "B", file: "phases/phase-3a-rest.md", tasks: [{ id: "3.3" }, { id: "3.4" }] });
    expect(seen[0]?.line).toBe("split: phase 3 keeps 3.1 and 3.2; 3a added with 3.3 and 3.4 (plan v5)");
  });

  test("refuses a done phase and a position with no open task", () => {
    expect(run(change(splitEdit({ spec: SPEC, id: "2", titles: ["x"], items: [] }))).result).toEqual({ refused: "Phase 2 is done; add a phase after it with phase add --after 2" });
    expect(run(change(splitEdit({ spec: SPEC, id: "3", titles: ["x"], items: [[7]] }))).result).toEqual({ refused: "no open task #7 in phase 3; open tasks: #1 3.2, #2 3.3, #3 3.4" });
  });
});

describe("phase move on the record", () => {
  test("moves tasks by id wherever they are, ids kept, appended in order", () => {
    const { after, seen } = run(change(moveEdit({ spec: SPEC, tasks: ["3.4", "2.2"], to: "5" })));
    expect(after?.phases.map((p) => [p.id, p.tasks.map((t) => t.id)])).toEqual([["2", ["2.1"]], ["3", ["3.1", "3.2", "3.3"]], ["5", ["5.1", "3.4", "2.2"]]]);
    expect(seen[0]?.line).toBe("move: 3.4 and 2.2 → phase 5 (plan v5)");
  });

  test("a task already there changes nothing; an unknown one refuses", () => {
    expect(run(change(moveEdit({ spec: SPEC, tasks: ["5.1"], to: "5" }))).seen).toEqual([{ kind: "unchanged", line: "move: 5.1 is already in phase 5", added: [] }]);
    expect(run(change(moveEdit({ spec: SPEC, tasks: ["9.9"], to: "5" }))).result).toEqual({ refused: "no task 9.9 in checkout" });
  });
});

describe("phase set on the record", () => {
  test("changes only the fields given and says which", () => {
    const { after, seen, ops } = run(change(setEdit({ spec: SPEC, phase: "3", fields: { needs: [], pr: null, gate: "design", title: "Renamed" } })));
    expect(after?.phases.find((p) => p.id === "3")).toMatchObject({ needs: [], gate: "design", title: "Renamed", file: "phases/phase-3.md" });
    expect(after?.phases.find((p) => p.id === "3")?.pr).toBeUndefined();
    expect(seen[0]?.line).toBe('set: phase 3 · needs nothing · no PR group · gate design · title "Renamed" (plan v5)');
    expect(ops?.find((op) => op.path === phaseDocPath(SPEC, "3"))).toEqual({ op: "update", path: phaseDocPath(SPEC, "3"), patch: { title: "Renamed", needs: [], pr: null, gate: "design" } });
  });

  test("refuses an edge that closes a cycle, but not one the plan already had", () => {
    expect(run(change(setEdit({ spec: SPEC, phase: "3", fields: { needs: ["5"] } }))).result).toEqual({ refused: "needs cycle: 3 → 5 → 3" });
    const cyclic = defaultPhases().map((p) => (p.id === "2" ? { ...p, needs: ["2"] } : p));
    expect(run(change(setEdit({ spec: SPEC, phase: "5", fields: { pr: "C" } })), record(cyclic)).result).toHaveProperty("ops");
  });

  test("sets needs-deployed and same-files-as; an empty list drops the field", () => {
    const set = run(change(setEdit({ spec: SPEC, phase: "5", fields: { needsDeployed: ["2"], sameFilesAs: ["3"] } })));
    expect(set.after?.phases.find((p) => p.id === "5")).toMatchObject({ needsDeployed: ["2"], sameFilesAs: ["3"] });
    expect(set.seen[0]?.line).toBe("set: phase 5 · needs 2 deployed · same files as 3 (plan v5)");
    const phases = defaultPhases().map((p) => (p.id === "5" ? { ...p, sameFilesAs: ["3"] } : p));
    const cleared = run(change(setEdit({ spec: SPEC, phase: "5", fields: { sameFilesAs: [] } })), record(phases));
    expect(cleared.after?.phases.find((p) => p.id === "5")?.sameFilesAs).toBeUndefined();
    expect(cleared.seen[0]?.line).toBe("set: phase 5 · no same-files edge (plan v5)");
  });

  test("nothing new is unchanged", () => {
    expect(run(change(setEdit({ spec: SPEC, phase: "3", fields: { pr: "B" } }))).seen[0]).toEqual({ kind: "unchanged", line: "set: phase 3 already has those values", added: [] });
  });

  test("a field this version doesn't know survives the write", () => {
    const phases = defaultPhases().map((p) => (p.id === "3" ? ({ ...p, handoff: { note: "later" } } as PhaseDoc) : p));
    const { ops } = run(change(setEdit({ spec: SPEC, phase: "3", fields: { pr: "C" } })), record(phases));
    expect(ops?.find((op) => op.path === phaseDocPath(SPEC, "3"))).toEqual({ op: "update", path: phaseDocPath(SPEC, "3"), patch: { pr: "C" } });
  });
});

describe("phase state changes on the record", () => {
  const state = (phase: string, edit: Parameters<typeof phaseStatePlan>[3]) => (see: (seen: ChangeSeen) => void) => phaseStatePlan(SPEC, "test", phase, edit, see);

  test("deployed marks a finished phase without raising the plan version", () => {
    const { after, seen } = run(state("2", deployedEdit({ spec: SPEC, phase: "2", day: "2026-11-12" })));
    expect(after?.phases[0]?.deployed).toBe("2026-11-12");
    expect(after?.spec.planVersion).toBe(4);
    expect(seen[0]?.line).toBe("Phase 2 marked deployed 2026-11-12");
    expect(run(state("3", deployedEdit({ spec: SPEC, phase: "3", day: "2026-11-12" }))).result).toEqual({ refused: "Phase 3 is not ticked; only a finished phase can be deployed" });
  });

  test("park adds one open question; a second refuses; unpark answers it", () => {
    const parked = run(state("3", parkEdit({ spec: SPEC, phase: "3", question: "Reset  the pick?", recommend: "no", at: "T1" })));
    expect(parked.after?.phases[1]?.parks).toEqual([{ parkedAt: "T1", question: "Reset the pick?", recommend: "no" }]);
    const view = record(parked.after?.phases);
    expect(run(state("3", parkEdit({ spec: SPEC, phase: "3", question: "Again?", at: "T2" })), view).result).toEqual({ refused: 'Phase 3 is already parked on "Reset the pick?"; ask both in one question' });
    expect(run(state("3", unparkEdit({ spec: SPEC, phase: "3", answer: "no reset", at: "T3" })), view).after?.phases[1]?.parks).toEqual([{ parkedAt: "T1", question: "Reset the pick?", recommend: "no", answer: { at: "T3", text: "no reset" } }]);
    expect(run(state("5", unparkEdit({ spec: SPEC, phase: "5", answer: "x", at: "T3" }))).result).toEqual({ refused: "Phase 5 is not parked" });
  });
});

describe("listIds", () => {
  test("reads like a sentence, and a run of three or more as a range", () => {
    expect([[], ["3.4"], ["3.4", "3.5"], ["3.1", "3.2", "3.3"], ["2.1", "3.4", "3.5"]].map(listIds)).toEqual(["no tasks", "3.4", "3.4 and 3.5", "3.1–3.3", "2.1, 3.4 and 3.5"]);
  });
});
