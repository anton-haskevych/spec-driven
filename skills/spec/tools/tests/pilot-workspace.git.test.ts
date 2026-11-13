import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { verifyPilotWorkspace } from "../runtime/pilot-workspace";
import { isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";

let repo: TestRepo;
let pilot: WorkingCopy;
beforeEach(() => { repo = repoWithOrigin("pilot-workspace-"); pilot = repo.clone("pilot"); });
afterEach(() => repo?.cleanup());

test("separate clone of the same origin has its own common directory", () => {
  expect(verifyPilotWorkspace(pilot.dir, repo.dir, isolatedRunner)).toEqual({ ok: true, value: realpathSync(pilot.dir) });
});

test("a sibling worktree cannot serve as an isolated pilot", () => {
  const tree = repo.addWorktree("sibling", "feat/sibling");
  expect(verifyPilotWorkspace(tree.dir, repo.dir, isolatedRunner)).toMatchObject({ ok: false, reason: expect.stringContaining("common directory") });
  pilot.git("worktree", "add", "-q", "-b", "feat/extra", join(repo.root, "extra"));
  expect(verifyPilotWorkspace(pilot.dir, repo.dir, isolatedRunner)).toMatchObject({ ok: false, reason: expect.stringContaining("exclusive checkout") });
});

test("missing/relative paths, non-root cwd and failed Git evidence refuse", () => {
  const nested = join(pilot.dir, "nested");
  mkdirSync(nested);
  for (const [cwd, legacy] of [["relative", repo.dir], [pilot.dir, "relative"], [nested, repo.dir], ["/missing", repo.dir]]) {
    expect(verifyPilotWorkspace(cwd!, legacy!, isolatedRunner).ok).toBe(false);
  }
  expect(verifyPilotWorkspace(pilot.dir, repo.dir, { run: () => ({ code: 1, stdout: "", stderr: "fixture Git failure" }) }).ok).toBe(false);
});
