import { describe, expect, test } from "bun:test";
import { parseItemAssignments, takeOpenItems } from "../phases/move-items";

const entry = [
  "## Deliverables",
  "- [x] shipped",
  "- [ ] read path",
  "  - [ ] read cache",
  "  note under read path",
  "- [ ] write path",
  "- [ ] audit log",
  "",
].join("\n");

describe("takeOpenItems", () => {
  test("removes the numbered open items with their nested lines, dedented, in entry order", () => {
    const taken = takeOpenItems(entry, [3, 1]);
    expect(taken.kind).toBe("ok");
    if (taken.kind !== "ok") return;
    expect(taken.remaining).toBe("## Deliverables\n- [x] shipped\n- [ ] audit log\n");
    expect(taken.moved.get(1)).toEqual(["- [ ] read path", "  - [ ] read cache", "  note under read path"]);
    expect(taken.moved.get(3)).toEqual(["- [ ] write path"]);
  });

  test("numbers count top-level and nested open items like #N in phase tick", () => {
    const taken = takeOpenItems(entry, [2]);
    expect(taken.kind === "ok" && taken.moved.get(2)).toEqual(["- [ ] read cache"]);
  });

  test("an unknown number is invalid", () => {
    expect(takeOpenItems(entry, [9])).toMatchObject({ kind: "invalid" });
  });
});

describe("parseItemAssignments", () => {
  test("reads label:numbers pairs from repeated or space-separated values", () => {
    expect(parseItemAssignments(["b:1,2 c:3", "d:4"], 3)).toEqual(new Map([[0, [1, 2]], [1, [3]], [2, [4]]]));
  });

  test("rejects a label past the last title, a malformed pair, and a number given twice", () => {
    expect(parseItemAssignments(["d:1"], 2)).toBe('--items label "d" has no title; labels run b to c');
    expect(parseItemAssignments(["b1,2"], 1)).toBe('--items "b1,2" is not <label>:<n>,<n>');
    expect(parseItemAssignments(["b:1 c:1"], 2)).toBe("--items moves open item 1 twice");
  });
});

describe("takeOpenItems with nesting", () => {
  test("refuses to move a nested item separately from the item that holds it", () => {
    expect(takeOpenItems(entry, [1, 2])).toEqual({
      kind: "invalid",
      reason: "open item 2 is nested under another moved item; it moves with it",
    });
  });
});
