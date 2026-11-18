import { describe, expect, test } from "bun:test";
import { filesToTouch } from "../core/phase-entry";
import { commitsOf, phaseSections } from "../pr/how-to-review";

const ENTRY = `---
needs: [3]
---

# Phase 5 — Final PR

**Goal:** one PR.

**Files to touch:**
- \`pr/open.ts\`, \`pr/resolve.ts\`
- tests: \`pr-open.test.ts\`

## Implementation guidance

- not a file
`;

describe("filesToTouch", () => {
  test("the bullets under the Files to touch label, and nothing after them", () => {
    expect(filesToTouch(ENTRY)).toEqual(["`pr/open.ts`, `pr/resolve.ts`", "tests: `pr-open.test.ts`"]);
  });

  test("an entry without the label has none", () => {
    expect(filesToTouch("# Phase 1\n\n- [ ] a task\n")).toEqual([]);
  });
});

describe("commitsOf", () => {
  test("each done task's evidence sha, short, once, in task order", () => {
    const tasks = [
      { done: true, evidence: "aaaaaaa111111111111111111111111111111111 on origin/feat/x-pr-a" },
      { done: true, evidence: "bbbbbbb2222" },
      { done: true, evidence: "aaaaaaa111111111111111111111111111111111 on origin/feat/x-pr-a · note" },
      { done: true, evidence: "approved by Anton" },
      { done: false },
    ];
    expect(commitsOf(tasks)).toEqual(["aaaaaaa", "bbbbbbb"]);
  });
});

describe("phaseSections", () => {
  test("one section per phase: Outcome, files and commits, leaving out what it lacks", () => {
    const text = phaseSections([
      { id: "1", name: "Schema", outcome: "Invoices go out", files: ["`a.ts`"], commits: ["aaaaaaa", "bbbbbbb"] },
      { id: "2", name: "Import", files: [], commits: [] },
    ]);
    expect(text).toBe(
      ["### Phase 1 — Schema", "Outcome: Invoices go out", "Files: `a.ts`", "Commits: aaaaaaa, bbbbbbb", "", "### Phase 2 — Import"].join("\n"),
    );
  });
});
