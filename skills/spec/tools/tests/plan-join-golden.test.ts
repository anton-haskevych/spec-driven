import { describe, expect, test } from "bun:test";
import type { SpecState } from "../core/spec-state";
import type { PhaseDoc } from "../plan/docs/phase-doc";
import { planJoin } from "../plan/join";
import { readySet } from "../ready/ready-set";
import { copyOf, specFiles, SPEC, type PhaseSpec } from "./join-fixtures";
import { phaseEdges, phaseState } from "./factories";

// Phase 2a reads joined specs this way; here it only has to agree with the ready set's rule.
function stateFromDocs(base: SpecState, docs: readonly PhaseDoc[]): SpecState {
  return {
    ...base,
    phases: docs.map((doc) => {
      const checked = doc.tasks.filter((task) => task.done).length;
      return phaseState({
        id: doc.id,
        name: doc.title,
        done: doc.tasks.length > 0 && checked === doc.tasks.length,
        pointer: doc.file,
        edges: phaseEdges({ declared: true, needs: doc.needs, needsDeployed: doc.needsDeployed ?? [], sameFilesAs: doc.sameFilesAs ?? [], ...(doc.pr ? { pr: doc.pr } : {}) }),
        summary: { deliverables: { checked, unchecked: doc.tasks.length - checked }, nextRun: [] },
      });
    }),
  };
}

function readyIds(state: SpecState): { ready: string[]; waiting: string[] } {
  const set = readySet(state, new Map());
  return { ready: set.ready.map((phase) => phase.id), waiting: set.waiting.map(({ phase }) => phase.id) };
}

function sameReadySet(phases: readonly PhaseSpec[]): void {
  const base = copyOf("main", "a".repeat(40), specFiles(phases));
  const plan = planJoin({ spec: SPEC, base, trees: [], onBase: () => true, joinedAt: "2026-11-11T21:00:00-08:00" });
  if ("refused" in plan) throw new Error(plan.refused);
  expect(readyIds(stateFromDocs(base.state, plan.phases))).toEqual(readyIds(base.state));
}

describe("join writes the edges the ready set computes today", () => {
  test("a linear spec: each phase needs the one before it", () => {
    const phases: PhaseSpec[] = [
      { id: "1", done: true, tasks: [["a", true]] },
      { id: "2", tasks: [["b", true], "c"] },
      { id: "3", tasks: ["d"] },
      { id: "4", tasks: ["e"] },
    ];
    sameReadySet(phases);
    const base = copyOf("main", "a".repeat(40), specFiles(phases));
    const plan = planJoin({ spec: SPEC, base, trees: [], onBase: () => true, joinedAt: "2026-11-11T21:00:00-08:00" });
    expect("refused" in plan ? [] : plan.phases.map((phase) => phase.needs)).toEqual([[], ["1"], ["2"], ["3"]]);
  });

  test("a partly-edged spec: an undeclared phase needs every earlier one", () => {
    const phases: PhaseSpec[] = [
      { id: "1", done: true, edges: "needs: []", tasks: [["a", true]] },
      { id: "2", edges: "needs: [1]\nsame-files-as: [3]", tasks: ["b"] },
      { id: "3", edges: "needs: [1]", tasks: [["c", true], "d"] },
      { id: "4", tasks: ["e"] },
      { id: "5", edges: "needs: []\npr: B", tasks: ["f"] },
      { id: "6", edges: "needs-deployed: [1]", tasks: ["g"] },
    ];
    sameReadySet(phases);
    const base = copyOf("main", "a".repeat(40), specFiles(phases));
    const plan = planJoin({ spec: SPEC, base, trees: [], onBase: () => true, joinedAt: "2026-11-11T21:00:00-08:00" });
    expect("refused" in plan ? [] : plan.phases.map((phase) => phase.needs)).toEqual([[], ["1"], ["1"], ["1", "2", "3"], [], []]);
  });
});
