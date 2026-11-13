import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "../core/frontmatter";
import { summarizePhaseEntry } from "../core/phase-entry";
import { entryTasks, taskKey } from "../plan/entry-tasks";

const ENTRY = `---
needs: [1]
---

# Phase 2 — Two

- [ ] not a deliverable: above the section

## Deliverables

- [ ] Add \`planJoin\` — pure
- [x] Wire the command — \`0651e4e\`
- [x] Ship it — nothing that looks like evidence
- [ ] Gate: design agreed with Anton
  - [ ] nested step

\`\`\`md
- [ ] inside a fence
\`\`\`

## Notes

- [ ] a note checkbox
`;

describe("entryTasks", () => {
  test("reads the Deliverables section's checkboxes as written, with evidence split off ticked ones", () => {
    expect(entryTasks(ENTRY)).toEqual([
      { text: "Add `planJoin` — pure", done: false, gate: false },
      { text: "Wire the command", done: true, evidence: "`0651e4e`", gate: false },
      { text: "Ship it — nothing that looks like evidence", done: true, gate: false },
      { text: "Gate: design agreed with Anton", done: false, gate: true },
      { text: "nested step", done: false, gate: false },
    ]);
  });

  test("takes every checkbox when there is no Deliverables section", () => {
    expect(entryTasks("# P\n\n- [ ] one\n- [x] two\n").map((task) => task.text)).toEqual(["one", "two"]);
  });

  test("counts what the phase summary counts, on this spec's own phase files", () => {
    const dir = join(import.meta.dir, "../../../../docs/specs/live-board/phases");
    for (const file of readdirSync(dir).filter((name) => name.endsWith(".md"))) {
      const text = readFileSync(join(dir, file), "utf8");
      const parsed = parseFrontmatter(text);
      const body = parsed.kind === "ok" ? parsed.body : text;
      const { checked, unchecked } = summarizePhaseEntry(body).deliverables;
      const tasks = entryTasks(text);
      expect([tasks.filter((task) => task.done).length, tasks.filter((task) => !task.done).length]).toEqual([checked, unchecked]);
    }
  });
});

describe("taskKey", () => {
  test("ignores markdown marks, spacing and case", () => {
    expect(taskKey("Add `planJoin`  **now**")).toBe(taskKey("add planJoin now"));
  });
});
