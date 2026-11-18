import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { crewTick } from "../commands/crew/tick";
import type { CloseOut } from "../crew/close-out";
import { findCrewLine } from "../crew/crew-line";
import { parseRunFile } from "../crew/run-state";
import type { SpecState } from "../core/spec-state";
import { specLayout } from "../pr/groups";
import { readyRow } from "./board-factories";
import { fastCrewDeps } from "./crew-fake-deps";
import { agent, crewTree, env, OWN, tickPorts } from "./crew-tick-fast";
import { liveSession, phaseState } from "./factories";
import { questionDoc } from "./record-factories";

const AGAIN = "Crew: needs you 0 (in-flight.md) · say if wrong 0 · PR group ready no · next same phase · servers stopped none";
const DONE = AGAIN.replace("next same phase", "next nothing");
const crewOk = (line: string): CloseOut => ({ kind: "ok", report: line, crewLine: findCrewLine(line) });
const question = (spec: string) => ({ ...questionDoc({ id: `q-${spec}`, about: `${spec}#1` }), spec, version: "v1" });
const OTHER = "9a8b7c6d-0000-4000-8000-000000000000";
const sessions = (...ids: string[]) => ({ ok: true as const, value: ids.map((sessionId) => liveSession({ sessionId })) });
const lanePhase = (id: string, pr: string, needs: string[] = []) => phaseState({ id, edges: { declared: true, needs, needsDeployed: [], sameFilesAs: [], pr } });
function lanes(spec: string, phases: ReturnType<typeof lanePhase>[]) {
  const state: SpecState = { spec: { name: spec, dir: `/specs/${spec}` }, hasProgress: true, phases };
  return { states: new Map([[spec, state]]), layouts: new Map([[spec, specLayout(state, { cutFrom: "c0ffee", shipAlone: [] })]]) };
}
const states = (spec: string, done: boolean[]): Map<string, SpecState> =>
  new Map([[spec, { spec: { name: spec, dir: `/specs/${spec}` }, hasProgress: true, phases: done.map((isDone, index) => phaseState({ id: String(index + 1), done: isDone })) }]]);

describe("crew tick --spec", () => {
  let tree: ReturnType<typeof crewTree>;
  afterEach(() => tree?.cleanup());
  const runText = (name: string) => readFileSync(join(tree.root, ".git", "spec-board", "crew", name), "utf8");

  test("works its own run-<spec>.md on its spec's ready rows and questions only, plan change first", async () => {
    tree = crewTree();
    tree.run({ spec: "alpha", workers: 2 });
    const { fake, calls } = tickPorts({ ready: [readyRow({ spec: "beta", phase: "1" }), readyRow({ spec: "alpha", phase: "2" })], questions: [question("beta"), question("alpha")], planChange: "Plan changed since this session loaded it (v2 → v3): phase 4 added" }, []);
    const lines = (await crewTick(tree.root, ["--spec", "alpha"], fastCrewDeps(tree.root, { env }), fake)).split("\n");
    expect(calls.launched).toEqual(["alpha 2"]);
    expect(lines[0]).toBe("Plan changed since this session loaded it (v2 → v3): phase 4 added");
    expect(lines.filter((line) => line.startsWith("Question:"))).toEqual([expect.stringContaining("· alpha ·")]);
    expect(existsSync(join(tree.root, ".git", "spec-board", "crew", "run.md"))).toBe(false);
  });

  test("ends the run finished once the spec has no open phase and no session was out when the tick began", async () => {
    tree = crewTree();
    tree.run({ spec: "alpha" });
    const { fake, calls } = tickPorts({ states: states("alpha", [true, true]) }, []);
    const lines = (await crewTick(tree.root, ["--spec", "alpha"], fastCrewDeps(tree.root, { env }), fake)).split("\n");
    expect(lines).toContain("Finished: alpha has no open phase and no session out; run ended");
    expect(parseRunFile(runText("run-alpha.md")).state).toBe("finished");
    expect(calls.launched).toEqual([]);
  });

  test("the tick that closes out the last worker doesn't finish the run: its PR moment still needs it", async () => {
    tree = crewTree();
    tree.run({ spec: "alpha", launched: [{ id: "a1", title: "alpha execute 2", at: "t0" }] });
    const { fake } = tickPorts({ states: states("alpha", [true, true]) }, [agent("a1", "done")], { a1: crewOk(DONE) });
    await crewTick(tree.root, ["--spec", "alpha"], fastCrewDeps(tree.root, { env }), fake);
    expect(parseRunFile(runText("run-alpha.md")).state).toBe("running");
  });

  test("a spec with an open phase keeps running", async () => {
    tree = crewTree();
    tree.run({ spec: "alpha" });
    const { fake } = tickPorts({ states: states("alpha", [true, false]) }, []);
    await crewTick(tree.root, ["--spec", "alpha"], fastCrewDeps(tree.root, { env }), fake);
    expect(parseRunFile(runText("run-alpha.md")).state).toBe("running");
  });

  test("in spec-branch mode each lane gets its own worker, one at a time per lane", async () => {
    tree = crewTree();
    tree.run({ spec: "alpha", workers: 3, launched: [{ id: "a1", title: "alpha execute 1", at: "t0" }] });
    const world = lanes("alpha", [lanePhase("1", "A"), lanePhase("2", "A"), lanePhase("3", "B"), lanePhase("4", "C", ["1"])]);
    const ready = ["2", "3", "4"].map((phase) => readyRow({ spec: "alpha", phase }));
    const { fake, calls } = tickPorts({ ...world, ready }, [agent("a1", "working")]);
    await crewTick(tree.root, ["--spec", "alpha"], fastCrewDeps(tree.root, { env }), fake);
    expect(calls.launched).toEqual(["alpha 3"]);
  });

  test("bad flags are a usage line", async () => {
    tree = crewTree();
    expect(await crewTick(tree.root, ["--spec"], fastCrewDeps(tree.root, { env }))).toBe("usage: crew tick [--spec <spec>] [--no-launch]");
    expect(await crewTick(tree.root, ["--now"], fastCrewDeps(tree.root, { env }))).toBe("usage: crew tick [--spec <spec>] [--no-launch]");
  });
});

describe("the whole-board tick beside a spec crew", () => {
  let tree: ReturnType<typeof crewTree>;
  afterEach(() => tree?.cleanup());

  test("skips an overseen spec's ready rows, questions and relaunches, silently while its overseer lives", async () => {
    tree = crewTree();
    tree.run({ workers: 3, launched: [{ id: "a1", title: "alpha execute 3", at: "t0" }] });
    tree.run({ spec: "alpha", overseer: OTHER });
    const { fake, calls } = tickPorts({ sessions: sessions(OWN, OTHER), ready: [readyRow({ spec: "alpha", phase: "4" }), readyRow({ spec: "beta", phase: "1" })], questions: [question("alpha")] }, [agent("a1", "done")], { a1: crewOk(AGAIN) });
    const lines = (await crewTick(tree.root, [], fastCrewDeps(tree.root, { env }), fake)).split("\n");
    expect(calls.launched).toEqual(["beta 1"]);
    expect(lines.some((line) => line.startsWith("Overseen:") || line.startsWith("Question:"))).toBe(false);
  });

  test("says once when an overseen spec's overseer is gone, and still leaves it alone", async () => {
    tree = crewTree();
    tree.run();
    tree.run({ spec: "alpha", overseer: "4efef1e3-closed", launched: [{ id: "w1", title: "alpha execute 1", at: "t0" }, { id: "w2", title: "alpha execute 2", at: "t0" }, { id: "b1", title: "alpha babysit A", at: "t0" }] });
    const { fake, calls } = tickPorts({ ready: [readyRow({ spec: "alpha", phase: "4" })] }, []);
    const lines = (await crewTick(tree.root, [], fastCrewDeps(tree.root, { env }), fake)).split("\n");
    expect(lines).toContain("Overseen: alpha (no live overseer, 2 workers)");
    expect(calls.launched).toEqual([]);
  });

  test("leaves a spec in spec-branch mode alone even with no run of its own", async () => {
    tree = crewTree();
    tree.run({ workers: 3 });
    const { fake, calls } = tickPorts({ ...lanes("alpha", [lanePhase("1", "A")]), ready: [readyRow({ spec: "alpha", phase: "1" }), readyRow({ spec: "beta", phase: "1" })] }, []);
    await crewTick(tree.root, [], fastCrewDeps(tree.root, { env }), fake);
    expect(calls.launched).toEqual(["beta 1"]);
  });

  test("a stood-down or finished spec run no longer holds its spec", async () => {
    tree = crewTree();
    tree.run();
    tree.write(".git/spec-board/crew/run-alpha.md", "---\nspec: alpha\noverseer: x\nstate: finished\n---\n");
    const { fake, calls } = tickPorts({ ready: [readyRow({ spec: "alpha", phase: "4" })] }, []);
    await crewTick(tree.root, [], fastCrewDeps(tree.root, { env }), fake);
    expect(calls.launched).toEqual(["alpha 4"]);
  });
});
