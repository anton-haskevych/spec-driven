import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSpecState } from "../core/spec-state";
import { taskPhaseIssues } from "../doctor/task-phases";
import { renderPrGroups } from "../ready/render";
import { phaseEdges, phaseState } from "./factories";

describe("a phase's code flag", () => {
  const dir = mkdtempSync(join(tmpdir(), "spec-task-"));
  const write = (path: string, text: string) => {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  write("progress.md", "## Phases\n- [ ] Phase 1 — Page → `phases/phase-1-page.md`\n- [ ] Phase 2 — Record → `phases/phase-2-record.md`\n");
  write("phases/phase-1-page.md", "---\nneeds: []\n---\n- [ ] build\n");
  write("phases/phase-2-record.md", "---\nneeds: []\ncode: false\n---\n- [ ] record\n");
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test("defaults to code and reads code: false as a task phase", () => {
    const phases = loadSpecState({ name: "ballroom", dir }).phases;
    expect(phases.map((phase) => phase.code)).toEqual([true, false]);
  });
});

describe("renderPrGroups", () => {
  test("leaves task phases out of the PR split and names them separately", () => {
    const state = {
      spec: { name: "ballroom", dir: "/specs/ballroom" },
      hasProgress: true,
      phases: [
        phaseState({ id: "1", edges: phaseEdges({ pr: "A" }) }),
        phaseState({ id: "2", code: false }),
        phaseState({ id: "3", done: true, code: false }),
      ],
    };
    expect(renderPrGroups(state)).toBe("PR A: phases 1\nTask phases (no PR): 2, 3 ✓");
  });
});

describe("taskPhaseIssues", () => {
  const spec = { name: "ballroom", dir: "/specs/ballroom" };
  const check = (phase: Parameters<typeof phaseState>[0]) =>
    taskPhaseIssues({ spec, hasProgress: true, phases: [phaseState({ pointer: "phases/p.md", ...phase })] }).map(
      (issue) => `${issue.severity}: ${issue.problem}`,
    );

  test("a task phase with evidence on every ticked item is clean", () => {
    const entry = [
      "---",
      "code: false",
      "---",
      "- [x] Record the interview — 2026-09-24, Drive/Recordings/ballroom.mp4",
      "- [x] Publish the page — [live](https://crm.dance/ballroom)",
      "- [x] Post in the group — `channels/facebook.md`",
      "- [ ] Answer the Reddit threads",
    ].join("\n");
    expect(check({ code: false, name: "Publish and distribute", entry })).toEqual([]);
  });

  test("warns about a ticked task item with nothing to show for it", () => {
    const entry = "---\ncode: false\n---\n- [x] Record the interview\n";
    expect(check({ code: false, name: "Record", entry })).toEqual([
      'warning: ticked "Record the interview" without evidence; add a link, date or file after it',
    ]);
  });

  test("warns when a task phase is really verification or a PR step", () => {
    for (const name of ["Manual QA", "Verification", "Open PR", "Smoke testing"]) {
      expect(check({ code: false, name, entry: "---\ncode: false\n---\n" })).toEqual([
        `warning: task phase "${name}" looks like checking our own work; that belongs in pr-opening.md, not a phase`,
      ]);
    }
  });

  test("warns about a pr group on a task phase, and rejects a code value that is not true or false", () => {
    expect(check({ code: false, name: "Record", edges: phaseEdges({ pr: "A" }), entry: "---\ncode: false\npr: A\n---\n" })).toEqual([
      "warning: task phase has pr: A, but task phases open no PR; drop the field",
    ]);
    expect(check({ name: "Build", entry: "---\ncode: no\n---\n" })).toEqual(['error: code must be true or false, not "no"']);
  });

  test("ignores code phases", () => {
    expect(check({ name: "Manual QA", entry: "- [x] untested claim\n" })).toEqual([]);
  });
});
