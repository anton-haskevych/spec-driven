import { describe, expect, test } from "bun:test";
import { changedSpecFields, movedFieldsProblem } from "../hooks/frozen-plan-edits";

const BEFORE = "---\nstatus: active\nowner: Taras\nupdated: 2026-11-01T00:00:00Z\n---\n# Alpha\n";

describe("changedSpecFields", () => {
  test("names the moved fields an edit to CLAUDE.md changed", () => {
    expect(changedSpecFields(BEFORE, BEFORE.replace("owner: Taras", "owner: Anton").replace("status: active", "status: done"))).toEqual(["status", "owner"]);
    expect(changedSpecFields(BEFORE, BEFORE.replace("---\n# Alpha", "focus: must\n---\n# Alpha"))).toEqual(["focus"]);
  });

  test("prose, updated: and relations are not moved fields", () => {
    expect(changedSpecFields(BEFORE, BEFORE.replace("# Alpha", "# Alpha\n\nMore prose.").replace("2026-11-01", "2026-11-12"))).toEqual([]);
    expect(changedSpecFields(BEFORE, BEFORE.replace("---\n# Alpha", "related:\n  - beta: why\n---\n# Alpha"))).toEqual([]);
  });

  test("the problem names the command for each field", () => {
    expect(movedFieldsProblem("alpha", ["status", "owner"])).toBe(
      "alpha is on the board: its status and owner live in the record, so this edit changes nothing there. Undo it, then run `spec.ts spec-status alpha <status>` and `spec.ts owner alpha <name|me|none>`.",
    );
  });
});
