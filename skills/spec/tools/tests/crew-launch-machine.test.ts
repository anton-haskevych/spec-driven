import { afterEach, describe, expect, test } from "bun:test";
import { launchCrewSession, type CrewLaunchRequest } from "../commands/crew/launch-session";
import { runFileStore } from "../crew/deps";
import { newRunFile } from "../crew/run-state";
import type { Agent } from "../sessions/agents";
import type { Placement } from "../trees/place";
import { fastCrewDeps } from "./crew-fake-deps";
import { createTree, type Tree } from "./tree";

const FULL = "launch: 6 of 6 machine workers busy; nothing launched";
const busyTree: Placement = { kind: "busy", path: "/trees/x", branch: "b", holder: "after checkout 2 (s1)" };
const placeBusy = async () => ({ ok: true as const, value: busyTree });
const PLACED = "launch: /trees/x is busy, after checkout 2 (s1); not launched";
const working = (count: number): Agent[] => Array.from({ length: count }, (_, index) => ({ sessionId: `s${index}`, cwd: "/w", kind: "background", state: "working", name: `other execute ${index + 1}` }));
const execute = (extra: Partial<CrewLaunchRequest> = {}): CrewLaunchRequest => ({ subCommand: "execute", spec: "checkout", target: "3", hold: false, notes: [], ...extra });

describe("crew launch on a full machine", () => {
  let tree: Tree;
  afterEach(() => tree?.cleanup());

  function launch(request: CrewLaunchRequest, agents: Agent[] = []) {
    tree = createTree("crew-launch-machine-");
    tree.write(".git/spec-board/crew/run.md", newRunFile({ overseer: "o1", runner: "anton", started: "2026-11-17T10:00:00-08:00", caps: { workers: 9, babysitters: 1 } }));
    const deps = fastCrewDeps(tree.root, { agents: () => ({ ok: true, value: agents }) });
    const store = runFileStore(tree.root, deps.runner);
    if (!store.ok) throw new Error(store.reason);
    return launchCrewSession(request, store.value, deps, placeBusy);
  }

  test("a worker is refused at the limit, whether the tick counted for it or the roster is loaded here", async () => {
    expect((await launch(execute({ machineBusy: 6 }))).text).toBe(FULL);
    expect((await launch(execute(), working(6))).text).toBe(FULL);
    expect((await launch(execute(), working(5))).text).toBe(PLACED);
  });

  test("relaunches and babysitters are never refused for the machine", async () => {
    expect((await launch(execute({ machineBusy: 6, relaunch: true }))).text).toBe(PLACED);
    expect((await launch({ ...execute(), subCommand: "babysit", target: "A" }, working(6))).text).toBe(PLACED);
  });

  test("an unreadable roster launches nothing", async () => {
    tree = createTree("crew-launch-machine-");
    tree.write(".git/spec-board/crew/run.md", newRunFile({ overseer: "o1", runner: "anton", started: "2026-11-17T10:00:00-08:00", caps: { workers: 9, babysitters: 1 } }));
    const deps = fastCrewDeps(tree.root, { agents: () => ({ ok: false, reason: "claude agents failed: down" }) });
    const store = runFileStore(tree.root, deps.runner);
    if (!store.ok) throw new Error(store.reason);
    expect((await launchCrewSession(execute(), store.value, deps, placeBusy)).text).toBe("crew launch: claude agents failed: down");
  });
});
