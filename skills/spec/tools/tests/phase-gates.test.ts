import { afterAll, describe, expect, test } from "bun:test";
import { gateItemText, isGateItem } from "../core/gate";
import { loadSpecState } from "../core/spec-state";
import { phaseGateIssues } from "../doctor/phase-gates";
import { createTree } from "./tree";

describe("a phase's gate", () => {
  const tree = createTree("spec-gate-");
  const spec = tree.spec("checkout", {
    "progress.md": [
      "## Phases",
      "- [ ] Phase 1 — Design → `phases/phase-1-design.md`",
      "- [ ] Phase 2 — Launch → `phases/phase-2-launch.md`",
      "- [ ] Phase 3 — Build → `phases/phase-3-build.md`",
      "- [ ] Phase 4 — Odd → `phases/phase-4-odd.md`",
      "",
    ].join("\n"),
    "phases/phase-1-design.md": "---\nneeds: []\ngate: design\n---\n- [ ] Gate: design agreed with Anton\n- [ ] build\n",
    "phases/phase-2-launch.md": "---\nneeds: [1]\ngate: outward\n---\n- [ ] send the emails\n",
    "phases/phase-3-build.md": "---\nneeds: [1]\n---\n- [ ] build\n",
    "phases/phase-4-odd.md": "---\nneeds: [1]\ngate: maybe\n---\n- [ ] 4.1 Gate: someone says so\n",
  });
  afterAll(tree.cleanup);

  test("is read from frontmatter, and a phase without one has none", () => {
    expect(loadSpecState(spec).phases.map((phase) => phase.gate)).toEqual(["design", "outward", undefined, undefined]);
  });

  test("is not an edge: a gate alone doesn't make a spec use declared edges", () => {
    const solo = tree.spec("solo", {
      "progress.md": "- [ ] Phase 1 — A → `phases/phase-1-a.md`\n",
      "phases/phase-1-a.md": "---\ngate: design\n---\n- [ ] Gate: agreed\n",
    });
    expect(loadSpecState(solo).phases[0]?.edges.declared).toBe(false);
  });

  test("the doctor errors on an unknown kind and warns when a gated phase has no Gate: item", () => {
    const issues = phaseGateIssues(loadSpecState(spec)).map((issue) => `${issue.severity}: ${issue.problem}`);
    expect(issues).toEqual([
      "warning: gate: outward, but no deliverable starts \"Gate:\"; add one saying who approves (e.g. - [ ] Gate: design agreed with Anton)",
      'error: gate must be design or outward, not "maybe"',
    ]);
  });

  test("onlyPointer limits the check to one phase file", () => {
    expect(phaseGateIssues(loadSpecState(spec), "phases/phase-1-design.md")).toEqual([]);
  });
});

describe("Gate: items", () => {
  test("start with Gate:, optionally after a numbered id", () => {
    expect(isGateItem("Gate: design agreed with Anton")).toBe(true);
    expect(isGateItem("3.0 Gate: design agreed")).toBe(true);
    expect(isGateItem("`gate:` on PhaseState")).toBe(false);
    expect(isGateItem("Gateway wired")).toBe(false);
  });

  test("gateItemText reads an item line, open or ticked", () => {
    expect(gateItemText("- [ ] Gate: agreed")).toBe("Gate: agreed");
    expect(gateItemText("- [x] Gate: agreed — Anton, 2026-10-13")).toBe("Gate: agreed — Anton, 2026-10-13");
    expect(gateItemText("- [ ] build")).toBeUndefined();
  });
});
