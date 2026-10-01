import { describe, expect, test } from "bun:test";
import type { ClassifiedWorkspace } from "../workspaces/classify";
import { workspaceSpecChanges } from "../workspaces/changes";
import type { Workspace } from "../workspaces/list";
import { asyncStubRunner } from "./stub-runner";

const BASE = "b".repeat(40);
const workspace = (path: string, overrides: Partial<Workspace> = {}): Workspace => ({
  path, head: "h".repeat(40), branch: "feat/x", detached: false, locked: false, prunable: false, isMain: false, ...overrides,
});
const live = (ws: Workspace, aheadOfBase: boolean): ClassifiedWorkspace => ({ workspace: ws, kind: "live", aheadOfBase });

const DIFF = ["git", "--no-optional-locks", "diff"];
const STATUS = ["git", "--no-optional-locks", "status"];

describe("workspaceSpecChanges", () => {
  test("joins committed and uncommitted spec docs into sorted spec names", async () => {
    const runner = asyncStubRunner([
      [DIFF, { stdout: "docs/specs/billing/progress.md\0docs/specs/_ledger/gotcha-x.md\0" }],
      [STATUS, { stdout: " M web/docs/specs/auth/CLAUDE.md\0?? docs/specs/billing/phases/phase-2-x.md\0" }],
    ]);
    const [changes] = await workspaceSpecChanges(runner, [live(workspace("/w/a"), true)], BASE);
    expect(changes?.specs).toEqual({ ok: true, value: ["auth", "billing"] });
  });

  test("diffs from the pinned base sha to the worktree head, both scoped to spec docs, without taking locks", async () => {
    const runner = asyncStubRunner([[DIFF, {}], [STATUS, {}]]);
    await workspaceSpecChanges(runner, [live(workspace("/w/a"), true)], BASE);
    expect(runner.calls).toEqual([
      { argv: [...DIFF, "--name-only", "-z", `${BASE}...${"h".repeat(40)}`, "--", "docs/specs", ":(glob)*/docs/specs/**"], cwd: "/w/a" },
      { argv: [...STATUS, "--porcelain", "-z", "--untracked-files=all", "--", "docs/specs", ":(glob)*/docs/specs/**"], cwd: "/w/a" },
    ]);
  });

  test("skips the committed query when nothing is ahead of base, as for a main checkout on the default branch", async () => {
    const runner = asyncStubRunner([[STATUS, { stdout: " M docs/specs/billing/design.md\0" }]]);
    const [changes] = await workspaceSpecChanges(runner, [live(workspace("/repo", { isMain: true, branch: "main" }), false)], BASE);
    expect(runner.calls.map((call) => call.argv[2])).toEqual(["status"]);
    expect(changes?.specs).toEqual({ ok: true, value: ["billing"] });
  });

  test("reports a failed query for that worktree only", async () => {
    const runner = asyncStubRunner([[DIFF, { code: 128, stderr: "fatal: no merge base\n" }], [STATUS, {}]]);
    const results = await workspaceSpecChanges(runner, [live(workspace("/w/a"), true), live(workspace("/w/b"), false)], BASE);
    expect(results.map((result) => [result.workspace.path, result.specs])).toEqual([
      ["/w/a", { ok: false, reason: "git diff failed: fatal: no merge base" }],
      ["/w/b", { ok: true, value: [] }],
    ]);
  });
});
