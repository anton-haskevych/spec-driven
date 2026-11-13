import { describe, expect, test } from "bun:test";
import { phaseDocPath, specDocPath, validateRecordDoc } from "../plan/kinds";
import { planJoin, type JoinInput, type JoinPlan } from "../plan/join";
import { copyOf, november11, pointer, specFiles, SPEC } from "./join-fixtures";

const JOINED_AT = "2026-11-11T21:00:00-08:00";

function joined(input: Omit<JoinInput, "spec" | "joinedAt" | "onBase"> & { onBase?: JoinInput["onBase"] }): JoinPlan {
  const plan = planJoin({ spec: SPEC, joinedAt: JOINED_AT, onBase: () => false, ...input });
  if ("refused" in plan) throw new Error(plan.refused);
  return plan;
}

describe("planJoin on the Nov 11 copies", () => {
  const { base, trees } = november11();
  const plan = joined({ base, trees });
  const phase = (id: string) => plan.phases.find((doc) => doc.id === id);

  test("every phase main has, in main's order, with main's commit as the join point", () => {
    expect(plan.spec).toEqual({
      name: SPEC,
      planVersion: 1,
      phases: ["1", "2", "3", "4", "5", "6", "6a", "7", "8", "9", "10"],
      joinedAt: JOINED_AT,
      joinedFrom: base.head,
      layout: 4,
    });
  });

  test("a phase done in one tree is done, with that tree's head as evidence", () => {
    expect(phase("2")?.tasks).toEqual([
      { id: "2.1", text: "2 one", done: true, evidence: "0651e4e000000000000000000000000000000000" },
      { id: "2.2", text: "2 two", done: true, evidence: "0651e4e000000000000000000000000000000000" },
    ]);
    expect(plan.recorded).toContain("phase 2 is done in tree pr-a and open on main; recorded as done (0651e4e)");
  });

  test("a tick's own evidence wins over the tree's head", () => {
    expect(phase("3")?.tasks[0]).toEqual({ id: "3.1", text: "3 one", done: true, evidence: "`9f1c2d3`" });
    expect(plan.recorded).toContain("phase 3: 3.1 done in tree pr-b and open on main; recorded as done (ccccccc)");
  });

  test("ticks on main keep main's head; phases only on main are added; nothing is left over", () => {
    expect(phase("1")?.tasks.every((task) => task.done && task.evidence === base.head)).toBe(true);
    expect(phase("6a")?.tasks.map((task) => task.id)).toEqual(["6a.1", "6a.2"]);
    expect(phase("10")?.file).toBe(pointer("10"));
    expect(plan.left).toEqual([]);
  });

  test("every document it builds passes the record's validator", () => {
    expect(validateRecordDoc(specDocPath(SPEC), plan.spec)).toEqual([]);
    expect(plan.phases.flatMap((doc) => validateRecordDoc(phaseDocPath(SPEC, doc.id), doc))).toEqual([]);
  });

  test("a phase document carries its title, outcome sentence and prose file", () => {
    expect(phase("6a")).toMatchObject({ id: "6a", title: "P6a", outcome: "phase 6a ships.", file: pointer("6a"), code: true });
  });
});

describe("planJoin matches tasks by text", () => {
  const base = copyOf("main", "a".repeat(40), specFiles([{ id: "1", tasks: ["Alpha", "Beta", "Gamma"] }]));

  test("a tree that inserted a task above a ticked one ticks the right task and lists the insertion", () => {
    const tree = copyOf("pr-a", "d".repeat(40), specFiles([{ id: "1", tasks: ["Alpha", "Inserted", ["Beta", true], "Gamma"] }]));
    const plan = joined({ base, trees: [tree] });
    expect(plan.phases[0]?.tasks.map((task) => [task.id, task.text, task.done])).toEqual([
      ["1.1", "Alpha", false],
      ["1.2", "Beta", true],
      ["1.3", "Gamma", false],
    ]);
    expect(plan.left).toEqual(['phase 1: "Inserted" in tree pr-a matches no task on main; not added']);
  });

  test("a task matching two tasks is listed and left open", () => {
    const twice = copyOf("main", "a".repeat(40), specFiles([{ id: "1", tasks: ["Same", "Same"] }]));
    const tree = copyOf("pr-a", "d".repeat(40), specFiles([{ id: "1", tasks: [["Same", true], "Same"] }]));
    const plan = joined({ base: twice, trees: [tree] });
    expect(plan.phases[0]?.tasks.map((task) => task.done)).toEqual([false, false]);
    expect(plan.left).toEqual(['phase 1: "Same" in tree pr-a matches 2 tasks (1.1, 1.2); left open']);
  });

  test("a tick whose note isn't evidence still matches its task", () => {
    const tree = copyOf("pr-a", "d".repeat(40), specFiles([{ id: "1", tasks: ["Alpha", ["Beta — done by hand", true], "Gamma"] }]));
    expect(joined({ base, trees: [tree] }).phases[0]?.tasks[1]).toEqual({ id: "1.2", text: "Beta", done: true, evidence: "d".repeat(40) });
  });
});

describe("planJoin and phases only in a tree", () => {
  const base = copyOf("main", "a".repeat(40), specFiles([{ id: "1", tasks: ["A"] }, { id: "2", tasks: ["B"] }]));
  const tree = copyOf("pr-a", "d".repeat(40), specFiles([{ id: "1", tasks: ["A"] }, { id: "1a", tasks: ["X"] }, { id: "2", tasks: ["B"] }]));

  test("is listed, not added, when its file is not on the default branch", () => {
    const plan = joined({ base, trees: [tree] });
    expect(plan.spec.phases).toEqual(["1", "2"]);
    expect(plan.left).toEqual(["phase 1a is only in tree pr-a and its file is not on main; not added"]);
  });

  test("is added after the phase it follows in that tree when its file is on the default branch", () => {
    const plan = joined({ base, trees: [tree], onBase: (path) => path === pointer("1a") });
    expect(plan.spec.phases).toEqual(["1", "1a", "2"]);
    expect(plan.left).toEqual([]);
  });
});

describe("planJoin keeps phase marks", () => {
  test("deployed day, due day, PR group and gate come across", () => {
    const files = specFiles([
      { id: "1", done: true, deployed: "2026-11-01", edges: "needs: []\npr: A", tasks: [["A", true]] },
      { id: "2", edges: "needs: [1]\npr: B\ndue: 2026-12-01\ngate: design\ncode: false", tasks: ["Gate: design agreed"] },
    ]);
    const plan = joined({ base: copyOf("main", "a".repeat(40), files), trees: [] });
    expect(plan.phases[0]).toMatchObject({ deployed: "2026-11-01", pr: "A", needs: [] });
    expect(plan.phases[1]).toMatchObject({ needs: ["1"], pr: "B", due: "2026-12-01", gate: "design", code: false });
    expect(plan.phases[1]?.tasks[0]).toEqual({ id: "2.1", text: "Gate: design agreed", done: false, gate: true });
  });

  test("a plan whose edges don't resolve is refused", () => {
    const files = specFiles([{ id: "1", edges: "needs: [7]", tasks: ["A"] }]);
    expect(planJoin({ spec: SPEC, joinedAt: JOINED_AT, onBase: () => false, base: copyOf("main", "a".repeat(40), files), trees: [] })).toEqual({
      refused: `${SPEC}'s plan has problems: phase 1 needs 7, which is not a phase of ${SPEC}`,
    });
  });
});
