import { describe, expect, test } from "bun:test";
import { boardLine, treeAheadLine } from "../context/board-lines";
import type { RecordRead } from "../record/read";
import { viewOf } from "./fake-record";
import { phaseDoc, specDoc, task } from "./record-factories";

const view = viewOf({});
const plan = (planVersion: number) => ({ spec: specDoc({ name: "alpha", planVersion, phases: ["2"] }), phases: [phaseDoc({ id: "2" })] });

describe("boardLine", () => {
  test("a live read names the plan version", () => {
    expect(boardLine({ kind: "read", view, live: true, ageMs: 0 }, plan(9))).toBe("Board: live · plan v9");
  });

  test("a local read says how old the copy is, and why it wasn't fetched", () => {
    const offline: RecordRead = { kind: "read", view, live: false, ageMs: 14 * 60_000, offline: "could not resolve host" };
    expect(boardLine(offline, plan(9))).toBe("Board: local copy from 14m ago (origin unreachable) · plan v9");
    expect(boardLine({ kind: "read", view, live: false }, plan(9))).toBe("Board: local copy of unknown age · plan v9");
  });

  test("a spec not on the board gets no line; a newer layout always does", () => {
    expect(boardLine({ kind: "read", view, live: true, ageMs: 0 }, undefined)).toBeUndefined();
    expect(boardLine({ kind: "none" }, undefined)).toBeUndefined();
    expect(boardLine({ kind: "newer", layout: 2 }, undefined)).toBe("record: this plugin is older than the board's layout; update it");
  });
});

describe("treeAheadLine", () => {
  const joined = {
    spec: specDoc({ name: "alpha", phases: ["2"] }),
    phases: [phaseDoc({ id: "2", file: "phases/phase-2.md", tasks: [task({ id: "2.1", text: "`model` it" }), task({ id: "2.2", text: "ship", done: true }), task({ id: "2.3", text: "test" })] })],
  };
  const files = (text: string) => (path: string) => (path === "phases/phase-2.md" ? text : undefined);

  test("names the tasks this tree ticked that the record has open", () => {
    const frozen = "## Deliverables\n\n- [x] model it\n- [x] ship\n- [ ] test\n";
    expect(treeAheadLine(joined, files(frozen))).toBe("Tree is ahead of the board: 1 tick (2.1) is open on the record. Run join alpha --from-tree.");
  });

  test("says nothing when the tree's boxes match the record", () => {
    expect(treeAheadLine(joined, files("## Deliverables\n\n- [ ] model it\n- [x] ship\n- [ ] test\n"))).toBeUndefined();
    expect(treeAheadLine(joined, () => undefined)).toBeUndefined();
  });
});
