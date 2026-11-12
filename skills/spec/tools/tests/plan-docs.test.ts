import { describe, expect, test } from "bun:test";
import { readPhaseDoc } from "../plan/docs/phase-doc";
import { readSpecDoc } from "../plan/docs/spec-doc";
import { specPlanProblems } from "../plan/docs/spec-plan";
import { validateRecordDoc } from "../plan/kinds";
import { phaseDoc, specDoc, task } from "./record-factories";

describe("readPhaseDoc", () => {
  test("reads a factory document back unchanged", () => {
    const doc = phaseDoc({ id: "2", needs: ["1"], pr: "B", due: "2026-12-01", gate: "design", deployed: "2026-11-20" });
    expect(readPhaseDoc(doc)).toEqual({ doc, problems: [] });
  });

  test("collects every problem instead of stopping at the first", () => {
    const read = readPhaseDoc({ ...phaseDoc(), id: "", needs: "1", code: "yes", due: "soon", gate: "legal", deployed: "today" });
    expect(read.doc).toBeUndefined();
    expect(read.problems).toEqual([
      "id must be text",
      "needs must be a list of strings, e.g. needs: [\"Vercel*\"]",
      "code must be true or false",
      'due "soon" is not a date; use YYYY-MM-DD',
      'gate must be design or outward, not "legal"',
      'deployed "today" is not a date; use YYYY-MM-DD',
    ]);
  });

  test("names duplicate task ids and malformed tasks", () => {
    const read = readPhaseDoc(phaseDoc({ tasks: [task({ id: "1.1" }), task({ id: "1.1", text: "Other" }), { id: "1.3" } as never] }));
    expect(read.problems).toEqual(["task 1.3: text must be text", "task 1.3: done must be true or false", "task id 1.1 appears twice"]);
  });

  test("is not an object", () => {
    expect(readPhaseDoc([]).problems).toEqual(["a phase document must be a JSON object"]);
  });
});

describe("readSpecDoc", () => {
  test("reads a factory document back unchanged", () => {
    const doc = specDoc({ phases: ["1", "2"] });
    expect(readSpecDoc(doc)).toEqual({ doc, problems: [] });
  });

  test("uses the plugin's field readers for spec fields", () => {
    const read = readSpecDoc({ ...specDoc(), focus: "Must", ship: "never", stale: "" });
    expect(read.doc?.focus).toBeUndefined();
    expect(read.problems).toEqual(['ship "never" is not one of auto, hold-for-review', 'stale must be one line of text, not ""']);
    expect(readSpecDoc({ ...specDoc(), focus: "Must" }).doc?.focus).toBe("must");
  });

  test("needs a plan version of 1 or more and a layout", () => {
    expect(readSpecDoc({ ...specDoc(), planVersion: 0, layout: undefined }).problems).toEqual([
      "planVersion must be a whole number, 1 or more",
      "layout must be a whole number, 0 or more",
    ]);
  });
});

describe("specPlanProblems", () => {
  test("a consistent plan has none, cross-spec refs included", () => {
    const phases = [phaseDoc({ id: "1" }), phaseDoc({ id: "2", needs: ["1", "gift-cards#3", "gift-cards"] })];
    expect(specPlanProblems(specDoc({ phases: ["1", "2"] }), phases)).toEqual([]);
  });

  test("names unknown phases, unresolved needs and task ids used twice", () => {
    const phases = [
      phaseDoc({ id: "1", tasks: [task({ id: "1.1" })] }),
      phaseDoc({ id: "3", needs: ["9"], sameFilesAs: ["4"], tasks: [task({ id: "1.1" })] }),
    ];
    expect(specPlanProblems(specDoc({ phases: ["1", "2"] }), phases)).toEqual([
      "phase 2 is listed in spec.json but has no document",
      "phase 3 has a document but is not in spec.json's phases",
      "phase 3 needs 9, which is not a phase of checkout",
      "phase 3 same-files-as 4, which is not a phase of checkout",
      "task id 1.1 is in phases 1 and 3",
    ]);
  });

  test("names a needs cycle once, from the first phase on it", () => {
    const phases = [phaseDoc({ id: "3", needs: ["5"] }), phaseDoc({ id: "4" }), phaseDoc({ id: "5", needs: ["4", "3"] })];
    expect(specPlanProblems(specDoc({ phases: ["3", "4", "5"] }), phases)).toEqual(["needs cycle: 3 → 5 → 3"]);
  });
});

describe("validateRecordDoc", () => {
  test("routes a path to its reader and checks the name matches the path", () => {
    expect(validateRecordDoc("specs/checkout/spec.json", specDoc())).toEqual([]);
    expect(validateRecordDoc("specs/checkout/phases/1.json", phaseDoc())).toEqual([]);
    expect(validateRecordDoc("specs/other/spec.json", specDoc())).toEqual(["specs/other/spec.json: name checkout does not match the path"]);
    expect(validateRecordDoc("specs/checkout/phases/2.json", phaseDoc())).toEqual(["specs/checkout/phases/2.json: id 1 does not match the path"]);
    expect(validateRecordDoc("specs/checkout/phases/1.json", { id: 1 })[0]).toStartWith("specs/checkout/phases/1.json: ");
  });

  test("refuses a path no document kind owns", () => {
    expect(validateRecordDoc("misc/x.json", {})).toEqual(["misc/x.json: no document kind is stored at this path"]);
  });
});
