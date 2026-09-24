import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listCommand } from "../commands/list";
import { matchesItem, matchesSpec, orderBacklog, orderSpecs } from "../portfolio/order";
import { renderPortfolio } from "../portfolio/render";
import { specRow } from "../portfolio/rows";
import { backlogItem, specMeta, specNode, specRowOf } from "./factories";

const TODAY = "2026-09-23";

describe("specRow", () => {
  test("projects a graph node into a list row", () => {
    const node = specNode({
      spec: { name: "front-doors", dir: "/repo/landing/docs/specs/front-doors" },
      phases: [{ id: "1", done: true, deployed: false }, { id: "2", done: false, deployed: false }],
      meta: specMeta({ domain: ["seo"], priority: "p1", due: "2026-09-20", updated: "2026-09-21T10:00:00-07:00" }),
    });
    expect(specRow(node, "/repo", TODAY)).toEqual({
      name: "front-doors",
      root: "landing/docs/specs",
      status: "active",
      finished: false,
      area: [],
      domain: ["seo"],
      scope: [],
      priority: "p1",
      due: "2026-09-20",
      overdue: true,
      updated: "2026-09-21",
      progress: { done: 1, total: 2 },
    });
  });
});

describe("orderSpecs", () => {
  test("open before finished, then priority, then due day, then most recently updated", () => {
    const rows = [
      specRowOf({ name: "done-p1", finished: true, status: "done", priority: "p1" }),
      specRowOf({ name: "none-recent", updated: "2026-09-22" }),
      specRowOf({ name: "p2-late", priority: "p2", due: "2026-12-01" }),
      specRowOf({ name: "p2-soon", priority: "p2", due: "2026-10-01" }),
      specRowOf({ name: "none-old", updated: "2026-01-01" }),
      specRowOf({ name: "p1", priority: "p1" }),
    ];
    expect(orderSpecs(rows).map((row) => row.name)).toEqual(["p1", "p2-soon", "p2-late", "none-recent", "none-old", "done-p1"]);
  });
});

describe("filters", () => {
  test("a spec matches a taxonomy value, a priority, or part of its name", () => {
    const row = specRowOf({ name: "competition-directory", domain: ["competitions"], priority: "p2" });
    expect(["competitions", "P2", "directory"].map((filter) => matchesSpec(row, filter))).toEqual([true, true, true]);
    expect(matchesSpec(row, "seo")).toBe(false);
  });

  test("an idea matches a tag, a priority, or words in its slug or title", () => {
    const item = backlogItem({ slug: "organizer-accounts", title: "Organizer logins", tags: ["growth"] });
    expect(["growth", "logins", "organizer"].map((filter) => matchesItem(item, filter))).toEqual([true, true, true]);
    expect(matchesItem(item, "p1")).toBe(false);
  });

  test("ideas sort by priority, then due day, then slug", () => {
    const items = [backlogItem({ slug: "b" }), backlogItem({ slug: "a" }), backlogItem({ slug: "c", due: "2026-10-01" }), backlogItem({ slug: "d", priority: "p3" })];
    expect(orderBacklog(items).map((item) => item.slug)).toEqual(["d", "c", "a", "b"]);
  });
});

describe("renderPortfolio", () => {
  test("renders open specs and ideas as tables with a summary line", () => {
    const output = renderPortfolio({
      today: TODAY,
      showFinished: false,
      hiddenFinished: 4,
      notShown: 0,
      specs: [specRowOf({ name: "front-doors", root: "landing/docs/specs", priority: "p1", due: "2026-09-20", overdue: true, progress: { done: 1, total: 2 } })],
      backlog: [backlogItem({ slug: "organizer-accounts", title: "Organizer | logins", tags: ["growth"], priority: "p2" })],
    });
    expect(output).toBe([
      "## Open specs (1)",
      "",
      "| Spec | Status | Priority | Due | Area | Domain | Updated | Progress |",
      "|------|--------|----------|-----|------|--------|---------|----------|",
      "| front-doors (landing) | active | p1 | 2026-09-20 ⚠ overdue | — | — | — | 1/2 |",
      "",
      "## Backlog (1)",
      "",
      "| Idea | Priority | Due | Tags | Title |",
      "|------|----------|-----|------|-------|",
      "| organizer-accounts | p2 | — | growth | Organizer \\| logins |",
      "",
      "**1 open spec, 1 idea. 1 overdue.** 4 finished specs hidden; `/spec list all` shows them.",
    ].join("\n"));
  });

  test("says so when nothing is left to show", () => {
    expect(renderPortfolio({ today: TODAY, showFinished: false, hiddenFinished: 0, notShown: 0, specs: [], backlog: [] })).toBe("No open specs or backlog items.");
  });

  test("points at filters when the default view is cut short", () => {
    const output = renderPortfolio({ today: TODAY, showFinished: false, hiddenFinished: 0, notShown: 12, specs: [specRowOf()], backlog: [] });
    expect(output).toEndWith("**1 open spec, 0 ideas.** 12 more open specs not shown; filter by priority, domain, area or name to see them.");
  });
});

describe("listCommand", () => {
  const project = mkdtempSync(join(tmpdir(), "spec-list-"));
  const write = (path: string, text: string) => {
    mkdirSync(join(project, path, ".."), { recursive: true });
    writeFileSync(join(project, path), text);
  };
  write("docs/specs/checkout/CLAUDE.md", "---\nstatus: active\ndomain: [billing]\npriority: p1\n---\n");
  write("docs/specs/checkout/progress.md", "## Phases\n- [x] Phase 1 — A → `phases/phase-1-a.md`\n- [ ] Phase 2 — B → `phases/phase-2-b.md`\n");
  write("docs/specs/old/CLAUDE.md", "---\nstatus: done\n---\n");
  write("docs/specs/_backlog/organizer-accounts.md", "---\ntitle: Organizer accounts\ntags: [growth]\n---\nLet organizers log in.\n");
  afterAll(() => rmSync(project, { recursive: true, force: true }));

  test("lists open specs and ideas, hiding finished specs unless asked", () => {
    const output = listCommand(project, [], TODAY);
    expect(output).toContain("| checkout | active | p1 | — | — | billing | — | 1/2 |");
    expect(output).toContain("| organizer-accounts | — | — | growth | Organizer accounts |");
    expect(output).not.toContain("| old |");
    expect(listCommand(project, ["all"], TODAY)).toContain("| old | done |");
  });

  test("shows the top 30 open specs by default, every match when filtered", () => {
    for (let index = 0; index < 31; index += 1) write(`docs/specs/bulk-${index}/CLAUDE.md`, "---\nstatus: active\ndomain: [bulk]\n---\n");
    expect(listCommand(project, [], TODAY)).toContain("2 more open specs not shown");
    expect(listCommand(project, ["bulk"], TODAY)).toContain("## Open specs (31)");
  });

  test("filters both tables and prints JSON for agents", () => {
    expect(listCommand(project, ["growth"], TODAY)).not.toContain("checkout");
    const json = JSON.parse(listCommand(project, ["billing", "--json"], TODAY));
    expect(json.specs.map((row: { name: string }) => row.name)).toEqual(["checkout"]);
    expect(json.backlog).toEqual([]);
    const [idea] = JSON.parse(listCommand(project, ["growth", "--json"], TODAY)).backlog;
    expect(idea).toMatchObject({ slug: "organizer-accounts", file: "docs/specs/_backlog/organizer-accounts.md", overdue: false });
    expect(json.today).toBe(TODAY);
  });
});
