import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { joinedSpecIssues } from "../doctor/joined";
import { ON_BOARD } from "../phases/template";
import { manualReadLine, progressStub } from "../plan/banner";
import { phaseDocPath, specDocPath } from "../plan/kinds";
import { viewOf } from "./fake-record";
import { phaseDoc, specDoc, task } from "./record-factories";
import { createTree, type Tree } from "./tree";

describe("joinedSpecIssues", () => {
  let tree: Tree;
  afterEach(() => tree.cleanup());

  const record = (phases: unknown[]) =>
    viewOf({
      [specDocPath("alpha")]: specDoc({ name: "alpha", phases: ["1", "2"] }),
      ...Object.fromEntries(phases.map((doc, index) => [phaseDocPath("alpha", String(index + 1)), doc])),
    });

  test("a tidied spec whose files and documents agree has no issues", () => {
    tree = createTree();
    const spec = tree.spec("alpha", { "progress.md": progressStub("# Alpha\n", "alpha", "2026-11-12"), "phases/phase-1.md": `# One\n\n${ON_BOARD}\n`, "phases/phase-2.md": "# Two\n" });
    expect(joinedSpecIssues(spec, record([phaseDoc({ id: "1" }), phaseDoc({ id: "2" })]))).toEqual([]);
  });

  test("boxes left in a phase file after tidy, and a phase whose prose file is missing here, are warnings", () => {
    tree = createTree();
    const spec = tree.spec("alpha", { "progress.md": `# Alpha\n\n${manualReadLine("alpha")}\n`, "phases/phase-1.md": "# One\n\n- [ ] frozen\n" });
    expect(joinedSpecIssues(spec, record([phaseDoc({ id: "1" }), phaseDoc({ id: "2" })]))).toEqual([
      { file: join(spec.dir, "phases/phase-1.md"), severity: "warning", problem: "still has checkboxes, but alpha's tasks live on the board; run join alpha --tidy (it waits while other work holds the file)" },
      { file: join(spec.dir, "phases/phase-2.md"), severity: "warning", problem: "phase 2 is on the board but its prose file is not in this tree; merge the default branch" },
    ]);
  });

  test("boxes before tidy are not reported: the frozen list is still there", () => {
    tree = createTree();
    const spec = tree.spec("alpha", { "progress.md": "# Alpha\n\n- [ ] Phase 1 — One → `phases/phase-1.md`\n", "phases/phase-1.md": "# One\n\n- [ ] frozen\n", "phases/phase-2.md": "# Two\n" });
    expect(joinedSpecIssues(spec, record([phaseDoc({ id: "1" }), phaseDoc({ id: "2" })]))).toEqual([]);
  });

  test("a phase document that doesn't read, such as a task without an id, is an error", () => {
    tree = createTree();
    const spec = tree.spec("alpha", { "progress.md": "# Alpha\n", "phases/phase-1.md": "# One\n", "phases/phase-2.md": "# Two\n" });
    const { id: _, ...noId } = task({ id: "2.1" });
    expect(joinedSpecIssues(spec, record([phaseDoc({ id: "1" }), { ...phaseDoc({ id: "2" }), tasks: [noId] }]))).toEqual([
      { file: join(spec.dir, "progress.md"), severity: "error", problem: "on the board, specs/alpha/phases/2.json: task #1: id must be text" },
    ]);
  });
});
