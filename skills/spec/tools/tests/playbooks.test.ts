import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPlaybooks, parsePlaybook, playbookMatches, selectPlaybooks } from "../playbook/playbooks";

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
});
