import { afterAll, describe, expect, test } from "bun:test";
import type { Workspace } from "../workspaces/list";
import { loadWorkspaceViews } from "../workspaces/views";
import { specNode } from "./factories";
import { createTree } from "./tree";

const tree = createTree("spec-views-");
afterAll(() => tree.cleanup());
tree.write("docs/specs/alpha/CLAUDE.md", "---\nstatus: active\n---\n");
tree.write("docs/specs/alpha/progress.md", "- [x] Phase 1 — One → `phases/phase-1-one.md`\n");
tree.write("docs/specs/ghost/progress.md", "- [x] Phase 1 — One → `phases/phase-1-one.md`\n");
tree.write("web/docs/specs/fresh/CLAUDE.md", "---\nstatus: active\n---\n");
tree.write("web/docs/specs/fresh/progress.md", "- [ ] Phase 1 — One → `phases/phase-1-one.md`\n");

const workspace = (path: string, overrides: Partial<Workspace> = {}): Workspace => ({
  path, head: "abc", branch: "feat/x", detached: false, locked: false, prunable: false, isMain: false, ...overrides,
});
const baseNodes = new Map([["alpha", specNode({ spec: { name: "alpha", dir: "/base/docs/specs/alpha" } })]]);

describe("loadWorkspaceViews", () => {
  const [view] = loadWorkspaceViews([{ workspace: workspace(tree.root), specs: ["alpha", "fresh", "ghost"] }], baseNodes);

  test("reads each changed spec's state from the worktree's own folder", () => {
    expect(view?.states.get("alpha")?.phases.map((phase) => phase.done)).toEqual([true]);
    expect(view?.states.get("alpha")?.spec.dir).toBe(`${tree.root}/docs/specs/alpha`);
  });

  test("skips a spec folder without CLAUDE.md, such as a deleted or renamed spec", () => {
    expect([...(view?.states.keys() ?? [])]).toEqual(["alpha", "fresh"]);
  });

  test("loads nodes only for specs base doesn't have", () => {
    expect([...(view?.branchOnly.keys() ?? [])]).toEqual(["fresh"]);
    expect(view).toMatchObject({ path: tree.root, branch: "feat/x", isMain: false });
  });

  test("keeps a worktree that changed no spec, and one whose folder is gone, with no states", () => {
    const views = loadWorkspaceViews([{ workspace: workspace("/repo", { isMain: true, branch: "main" }), specs: [] }, { workspace: workspace(`${tree.root}/gone`), specs: ["alpha"] }], baseNodes);
    expect(views.map((entry) => [entry.path, entry.states.size, entry.isMain])).toEqual([["/repo", 0, true], [`${tree.root}/gone`, 0, false]]);
  });
});
