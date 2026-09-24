import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { playbooksReport } from "../commands/playbooks";
import { checkPlaybook, phasePlaybookIssues } from "../doctor/playbooks";
import { loadPlaybooks, parsePlaybook, playbookMatches, selectPlaybooks } from "../playbook/playbooks";
import { phaseState } from "./factories";

const GROWTH = "---\nmatch: { domain: [growth, seo] }\n---\n# Growth\nDone means published.\n";

describe("parsePlaybook", () => {
  test("reads the match block and the body", () => {
    expect(parsePlaybook("g.md", "growth", GROWTH)).toEqual({
      name: "growth",
      file: "g.md",
      match: { domain: ["growth", "seo"] },
      body: "# Growth\nDone means published.",
    });
  });

  test("ignores files without a match block, like gates.md and archetypes.md", () => {
    expect(parsePlaybook("gates.md", "gates", "# Gates\n## landing\n- [ ] build\n")).toBeUndefined();
    expect(parsePlaybook("x.md", "x", "---\ntitle: x\n---\nbody")).toBeUndefined();
  });

  test("accepts a single value instead of a list", () => {
    expect(parsePlaybook("g.md", "growth", "---\nmatch: { domain: growth }\n---\n")?.match).toEqual({ domain: ["growth"] });
  });
});

describe("playbookMatches", () => {
  const playbook = (match: Record<string, string[]>) => ({ name: "p", file: "p.md", match, body: "" });

  test("any listed value in a field matches, case-insensitively", () => {
    expect(playbookMatches(playbook({ domain: ["growth", "seo"] }), { domain: ["SEO", "platform"] })).toBe(true);
    expect(playbookMatches(playbook({ domain: ["growth"] }), { domain: "growth" })).toBe(true);
    expect(playbookMatches(playbook({ domain: ["growth"] }), { domain: ["platform"] })).toBe(false);
  });

  test("every field in the match block must hit", () => {
    const both = playbook({ domain: ["growth"], area: ["landing"] });
    expect(playbookMatches(both, { domain: ["growth"], area: ["landing", "db"] })).toBe(true);
    expect(playbookMatches(both, { domain: ["growth"], area: ["backend"] })).toBe(false);
  });

  test("an empty match block matches nothing", () => {
    expect(playbookMatches(playbook({}), { domain: ["growth"] })).toBe(false);
  });
});

describe("selectPlaybooks", () => {
  const growth = { name: "growth", file: "g.md", match: { domain: ["growth"] }, body: "" };
  const video = { name: "video", file: "v.md", match: { tags: ["video"] }, body: "" };

  test("takes the spec's matches plus a playbook a phase names, once each", () => {
    expect(selectPlaybooks([growth, video], { domain: ["growth"] }).map((p) => p.name)).toEqual(["growth"]);
    expect(selectPlaybooks([growth, video], { domain: ["growth"] }, "video").map((p) => p.name)).toEqual(["growth", "video"]);
    expect(selectPlaybooks([growth, video], { domain: ["growth"] }, "growth").map((p) => p.name)).toEqual(["growth"]);
  });
});

describe("loadPlaybooks", () => {
  const project = mkdtempSync(join(tmpdir(), "spec-playbooks-"));
  const dir = join(project, "docs", "specs", "_playbook");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "growth.md"), GROWTH);
  writeFileSync(join(dir, "gates.md"), "# Gates\n## landing\n- [ ] build\n");
  afterAll(() => rmSync(project, { recursive: true, force: true }));

  test("loads only the files that declare match", () => {
    expect(loadPlaybooks(project).map((playbook) => playbook.name)).toEqual(["growth"]);
  });

  test("playbooksReport prints the playbooks a spec gets, for modes without a pack", () => {
    mkdirSync(join(project, "docs", "specs", "ballroom"), { recursive: true });
    writeFileSync(join(project, "docs", "specs", "ballroom", "CLAUDE.md"), "---\nstatus: active\ndomain: [growth]\n---\n");
    expect(playbooksReport(project, "ballroom")).toBe("### Playbooks (docs/specs/_playbook)\n#### growth\n# Growth\nDone means published.");
    expect(playbooksReport(project, "missing")).toBe("playbooks: no spec named missing");
    writeFileSync(join(project, "docs", "specs", "ballroom", "CLAUDE.md"), "---\nstatus: active\n---\n");
    expect(playbooksReport(project, "ballroom")).toBe("No playbook applies to ballroom.");
  });
});

describe("checkPlaybook", () => {
  const taxonomy = (field: string) => (field === "domain" ? ["growth", "seo"] : []);
  const problems = (text: string) => checkPlaybook("p.md", text, taxonomy).map((issue) => `${issue.severity}: ${issue.problem}`);

  test("a playbook with known values and a short body is clean; non-playbooks are skipped", () => {
    expect(problems(GROWTH)).toEqual([]);
    expect(problems("# Gates\n## landing\n- [ ] build\n")).toEqual([]);
  });

  test("rejects a match that is not a field map, and warns on one that matches nothing", () => {
    expect(problems("---\nmatch: growth\n---\n")).toEqual(["error: match must map taxonomy fields to values, e.g. match: { domain: [growth] }"]);
    expect(problems("---\nmatch: {}\n---\n")).toEqual(["warning: match is empty, so this playbook applies to no spec"]);
  });

  test("warns about values the project taxonomy doesn't have, and skips fields it doesn't define", () => {
    expect(problems("---\nmatch: { domain: [grwoth], tags: [video] }\n---\n")).toEqual([
      'warning: match domain: "grwoth" is not a domain value in .claude/taxonomy.md',
    ]);
  });

  test("warns when the playbook outgrows what the pack should carry", () => {
    const long = `---\nmatch: { domain: [growth] }\n---\n${"line\n".repeat(61)}`;
    expect(problems(long)).toEqual(["warning: playbook is 61 lines; keep it under 60 and move depth into the skill it points to"]);
  });
});

describe("phasePlaybookIssues", () => {
  test("flags a phase that names a playbook the project doesn't have", () => {
    const state = {
      spec: { name: "ballroom", dir: "/specs/ballroom" },
      hasProgress: true,
      phases: [phaseState({ pointer: "phases/p1.md", playbook: "growth" }), phaseState({ pointer: "phases/p2.md", playbook: "video" })],
    };
    expect(phasePlaybookIssues(state, new Set(["growth"])).map((issue) => `${issue.file}: ${issue.problem}`)).toEqual([
      "/specs/ballroom/phases/p2.md: playbook: video is not in docs/specs/_playbook/ (known: growth)",
    ]);
  });
});
