import { describe, expect, test } from "bun:test";
import { checkLedgerEntry, checkLedgerIndex } from "../doctor/ledger";
import { checkInFlight, checkPhases } from "../doctor/phases";
import { checkSpecMeta } from "../doctor/spec-meta";

const STATUSES = ["active", "done", "good-enough"];
const noEntries = () => false;

describe("checkSpecMeta", () => {
  test("rejects a status the project taxonomy does not allow", () => {
    const text = "---\nstatus: draft\ncreated: a\nupdated: b\n---\n# x";
    const [issue] = checkSpecMeta("CLAUDE.md", text, STATUSES);
    expect(issue?.severity).toBe("error");
    expect(issue?.problem).toContain('status "draft" is not allowed');
  });

  test("accepts an allowed status and ignores legacy files without frontmatter", () => {
    expect(checkSpecMeta("CLAUDE.md", "---\nstatus: active\ncreated: a\nupdated: b\n---\n", STATUSES)).toEqual([]);
    expect(checkSpecMeta("CLAUDE.md", "# legacy spec", STATUSES)).toEqual([]);
  });

  test("reports unparseable YAML as an error", () => {
    const [issue] = checkSpecMeta("CLAUDE.md", "---\nstatus: [active\n---\n", STATUSES);
    expect(issue?.severity).toBe("error");
  });
});

describe("checkLedgerEntry", () => {
  test("requires kind and applies-to", () => {
    const problems = checkLedgerEntry("e.md", "---\ncreated: a\n---\nbody", noEntries).map((i) => i.problem);
    expect(problems).toEqual(["frontmatter has no kind", "frontmatter has no applies-to"]);
  });

  test("flags a superseded-by target that does not exist, but not 'none'", () => {
    const base = "---\nkind: gotcha\napplies-to: [general]\ncreated: a\n";
    expect(checkLedgerEntry("e.md", `${base}superseded-by: gone.md\n---\n`, noEntries)).toHaveLength(1);
    expect(checkLedgerEntry("e.md", `${base}superseded-by: none\n---\n`, noEntries)).toEqual([]);
  });
});

describe("checkLedgerIndex", () => {
  test("reports rows without files and files without rows, ignoring mid-row mentions", () => {
    const index = "## Gotchas\n- `gotcha-a.md` — [general] — see `code-quality.md`\n- `gotcha-gone.md` — x\n";
    const problems = checkLedgerIndex("INDEX.md", index, ["gotcha-a.md", "gotcha-b.md"]).map((i) => i.problem);
    expect(problems).toEqual(["lists gotcha-gone.md, which does not exist", "has no row for gotcha-b.md"]);
  });
});

describe("checkPhases", () => {
  const phases = [
    { done: true, title: "Phase 1 — Schema", pointer: "phases/phase-1.md" },
    { done: false, title: "Phase 2 — Runner", pointer: "phases/phase-2.md" },
    { done: false, title: "Phase 3 — Missing", pointer: "phases/phase-3.md" },
  ];
  const entries: Record<string, string> = {
    "phases/phase-1.md": "- [x] a\n- [ ] b",
    "phases/phase-2.md": "- [x] a\n- [x] b",
  };

  test("finds ticked phases with open items, finished phases left open, and missing entries", () => {
    const issues = checkPhases("progress.md", phases, (pointer) => entries[pointer]);
    expect(issues.map((i) => i.problem)).toEqual([
      '"Phase 1 — Schema" is ticked but 1 sub-items in phases/phase-1.md are not',
      '"Phase 2 — Runner" has every sub-item ticked in phases/phase-2.md; tick the phase',
      '"Phase 3 — Missing" points at phases/phase-3.md, which does not exist',
    ]);
  });
});

describe("checkInFlight", () => {
  test("warns only when notes remain after every phase is done", () => {
    expect(checkInFlight("in-flight.md", "# In flight\n\nhalf-wired thing", true)).toHaveLength(1);
    expect(checkInFlight("in-flight.md", "# In flight\n", true)).toEqual([]);
    expect(checkInFlight("in-flight.md", "# In flight\n\nnotes", false)).toEqual([]);
  });
});
