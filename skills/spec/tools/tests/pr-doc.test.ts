import { describe, expect, test } from "bun:test";
import { missingPrDocs, readPrDoc } from "../plan/docs/pr-doc";
import { validateRecordDoc } from "../plan/kinds";
import { phaseDoc, prDoc } from "./record-factories";

describe("readPrDoc", () => {
  test("a not-opened group reads back as written", () => {
    const doc = prDoc();
    expect(readPrDoc(JSON.parse(JSON.stringify(doc)))).toEqual({ doc, problems: [] });
  });

  test("an opened and a merged PR carry their number, head and merge fields", () => {
    const merged = prDoc({ number: 41, state: "merged", headRefOid: "a".repeat(40), mergedAt: "2026-11-12", mergedSha: "b".repeat(40), method: "squash" });
    expect(readPrDoc(merged)).toEqual({ doc: merged, problems: [] });
  });

  test("every bad field is named", () => {
    expect(readPrDoc({ group: "", branch: 3, number: -1, state: "shipped", method: "octopus" }).problems).toEqual([
      "group must be text",
      "branch must be text",
      "number must be a whole number, 1 or more",
      'state must be not-opened, draft, open, green, merged or closed, not "shipped"',
      'method must be squash, merge or rebase, not "octopus"',
    ]);
  });

  test("an opened PR needs its number", () => {
    expect(readPrDoc(prDoc({ state: "open" })).problems).toEqual(["an open PR needs its number"]);
  });

  test("the registry keeps a PR document at prs/<group>.json and checks the group against the path", () => {
    expect(validateRecordDoc("specs/checkout/prs/A.json", prDoc())).toEqual([]);
    expect(validateRecordDoc("specs/checkout/prs/B.json", prDoc())).toEqual(["specs/checkout/prs/B.json: group A does not match the path"]);
  });
});

describe("missingPrDocs", () => {
  test("one not-opened document per code phase's PR group that has none yet", () => {
    const phases = [phaseDoc({ id: "1", pr: "A" }), phaseDoc({ id: "2", pr: "A" }), phaseDoc({ id: "3", pr: "B" }), phaseDoc({ id: "4", pr: "C", code: false })];
    expect(missingPrDocs("checkout", phases, (group) => group === "A")).toEqual([prDoc({ group: "B" })]);
  });

  test("a spec whose phases name no group gets one document for feat/<spec>", () => {
    expect(missingPrDocs("checkout", [phaseDoc()], () => false)).toEqual([{ group: "default", branch: "feat/checkout", state: "not-opened" }]);
  });
});
