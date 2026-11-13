import { describe, expect, test } from "bun:test";
import { phaseDocPath, prDocPath, questionDocPath, specDocPath, validateRecordDoc } from "../plan/kinds";
import { prDocsFromFiles, specFieldsFromFiles, upgradePlan } from "../plan/upgrade";
import { planWrites } from "../record/plan-writes";
import { viewOf } from "./fake-record";
import { cardDoc, phaseDoc, prDoc, specDoc } from "./record-factories";

const CLAUDE_MD = `---
status: active
owner: Taras
focus: Must
ship: hold-for-review
stale: "phase 4 predates the API change"
related:
  - billing: shares the invoice table
---
# Checkout
`;

const PR_OPENING = `# PR opening

## Spec state

PR #37 · feat/checkout-pr-a
PR #37 merged 2026-11-11 as 9392c3f (squash).
PR #41 · feat/checkout-pr-b

## Pre-PR checks
`;

const TWO_GROUPS = [phaseDoc({ id: "1", pr: "A" }), phaseDoc({ id: "2", pr: "B" }), phaseDoc({ id: "3", pr: "C" })];

describe("specFieldsFromFiles", () => {
  test("copies status, owner, focus and ship through the CLAUDE.md readers; relations and notes stay in the file", () => {
    expect(specFieldsFromFiles(CLAUDE_MD)).toEqual({ status: "active", owner: "Taras", focus: "must", ship: "hold-for-review" });
  });

  test("a field the file doesn't have is left out, and an unreadable one is not copied", () => {
    expect(specFieldsFromFiles("---\nstatus: draft\nfocus: 3x\n---\n")).toEqual({ status: "draft" });
    expect(specFieldsFromFiles("# no frontmatter\n")).toEqual({});
  });
});

describe("prDocsFromFiles", () => {
  test("a PR line names its group by branch; a merge line closes it", () => {
    const { prs, left } = prDocsFromFiles("checkout", TWO_GROUPS, PR_OPENING, () => undefined);
    expect(prs).toEqual([
      prDoc({ group: "A", number: 37, state: "merged", mergedAt: "2026-11-11", mergedSha: "9392c3f", method: "squash" }),
      prDoc({ group: "B", number: 41, state: "open" }),
      prDoc({ group: "C" }),
    ]);
    expect(left).toEqual([]);
  });

  test("GitHub's answer names the branch a bare merge line lacks, and its state wins over the file's guess", () => {
    const text = "## Spec state\n\nPR #37 merged 2026-11-11 as 9392c3f (squash).\nPR #41 · feat/checkout-pr-b\n";
    const seen = (number: number) =>
      number === 37 ? { branch: "feat/checkout-pr-a", state: "merged" as const, headRefOid: "h37", mergedSha: "9392c3fffff" } : number === 41 ? { branch: "feat/checkout-pr-b", state: "draft" as const, headRefOid: "h41" } : undefined;
    const { prs } = prDocsFromFiles("checkout", TWO_GROUPS, text, seen);
    expect(prs.slice(0, 2)).toEqual([
      prDoc({ group: "A", number: 37, state: "merged", headRefOid: "h37", mergedAt: "2026-11-11", mergedSha: "9392c3fffff", method: "squash" }),
      prDoc({ group: "B", number: 41, state: "draft", headRefOid: "h41" }),
    ]);
  });

  test("a merge line with no branch fits a one-group spec, and is named when the spec has several", () => {
    const text = "## Spec state\n\nPR #9 merged 2026-10-01 as abc1234 (squash).\n";
    expect(prDocsFromFiles("checkout", [phaseDoc()], text, () => undefined).prs).toEqual([{ ...prDoc({ group: "default", branch: "feat/checkout", number: 9, state: "merged", mergedAt: "2026-10-01", mergedSha: "abc1234", method: "squash" }) }]);
    expect(prDocsFromFiles("checkout", TWO_GROUPS, text, () => undefined).left).toEqual(["PR #9 matched no PR group of checkout; pr status checkout <group> records it"]);
  });

  test("of two PRs on one group, the newer number is the group's", () => {
    const text = "## Spec state\n\nPR #12 · feat/checkout-pr-a\nPR #15 · feat/checkout-pr-a\n";
    expect(prDocsFromFiles("checkout", TWO_GROUPS, text, () => undefined).prs[0]).toEqual(prDoc({ group: "A", number: 15, state: "open" }));
  });
});

const AT = "2026-11-13T10:00:00.000Z";

describe("upgradePlan", () => {
  const copied = { fields: { status: "active", owner: "Taras" }, prs: [prDoc({ group: "A", number: 37, state: "merged" }), prDoc({ group: "B" })] };

  test("a layout-1 spec gets its fields, its PR documents and layout 4 in one batch", () => {
    const view = viewOf({ [specDocPath("checkout")]: specDoc({ layout: 1 }), [prDocPath("checkout", "B")]: prDoc({ group: "B", number: 50, state: "open" }) });
    const planned = upgradePlan("checkout", copied, AT)(view);
    expect(planned).toEqual({
      ops: [
        { op: "update", path: specDocPath("checkout"), patch: { status: "active", owner: "Taras", layout: 4 } },
        { op: "create", path: prDocPath("checkout", "A"), doc: copied.prs[0] },
      ],
      message: "record: upgrade checkout to layout 4",
    });
    if (!("ops" in planned)) throw new Error("expected ops");
    expect(planWrites(view, planned.ops, validateRecordDoc).kind).toBe("planned");
  });

  test("an upgraded spec is left alone, and a spec off the board is refused", () => {
    expect(upgradePlan("checkout", copied, AT)(viewOf({ [specDocPath("checkout")]: specDoc({ layout: 4 }) }))).toEqual({ unchanged: true });
    expect(upgradePlan("checkout", copied, AT)(viewOf({}))).toEqual({ refused: "checkout is not on the board" });
  });

  test("a layout-2 spec gets only its notes and questions: fields and PRs are already on the record", () => {
    const phase = phaseDoc({ id: "1", parks: [{ parkedAt: "T0", question: "Old?", answer: { at: "T0b", text: "yes" } }] });
    const view = viewOf({ [specDocPath("checkout")]: specDoc({ layout: 2 }), [phaseDocPath("checkout", "1")]: phase });
    const notes = { notes: { "1": "# In-flight — phase 1\n\nPick up here.\n" }, parks: { "1": [{ parkedAt: "T1", question: "Ship?", recommend: "yes" }] } };
    const planned = upgradePlan("checkout", { ...copied, notes }, AT)(view);
    if (!("ops" in planned)) throw new Error(JSON.stringify(planned));
    expect(planned.ops).toEqual([
      { op: "update", path: specDocPath("checkout"), patch: { layout: 4 } },
      { op: "update", path: phaseDocPath("checkout", "1"), patch: { parks: null, handoff: { at: AT, by: "unknown", note: notes.notes["1"] } } },
      { op: "create", path: questionDocPath("checkout", "q1"), doc: { id: "q1", about: "checkout#1", kind: "question", askedAt: "T0", askedBy: "unknown", question: "Old?", answer: { text: "yes", by: "unknown", at: "T0b" } } },
      { op: "create", path: questionDocPath("checkout", "q2"), doc: { id: "q2", about: "checkout#1", kind: "question", askedAt: "T1", askedBy: "unknown", question: "Ship?", recommend: "yes" } },
    ]);
    expect(planWrites(view, planned.ops, validateRecordDoc).kind).toBe("planned");
  });

  test("a layout-3 spec gets the card it lacks, with its priority and due date; one some card covers gets none", () => {
    const seed = { title: "Checkout", priority: "p1" as const, due: "2026-12-01" };
    const view = viewOf({ [specDocPath("checkout")]: specDoc({ layout: 3 }), "cards/0/c2.json": cardDoc({ id: "c2", coveredBy: ["other"] }) });
    const at = "2026-11-13T10:00:00-08:00";
    const planned = upgradePlan("checkout", { ...copied, card: seed }, at)(view);
    if (!("ops" in planned)) throw new Error(JSON.stringify(planned));
    expect(planned.ops.map((op) => op.path)).toEqual([specDocPath("checkout"), "cards/0/c3.json", "sources/c3/a.json"]);
    expect(planned.ops[1]).toMatchObject({ doc: { title: "Checkout", priority: "p1", due: "2026-12-01", coveredBy: ["checkout"] } });
    expect(planWrites(view, planned.ops, validateRecordDoc).kind).toBe("planned");
    const covered = viewOf({ [specDocPath("checkout")]: specDoc({ layout: 3 }), "cards/0/c2.json": cardDoc({ id: "c2", coveredBy: ["checkout#1"] }) });
    expect(upgradePlan("checkout", { ...copied, card: seed }, at)(covered)).toEqual({ ops: [{ op: "update", path: specDocPath("checkout"), patch: { layout: 4 } }], message: "record: upgrade checkout to layout 4" });
  });
});
