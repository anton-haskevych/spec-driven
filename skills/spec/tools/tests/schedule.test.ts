import { describe, expect, test } from "bun:test";
import { isOverdue, isoDay, priorityRank, readSchedule } from "../core/schedule";

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
