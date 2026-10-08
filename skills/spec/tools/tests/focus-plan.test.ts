import { describe, expect, test } from "bun:test";
import { planFocus } from "../focus/plan";

const META = "---\nstatus: active\npriority: p1\n---\n# Spec\n";
const withFocus = (focus: string) => `---\nstatus: active\npriority: p1\nfocus: ${focus}\n---\n# Spec\n`;

describe("planFocus", () => {
  test("add writes the band and says where it went", () => {
    expect(planFocus({ kind: "add", spec: "c", band: "must" }, META)).toEqual({
      kind: "write",
      text: withFocus("must"),
      message: "[focus] add c",
      landed: { verb: "added", spec: "c", band: "must" },
    });
  });

  test("add overwrites a 2.37.0 rank or a malformed focus, which count as not in focus", () => {
    for (const old of ["10", "soon"]) {
      expect(planFocus({ kind: "add", spec: "c", band: "could" }, withFocus(old))).toMatchObject({ kind: "write", text: withFocus("could") });
    }
  });

  test("add refuses a spec already in a band, naming it", () => {
    expect(planFocus({ kind: "add", spec: "b", band: "must" }, withFocus("Should"))).toEqual({ kind: "refused", reason: "b is already in focus (should); use move" });
  });

  test("move rewrites the band", () => {
    expect(planFocus({ kind: "move", spec: "b", band: "could" }, withFocus("must"))).toEqual({
      kind: "write",
      text: withFocus("could"),
      message: "[focus] move b",
      landed: { verb: "moved", spec: "b", band: "could" },
    });
  });

  test("move refuses the band the spec is already in", () => {
    expect(planFocus({ kind: "move", spec: "b", band: "could" }, withFocus("could"))).toEqual({ kind: "refused", reason: "b is already could" });
  });

  test("move refuses a spec with no band, a 2.37.0 rank included", () => {
    for (const text of [META, withFocus("10")]) {
      expect(planFocus({ kind: "move", spec: "c", band: "must" }, text)).toEqual({ kind: "refused", reason: "c is not in focus" });
    }
  });

  test("drop removes any focus line, a 2.37.0 rank or a malformed one too", () => {
    for (const old of ["must", "10", "soon"]) {
      expect(planFocus({ kind: "drop", spec: "b" }, withFocus(old))).toEqual({ kind: "write", text: META, message: "[focus] drop b", landed: { verb: "dropped", spec: "b" } });
    }
  });

  test("drop refuses a spec with no focus line", () => {
    expect(planFocus({ kind: "drop", spec: "c" }, META)).toEqual({ kind: "refused", reason: "c is not in focus" });
  });

  test("a CLAUDE.md without frontmatter is refused", () => {
    expect(planFocus({ kind: "add", spec: "c", band: "must" }, "# legacy\n")).toEqual({ kind: "refused", reason: "c's CLAUDE.md: entry has no frontmatter" });
  });
});
