import { describe, expect, test } from "bun:test";
import { formatPointerRow, formatProjectRow, formatSpecRow, insertRow, kindSection, parseIndexRows } from "../core/ledger-index";

const SPEC_INDEX = `# Ledger Index (layout v1)

Warm cache. See \`SKILL.md\`.

## Gotchas
- \`gotcha-a.md\` — [phase 1] — first gotcha
- \`docs/specs/_ledger/gotcha-b.md\` — [general] — a pointer row

## Domain

- \`domain-c.md\` — [phase 3, 4] — domain fact

## Workarounds
`;

const PROJECT_INDEX = `# Project Ledger Index

Lessons about the codebase. Format: \`SKILL.md\` → *Project ledger*.

- \`gotcha-x.md\` — \`ops/**\` — x bites
- \`gotcha-y.md\` — \`a/**\`, \`b/**\` — y bites
`;

describe("parseIndexRows", () => {
  test("reads spec, pointer and project rows with their section and tail", () => {
    const rows = parseIndexRows(SPEC_INDEX);
    expect(rows.map((row) => [row.section, row.file])).toEqual([
      ["Gotchas", "gotcha-a.md"],
      ["Gotchas", "docs/specs/_ledger/gotcha-b.md"],
      ["Domain", "domain-c.md"],
    ]);
    expect(rows[2]?.tail).toBe("— [phase 3, 4] — domain fact");
    expect(rows[2]?.line).toBe("- `domain-c.md` — [phase 3, 4] — domain fact");
  });

  test("rows in a file without ## sections have no section", () => {
    const rows = parseIndexRows(PROJECT_INDEX);
    expect(rows.map((row) => [row.section, row.file])).toEqual([
      [undefined, "gotcha-x.md"],
      [undefined, "gotcha-y.md"],
    ]);
    expect(rows[1]?.tail).toBe("— `a/**`, `b/**` — y bites");
  });

  test("ignores backticked mentions that are not list rows", () => {
    expect(parseIndexRows("Warm cache. See `SKILL.md`.\n")).toEqual([]);
  });
});

describe("insertRow", () => {
  test("appends after the last row of the section whose singular form matches", () => {
    const text = insertRow(SPEC_INDEX, "- `gotcha-new.md` — [phase 4] — new", "Gotcha");
    expect(text).toContain("a pointer row\n- `gotcha-new.md` — [phase 4] — new\n\n## Domain");
  });

  test("matches a singular heading from a plural section name", () => {
    const text = insertRow(SPEC_INDEX, "- `domain-d.md` — [phase 4] — d", "Domains");
    expect(text).toContain("- `domain-c.md` — [phase 3, 4] — domain fact\n- `domain-d.md` — [phase 4] — d\n");
  });

  test("puts the first row of an empty section right under its heading", () => {
    const text = insertRow(SPEC_INDEX, "- `workaround-w.md` — [general] — w", "Workarounds");
    expect(text.endsWith("## Workarounds\n- `workaround-w.md` — [general] — w\n")).toBe(true);
  });

  test("adds a missing section at the end", () => {
    const text = insertRow(SPEC_INDEX, "- `recipe-r.md` — [general] — r", "Recipes");
    expect(text.endsWith("## Workarounds\n\n## Recipes\n- `recipe-r.md` — [general] — r\n")).toBe(true);
  });

  test("appends to a file without sections when no section is given", () => {
    const text = insertRow(PROJECT_INDEX, "- `gotcha-z.md` — `z/**` — z bites");
    expect(text).toBe(`${PROJECT_INDEX}- \`gotcha-z.md\` — \`z/**\` — z bites\n`);
    expect(insertRow("# Index", "- `a.md` — a")).toBe("# Index\n- `a.md` — a\n");
  });
});

describe("row formatters round-trip through parseIndexRows", () => {
  test("spec row", () => {
    const [row] = parseIndexRows(formatSpecRow("decision-d.md", ["phase 5+", "load-bearing"], "why"));
    expect(row?.file).toBe("decision-d.md");
    expect(row?.tail).toBe("— [phase 5+, load-bearing] — why");
  });

  test("project row, with and without paths", () => {
    expect(formatProjectRow("gotcha-g.md", ["a/**", "b/*.ts"], "g")).toBe("- `gotcha-g.md` — `a/**, b/*.ts` — g");
    expect(formatProjectRow("gotcha-g.md", [], "g")).toBe("- `gotcha-g.md` — g");
    expect(parseIndexRows(formatProjectRow("gotcha-g.md", ["a/**"], "g"))[0]?.file).toBe("gotcha-g.md");
  });

  test("pointer row is a [general] spec row at the lesson's repo path", () => {
    const line = formatPointerRow("docs/specs/_ledger/gotcha-g.md", "g");
    expect(line).toBe("- `docs/specs/_ledger/gotcha-g.md` — [general] — g");
    expect(parseIndexRows(line)[0]?.file).toBe("docs/specs/_ledger/gotcha-g.md");
  });
});

describe("kindSection", () => {
  test("pluralizes a kind into its section title", () => {
    expect(kindSection("gotcha")).toBe("Gotchas");
    expect(kindSection("recipe")).toBe("Recipes");
    expect(kindSection("process")).toBe("Process");
  });
});
