import { describe, expect, test } from "bun:test";
import { readySet } from "../ready/ready-set";
import type { SpecState } from "../core/spec-state";
import { specStateFrom } from "../core/spec-state";
import { bannerLine, manualReadLine, progressStub } from "../plan/banner";
import { planExport } from "../plan/export";
import { planJoin } from "../plan/join";
import { joinedSpecState } from "../plan/state-source";
import { planTidy } from "../plan/tidy";
import { copyOf, specFiles, SPEC, type PhaseSpec } from "./join-fixtures";

const PHASES: PhaseSpec[] = [
  { id: "1", done: true, deployed: "2026-11-10", tasks: [["a", true]] },
  { id: "2", edges: "needs: [1]\nsame-files-as: [3]\npr: B", tasks: [["b", true], "c"] },
  { id: "3", edges: "needs: [1]", tasks: ["d"] },
  { id: "4", tasks: ["e"] },
  { id: "5", edges: "needs-deployed: [1]", tasks: ["f"] },
];

function readyIds(state: SpecState): { ready: string[]; waiting: string[] } {
  const set = readySet(state, new Map());
  return { ready: set.ready.map((phase) => phase.id), waiting: set.waiting.map(({ phase }) => phase.id) };
}

function joined(files: Map<string, string>) {
  const plan = planJoin({ spec: SPEC, base: copyOf("main", "a".repeat(40), files), trees: [], onBase: () => true, joinedAt: "2026-11-11T21:00:00-08:00" });
  if ("refused" in plan) throw new Error(plan.refused);
  return plan;
}

function planFiles(files: ReadonlyMap<string, string>) {
  return { progress: files.get("progress.md") ?? "", phases: [...files].filter(([path]) => path !== "progress.md").map(([pointer, text]) => ({ pointer, text })) };
}

function applied(files: ReadonlyMap<string, string>, changed: readonly { pointer: string; text: string }[]): Map<string, string> {
  return new Map([...files, ...changed.map(({ pointer, text }) => [pointer, text] as const)]);
}

describe("planExport", () => {
  test("round trip: join → tick → tidy → export gives the files the same ready set as the record", () => {
    const files = specFiles(PHASES);
    const plan = joined(files);
    const phase2 = plan.phases[1]!;
    plan.phases[1] = { ...phase2, tasks: phase2.tasks.map((task) => ({ ...task, done: true, evidence: "abc1234 on origin/feat/x" })) };
    const tidied = applied(files, planTidy(SPEC, "2026-11-12", planFiles(files)));
    const exported = applied(tidied, planExport(plan, planFiles(tidied), true).files);

    const fromFiles = specStateFrom({ name: SPEC, dir: "/spec" }, (path) => exported.get(path));
    const fromRecord = joinedSpecState({ name: SPEC, dir: "/spec" }, (path) => exported.get(path), plan);
    expect(readyIds(fromFiles)).toEqual(readyIds(fromRecord));
    expect(readyIds(fromFiles).ready).toEqual(["3", "5"]);
    expect(exported.get("phases/phase-2.md")).toContain("- [x] c — abc1234 on origin/feat/x");
    expect(exported.get("progress.md")).toContain("- [x] Phase 1 — P1 → `phases/phase-1.md` · deployed 2026-11-10");
    expect(exported.get("progress.md")).not.toContain("On the board");
  });

  test("without --unjoin the banner and the read line stay above the list", () => {
    const files = specFiles(PHASES.slice(0, 1));
    const plan = joined(files);
    const stub = progressStub("# Progress\n", SPEC, "2026-11-12");
    const { files: changed } = planExport(plan, { progress: stub, phases: [] }, false);
    expect(changed[0]?.text).toBe(`# Progress\n\n${bannerLine("2026-11-12")}\n${manualReadLine(SPEC)}\n\n## Phases\n\n- [x] Phase 1 — P1 → \`phases/phase-1.md\` · deployed 2026-11-10\n`);
  });

  test("a phase whose file isn't in this tree is named, not invented", () => {
    const plan = joined(specFiles([PHASES[0]!, { id: "2", tasks: ["b"] }]));
    expect(planExport(plan, { progress: "", phases: [] }, false).missing).toEqual(["phases/phase-1.md", "phases/phase-2.md"]);
  });

  test("files that already say what the record says are not rewritten", () => {
    const files = specFiles(PHASES.slice(0, 1));
    const plan = joined(files);
    const once = applied(files, planExport(plan, planFiles(files), true).files);
    expect(planExport(plan, planFiles(once), true).files).toEqual([]);
  });
});
