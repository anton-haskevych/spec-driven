import { describe, expect, test } from "bun:test";
import { fromTreePlan } from "../plan/join-from-tree";
import { phaseDocPath, specDocPath, validateRecordDoc } from "../plan/kinds";
import { planWrites } from "../record/plan-writes";
import { viewOf } from "./fake-record";
import { phaseDoc, specDoc, task } from "./record-factories";

const HEAD = "b04412a8f14deab768d420d9dd09b78042b0d2fb";
const view = viewOf({
  [specDocPath("checkout")]: specDoc({ phases: ["2", "3"] }),
  [phaseDocPath("checkout", "2")]: phaseDoc({ id: "2", file: "phases/phase-2.md", tasks: [task({ id: "2.1", text: "Wire `locator`" }), task({ id: "2.2", text: "Beta" }), task({ id: "2.3", text: "Gamma", done: true, evidence: "x" })] }),
  [phaseDocPath("checkout", "3")]: phaseDoc({ id: "3", file: "phases/phase-3.md", tasks: [task({ id: "3.1", text: "Later" })] }),
});
const files: Record<string, string> = {
  "phases/phase-2.md": "# Phase 2\n\n## Deliverables\n\n- [x] Wire locator\n- [ ] Beta\n- [x] Gamma\n- [x] Not on the record\n",
  "phases/phase-3.md": "# Phase 3\n\n- [x] Later — https://example.com/pr/9\n",
};
const copy = { spec: "checkout", read: (path: string) => files[path], tree: "pr-b", head: HEAD, at: "2026-11-12T10:00:00Z", session: "s1" };

describe("fromTreePlan", () => {
  test("marks done, by text, each box ticked here and open on the record, with this tree's head or the box's evidence", () => {
    const ticked: string[] = [];
    const planned = fromTreePlan(copy, (ids) => ticked.push(...ids))(view);
    if (!("ops" in planned)) throw new Error(JSON.stringify(planned));
    const written = planWrites(view, planned.ops, validateRecordDoc);
    if (written.kind !== "planned") throw new Error(JSON.stringify(written));
    const tasks = (phase: string) => JSON.parse(written.changes.find((change) => change.path === phaseDocPath("checkout", phase))?.text ?? "{}").tasks;
    expect(tasks("2")[0]).toEqual({ id: "2.1", text: "Wire `locator`", done: true, evidence: HEAD, doneAt: copy.at, doneBy: "s1", doneIn: "pr-b" });
    expect(tasks("2")[1].done).toBe(false);
    expect(tasks("3")[0]).toMatchObject({ done: true, evidence: "https://example.com/pr/9" });
    expect(ticked).toEqual(["2.1", "3.1"]);
  });

  test("nothing ahead changes nothing; a spec not on the board refuses", () => {
    expect(fromTreePlan({ ...copy, read: () => undefined })(view)).toEqual({ unchanged: true });
    expect(fromTreePlan({ ...copy, spec: "ghost" })(view)).toEqual({ refused: "ghost is not on the board; run join ghost first" });
  });
});
