import { describe, expect, test } from "bun:test";
import { readSpecMeta } from "../core/spec-meta";
import { isOverdue, isoDay, priorityRank, readSchedule } from "../core/schedule";
import { phaseScheduleIssues, specOverdueIssues } from "../doctor/schedule";
import { phaseState, specMeta, specNode } from "./factories";

describe("readSchedule", () => {
  test("reads an optional priority and due date", () => {
    expect(readSchedule({ priority: "p1", due: "2026-10-15" })).toEqual({ priority: "p1", due: "2026-10-15", problems: [] });
    expect(readSchedule({})).toEqual({ problems: [] });
  });

  test("normalizes case and whitespace in the priority", () => {
    expect(readSchedule({ priority: " P2 " }).priority).toBe("p2");
  });

  test("reports a priority outside p1–p3 and a due that is not a calendar day", () => {
    const { priority, due, problems } = readSchedule({ priority: "high", due: "next week" });
    expect(priority).toBeUndefined();
    expect(due).toBeUndefined();
    expect(problems).toEqual([
      'priority "high" is not one of p1, p2, p3',
      'due "next week" is not a date; use YYYY-MM-DD',
    ]);
  });

  test("rejects an impossible date", () => {
    expect(readSchedule({ due: "2026-02-30" }).problems).toHaveLength(1);
  });
});

describe("isOverdue", () => {
  test("is overdue only strictly after the due day", () => {
    expect(isOverdue("2026-09-22", "2026-09-23")).toBe(true);
    expect(isOverdue("2026-09-23", "2026-09-23")).toBe(false);
    expect(isOverdue(undefined, "2026-09-23")).toBe(false);
  });
});

describe("isoDay", () => {
  test("formats the local calendar day", () => {
    expect(isoDay(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("priorityRank", () => {
  test("orders p1 first and unprioritized last", () => {
    expect([priorityRank("p1"), priorityRank("p2"), priorityRank("p3"), priorityRank(undefined)]).toEqual([1, 2, 3, 4]);
  });
});

describe("readSpecMeta", () => {
  test("reads the list columns and the schedule from CLAUDE.md frontmatter", () => {
    const data = { area: ["landing"], domain: "seo", scope: ["feature"], updated: "2026-09-20T10:00:00-07:00", priority: "p1", due: "2026-10-01" };
    expect(readSpecMeta(data)).toEqual({
      area: ["landing"],
      domain: ["seo"],
      scope: ["feature"],
      updated: "2026-09-20T10:00:00-07:00",
      priority: "p1",
      due: "2026-10-01",
    });
  });
});

describe("schedule checks in the doctor", () => {
  const TODAY = "2026-09-23";
  const spec = { name: "checkout", dir: "/specs/checkout" };
  const phases = [
    phaseState({ id: "1", done: true, schedule: { due: "2026-09-01", problems: [] } }),
    phaseState({ id: "2", pointer: "phases/phase-2.md", schedule: { due: "2026-09-10", problems: [] } }),
    phaseState({ id: "3", pointer: "phases/phase-3.md", schedule: { problems: ['due "soon" is not a date; use YYYY-MM-DD'] } }),
  ];

  test("flags bad phase dates as errors and open phases past due as warnings", () => {
    const issues = phaseScheduleIssues({ spec, hasProgress: true, phases }, TODAY);
    expect(issues.map((i) => `${i.severity} ${i.file}: ${i.problem}`)).toEqual([
      "warning /specs/checkout/phases/phase-2.md: Phase 2 was due 2026-09-10 and is still open",
      'error /specs/checkout/phases/phase-3.md: due "soon" is not a date; use YYYY-MM-DD',
    ]);
  });

  test("checks one phase file when the hook names it", () => {
    expect(phaseScheduleIssues({ spec, hasProgress: true, phases }, TODAY, "phases/phase-3.md")).toHaveLength(1);
  });

  test("warns about an unfinished spec past its due day, not a finished one", () => {
    const open = specNode({ meta: specMeta({ due: "2026-09-01" }) });
    expect(specOverdueIssues("CLAUDE.md", open, TODAY).map((i) => i.problem)).toEqual([
      "spec was due 2026-09-01 and is not finished",
    ]);
    expect(specOverdueIssues("CLAUDE.md", specNode({ status: "done", meta: specMeta({ due: "2026-09-01" }) }), TODAY)).toEqual([]);
  });
});
