import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listRunFiles, runFileStore } from "../crew/deps";
import { newRunFile, parseRunFile } from "../crew/run-state";
import { fastCrewDeps } from "./crew-fake-deps";
import { createTree, type Tree } from "./tree";

const NEW = { overseer: "o1", runner: "anton", started: "2026-11-17T10:00:00-08:00", caps: { workers: 2, babysitters: 1 } };

describe("run file store", () => {
  let tree: Tree;
  afterEach(() => tree?.cleanup());
  const crewDir = () => join(tree.root, ".git", "spec-board", "crew");

  test("without a spec it is the whole-board run.md; with one, run-<spec>.md beside it", () => {
    tree = createTree("crew-run-store-");
    const { runner } = fastCrewDeps(tree.root);
    const board = runFileStore(tree.root, runner);
    const spec = runFileStore(tree.root, runner, "checkout");
    expect(board.ok && board.value.path).toBe(join(crewDir(), "run.md"));
    expect(spec.ok && spec.value.path).toBe(join(crewDir(), "run-checkout.md"));
    if (!spec.ok) return;
    spec.value.write(newRunFile({ ...NEW, spec: "checkout" }));
    expect(readFileSync(join(crewDir(), "run-checkout.md"), "utf8")).toContain("spec: checkout\n");
    expect(board.ok && board.value.read()).toBeUndefined();
  });

  test("listRunFiles names every run, the whole-board one first, and nothing when the crew dir is missing", () => {
    tree = createTree("crew-run-store-");
    const { runner } = fastCrewDeps(tree.root);
    expect(listRunFiles(tree.root, runner)).toEqual({ ok: true, value: [] });
    tree.write(".git/spec-board/crew/run-zeta.md", newRunFile({ ...NEW, spec: "zeta" }));
    tree.write(".git/spec-board/crew/run.md", newRunFile(NEW));
    tree.write(".git/spec-board/crew/run-alpha.md", newRunFile({ ...NEW, spec: "alpha" }));
    tree.write(".git/spec-board/crew/briefs/alpha#1.md", "brief");
    const listed = listRunFiles(tree.root, runner);
    expect(listed.ok && listed.value.map((store) => store.spec)).toEqual([undefined, "alpha", "zeta"]);
    expect(listed.ok && parseRunFile(listed.value[1]?.store.read() ?? "").spec).toBe("alpha");
  });
});
