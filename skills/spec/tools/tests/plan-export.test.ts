import { describe, expect, test } from "bun:test";
import { readySet } from "../ready/ready-set";
import type { SpecState } from "../core/spec-state";
import { specStateFrom } from "../core/spec-state";
import { bannerLine, manualReadLine, progressStub } from "../plan/banner";
import { planExport } from "../plan/export";
import { planJoin } from "../plan/join";
import { joinedSpecState } from "../plan/state-source";
import { planTidy } from "../plan/tidy";
import { copyOf, phaseFile, pointer, specFiles, SPEC, type PhaseSpec } from "./join-fixtures";

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

  describe("free-text lines in the list (explicit-charge-handling, 2026-11-12)", () => {
    const line = (id: string, done: boolean) => `- [${done ? "x" : " "}] Phase ${id} — P${id} → \`${pointer(id)}\``;
    const v1 = ["1", "14", "14a"];
    const v2 = ["8", "12"];
    const progress = [
      "# Explicit Charge Handling — Progress",
      "",
      "## Success metrics",
      "",
      "- Zero code paths return a pass visit outside ChargeReversal",
      "",
      "## Phases",
      "",
      "v1:",
      ...v1.map((id) => line(id, false)),
      "",
      "v2:",
      ...v2.map((id) => line(id, false)),
      "",
    ].join("\n");
    const files = new Map([["progress.md", progress], ...[...v1, ...v2].map((id) => [pointer(id), phaseFile({ id, tasks: [`${id} one`] })] as const)]);

    function allDone() {
      const plan = joined(files);
      return { ...plan, phases: plan.phases.map((doc) => ({ ...doc, tasks: doc.tasks.map((task) => ({ ...task, done: true })) })) };
    }

    const expected = progress.replace(/- \[ \]/g, "- [x]");

    test("the labels stay where they stood and the list keeps the file's order", () => {
      const exported = applied(files, planExport(allDone(), planFiles(files), true).files);
      expect(exported.get("progress.md")).toBe(expected);
    });

    test("a tidied stub takes the list's layout from the frozen copy before the tidy", () => {
      const tidied = applied(files, planTidy(SPEC, "2026-11-12", planFiles(files)));
      const exported = applied(tidied, planExport(allDone(), planFiles(tidied), true, progress).files);
      expect(exported.get("progress.md")).toBe(expected);
    });

    test("a phase added on the board goes after the phase before it; one dropped there goes", () => {
      const plan = allDone();
      const added = { ...plan.phases[1]!, id: "14b", title: "P14b", file: pointer("14b") };
      const changed = { ...plan, phases: [...plan.phases.slice(0, 2), added, ...plan.phases.slice(2).filter((doc) => doc.id !== "12")] };
      const withFile = new Map([...files, [pointer("14b"), phaseFile({ id: "14b", tasks: ["14b one"] })]]);
      const text = applied(withFile, planExport(changed, planFiles(withFile), true).files).get("progress.md") ?? "";
      expect(text).toContain(`${line("14", true)}\n${line("14b", true)}\n${line("14a", true)}`);
      expect(text).toContain(`v2:\n${line("8", true)}\n`);
      expect(text).not.toContain("phase-12.md");
    });
  });
});
