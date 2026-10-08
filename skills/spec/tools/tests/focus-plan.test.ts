import { describe, expect, test } from "bun:test";
import { planFocus } from "../focus/plan";
import type { FocusEntry } from "../focus/rank";

const META = "---\nstatus: active\npriority: p1\n---\n# Spec\n";
const withFocus = (rank: string) => `---\nstatus: active\npriority: p1\nfocus: ${rank}\n---\n# Spec\n`;
const SET: FocusEntry[] = [
  { spec: "a", rank: 10 },
  { spec: "b", rank: 20 },
];

describe("planFocus", () => {
  test("add appends by default and reports the new position", () => {
    expect(planFocus({ kind: "add", spec: "c", place: { kind: "end" } }, SET, META)).toEqual({
      kind: "write",
      text: withFocus("30"),
      message: "[focus] add c",
      landed: { verb: "added", spec: "c", position: { position: 3, total: 3 } },
    });
  });

  test("add --after writes a fractional rank between the neighbours", () => {
    const plan = planFocus({ kind: "add", spec: "c", place: { kind: "after", spec: "a" } }, SET, META);
    expect(plan).toMatchObject({ kind: "write", text: withFocus("15"), landed: { position: { position: 2, total: 3 } } });
  });

  test("add overwrites a malformed focus, which counts as not in focus", () => {
    const plan = planFocus({ kind: "add", spec: "c", place: { kind: "top" } }, SET, withFocus("soon"));
    expect(plan).toMatchObject({ kind: "write", text: withFocus("0"), landed: { position: { position: 1, total: 3 } } });
  });

  test("add refuses a spec already in focus, with its position", () => {
    expect(planFocus({ kind: "add", spec: "b", place: { kind: "end" } }, SET, withFocus("20"))).toEqual({
      kind: "refused",
      reason: "b is already in focus (2/2)",
    });
  });

  test("--after a spec outside the set is refused", () => {
    expect(planFocus({ kind: "add", spec: "c", place: { kind: "after", spec: "z" } }, SET, META)).toEqual({
      kind: "refused",
      reason: "--after z: z is not in focus",
    });
  });

  test("move rewrites the rank and reports the position", () => {
    const plan = planFocus({ kind: "move", spec: "b", place: { kind: "top" } }, SET, withFocus("20"));
    expect(plan).toEqual({
      kind: "write",
      text: withFocus("0"),
      message: "[focus] move b",
      landed: { verb: "moved", spec: "b", position: { position: 1, total: 2 } },
    });
  });

  test("drop removes the line", () => {
    expect(planFocus({ kind: "drop", spec: "b" }, SET, withFocus("20"))).toEqual({
      kind: "write",
      text: META,
      message: "[focus] drop b",
      landed: { verb: "dropped", spec: "b" },
    });
  });

  test("drop and move refuse a spec that is not in focus", () => {
    expect(planFocus({ kind: "drop", spec: "c" }, SET, META)).toEqual({ kind: "refused", reason: "c is not in focus" });
    expect(planFocus({ kind: "move", spec: "c", place: { kind: "top" } }, SET, META)).toEqual({ kind: "refused", reason: "c is not in focus" });
  });

  test("a CLAUDE.md without frontmatter is refused", () => {
    expect(planFocus({ kind: "add", spec: "c", place: { kind: "end" } }, SET, "# legacy\n")).toEqual({
      kind: "refused",
      reason: "c's CLAUDE.md: entry has no frontmatter",
    });
  });
});
