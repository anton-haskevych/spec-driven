import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lessonsCommand } from "../commands/lessons";
import { checkProjectLesson } from "../doctor/project-lesson";
import { recallResponse, type RecallMemory } from "../hooks/lesson-recall";
import { hookResponse } from "../hooks/spec-file-check";
import { loadProjectLessons } from "../lessons/project-ledger";
import { lessonsForFiles } from "../lessons/recall";
import { addSeenIn } from "../lessons/seen-in";
import { similarLessons } from "../lessons/similar";

const MIGRATION = `---
kind: gotcha
paths: [backend/**/db/migration/**]
seen-in: [ach-direct-debit, lead-capture-sms-agent]
---
# Migration numbers collide on merge

Two open PRs can take the same Flyway version. Rebase and renumber before merging.
`;
const ENFORCED = `---
kind: gotcha
paths: [ops/**]
enforced-by: .github/workflows/ci.yml
---
# Ops tests never ran in CI
`;

let project = "";
const ledger = () => join(project, "docs", "specs", "_ledger");

beforeAll(() => {
  project = mkdtempSync(join(tmpdir(), "spec-lessons-"));
  mkdirSync(ledger(), { recursive: true });
  writeFileSync(join(ledger(), "gotcha-migration-numbers-collide.md"), MIGRATION);
  writeFileSync(join(ledger(), "gotcha-ops-tests-not-in-ci.md"), ENFORCED);
  writeFileSync(join(ledger(), "INDEX.md"), "# Project lessons\n");
});

afterAll(() => rmSync(project, { recursive: true, force: true }));

function memory(): RecallMemory & { shown: string[] } {
  const shown: string[] = [];
  return { shown, seen: (name) => shown.includes(name), remember: (names) => shown.push(...names) };
}

describe("lessonsForFiles", () => {
  test("matches by path glob and skips lessons a guard already enforces", () => {
    const lessons = loadProjectLessons(project);
    expect(lessonsForFiles(lessons, ["backend/src/main/resources/db/migration/V152__x.sql"]).map((l) => l.name)).toEqual([
      "gotcha-migration-numbers-collide.md",
    ]);
    expect(lessonsForFiles(lessons, ["ops/src/run.ts"])).toEqual([]);
  });
});

describe("recallResponse", () => {
  const edit = (file: string) => ({ tool_name: "Edit", tool_input: { file_path: join(project, file) }, cwd: project });

  test("injects a matching lesson once per session", () => {
    const seen = memory();
    const first = JSON.parse(recallResponse(edit("backend/db/migration/V1__a.sql"), project, seen) ?? "{}");
    expect(first.hookSpecificOutput.hookEventName).toBe("PreToolUse");
    expect(first.hookSpecificOutput.additionalContext).toContain("Migration numbers collide on merge");
    expect(first.hookSpecificOutput.additionalContext).toContain("seen in 2 specs");
    expect(recallResponse(edit("backend/db/migration/V2__b.sql"), project, seen)).toBeUndefined();
  });

  test("stays silent for spec files and files no lesson covers", () => {
    expect(recallResponse(edit("docs/specs/x/CLAUDE.md"), project, memory())).toBeUndefined();
    expect(recallResponse(edit("frontend/src/App.tsx"), project, memory())).toBeUndefined();
  });
});

describe("similarLessons", () => {
  test("ranks a differently worded lesson about the same thing first", () => {
    const [best] = similarLessons(loadProjectLessons(project), "gotcha-flyway-version-collides-on-merge");
    expect(best?.lesson.name).toBe("gotcha-migration-numbers-collide.md");
  });
});

describe("addSeenIn", () => {
  test("appends to an inline list, rewrites a block list, and inserts a missing field", () => {
    expect(addSeenIn(MIGRATION, "studio-comm")).toEqual({
      kind: "updated",
      text: MIGRATION.replace("lead-capture-sms-agent]", "lead-capture-sms-agent, studio-comm]"),
    });
    const block = "---\nkind: gotcha\nseen-in:\n  - a\n  - b\npaths: [x/**]\n---\n# T\n";
    expect(addSeenIn(block, "c")).toEqual({ kind: "updated", text: "---\nkind: gotcha\nseen-in: [a, b, c]\npaths: [x/**]\n---\n# T\n" });
    expect(addSeenIn("---\nkind: gotcha\n---\n# T\n", "a")).toEqual({ kind: "updated", text: "---\nkind: gotcha\nseen-in: [a]\n---\n# T\n" });
    expect(addSeenIn(MIGRATION, "ach-direct-debit")).toEqual({ kind: "unchanged" });
  });
});

describe("lessonsCommand seen", () => {
  test("records the spec in the lesson file", () => {
    expect(lessonsCommand(project, ["seen", "gotcha-migration-numbers-collide", "studio-comm"])).toContain("added studio-comm");
    expect(readFileSync(join(ledger(), "gotcha-migration-numbers-collide.md"), "utf8")).toContain("studio-comm]");
  });
});

describe("project lesson checks", () => {
  test("require kind and list-shaped paths and seen-in", () => {
    const problems = checkProjectLesson("l.md", "---\npaths: backend/**\n---\n").map((i) => i.problem);
    expect(problems).toEqual(["frontmatter has no kind", "paths must be a list, e.g. paths: [a, b]"]);
  });

  test("run from the spec-file hook when Claude writes into _ledger", () => {
    const file = join(ledger(), "gotcha-bad.md");
    writeFileSync(file, "# no frontmatter\n");
    const response = hookResponse({ tool_name: "Write", tool_input: { file_path: file }, cwd: project }, project);
    expect(response).toContain("project lesson has no frontmatter");
  });
});
