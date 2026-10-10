import { describe, expect, test } from "bun:test";
import { mergeLine, withMergeLine } from "../pr/actions/merge-line";
import { specPrNumbers } from "../pr/resolve";

const RECORD = { pr: 921, date: "2026-10-10", sha: "9b0c1d2e3f4a5b6c", method: "merge" } as const;
const OPENING = "# PR Opening\n\n## Spec state\n\nDone: phases 1–7.\nSplit: one PR.\n\n## Pre-PR checks\n\n- [ ] tests\n";

describe("mergeLine", () => {
  test("keeps the PR #n form, a 7-character sha and the method", () => {
    expect(mergeLine(RECORD)).toBe("PR #921 merged 2026-10-10 as 9b0c1d2 (merge).");
    expect(mergeLine({ pr: 921, date: "2026-10-10", sha: "9b0c1d2e3f" })).toBe("PR #921 merged 2026-10-10 as 9b0c1d2.");
  });
});

describe("withMergeLine", () => {
  test("appends the line at the end of Spec state, before the next section, and round-trips specPrNumbers", () => {
    const edit = withMergeLine(OPENING, RECORD);
    expect(edit).toEqual({
      kind: "write",
      text: "# PR Opening\n\n## Spec state\n\nDone: phases 1–7.\nSplit: one PR.\nPR #921 merged 2026-10-10 as 9b0c1d2 (merge).\n\n## Pre-PR checks\n\n- [ ] tests\n",
    });
    expect(edit.kind === "write" && specPrNumbers(edit.text)).toEqual([921]);
  });

  test("a Spec state that ends the file gets the line too", () => {
    expect(withMergeLine("## Spec state\n\nDone.", RECORD)).toEqual({ kind: "write", text: "## Spec state\n\nDone.\nPR #921 merged 2026-10-10 as 9b0c1d2 (merge).\n" });
  });

  test("a line already there for this PR is left alone, whatever its date or method", () => {
    const landed = OPENING.replace("Split: one PR.", "Split: one PR.\nPR #921 merged 2026-10-09 as 9b0c1d2 (squash).");
    expect(withMergeLine(landed, RECORD)).toEqual({ kind: "unchanged", reason: "PR #921's merge line is already in Spec state" });
    expect(withMergeLine(landed, { ...RECORD, pr: 92 })).toMatchObject({ kind: "write" });
  });

  test("no Spec state section is a refusal", () => {
    expect(withMergeLine("# PR Opening\n\n## Pre-PR checks\n", RECORD)).toEqual({ kind: "refused", reason: "pr-opening.md has no Spec state section" });
  });
});
