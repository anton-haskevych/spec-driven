import { describe, expect, test } from "bun:test";
import { prDocPath, specDocPath } from "../plan/kinds";
import { githubPrState, matchPrDoc, prDocAfter, prSyncPlan, readSpecPrDocs, type PrObserved } from "../plan/pr-sync";
import { viewOf } from "./fake-record";
import { prDoc, specDoc } from "./record-factories";

const seen = (overrides: Partial<PrObserved> = {}): PrObserved => ({ number: 7, branch: "feat/checkout-pr-a", state: "open", headRefOid: "aaa111", ...overrides });

describe("githubPrState", () => {
  test.each([
    ["MERGED", false, false, "merged"],
    ["CLOSED", true, false, "closed"],
    ["OPEN", true, true, "draft"],
    ["OPEN", false, false, "open"],
    ["OPEN", false, true, "green"],
    ["OPEN", false, undefined, "ready"],
  ] as const)("%s draft=%s green=%s → %s", (state, isDraft, green, expected) => {
    expect(githubPrState(state, isDraft, green)).toBe(expected);
  });
});

describe("prDocAfter", () => {
  test("a not-opened document takes the PR's number, state and head", () => {
    expect(prDocAfter(prDoc(), seen())).toEqual(prDoc({ number: 7, state: "open", headRefOid: "aaa111" }));
  });

  test("nothing differs → undefined", () => {
    expect(prDocAfter(prDoc({ number: 7, state: "open", headRefOid: "aaa111" }), seen())).toBeUndefined();
  });

  test("merge fields are added to the same PR", () => {
    const after = prDocAfter(prDoc({ number: 7, state: "green", headRefOid: "aaa111" }), seen({ state: "merged", mergedAt: "2026-11-12", mergedSha: "fff999", method: "squash" }));
    expect(after).toEqual(prDoc({ number: 7, state: "merged", headRefOid: "aaa111", mergedAt: "2026-11-12", mergedSha: "fff999", method: "squash" }));
  });

  test("a new PR number on the group starts the document over, keeping group and branch", () => {
    const closed = prDoc({ number: 7, state: "merged", headRefOid: "aaa111", mergedAt: "2026-11-01", mergedSha: "fff999", method: "squash" });
    expect(prDocAfter(closed, seen({ number: 9, headRefOid: "bbb222", branch: "renamed" }))).toEqual(prDoc({ number: 9, state: "open", headRefOid: "bbb222" }));
  });
});

describe("a ready sighting (CI not read)", () => {
  const green = prDoc({ number: 7, state: "green", headRefOid: "aaa111" });

  test("keeps a green document green while PR and head are the same", () => {
    expect(prDocAfter(green, seen({ state: "ready" }))).toBeUndefined();
  });

  test("a moved head drops it to open", () => {
    expect(prDocAfter(green, seen({ state: "ready", headRefOid: "bbb222" }))).toEqual(prDoc({ number: 7, state: "open", headRefOid: "bbb222" }));
  });

  test("a draft document becomes open", () => {
    expect(prDocAfter(prDoc({ number: 7, state: "draft", headRefOid: "aaa111" }), seen({ state: "ready" }))?.state).toBe("open");
  });
});

describe("matchPrDoc", () => {
  const docs = [prDoc({ group: "A" }), prDoc({ group: "B", number: 4, state: "open", headRefOid: "ccc333" })];

  test("by branch", () => {
    expect(matchPrDoc(docs, seen())?.group).toBe("A");
  });

  test("by head when the branch differs", () => {
    expect(matchPrDoc(docs, seen({ branch: "feat/renamed", headRefOid: "ccc333" }))?.group).toBe("B");
  });

  test("neither → undefined", () => {
    expect(matchPrDoc(docs, seen({ branch: "feat/other", headRefOid: "zzz" }))).toBeUndefined();
  });
});

describe("prSyncPlan", () => {
  const view = viewOf({ [specDocPath("checkout")]: specDoc({ layout: 2 }), [prDocPath("checkout", "A")]: prDoc() });

  test("replaces the matched document", () => {
    const planned = prSyncPlan([{ spec: "checkout", seen: seen() }])(view);
    expect(planned).toEqual({ ops: [{ op: "replace", path: prDocPath("checkout", "A"), doc: prDoc({ number: 7, state: "open", headRefOid: "aaa111" }) }], message: "record: PR #7 of checkout is open" });
  });

  test("already up to date → unchanged", () => {
    const current = viewOf({ [specDocPath("checkout")]: specDoc({ layout: 2 }), [prDocPath("checkout", "A")]: prDoc({ number: 7, state: "open", headRefOid: "aaa111" }) });
    expect(prSyncPlan([{ spec: "checkout", seen: seen() }])(current)).toEqual({ unchanged: true });
  });

  test("a PR no group takes is refused with its number and branch", () => {
    expect(prSyncPlan([{ spec: "checkout", seen: seen({ branch: "feat/x", headRefOid: "zzz" }) }])(view)).toEqual({ refused: "PR #7 (feat/x) matches no PR group of checkout" });
  });

  test("a spec not on the board is refused", () => {
    expect(prSyncPlan([{ spec: "billing", seen: seen() }])(view)).toEqual({ refused: "billing is not on the board" });
  });
});

test("readSpecPrDocs reads one spec's PR documents and skips one that doesn't read", () => {
  const view = viewOf({
    [prDocPath("checkout", "A")]: prDoc(),
    [prDocPath("checkout", "B")]: { group: "B" },
    [prDocPath("billing", "A")]: prDoc({ branch: "feat/billing-pr-a" }),
  });
  expect(readSpecPrDocs(view, "checkout")).toEqual([prDoc()]);
});
