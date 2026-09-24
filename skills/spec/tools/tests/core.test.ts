import { describe, expect, test } from "bun:test";
import { parseFrontmatter, stringList } from "../core/frontmatter";
import { countCheckboxes, parsePhaseLines } from "../core/progress";
import { locateSpecFile } from "../core/spec-folders";
import { statusValues } from "../core/taxonomy";
import { phaseLine } from "./factories";

describe("parseFrontmatter", () => {
  test("reads the block between the fences", () => {
    const result = parseFrontmatter("---\nstatus: active\napplies-to: [general]\n---\n# Body");
    expect(result).toEqual({ kind: "ok", data: { status: "active", "applies-to": ["general"] }, body: "# Body" });
  });

  test("reports a missing closing fence and a non-map block", () => {
    expect(parseFrontmatter("---\nstatus: active\n").kind).toBe("invalid");
    expect(parseFrontmatter("---\n- a\n- b\n---\n").kind).toBe("invalid");
  });

  test("stringList reads a list or a lone string, dropping blanks and non-strings", () => {
    expect(stringList({ tags: [" a ", "", 3, "b"] }, "tags")).toEqual(["a", "b"]);
    expect(stringList({ tags: "solo" }, "tags")).toEqual(["solo"]);
    expect(stringList({}, "tags")).toEqual([]);
  });

  test("returns none when the file has no frontmatter", () => {
    expect(parseFrontmatter("# Just a doc").kind).toBe("none");
  });
});

describe("parsePhaseLines", () => {
  test("reads top-level phase lines with a phases/ pointer, ignoring code blocks and nested items", () => {
    const progress = [
      "## Phases",
      "- [x] Phase 1 — Schema → `phases/phase-1-schema.md`",
      "- [ ] Phase 2 — CSV → `phases/phase-2-csv/plan.md`",
      "  - [ ] nested note `phases/phase-9-x.md`",
      "- [ ] a task without a pointer",
      "```",
      "- [ ] Phase 7 — in a fence → `phases/phase-7.md`",
      "```",
    ].join("\n");
    expect(parsePhaseLines(progress)).toEqual([
      phaseLine({ done: true, title: "Phase 1 — Schema → phases/phase-1-schema.md", pointer: "phases/phase-1-schema.md" }),
      phaseLine({ title: "Phase 2 — CSV → phases/phase-2-csv/plan.md", pointer: "phases/phase-2-csv/plan.md" }),
    ]);
  });
});

describe("countCheckboxes", () => {
  test("counts nested and upper-case ticks, but not boxes inside code fences", () => {
    const entry = "- [x] a\n  - [X] b\n- [ ] c\n```\n- [ ] fenced\n```";
    expect(countCheckboxes(entry)).toEqual({ checked: 2, unchecked: 1 });
  });
});

describe("statusValues", () => {
  test("reads a table-style project taxonomy", () => {
    const md = "## status (enum)\n\n| Value | Meaning |\n|---|---|\n| `active` | WIP |\n| `done` | Done |\n\n## area\n| `backend` | x |";
    expect(statusValues(md)).toEqual(["active", "done"]);
  });

  test("reads a bullet-style taxonomy and skips file names in descriptions", () => {
    const md = "## status (single value)\n\n- `prep` — folder + `product-brief.md` + `research/`\n- `draft` — written\n";
    expect(statusValues(md)).toEqual(["prep", "draft"]);
  });
});

describe("locateSpecFile", () => {
  test("finds the spec for files under either spec root, but not reserved folders", () => {
    expect(locateSpecFile("/repo/landing/docs/specs/share/ledger/decision-a.md")).toEqual({
      spec: { name: "share", dir: "/repo/landing/docs/specs/share" },
      pathInSpec: "ledger/decision-a.md",
    });
    expect(locateSpecFile("/repo/docs/specs/_ledger/gotcha-a.md")).toBeUndefined();
    expect(locateSpecFile("/repo/src/app.ts")).toBeUndefined();
  });
});
