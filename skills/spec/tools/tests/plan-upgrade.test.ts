import { describe, expect, test } from "bun:test";
import { prDocPath, specDocPath, validateRecordDoc } from "../plan/kinds";
import { prDocsFromFiles, specFieldsFromFiles, upgradePlan } from "../plan/upgrade";
import { planWrites } from "../record/plan-writes";
import { viewOf } from "./fake-record";
import { phaseDoc, prDoc, specDoc } from "./record-factories";

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

describe("upgradePlan", () => {
  const copied = { fields: { status: "active", owner: "Taras" }, prs: [prDoc({ group: "A", number: 37, state: "merged" }), prDoc({ group: "B" })] };

  test("a layout-1 spec gets its fields, layout 2 and its PR documents in one batch", () => {
    const view = viewOf({ [specDocPath("checkout")]: specDoc({ layout: 1 }), [prDocPath("checkout", "B")]: prDoc({ group: "B", number: 50, state: "open" }) });
    const planned = upgradePlan("checkout", copied)(view);
    expect(planned).toEqual({
      ops: [
        { op: "update", path: specDocPath("checkout"), patch: { status: "active", owner: "Taras", layout: 2 } },
        { op: "create", path: prDocPath("checkout", "A"), doc: copied.prs[0] },
      ],
      message: "record: upgrade checkout to layout 2",
    });
    if (!("ops" in planned)) throw new Error("expected ops");
    expect(planWrites(view, planned.ops, validateRecordDoc).kind).toBe("planned");
  });

  test("an upgraded spec is left alone, and a spec off the board is refused", () => {
    expect(upgradePlan("checkout", copied)(viewOf({ [specDocPath("checkout")]: specDoc({ layout: 2 }) }))).toEqual({ unchanged: true });
    expect(upgradePlan("checkout", copied)(viewOf({}))).toEqual({ refused: "checkout is not on the board" });
  });
});
