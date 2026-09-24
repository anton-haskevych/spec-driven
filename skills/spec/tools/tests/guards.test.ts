import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lessonsCommand } from "../commands/lessons";
import { projectLedgerIssues } from "../doctor/project-ledger";
import { checkEnforcedBy } from "../doctor/project-lesson";
import { graduationCandidates } from "../lessons/graduation";
import type { Lesson } from "../lessons/project-ledger";

function lesson(overrides: Partial<Lesson>): Lesson {
  return { file: "l.md", name: "gotcha-l.md", kind: "gotcha", title: "L", summary: "", paths: [], seenIn: [], ...overrides };
}

describe("graduationCandidates", () => {
  const recurring = lesson({ name: "gotcha-flyway.md", paths: ["backend/**/db/migration/**"], seenIn: ["a", "b", "c"] });
  const guarded = lesson({ name: "gotcha-ops.md", seenIn: ["a", "b", "c", "d"], enforcedBy: "ci.yml" });
  const rare = lesson({ name: "gotcha-rare.md", seenIn: ["a", "b"] });

  test("picks unguarded lessons seen in 3+ specs", () => {
    expect(graduationCandidates([recurring, guarded, rare]).map((l) => l.name)).toEqual(["gotcha-flyway.md"]);
  });

  test("scopes to a spec by seen-in or by the files it touches", () => {
    expect(graduationCandidates([recurring], { specName: "b" })).toHaveLength(1);
    expect(graduationCandidates([recurring], { paths: ["backend/app/db/migration/V9__x.sql"] })).toHaveLength(1);
    expect(graduationCandidates([recurring], { specName: "z", paths: ["frontend/App.tsx"] })).toEqual([]);
  });
});

describe("checkEnforcedBy", () => {
  test("requires the guard path to exist, ignoring a :line or #anchor suffix", () => {
    expect(checkEnforcedBy("l.md", ".github/workflows/ci.yml:42", (path) => path === ".github/workflows/ci.yml")).toEqual([]);
    expect(checkEnforcedBy("l.md", "scripts/gone.sh", () => false)[0]?.problem).toBe(
      "enforced-by points at scripts/gone.sh, which does not exist",
    );
  });
});

describe("project ledger in the doctor and the candidates command", () => {
  let project = "";
  const ledger = () => join(project, "docs", "specs", "_ledger");

  beforeAll(() => {
    project = mkdtempSync(join(tmpdir(), "spec-guards-"));
    mkdirSync(ledger(), { recursive: true });
    writeFileSync(join(ledger(), "gotcha-a.md"), "---\nkind: gotcha\npaths: [x/**]\nseen-in: [s1, s2, s3]\n---\n# Flyway collides\n");
    writeFileSync(join(ledger(), "gotcha-b.md"), "---\nkind: gotcha\npaths: [y/**]\nenforced-by: ci/check.sh\n---\n# B\n");
  });

  afterAll(() => rmSync(project, { recursive: true, force: true }));

  test("the doctor reports a guard that points nowhere", () => {
    expect(projectLedgerIssues(project).map((issue) => issue.problem)).toEqual(["enforced-by points at ci/check.sh, which does not exist"]);
  });

  test("candidates lists recurring lessons for given files", () => {
    expect(lessonsCommand(project, ["candidates", "x/src/a.ts"])).toContain("Flyway collides (`gotcha-a.md`): seen in 3 specs (s1, s2, s3)");
    expect(lessonsCommand(project, ["candidates", "y/src/a.ts"])).toContain("No graduation candidates");
  });
});
