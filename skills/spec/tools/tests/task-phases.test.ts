import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSpecState } from "../core/spec-state";
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
