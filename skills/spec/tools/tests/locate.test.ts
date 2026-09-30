import { describe, expect, test } from "bun:test";
import { locateOpenItem, locatePhaseLine } from "../phases/locate";

const entry = [
  "---",
  "needs: []",
  "---",
  "## Deliverables",
  "- [x] `tests/tree.ts` builder",
  "- [ ] `spec.ts` command table + **USAGE**",
  "- [ ] build it",
  "- [ ] build it again",
  "```md",
  "- [ ] example inside a fence",
  "```",
  "  - [ ] nested [link](https://x.dev) item",
].join("\n");

describe("locateOpenItem", () => {
  test("matches a prefix against markdown-stripped text, case-insensitively", () => {
    expect(locateOpenItem(entry, "SPEC.TS command")).toMatchObject({ kind: "found", line: 5 });
    expect(locateOpenItem(entry, "nested link")).toMatchObject({ kind: "found", line: 11 });
  });

  test("strips markdown from the prefix too, so a backticked prefix still matches", () => {
    expect(locateOpenItem(entry, "`spec.ts` command table + **USAGE**")).toMatchObject({ kind: "found", line: 5 });
  });

  test("a found item carries its markdown-stripped text", () => {
    expect(locateOpenItem(entry, "#1")).toEqual({ kind: "found", line: 5, text: "spec.ts command table + USAGE" });
  });

  test("#N picks the Nth open item in file order, skipping ticked items and fenced code", () => {
    expect(locateOpenItem(entry, "#1")).toMatchObject({ kind: "found", line: 5 });
    expect(locateOpenItem(entry, "#4")).toMatchObject({ kind: "found", line: 11 });
  });

  test("never matches inside a code fence", () => {
    expect(locateOpenItem(entry, "example inside")).toMatchObject({ kind: "invalid" });
  });

  test("an exact match wins over longer items it prefixes", () => {
    expect(locateOpenItem(entry, "build it")).toMatchObject({ kind: "found", line: 6 });
  });

  test("an ambiguous prefix is invalid and lists the candidates", () => {
    const result = locateOpenItem(entry, "build");
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") expect(result.reason).toContain("build it again");
  });

  test("no match, or #N out of range, is invalid and lists the open items", () => {
    for (const selector of ["ghost", "#5", "#0"]) {
      const result = locateOpenItem(entry, selector);
      expect(result.kind).toBe("invalid");
      if (result.kind === "invalid") expect(result.reason).toContain("#1 spec.ts command table + USAGE");
    }
  });

  test("an already-ticked item is not open", () => {
    expect(locateOpenItem(entry, "tests/tree.ts")).toMatchObject({ kind: "invalid" });
  });
});

describe("locatePhaseLine", () => {
  const progress = [
    "## Phases",
    "```",
    "- [ ] Phase 2 — Example → `phases/phase-2-x.md`",
    "```",
    "- [x] Phase 1 — One → `phases/phase-1-one.md`",
    "- [ ] Phase 2 — Two → `phases/phase-2-two.md` (notes)",
  ].join("\n");

  test("finds the top-level checkbox line holding the pointer, outside fences", () => {
    expect(locatePhaseLine(progress, "phases/phase-2-two.md")).toBe(5);
    expect(locatePhaseLine(progress, "phases/phase-1-one.md")).toBe(4);
  });

  test("returns undefined when no line holds the pointer", () => {
    expect(locatePhaseLine(progress, "phases/phase-2-x.md")).toBeUndefined();
  });
});
