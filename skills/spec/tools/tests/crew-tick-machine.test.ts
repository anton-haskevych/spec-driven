import { afterEach, describe, expect, test } from "bun:test";
import { crewTick } from "../commands/crew/tick";
import type { CloseOut } from "../crew/close-out";
import { findCrewLine } from "../crew/crew-line";
import { readyRow } from "./board-factories";
import { fastCrewDeps } from "./crew-fake-deps";
import { agent, crewTree, env, tickPorts } from "./crew-tick-fast";

const AGAIN = "Crew: needs you 0 (in-flight.md) · say if wrong 0 · PR group ready no · next same phase · servers stopped none";
const crewOk = (line: string): CloseOut => ({ kind: "ok", report: line, crewLine: findCrewLine(line) });
const others = (count: number) => Array.from({ length: count }, (_, index) => agent(`o${index}`, "working", `other execute ${index + 1}`));

describe("crew tick under the machine limit", () => {
  let tree: ReturnType<typeof crewTree>;
  afterEach(() => tree?.cleanup());

  test("new picks stop at the machine's free slots, say so once, and each launch carries the count", async () => {
    tree = crewTree();
    tree.run({ workers: 4 });
    const ready = [readyRow({ spec: "a", phase: "1" }), readyRow({ spec: "b", phase: "1" }), readyRow({ spec: "c", phase: "1" })];
    const { fake, calls } = tickPorts({ ready }, others(5));
    const lines = (await crewTick(tree.root, [], fastCrewDeps(tree.root, { env }), fake)).split("\n");
    expect(calls.launched).toEqual(["a 1"]);
    expect(calls.requests).toEqual([{ machineBusy: 5 }]);
    expect(lines).toContain("Machine full: 5 of 6");
  });

  test("a relaunch goes even on a full machine, marked as one", async () => {
    tree = crewTree();
    tree.run({ workers: 2, launched: [{ id: "a1", title: "checkout execute 3", at: "t0" }] });
    const { fake, calls } = tickPorts({ ready: [readyRow({ spec: "billing", phase: "1" })] }, [agent("a1", "done", "checkout execute 3"), ...others(6)], { a1: crewOk(AGAIN) });
    const lines = (await crewTick(tree.root, [], fastCrewDeps(tree.root, { env }), fake)).split("\n");
    expect(calls.launched).toEqual(["checkout 3"]);
    expect(calls.requests).toEqual([{ relaunch: true }]);
    expect(lines).toContain("Machine full: 6 of 6");
  });
});
