import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gatesReport } from "../commands/gates";
import { gateIssues } from "../doctor/gates";
import { parseGates, referencedGates } from "../playbook/gates";

const GATES = "# Gates\n\n## landing\n- [ ] unit tests in both time zones\n- [ ] landing build (CI does not run it)\n\n## backend\n- [ ] ./gradlew check\n";

describe("parseGates and referencedGates", () => {
  test("reads one check list per heading and gate references from pr-opening", () => {
    expect(parseGates(GATES)).toEqual(
      new Map([
        ["landing", ["unit tests in both time zones", "landing build (CI does not run it)"]],
        ["backend", ["./gradlew check"]],
      ]),
    );
    expect(referencedGates("## Pre-PR checks\n- [ ] gate: landing, Backend\n- [ ] manual smoke on staging\n")).toEqual(["landing", "backend"]);
  });
});

describe("gateIssues", () => {
  test("flags unknown gates and a missing gates file", () => {
    const gates = parseGates(GATES);
    expect(gateIssues("pr.md", "- [ ] gate: ops", gates)[0]?.problem).toBe("gate: ops is not defined in docs/specs/_playbook/gates.md");
    expect(gateIssues("pr.md", "- [ ] gate: landing", undefined)).toHaveLength(1);
    expect(gateIssues("pr.md", "- [ ] tests pass", undefined)).toEqual([]);
  });
});

describe("gatesReport", () => {
  let project = "";
  beforeAll(() => {
    project = mkdtempSync(join(tmpdir(), "spec-gates-"));
    mkdirSync(join(project, "docs", "specs", "_playbook"), { recursive: true });
    mkdirSync(join(project, "docs", "specs", "share"), { recursive: true });
    writeFileSync(join(project, "docs", "specs", "_playbook", "gates.md"), GATES);
    writeFileSync(join(project, "docs", "specs", "share", "CLAUDE.md"), "---\nstatus: active\n---\n");
    writeFileSync(join(project, "docs", "specs", "share", "pr-opening.md"), "- [ ] gate: landing\n");
  });
  afterAll(() => rmSync(project, { recursive: true, force: true }));

  test("expands the gates a spec references into its checks", () => {
    expect(gatesReport(project, "share")).toBe(
      "## gate: landing\n- [ ] unit tests in both time zones\n- [ ] landing build (CI does not run it)",
    );
  });
});
