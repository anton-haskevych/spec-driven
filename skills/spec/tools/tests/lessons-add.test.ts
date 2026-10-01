import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyEdits } from "../core/apply-edits";
import { parseIndexRows } from "../core/ledger-index";
import { isoTimestamp } from "../core/schedule";
import type { SpecFolder } from "../core/spec-folders";
import { projectLedgerIssues } from "../doctor/project-ledger";
import { lessonsCommand } from "../commands/lessons";
import { planLessonAdd } from "../lessons/add";
import { createTree, type Tree } from "./tree";

const NOW = new Date(2026, 8, 30, 18, 5, 0);
const SPEC_INDEX = "# Ledger Index (layout v1)\n\n## Gotchas\n- `gotcha-local.md` — [phase 1] — local\n\n## Decisions\n";
const LOCAL_ENTRY = "---\nkind: gotcha\napplies-to: [phase 1]\ncreated: 2026-09-01T00:00:00-07:00\n---\n# Local\n";
const NEW_LESSON = "---\nkind: gotcha\npaths: [src/**]\n---\n\n# Retries double-charge cards\n\nUse the idempotency key.\n";

let tree: Tree;
let spec: SpecFolder;
afterEach(() => tree.cleanup());

function setup(projectIndex: string | null = "# Project Ledger Index\n\n- `gotcha-old.md` — `x/**` — old\n"): void {
  tree = createTree();
  spec = tree.spec("alpha", { "ledger/INDEX.md": SPEC_INDEX, "ledger/gotcha-local.md": LOCAL_ENTRY });
  tree.write("docs/specs/_ledger/gotcha-old.md", "---\nkind: gotcha\npaths: [x/**]\nseen-in: [beta]\n---\n# Old\n");
  if (projectIndex !== null) tree.write("docs/specs/_ledger/INDEX.md", projectIndex);
  tree.write("docs/specs/_ledger/gotcha-retries-double-charge.md", NEW_LESSON);
}

const ledgerFile = (name: string) => join(tree.root, "docs/specs/_ledger", name);
const read = (path: string) => readFileSync(path, "utf8");

describe("planLessonAdd", () => {
  test("stamps created and seen-in, adds the project row and the spec pointer row in one plan", () => {
    setup();
    const result = planLessonAdd(tree.root, spec, { entry: "gotcha-retries-double-charge.md", now: NOW });
    if (result.plan.kind !== "ok") throw new Error(result.plan.reason);
    expect(result.plan.edits).toHaveLength(3);
    expect(result.changes).toEqual(["created", "seen-in", "project INDEX row", "alpha pointer row"]);
    applyEdits(result.plan);

    const entry = read(ledgerFile("gotcha-retries-double-charge.md"));
    expect(entry).toContain(`created: ${isoTimestamp(NOW)}\nseen-in: [alpha]\n---`);
    expect(read(ledgerFile("INDEX.md")).endsWith("- `gotcha-retries-double-charge.md` — `src/**` — Retries double-charge cards\n")).toBe(true);
    const pointer = parseIndexRows(read(join(spec.dir, "ledger/INDEX.md"))).find((row) => row.file.endsWith("double-charge.md"));
    expect(pointer).toEqual({
      section: "Gotchas",
      file: "docs/specs/_ledger/gotcha-retries-double-charge.md",
      tail: "— [general] — Retries double-charge cards",
      line: "- `docs/specs/_ledger/gotcha-retries-double-charge.md` — [general] — Retries double-charge cards",
    });
    expect(projectLedgerIssues(tree.root)).toEqual([]);
  });

  test("a second run changes nothing", () => {
    setup();
    const first = planLessonAdd(tree.root, spec, { entry: "gotcha-retries-double-charge", now: NOW });
    if (first.plan.kind === "ok") applyEdits(first.plan);
    const again = planLessonAdd(tree.root, spec, { entry: "gotcha-retries-double-charge", now: new Date() });
    expect(again.plan).toEqual({ kind: "unchanged", reason: "gotcha-retries-double-charge.md is already recorded for alpha" });
  });

  test("keeps an existing created and appends to seen-in", () => {
    setup();
    tree.write("docs/specs/_ledger/gotcha-retries-double-charge.md", NEW_LESSON.replace("paths:", "created: 2026-01-01T00:00:00-08:00\nseen-in: [beta]\npaths:"));
    const result = planLessonAdd(tree.root, spec, { entry: "gotcha-retries-double-charge.md", now: NOW });
    if (result.plan.kind !== "ok") throw new Error(result.plan.reason);
    expect(result.changes[0]).toBe("seen-in");
    expect(result.plan.edits[0]?.text).toContain("created: 2026-01-01T00:00:00-08:00\nseen-in: [beta, alpha]\n");
  });

  test("a title over 80 characters needs --summary", () => {
    setup();
    const longTitle = `# ${"Very long lesson title ".repeat(5)}`;
    tree.write("docs/specs/_ledger/gotcha-retries-double-charge.md", NEW_LESSON.replace("# Retries double-charge cards", longTitle));
    const refused = planLessonAdd(tree.root, spec, { entry: "gotcha-retries-double-charge.md", now: NOW });
    expect(refused.plan).toEqual({ kind: "invalid", reason: 'the title is 114 characters; pass --summary "<under 80 characters>"' });
    const summarized = planLessonAdd(tree.root, spec, { entry: "gotcha-retries-double-charge.md", now: NOW, summary: "short" });
    expect(summarized.plan.kind === "ok" && summarized.plan.edits[1]?.text.endsWith("— `src/**` — short\n")).toBe(true);
  });

  test("a free-form kind gets its own section; a missing project INDEX is created", () => {
    setup(null);
    tree.write("docs/specs/_ledger/gotcha-retries-double-charge.md", NEW_LESSON.replace("kind: gotcha", "kind: recipe"));
    const result = planLessonAdd(tree.root, spec, { entry: "gotcha-retries-double-charge.md", now: NOW });
    if (result.plan.kind !== "ok") throw new Error(result.plan.reason);
    const [, projectIndex, specIndex] = result.plan.edits.map((edit) => edit.text);
    expect(projectIndex).toBe("# Project Ledger Index\n- `gotcha-retries-double-charge.md` — `src/**` — Retries double-charge cards\n");
    expect(specIndex?.endsWith("## Decisions\n\n## Recipes\n- `docs/specs/_ledger/gotcha-retries-double-charge.md` — [general] — Retries double-charge cards\n")).toBe(true);
  });

  test("refuses an entry that is not written yet, or a spec without a ledger INDEX", () => {
    setup();
    expect(planLessonAdd(tree.root, spec, { entry: "gotcha-nope.md", now: NOW }).plan).toEqual({
      kind: "invalid",
      reason: "no lesson at docs/specs/_ledger/gotcha-nope.md; write it with the Write tool first",
    });
    const bare = tree.spec("bare", {});
    expect(planLessonAdd(tree.root, bare, { entry: "gotcha-retries-double-charge.md", now: NOW }).plan).toEqual({
      kind: "invalid",
      reason: "bare has no ledger/INDEX.md",
    });
  });
});

describe("lessonsCommand add", () => {
  test("records the lesson and warns about close matches without refusing", () => {
    setup();
    tree.write("docs/specs/_ledger/gotcha-retries-charge-twice.md", "---\nkind: gotcha\npaths: [src/**]\nseen-in: [beta]\n---\n# Card retries charge twice\n");
    const out = lessonsCommand(tree.root, ["add", "gotcha-retries-double-charge.md", "alpha"]);
    expect(out).toContain("gotcha-retries-charge-twice.md");
    expect(out).toContain("lessons seen");
    expect(out).toContain("gotcha-retries-double-charge.md recorded for alpha: created, seen-in, project INDEX row, alpha pointer row");
    expect(out).not.toContain("(`gotcha-retries-double-charge.md`");
    expect(read(ledgerFile("gotcha-retries-double-charge.md"))).toContain("seen-in: [alpha]");
  });

  test("passes --summary through and reports refusals", () => {
    setup();
    expect(lessonsCommand(tree.root, ["add", "gotcha-retries-double-charge", "alpha", "--summary", "retries"])).toContain("recorded for alpha");
    expect(read(ledgerFile("INDEX.md"))).toContain("— `src/**` — retries\n");
    expect(lessonsCommand(tree.root, ["add", "gotcha-nope", "alpha"])).toBe("lessons add: no lesson at docs/specs/_ledger/gotcha-nope.md; write it with the Write tool first");
    expect(lessonsCommand(tree.root, ["add", "gotcha-retries-double-charge", "zeta"])).toBe("lessons add: no spec named zeta");
    expect(lessonsCommand(tree.root, ["add", "only-one-arg"])).toStartWith("usage: lessons");
  });
});
