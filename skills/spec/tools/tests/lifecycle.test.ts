import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { portfolioTable } from "../commands/list";
import { readLifecycleFields, readSpecMeta } from "../core/spec-meta";
import { checkSpecMeta } from "../doctor/spec-meta";
import { linkIssues } from "../graph/checks";
import { lifecycleIssues, supersededBy } from "../graph/lifecycle";
import type { SpecNode } from "../graph/nodes";
import { hookResponse } from "../hooks/spec-file-check";
import { matchesSpec } from "../portfolio/order";
import { renderPortfolio } from "../portfolio/render";
import { specRow } from "../portfolio/rows";
import { specMeta, specNode, specRowOf } from "./factories";

const TODAY = "2026-10-16";
const node = (name: string, overrides: Partial<SpecNode> = {}) => specNode({ spec: { name, dir: `/repo/docs/specs/${name}` }, ...overrides });
const graph = (...nodes: SpecNode[]) => new Map(nodes.map((each) => [each.spec.name, each]));
const problems = (nodes: ReadonlyMap<string, SpecNode>, name: string) => {
  const target = nodes.get(name);
  return target ? lifecycleIssues(nodes, target, "CLAUDE.md").map((issue) => `${issue.severity}: ${issue.problem}`) : [];
};

describe("readLifecycleFields", () => {
  test("reads stale and dropped as one line each", () => {
    expect(readLifecycleFields({ stale: " phase 3 predates the move ", dropped: "no studio asked" })).toEqual({ stale: "phase 3 predates the move", dropped: "no studio asked", problems: [] });
    expect(readSpecMeta({ stale: "x" }).stale).toBe("x");
  });

  test("a list, a number, an empty value or several lines is a problem and no note", () => {
    const fields = readLifecycleFields({ stale: ["a", "b"], dropped: "first\nsecond" });
    expect(fields.stale).toBeUndefined();
    expect(fields.dropped).toBeUndefined();
    expect(fields.problems).toEqual(['stale must be one line of text, not ["a","b"]', 'dropped must be one line of text, not "first\\nsecond"']);
    expect(readLifecycleFields({ stale: 3 }).problems).toHaveLength(1);
    expect(readLifecycleFields({ dropped: "" }).problems).toHaveLength(1);
  });

  test("checkSpecMeta reports them as errors", () => {
    const text = "---\nstatus: active\ncreated: a\nupdated: b\nstale: [a]\n---\n";
    expect(checkSpecMeta("CLAUDE.md", text, []).map((issue) => `${issue.severity}: ${issue.problem}`)).toEqual(['error: stale must be one line of text, not ["a"]']);
  });
});

describe("supersededBy", () => {
  test("lists the specs that supersede this one, whole or by phase", () => {
    const nodes = graph(
      node("old"),
      node("whole", { relations: [{ type: "supersedes", target: "old" }] }),
      node("partial", { relations: [{ type: "supersedes", target: "old", phases: "2" }] }),
      node("other", { relations: [{ type: "related", target: "old" }] }),
    );
    expect(supersededBy(nodes, "old")).toEqual(["partial", "whole"]);
    expect(supersededBy(nodes, "whole")).toEqual([]);
  });
});

describe("lifecycle warnings", () => {
  test("an abandoned spec with neither dropped: nor a superseding spec", () => {
    const nodes = graph(node("old", { status: "abandoned" }));
    expect(problems(nodes, "old")).toEqual(['warning: abandoned with no reason: add dropped: "<why>", or supersedes: [old] on the spec that took the work']);
  });

  test("an abandoned spec that says why, or that another spec supersedes, is fine", () => {
    expect(problems(graph(node("old", { status: "abandoned", meta: specMeta({ dropped: "no studio asked" }) })), "old")).toEqual([]);
    expect(problems(graph(node("old", { status: "abandoned" }), node("new", { relations: [{ type: "supersedes", target: "old", phases: "1" }] })), "old")).toEqual([]);
  });

  test("dropped: on a spec that isn't abandoned", () => {
    expect(problems(graph(node("live", { status: "active", meta: specMeta({ dropped: "x" }) })), "live")).toEqual([
      "warning: dropped: is only for an abandoned spec (status is active); remove it or set status: abandoned",
    ]);
  });

  test("stale: on a finished spec, by status or by every phase ticked", () => {
    const warning = "warning: stale: on a finished spec; remove it (stale marks open work whose text drifted)";
    expect(problems(graph(node("a", { status: "done", meta: specMeta({ stale: "x" }) })), "a")).toEqual([warning]);
    expect(problems(graph(node("b", { phases: [{ id: "1", done: true, deployed: false }], meta: specMeta({ stale: "x" }) })), "b")).toEqual([warning]);
    expect(problems(graph(node("c", { phases: [{ id: "1", done: false, deployed: false }], meta: specMeta({ stale: "x" }) })), "c")).toEqual([]);
  });

  test("the doctor's link checks include them", () => {
    const nodes = graph(node("old", { status: "abandoned" }));
    expect(linkIssues(nodes, "old", "CLAUDE.md").map((issue) => issue.problem)).toContainEqual(expect.stringContaining("abandoned with no reason"));
  });
});

describe("lifecycle in the list table", () => {
  test("specRow carries stale, dropped and supersededBy", () => {
    const row = specRow(node("old", { status: "abandoned", meta: specMeta({ dropped: "why" }) }), "/repo", TODAY, ["new"]);
    expect(row).toMatchObject({ dropped: "why", supersededBy: ["new"] });
    expect(specRow(node("live", { meta: specMeta({ stale: "drifted" }) }), "/repo", TODAY)).toMatchObject({ stale: "drifted" });
    expect(specRow(node("plain"), "/repo", TODAY)).not.toContainKeys(["stale", "dropped", "supersededBy"]);
  });

  test("the stale token keeps only specs carrying stale:, even one whose name contains it", () => {
    expect(matchesSpec(specRowOf({ stale: "drifted" }), "stale")).toBe(true);
    expect(matchesSpec(specRowOf({ name: "stale-claims" }), "stale")).toBe(false);
  });

  test("a finished status matches the status only, never a name", () => {
    expect(matchesSpec(specRowOf({ status: "abandoned", finished: true }), "abandoned")).toBe(true);
    expect(matchesSpec(specRowOf({ name: "abandoned-booking-release" }), "abandoned")).toBe(false);
  });

  test("the status cell marks stale specs and says how abandoned ones ended", () => {
    const output = renderPortfolio({
      today: TODAY,
      showFinished: true,
      hiddenFinished: 0,
      notShown: 0,
      specs: [
        specRowOf({ name: "live", stale: "phase 3 predates the move" }),
        specRowOf({ name: "taken", status: "abandoned", finished: true, supersededBy: ["new", "newer"], dropped: "ignored" }),
        specRowOf({ name: "dead", status: "abandoned", finished: true, dropped: "no studio asked" }),
        specRowOf({ name: "silent", status: "abandoned", finished: true }),
      ],
      backlog: [],
    });
    expect(output).toContain("| live | active ⚠ stale: phase 3 predates the move |");
    expect(output).toContain("| taken | abandoned, superseded by new, newer |");
    expect(output).toContain("| dead | abandoned, dropped: no studio asked |");
    expect(output).toContain("| silent | abandoned |");
    expect(output).toContain("1 stale.");
  });
});

describe("portfolioTable lifecycle filters", () => {
  const project = mkdtempSync(join(tmpdir(), "spec-lifecycle-"));
  const write = (path: string, text: string) => {
    mkdirSync(join(project, path, ".."), { recursive: true });
    writeFileSync(join(project, path), text);
  };
  write("docs/specs/live/CLAUDE.md", "---\nstatus: active\nstale: phase 2 predates the move\n---\n");
  write("docs/specs/fresh/CLAUDE.md", "---\nstatus: active\n---\n");
  write("docs/specs/taken/CLAUDE.md", "---\nstatus: abandoned\n---\n");
  write("docs/specs/heir/CLAUDE.md", "---\nstatus: active\nsupersedes: [taken#1]\n---\n");
  write("docs/specs/dead/CLAUDE.md", "---\nstatus: abandoned\ndropped: no studio asked\n---\n");
  write("docs/specs/_backlog/stale-ideas.md", "---\ntitle: Stale ideas\n---\nBody.\n");
  afterAll(() => rmSync(project, { recursive: true, force: true }));

  test("list stale keeps stale specs only, and no backlog ideas", () => {
    const output = portfolioTable(project, ["stale"], TODAY);
    expect(output).toContain("| live | active ⚠ stale: phase 2 predates the move |");
    expect(output).not.toContain("fresh");
    expect(output).not.toContain("stale-ideas");
  });

  test("list abandoned shows abandoned specs without all, with how each ended", () => {
    const output = portfolioTable(project, ["abandoned"], TODAY);
    expect(output).toContain("| taken | abandoned, superseded by heir |");
    expect(output).toContain("| dead | abandoned, dropped: no studio asked |");
    expect(output).not.toContain("| live |");
  });

  test("--json carries stale, dropped and supersededBy per spec", () => {
    const specs: Array<{ name: string }> = JSON.parse(portfolioTable(project, ["all", "--json"], TODAY)).specs;
    const byName = new Map(specs.map((row) => [row.name, row]));
    expect(byName.get("live")).toMatchObject({ stale: "phase 2 predates the move" });
    expect(byName.get("taken")).toMatchObject({ supersededBy: ["heir"] });
    expect(byName.get("dead")).toMatchObject({ dropped: "no studio asked" });
  });
});

describe("spec-file hook", () => {
  test("blocks a CLAUDE.md whose stale: is not one line of text", () => {
    const project = mkdtempSync(join(tmpdir(), "spec-lifecycle-hook-"));
    const file = join(project, "docs", "specs", "live", "CLAUDE.md");
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, "---\nstatus: active\ncreated: a\nupdated: b\nstale:\n  - a\n  - b\n---\n");
    const response = hookResponse({ tool_name: "Write", tool_input: { file_path: file }, cwd: project }, project);
    rmSync(project, { recursive: true, force: true });
    expect(response).toContain("stale must be one line of text");
  });
});
