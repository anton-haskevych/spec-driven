import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { focusCommand } from "../commands/focus";
import { issuesForWrittenFile } from "../hooks/spec-file-check";
import { ownerCommand } from "../commands/owner";
import { shipCommand } from "../commands/ship";
import { specStatusCommand } from "../commands/spec-status";
import { specDocPath } from "../plan/kinds";
import { RECORD_REF } from "../record/layout";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { joinedRepo } from "./joined-repo";

const NOW = new Date("2026-11-12T10:00:00Z");
const REAL_GIT_MS = 30_000;
const deps = { runner: isolatedRunner, env: { CLAUDE_CODE_SESSION_ID: "s1" }, now: () => NOW };

describe("spec fields of a joined spec (real git)", () => {
  let repo: TestRepo;
  const onRecord = () => JSON.parse(repo.git("--git-dir", repo.origin, "show", `${RECORD_REF}:${specDocPath("alpha")}`));
  const mainTip = () => repo.git("--git-dir", repo.origin, "rev-parse", "main");

  beforeEach(() => {
    repo = joinedRepo("spec-field-commands-");
  });
  afterEach(() => repo.cleanup());

  test("owner, ship, focus and spec-status write the record and put no commit on main", async () => {
    const main = mainTip();
    expect(await ownerCommand(repo.dir, ["alpha", "Taras"], isolatedRunner, deps)).toMatch(/^owner: alpha is Taras \([0-9a-f]{7}\)$/);
    expect(await shipCommand(repo.dir, ["alpha", "auto"], isolatedRunner, deps)).toMatch(/^ship: alpha is auto \([0-9a-f]{7}\)$/);
    expect(await focusCommand(repo.dir, ["add", "alpha", "must"], isolatedRunner, deps)).toMatch(/^focus: added alpha to must \([0-9a-f]{7}\)$/);
    expect(await specStatusCommand(repo.dir, ["alpha", "paused"], isolatedRunner, deps)).toMatch(/^spec-status: alpha is paused \([0-9a-f]{7}\)$/);
    expect(onRecord()).toMatchObject({ layout: 4, owner: "Taras", ship: "auto", focus: "must", status: "paused" });
    expect(mainTip()).toBe(main);
  }, REAL_GIT_MS);

  test("the same value again, a focus rule, and none", async () => {
    await ownerCommand(repo.dir, ["alpha", "Taras"], isolatedRunner, deps);
    expect(await ownerCommand(repo.dir, ["alpha", "Taras"], isolatedRunner, deps)).toBe("owner: alpha is already Taras");
    expect(await focusCommand(repo.dir, ["move", "alpha", "must"], isolatedRunner, deps)).toBe("focus move: alpha is not in focus");
    expect(await ownerCommand(repo.dir, ["alpha", "none"], isolatedRunner, deps)).toMatch(/^owner: alpha has no owner \([0-9a-f]{7}\)$/);
    expect(onRecord().owner).toBeUndefined();
  }, REAL_GIT_MS);
});

describe("a hand edit of a moved field (real git)", () => {
  let repo: TestRepo;
  afterEach(() => repo.cleanup());

  test("is blocked once the spec is upgraded, and passes before", async () => {
    repo = joinedRepo("spec-field-hook-");
    const file = join(repo.dir, "docs/specs/alpha/CLAUDE.md");
    writeFileSync(file, "---\nstatus: done\n---\n# Alpha\n");
    const errors = () => issuesForWrittenFile(file, repo.dir, isolatedRunner).filter((issue) => issue.severity === "error");
    expect(errors()).toEqual([]);
    writeFileSync(file, "---\nstatus: active\n---\n# Alpha\n");
    await ownerCommand(repo.dir, ["alpha", "Taras"], isolatedRunner, deps);
    writeFileSync(file, "---\nstatus: done\n---\n# Alpha\n");
    expect(errors().map((issue) => issue.problem)).toEqual([
      "alpha is on the board: its status lives in the record, so this edit changes nothing there. Undo it, then run `spec.ts spec-status alpha <status>`.",
    ]);
  }, REAL_GIT_MS);
});

describe("spec-status on a spec in files (real git)", () => {
  let repo: TestRepo;
  afterEach(() => repo.cleanup());

  test("lands status: on main", async () => {
    repo = repoWithOrigin("spec-status-files-");
    repo.write("docs/specs/beta/CLAUDE.md", "---\nstatus: draft\n---\n# Beta\n");
    repo.commitAll("beta");
    repo.git("push", "-q", "origin", "main");
    expect(await specStatusCommand(repo.dir, ["beta", "active"], isolatedRunner, deps)).toMatch(/^spec-status: beta is active \([0-9a-f]{7}\)$/);
    expect(repo.git("--git-dir", repo.origin, "show", "main:docs/specs/beta/CLAUDE.md")).toContain("status: active");
    expect(await specStatusCommand(repo.dir, ["beta", "shipped"], isolatedRunner, deps)).toStartWith("spec-status: shipped is not a status here; use prep, draft,");
  }, REAL_GIT_MS);
});
