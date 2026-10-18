import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { crewTick, type TickPorts, type TickWorld } from "../commands/crew/tick";
import type { CloseOut } from "../crew/close-out";
import { findCrewLine } from "../crew/crew-line";
import { newRunFile, parseRunFile, withLaunched, type LaunchedEntry } from "../crew/run-state";
import type { Agent } from "../sessions/agents";
import { readyRow } from "./board-factories";
import { heldClaim, liveSession } from "./factories";
import { claudeAnd, crewDeps } from "./crew-deps";
import { repoWithOrigin, type TestRepo } from "./git-repo";

const OWN = "48777164-0d07-4950-a27e-f5187ba29739";
const env = { CLAUDE_CODE_SESSION_ID: OWN };
const crewOk = (line: string): CloseOut => ({ kind: "ok", report: line, crewLine: findCrewLine(line) });
const DONE = "Crew: needs you 0 (in-flight.md) · say if wrong 0 · PR group ready no · next nothing · servers stopped none";
const agent = (id: string, state: Agent["state"]): Agent => ({ id, sessionId: `${id}-0`, cwd: `/trees/${id}`, kind: "background", state });

describe("crew tick", () => {
  let repo: TestRepo;
  afterEach(() => repo?.cleanup());
  const runPath = () => join(repo.dir, ".git", "spec-board", "crew", "run.md");

  function setUp(launched: LaunchedEntry[], workers = 1, overseer = OWN) {
    repo = repoWithOrigin("crew-tick-");
    mkdirSync(join(repo.dir, ".git", "spec-board", "crew"), { recursive: true });
    writeFileSync(runPath(), withLaunched(newRunFile({ overseer, runner: "anton-haskevych", started: "2026-10-12T20:00:00-07:00", caps: { workers, babysitters: 1 } }), launched));
  }

  function ports(world: Partial<TickWorld>, agents: Agent[], verdicts: Record<string, CloseOut> = {}) {
    const calls = { stopped: [] as string[], launched: [] as string[] };
    const fake: TickPorts = {
      world: async () => ({ ok: true, value: { sessions: { ok: true, value: [liveSession({ sessionId: OWN })] }, claims: [], ready: [], states: new Map(), ...world } }),
      agents: () => ({ ok: true, value: agents }),
      closeOut: (entry) => verdicts[entry.id],
      stop: (id) => void calls.stopped.push(id),
      launch: async (request) => {
        calls.launched.push(`${request.spec} ${request.target}`);
        const id = `n${calls.launched.length}`;
        return { text: `Launched: background ${id} · ${request.spec} execute ${request.target}`, launched: { id, title: `${request.spec} execute ${request.target}`, at: "t" } };
      },
    };
    return { fake, calls };
  }

  test("a done worker that passes close-out is stopped, dropped and its slot refilled from the board", async () => {
    setUp([{ id: "a1", title: "checkout execute 1", at: "t0" }]);
    const { fake, calls } = ports({ ready: [readyRow({ spec: "checkout", phase: "2" }), readyRow({ spec: "billing", phase: "1" })] }, [agent("a1", "done")], { a1: crewOk(DONE) });
    const result = await crewTick(repo.dir, [], crewDeps({ env }), fake);
    expect(calls.stopped).toEqual(["a1"]);
    expect(calls.launched).toEqual(["checkout 2"]);
    expect(parseRunFile(readFileSync(runPath(), "utf8")).launched).toEqual([]);
    expect(readFileSync(runPath(), "utf8")).toContain("checkout 1 done · close-out ok · stopped a1");
    expect(result.split("\n")).toEqual([`Closed out checkout execute 1 · a1 · ${DONE}`, "Launched: background n1 · checkout execute 2", "Tick: 1 closed out · 1 launched · 0 for you"]);
  });

  test("a babysitter holding its PR claim and a working worker are left alone; full slots launch nothing", async () => {
    setUp([{ id: "b1", title: "checkout babysit A", at: "t0" }, { id: "w1", title: "billing execute 2", at: "t0" }]);
    const claims = [heldClaim("live", { spec: "checkout", phase: "pr-A", sessionId: "stale-id" })];
    const { fake, calls } = ports({ claims, ready: [readyRow({ spec: "other", phase: "1" })] }, [agent("b1", "done"), agent("w1", "working")]);
    expect(await crewTick(repo.dir, [], crewDeps({ env }), fake)).toBe("Tick: 0 closed out · 0 launched · 0 for you");
    expect(calls).toEqual({ stopped: [], launched: [] });
  });

  test("sessions not in ## Launched are never touched", async () => {
    setUp([]);
    const { fake, calls } = ports({}, [agent("zz", "done")], { zz: crewOk(DONE) });
    await crewTick(repo.dir, [], crewDeps({ env }), fake);
    expect(calls.stopped).toEqual([]);
  });

  test("blocked sessions print what the overseer does; a failed close-out is printed, not acted on", async () => {
    setUp([{ id: "p1", title: "a execute 1", at: "t0" }, { id: "t1", title: "b execute 1", at: "t0" }, { id: "d1", title: "c execute 1", at: "t0" }], 3);
    const blocked: Agent = { ...agent("p1", "blocked"), waitingFor: "permission prompt" };
    const { fake, calls } = ports({}, [blocked, agent("t1", "blocked"), agent("d1", "done")], { d1: { kind: "missing", missing: ["commits not on origin"] } });
    const lines = (await crewTick(repo.dir, [], crewDeps({ env }), fake)).split("\n");
    expect(lines).toEqual([
      "Needs you: a execute 1 · p1 waits on permission prompt → claude attach p1",
      'Hand off now → SendMessage "b execute 1" (t1 ended its turn on text)',
      'Close-out c execute 1 · d1: missing commits not on origin → SendMessage "c execute 1" once',
      "Tick: 0 closed out · 0 launched · 3 for you",
    ]);
    expect(calls.stopped).toEqual([]);
  });

  test("next same phase relaunches that phase, and its spec isn't picked twice", async () => {
    setUp([{ id: "a1", title: "checkout execute 3", at: "t0" }], 2);
    const again = DONE.replace("next nothing", "next same phase");
    const { fake, calls } = ports({ ready: [readyRow({ spec: "checkout", phase: "4" }), readyRow({ spec: "billing", phase: "1" })] }, [agent("a1", "done")], { a1: crewOk(again) });
    await crewTick(repo.dir, [], crewDeps({ env }), fake);
    expect(calls.launched).toEqual(["checkout 3", "billing 1"]);
  });

  test("--no-launch closes out but starts nothing, and holds a relaunch for the stood-down list", async () => {
    setUp([{ id: "a1", title: "checkout execute 3", at: "t0" }], 2);
    const again = DONE.replace("next nothing", "next same phase");
    const { fake, calls } = ports({ ready: [readyRow({ spec: "billing", phase: "1" })] }, [agent("a1", "done")], { a1: crewOk(again) });
    const lines = (await crewTick(repo.dir, ["--no-launch"], crewDeps({ env }), fake)).split("\n");
    expect(calls).toEqual({ stopped: ["a1"], launched: [] });
    expect(lines.slice(1)).toEqual(["Relaunch held (pausing): checkout 3", "Tick: 1 closed out · 0 launched · 1 for you"]);
  });

  test("another live overseer: prints it and does nothing", async () => {
    const other = "9a8b7c6d-0000-4000-8000-000000000000";
    setUp([{ id: "a1", title: "checkout execute 1", at: "t0" }], 1, other);
    const { fake, calls } = ports({ sessions: { ok: true, value: [liveSession({ sessionId: other, name: "repo oversee-crew" })] } }, [agent("a1", "done")], { a1: crewOk(DONE) });
    expect(await crewTick(repo.dir, [], crewDeps({ env }), fake)).toBe(`Overseer: another live overseer ${other} · repo oversee-crew`);
    expect(calls).toEqual({ stopped: [], launched: [] });
  });

  test("taking over writes this session's id", async () => {
    setUp([], 1, "4efef1e3-closed");
    const { fake } = ports({}, []);
    expect(await crewTick(repo.dir, [], crewDeps({ env }), fake)).toStartWith("Overseer: taking over from 4efef1e3-closed (closed)");
    expect(parseRunFile(readFileSync(runPath(), "utf8")).overseer).toBe(OWN);
  });

  test("stopping runs claude stop and claude rm only: tick never removes a worktree", async () => {
    setUp([{ id: "a1", title: "checkout execute 1", at: "t0" }]);
    const claude: string[][] = [];
    const { fake } = ports({}, [agent("a1", "done")], { a1: crewOk(DONE) });
    const { stop: _systemStop, ...rest } = fake;
    await crewTick(repo.dir, [], crewDeps({ env, runner: claudeAnd([], claude) }), rest);
    expect(claude).toEqual([["claude", "stop", "a1"], ["claude", "rm", "a1"]]);
  });

  test("an unreadable roster acts on nothing and writes nothing", async () => {
    setUp([{ id: "a1", title: "checkout execute 1", at: "t0" }]);
    const before = readFileSync(runPath(), "utf8");
    const { fake, calls } = ports({}, []);
    const result = await crewTick(repo.dir, [], crewDeps({ env }), { ...fake, agents: () => ({ ok: false, reason: "claude agents failed: down" }) });
    expect(result).toBe("crew tick: claude agents failed: down");
    expect(readFileSync(runPath(), "utf8")).toBe(before);
    expect(calls.stopped).toEqual([]);
  });
});
