import { afterAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { ClassifiedWorkspace } from "../workspaces/classify";
import { workspaceSpecChanges } from "../workspaces/changes";
import type { Workspace } from "../workspaces/list";
import { asyncStubRunner } from "./stub-runner";
import { createTree } from "./tree";

const BASE = "b".repeat(40);
const HEAD = "h".repeat(40);
const tree = createTree("spec-changes-");
tree.write("a/docs/specs/.keep", "");
tree.write("a/web/docs/specs/.keep", "");
tree.write("b/docs/specs/.keep", "");
tree.write("bare/src/index.ts", "");
afterAll(() => tree.cleanup());

const at = (name: string) => join(tree.root, name);
const workspace = (name: string, overrides: Partial<Workspace> = {}): Workspace => ({
  path: at(name), head: HEAD, branch: "feat/x", detached: false, locked: false, prunable: false, isMain: false, ...overrides,
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
    const [changes] = await workspaceSpecChanges(runner, [live(workspace("a"), true)], BASE);
    expect(changes?.specs).toEqual({ ok: true, value: ["auth", "billing"] });
  });

  test("diffs base sha to head over both roots, and asks status only about the roots on disk, without taking locks", async () => {
    const runner = asyncStubRunner([[DIFF, {}], [STATUS, {}]]);
    await workspaceSpecChanges(runner, [live(workspace("a"), true)], BASE);
    expect(runner.calls).toEqual([
      { argv: [...DIFF, "--name-only", "-z", `${BASE}...${HEAD}`, "--", "docs/specs", ":(glob)*/docs/specs/**"], cwd: at("a") },
      { argv: [...STATUS, "--porcelain", "-z", "--untracked-files=all", "--", "docs/specs", "web/docs/specs"], cwd: at("a") },
    ]);
  });

  test("skips the committed query when nothing is ahead of base, as for a main checkout on the default branch", async () => {
    const runner = asyncStubRunner([[STATUS, { stdout: " M docs/specs/billing/design.md\0" }]]);
    const [changes] = await workspaceSpecChanges(runner, [live(workspace("b", { isMain: true, branch: "main" }), false)], BASE);
    expect(runner.calls.map((call) => call.argv[2])).toEqual(["status"]);
    expect(changes?.specs).toEqual({ ok: true, value: ["billing"] });
  });

  test("runs no status query in a worktree without spec roots", async () => {
    const runner = asyncStubRunner([]);
    const [changes] = await workspaceSpecChanges(runner, [live(workspace("bare"), false)], BASE);
    expect(runner.calls).toEqual([]);
    expect(changes?.specs).toEqual({ ok: true, value: [] });
  });

  test("reports a failed query for that worktree only", async () => {
    const runner = asyncStubRunner([[DIFF, { code: 128, stderr: "fatal: no merge base\n" }], [STATUS, {}]]);
    const results = await workspaceSpecChanges(runner, [live(workspace("a"), true), live(workspace("b"), false)], BASE);
    expect(results.map((result) => [result.workspace.path, result.specs])).toEqual([
      [at("a"), { ok: false, reason: "git diff failed: fatal: no merge base" }],
      [at("b"), { ok: true, value: [] }],
    ]);
  });
});
