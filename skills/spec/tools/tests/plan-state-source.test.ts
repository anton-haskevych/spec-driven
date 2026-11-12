import { afterEach, describe, expect, test } from "bun:test";
import { parkEntries, parkOf } from "../core/park";
import { phaseDocPath, specDocPath } from "../plan/kinds";
import { joinedSpecState, stateSourceFor, withLiveTasks } from "../plan/state-source";
import { viewOf } from "./fake-record";
import { phaseDoc, specDoc, task } from "./record-factories";
import { createTree, type Tree } from "./tree";

const SPEC = { name: "checkout", dir: "/nowhere/docs/specs/checkout" };

const FROZEN_ENTRY = [
  "---",
  "needs: [1]",
  "pr: A",
  "---",
  "",
  "# Phase 2 — Runner",
  "",
  "**Goal:** run it.",
  "",
  "## Deliverables",
  "",
  "- [x] frozen one",
  "- [ ] frozen two",
  "",
  "## Phase-local notes",
  "",
  "- keep this",
  "",
].join("\n");

const read = (files: Record<string, string>) => (path: string) => files[path];

describe("withLiveTasks", () => {
  test("replaces the frozen Deliverables section with the live tasks, ids first, prose kept", () => {
    const tasks = [task({ id: "2.1", text: "one", done: true, evidence: "0651e4e" }), task({ id: "2.2", text: "two" })];
    expect(withLiveTasks("# Phase 2\n\n## Deliverables\n\n- [x] frozen\n\n## Notes\n\n- keep\n", tasks)).toBe(
      "# Phase 2\n\n## Deliverables\n\n- [x] 2.1 one — 0651e4e\n- [ ] 2.2 two\n\n## Notes\n\n- keep\n",
    );
  });

  test("a file with no Deliverables section loses its boxes and gains the section", () => {
    expect(withLiveTasks("# Phase 1\n\n- [ ] frozen\n- plain\n", [task({ id: "1.1", text: "live" })])).toBe(
      "# Phase 1\n\n- plain\n\n## Deliverables\n\n- [ ] 1.1 live\n",
    );
  });

  test("a heading inside a code fence is not a section", () => {
    const body = "## Deliverables\n\n- [ ] frozen\n\n```\n## Not a heading\n- [ ] fenced\n```\n\n## Notes\n";
    expect(withLiveTasks(body, [task({ id: "1.1", text: "live" })])).toBe("## Deliverables\n\n- [ ] 1.1 live\n\n## Notes\n");
  });
});

describe("joinedSpecState", () => {
  const files = { "phases/phase-2.md": FROZEN_ENTRY, "in-flight/phase-2.md": "half-wired\n" };
  const plan = {
    spec: specDoc({ phases: ["1", "2"] }),
    phases: [
      phaseDoc({ id: "1", deployed: "2026-11-01", tasks: [task({ id: "1.1", done: true })] }),
      phaseDoc({
        id: "2",
        title: "Runner",
        file: "phases/phase-2.md",
        needs: ["1"],
        pr: "B",
        gate: "design",
        due: "2026-12-01",
        tasks: [task({ id: "2.1", text: "one", done: true }), task({ id: "2.2", text: "two" }), task({ id: "2.3", text: "three" })],
      }),
    ],
  };

  test("reads phases, marks, edges and counts from the record, not the frozen file", () => {
    const state = joinedSpecState(SPEC, read(files), plan);
    expect(state.hasProgress).toBe(true);
    expect(state.phases.map((phase) => [phase.id, phase.done, phase.deployed, phase.deployedOn])).toEqual([
      ["1", true, true, "2026-11-01"],
      ["2", false, false, undefined],
    ]);
    const [, runner] = state.phases;
    expect(runner?.name).toBe("Runner");
    expect(runner?.edges).toEqual({ declared: true, needs: ["1"], needsDeployed: [], sameFilesAs: [], pr: "B" });
    expect(runner?.gate).toBe("design");
    expect(runner?.schedule).toEqual({ due: "2026-12-01", problems: [] });
    expect(runner?.summary?.deliverables).toEqual({ checked: 1, unchecked: 2 });
    expect(runner?.summary?.nextRun).toEqual(["2.2 two", "2.3 three"]);
    expect(runner?.summary?.goal).toBe("run it.");
    expect(runner?.entry).not.toContain("frozen");
    expect(runner?.entry).not.toContain("pr: A");
    expect(runner?.entry).toContain("- [ ] 2.2 two");
    expect(runner?.entry).toContain("- keep this");
    expect(state.inFlight).toEqual([{ file: "in-flight/phase-2.md", text: "half-wired\n" }]);
  });

  test("a park on the record reads as the phase's Needs you note, after one already in its file", () => {
    const parks = [
      { parkedAt: "2026-11-12T10:00:00-08:00", question: "Reset the pick?", recommend: "no", answer: { at: "2026-11-12T11:00:00-08:00", text: "no reset" } },
      { parkedAt: "2026-11-12T12:00:00-08:00", question: "Ship today?" },
    ];
    const plan = { spec: specDoc({ phases: ["1", "2"] }), phases: [phaseDoc({ id: "1", parks }), phaseDoc({ id: "2", parks: [{ parkedAt: "2026-11-12T09:00:00-08:00", question: "Why?" }] })] };
    const notes = joinedSpecState(SPEC, read({ "in-flight/phase-2.md": "# In-flight — phase 2\n\nhalf-wired\n" }), plan).inFlight ?? [];
    expect(parkOf(notes, "1")).toEqual({ parkedAt: "2026-11-12T12:00:00-08:00", question: "Ship today?" });
    expect(parkEntries(notes.find((note) => note.file === "in-flight/phase-1.md")?.text ?? "")[0]).toEqual(parks[0]);
    const second = notes.find((note) => note.file === "in-flight/phase-2.md")?.text ?? "";
    expect(second).toContain("half-wired");
    expect(parkOf(notes, "2")?.question).toBe("Why?");
  });

  test("a phase with no tasks is open unless it was deployed", () => {
    const state = joinedSpecState(SPEC, read({}), { spec: specDoc({ phases: ["1", "2"] }), phases: [phaseDoc({ id: "1", tasks: [] }), phaseDoc({ id: "2", tasks: [], deployed: "2026-11-01" })] });
    expect(state.phases.map((phase) => phase.done)).toEqual([false, true]);
  });
});

describe("stateSourceFor", () => {
  let tree: Tree;
  afterEach(() => tree?.cleanup());

  function checkout() {
    tree = createTree("spec-state-source-");
    return tree.spec("checkout", {
      "progress.md": "- [x] Phase 1 — Harness → `phases/phase-1.md`\n",
      "phases/phase-1.md": "## Deliverables\n- [x] file task\n",
    });
  }

  test("a joined spec reads from the record", () => {
    const spec = checkout();
    const view = viewOf({ [specDocPath("checkout")]: specDoc(), [phaseDocPath("checkout", "1")]: phaseDoc({ id: "1", tasks: [task({ id: "1.1", text: "record task" })] }) });
    const state = stateSourceFor(view)(spec);
    expect(state.phases[0]?.done).toBe(false);
    expect(state.phases[0]?.entry).toContain("1.1 record task");
    expect(state.reviewed).toBe(false);
  });

  test("a spec not on the record, or no record at all, reads its files as today", () => {
    const spec = checkout();
    for (const view of [viewOf({}), undefined]) {
      const state = stateSourceFor(view)(spec);
      expect(state.phases[0]?.done).toBe(true);
      expect(state.phases[0]?.entry).toContain("file task");
    }
  });
});
