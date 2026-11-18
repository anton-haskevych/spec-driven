import { afterEach, describe, expect, test } from "bun:test";
import { boardScope, inScope, isRunOpen, scopeWorld, specRun } from "../crew/scope";
import { specLayout } from "../pr/groups";
import { phaseState } from "./factories";
import { newRunFile, parseRunFile } from "../crew/run-state";
import { readyRow } from "./board-factories";
import { fastCrewDeps } from "./crew-fake-deps";
import { questionDoc } from "./record-factories";
import { createTree, type Tree } from "./tree";

const NEW = { overseer: "o1", runner: "anton", started: "2026-11-17T10:00:00-08:00", caps: { workers: 2, babysitters: 1 } };
const question = (spec: string) => ({ ...questionDoc({ id: `q-${spec}` }), spec, version: "v1" });
const world = { ready: [readyRow({ spec: "alpha", phase: "1" }), readyRow({ spec: "beta", phase: "2" }), readyRow({ spec: "alpha", phase: "3" })], questions: [question("alpha"), question("beta")], other: "kept" };

describe("scopeWorld", () => {
  test("a spec crew keeps only its spec's ready rows and questions", () => {
    const scoped = scopeWorld(world, { spec: "alpha" });
    expect(scoped.ready.map((row) => `${row.spec} ${row.phase}`)).toEqual(["alpha 1", "alpha 3"]);
    expect(scoped.questions?.map((row) => row.spec)).toEqual(["alpha"]);
    expect(scoped.other).toBe("kept");
  });

  test("the whole-board crew drops every overseen spec, and with none overseen the world is unchanged", () => {
    expect(scopeWorld(world, { overseen: new Set(["alpha"]) }).ready.map((row) => row.spec)).toEqual(["beta"]);
    expect(scopeWorld(world, { overseen: new Set() })).toBe(world);
  });

  test("the whole-board crew leaves alone every spec with an open run or in spec-branch mode", () => {
    const state = (name: string) => ({ spec: { name, dir: `/s/${name}` }, hasProgress: true, phases: [phaseState({ id: "1", edges: { declared: true, needs: [], needsDeployed: [], sameFilesAs: [], pr: "A" } })] });
    const layouts = new Map([
      ["lanes", specLayout(state("lanes"), { cutFrom: "c0ffee", shipAlone: [] })],
      ["plain", specLayout(state("plain"))],
    ]);
    const run = { ...parseRunFile(newRunFile({ ...NEW, spec: "watched" })), spec: "watched" };
    expect([...boardScope([run], layouts).overseen].sort()).toEqual(["lanes", "watched"]);
  });

  test("inScope answers the same question for one spec name", () => {
    expect([inScope("alpha", { spec: "alpha" }), inScope("beta", { spec: "alpha" }), inScope("alpha", { overseen: new Set(["alpha"]) }), inScope("beta", { overseen: new Set(["alpha"]) })]).toEqual([true, false, false, true]);
  });
});

describe("specRun", () => {
  let tree: Tree;
  afterEach(() => tree?.cleanup());

  test("a run is open unless it stood down or finished", () => {
    const run = parseRunFile(newRunFile({ ...NEW, spec: "alpha" }));
    expect([isRunOpen(run), isRunOpen({ ...run, state: "stood-down" }), isRunOpen({ ...run, state: "finished" })]).toEqual([true, false, false]);
  });

  test("finds run-<spec>.md while it is open, and nothing for a spec without one or a finished one", () => {
    tree = createTree("crew-scope-");
    const { runner } = fastCrewDeps(tree.root);
    tree.write(".git/spec-board/crew/run-alpha.md", newRunFile({ ...NEW, spec: "alpha" }));
    tree.write(".git/spec-board/crew/run-beta.md", newRunFile({ ...NEW, spec: "beta" }).replace("state: running", "state: finished"));
    const alpha = specRun(tree.root, runner, "alpha");
    expect(alpha.ok && alpha.value?.spec).toBe("alpha");
    expect(specRun(tree.root, runner, "beta")).toEqual({ ok: true, value: undefined });
    expect(specRun(tree.root, runner, "gamma")).toEqual({ ok: true, value: undefined });
  });
});
