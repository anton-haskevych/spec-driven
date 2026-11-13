import { describe, expect, test } from "bun:test";
import { boardPrDocs, rowForDoc } from "../board/pr-sync";
import type { PrRow } from "../pr/checks/rollup";
import { prDoc } from "./record-factories";

const row = (overrides: Partial<PrRow> = {}): PrRow => ({ number: 7, branch: "feat/checkout-pr-a", state: "OPEN", draft: false, url: "", headRefOid: "aaa111", ...overrides });

describe("rowForDoc", () => {
  test("an open PR on the group's branch beats older closed ones", () => {
    const rows = [row({ number: 3, state: "CLOSED" }), row({ number: 9 }), row({ number: 5, state: "MERGED" })];
    expect(rowForDoc(prDoc(), rows)?.number).toBe(9);
  });

  test("with none open, the newest", () => {
    expect(rowForDoc(prDoc(), [row({ number: 3, state: "CLOSED" }), row({ number: 5, state: "MERGED" })])?.number).toBe(5);
  });

  test("a PR on another branch matches by the document's head", () => {
    expect(rowForDoc(prDoc({ number: 4, state: "open", headRefOid: "ccc333" }), [row({ number: 4, branch: "feat/renamed", headRefOid: "ccc333" })])?.number).toBe(4);
    expect(rowForDoc(prDoc(), [row({ branch: "feat/other" })])).toBeUndefined();
  });
});

describe("boardPrDocs", () => {
  const docs = { checkout: [prDoc(), prDoc({ group: "B", number: 8, state: "green", headRefOid: "bbb222" })] };
  const prs = (spec: string) => docs[spec as keyof typeof docs];

  test("a document GitHub disagrees with is synced and shown synced; one that agrees is left alone", () => {
    const rows = [row({ state: "MERGED", mergedAt: "2026-11-12T08:00:00Z", mergeCommit: "fff999" }), row({ number: 8, branch: "feat/checkout-pr-b", headRefOid: "bbb222" })];
    const { docs: shown, sightings } = boardPrDocs(["checkout", "billing"], prs, rows);
    expect(sightings).toEqual([{ spec: "checkout", seen: { number: 7, branch: "feat/checkout-pr-a", state: "merged", headRefOid: "aaa111", mergedSha: "fff999", mergedAt: "2026-11-12" } }]);
    expect(shown.get("checkout")?.map((doc) => doc.state)).toEqual(["merged", "green"]);
    expect(shown.has("billing")).toBe(false);
  });
});
