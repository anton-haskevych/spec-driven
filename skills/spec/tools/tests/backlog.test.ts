import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadBacklog, parseBacklogItem } from "../backlog/items";
import { backlogIssues } from "../doctor/backlog";
import { checkBacklogItem } from "../doctor/backlog-item";

const ITEM = [
  "---",
  "title: Organizer accounts for the directory",
  "tags: [competitions, directory]",
  "priority: p2",
  "due: 2026-10-15",
  "created: 2026-09-23T19:00:00-07:00",
  "---",
  "Organizers log into our directory and manage their own listing.",
  "",
].join("\n");

describe("parseBacklogItem", () => {
  test("reads title, tags, schedule and body", () => {
    expect(parseBacklogItem("x/organizer-accounts.md", "organizer-accounts", ITEM)).toEqual({
      file: "x/organizer-accounts.md",
      slug: "organizer-accounts",
      title: "Organizer accounts for the directory",
      body: "Organizers log into our directory and manage their own listing.",
      tags: ["competitions", "directory"],
      priority: "p2",
      due: "2026-10-15",
      created: "2026-09-23T19:00:00-07:00",
      resolution: undefined,
    });
  });

  test("skips a file without a title", () => {
    expect(parseBacklogItem("x.md", "x", "---\ntags: [a]\n---\nbody")).toBeUndefined();
  });
});

describe("checkBacklogItem", () => {
  const problems = (text: string, closed = false) => checkBacklogItem("i.md", text, closed).map((i) => `${i.severity}: ${i.problem}`);

  test("a well-formed open item is clean", () => {
    expect(problems(ITEM)).toEqual([]);
  });

  test("requires frontmatter with a title, and a valid schedule", () => {
    expect(problems("just text")).toEqual(["error: backlog item has no frontmatter (needs at least title)"]);
    expect(problems("---\npriority: urgent\n---\n")).toEqual([
      "error: frontmatter has no title",
      'error: priority "urgent" is not one of p1, p2, p3',
    ]);
  });

  test("a closed item needs a resolution, an open one should not have one", () => {
    expect(problems(ITEM, true)).toEqual(["error: closed item has no resolution; say how it ended"]);
    expect(problems(ITEM.replace("---\nOrg", "resolution: dropped\n---\nOrg"))).toEqual([
      "warning: has a resolution but sits with open items; move it to _backlog/_closed/",
    ]);
  });

  test("warns when the description outgrows an idea", () => {
    const long = ITEM.replace("Organizers log", `${"word ".repeat(130)}Organizers log`);
    expect(problems(long)).toEqual(["warning: description is 140 words; keep an idea under 120, or prep a spec"]);
  });
});

describe("loading the backlog from disk", () => {
  const projectDir = mkdtempSync(join(tmpdir(), "spec-backlog-"));
  const dir = join(projectDir, "docs", "specs", "_backlog");
  mkdirSync(join(dir, "_closed"), { recursive: true });
  writeFileSync(join(dir, "organizer-accounts.md"), ITEM);
  writeFileSync(join(dir, "broken.md"), "no frontmatter");
  writeFileSync(join(dir, "_closed", "old-idea.md"), ITEM);

  test("loadBacklog returns open items only", () => {
    expect(loadBacklog(projectDir).map((item) => item.slug)).toEqual(["organizer-accounts"]);
  });

  test("backlogIssues checks open and closed items", () => {
    const found = backlogIssues(projectDir).map((issue) => issue.file.replace(`${dir}/`, ""));
    expect(found).toEqual(["broken.md", "_closed/old-idea.md"]);
  });
});
