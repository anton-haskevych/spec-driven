import { describe, expect, test } from "bun:test";
import type { CloseOut } from "../crew/close-out";
import { findCrewLine } from "../crew/crew-line";
import { INVALID_OWNER } from "../core/people";
import { groupKey, pickRows, workKey } from "../crew/pick";
import { specLayout, type SpecLayout } from "../pr/groups";
import { actionLines, afterCloseOut, finalPrMoment, nextAction } from "../crew/tick-step";
import type { SpecState } from "../core/spec-state";
import type { Agent } from "../sessions/agents";
import { readyRow } from "./board-factories";
import { phaseState } from "./factories";

const worker = { spec: "checkout", sub: "execute", phase: "3" };
const babysitter = { spec: "checkout", sub: "babysit", group: "B" };
const agent = (state: Agent["state"], waitingFor?: string): Agent => ({ id: "a1", sessionId: "a1-0", cwd: "/t", kind: "background", state, ...(waitingFor ? { waitingFor } : {}) });
const entry = { id: "a1", title: "checkout execute 3", at: "2026-10-12T21:00:00-07:00" };

describe("nextAction", () => {
  test("a worker: done, stopped or gone → close-out; blocked on a prompt → attach; blocked on text → hand off; working → wait", () => {
    expect(nextAction(worker, agent("done"), false)).toEqual({ kind: "close-out" });
    expect(nextAction(worker, agent("stopped"), false)).toEqual({ kind: "close-out" });
    expect(nextAction(worker, undefined, false)).toEqual({ kind: "close-out" });
    expect(nextAction(worker, agent("blocked", "permission prompt"), true)).toEqual({ kind: "attach", waitingFor: "permission prompt" });
    expect(nextAction(worker, agent("blocked"), true)).toEqual({ kind: "hand-off" });
    expect(nextAction(worker, agent("working"), true)).toEqual({ kind: "wait" });
    expect(nextAction(worker, agent("unknown"), false)).toEqual({ kind: "wait" });
  });

  test("a babysitter holding its PR claim waits, even done or gone", () => {
    expect(nextAction(babysitter, agent("done"), true)).toEqual({ kind: "wait" });
    expect(nextAction(babysitter, undefined, true)).toEqual({ kind: "wait" });
    expect(nextAction(babysitter, agent("done"), false)).toEqual({ kind: "close-out" });
    expect(nextAction(babysitter, agent("blocked"), false)).toEqual({ kind: "close-out" });
  });

  test("attach and hand-off print the line the overseer acts on", () => {
    expect(actionLines(entry, { kind: "attach", waitingFor: "permission prompt" })).toEqual(["Needs you: checkout execute 3 · a1 waits on permission prompt → claude attach a1"]);
    expect(actionLines(entry, { kind: "hand-off" })).toEqual(['Hand off now → SendMessage "checkout execute 3" (a1 ended its turn on text)']);
  });
});

describe("afterCloseOut", () => {
  const ok = (crew: string): CloseOut => ({ kind: "ok", report: crew, crewLine: findCrewLine(crew) });

  test("ok: removed and logged; PR group, questions and say-if-wrong printed; next same phase relaunches", () => {
    const outcome = afterCloseOut(entry, worker, ok("Crew: needs you 2 (in-flight.md) · say if wrong 1 · PR group ready A · next same phase · servers stopped none"), false, "T");
    expect(outcome.remove).toBe(true);
    expect(outcome.relaunch).toEqual({ spec: "checkout", phase: "3" });
    expect(outcome.log).toBe("T checkout 3 done · close-out ok · stopped a1");
    expect(outcome.lines.slice(1)).toEqual([
      "PR group ready: checkout A → the PR moment",
      "Needs you: checkout 3 asks 2 (question list, or its in-flight note on its branch for a spec in files)",
      "Say if wrong: checkout 3 lists 1 in its handoff",
    ]);
  });

  test("a lane's PR group ready starts no PR moment: its work ships in the final PR", () => {
    const crew = "Crew: needs you 0 (in-flight.md) · say if wrong 0 · PR group ready A · next nothing · servers stopped none";
    const lane: CloseOut = { kind: "ok", report: crew, crewLine: findCrewLine(crew), lane: true };
    expect(afterCloseOut(entry, worker, lane, false, "T").lines.slice(1)).toEqual([]);
  });

  test("missing on a live session: message it; on a gone one: needs you; neither is removed", () => {
    const missing: CloseOut = { kind: "missing", missing: ["claim still live"] };
    expect(afterCloseOut(entry, worker, missing, false, "T")).toEqual({ remove: false, lines: ['Close-out checkout execute 3 · a1: missing claim still live → SendMessage "checkout execute 3" once'] });
    expect(afterCloseOut(entry, worker, missing, true, "T").lines).toEqual(["Needs you: checkout execute 3 · a1 is gone; close-out missing claim still live"]);
  });

  test("a finished babysitter is reported and removed", () => {
    const outcome = afterCloseOut({ ...entry, title: "checkout babysit B" }, babysitter, { kind: "ok", report: "Merged #31 checkout B" }, false, "T");
    expect(outcome).toMatchObject({ remove: true, lines: ["Babysitter checkout babysit B · a1: Merged #31 checkout B"] });
  });
});

describe("pickRows", () => {
  const states = new Map<string, SpecState>([["tasks", { spec: { name: "tasks", dir: "/s" }, hasProgress: true, phases: [phaseState({ id: "1", code: false })] }]]);

  test("takes execute rows in board order, one per spec, up to the free slots", () => {
    const ready = [readyRow({ spec: "a", phase: "1" }), readyRow({ spec: "a", phase: "2" }), readyRow({ spec: "b", phase: "4" }), readyRow({ spec: "c", phase: "1" })];
    expect(pickRows({ ready, states, busy: new Set(), unanswered: [], slots: 2, me: "anton", layouts: new Map(), launched: [] })).toEqual([{ spec: "a", phase: "1" }, { spec: "b", phase: "4" }]);
  });

  test("skips prep rows, busy trees, worktree-only rows, task phases, specs with a worker and unanswered questions", () => {
    const ready = [
      readyRow({ spec: "p", next: "prep" }),
      readyRow({ spec: "busy", phase: "1", treeBusy: "after busy 0 (s)" }),
      readyRow({ spec: "wt", phase: "1", readyIn: { workspace: "/w", needs: ["0"] } }),
      readyRow({ spec: "branch", phase: "1", onlyOn: "feat/x" }),
      readyRow({ spec: "tasks", phase: "1" }),
      readyRow({ spec: "running", phase: "2" }),
      readyRow({ spec: "asked", phase: "5" }),
      readyRow({ spec: "free", phase: "7" }),
    ];
    expect(pickRows({ ready, states, busy: new Set(["running"]), unanswered: [{ id: "q1", spec: "asked", phase: "5" }], slots: 5, me: "anton", layouts: new Map(), launched: [] })).toEqual([{ spec: "free", phase: "7" }]);
  });

  test("takes only rows owned by the crew's runner or by nobody; a malformed owner goes to no one", () => {
    const ready = [
      readyRow({ spec: "theirs", phase: "1", owner: "taras" }),
      readyRow({ spec: "broken", phase: "1", owner: INVALID_OWNER }),
      readyRow({ spec: "mine", phase: "2", owner: "anton" }),
      readyRow({ spec: "shared", phase: "3" }),
    ];
    expect(pickRows({ ready, states, busy: new Set(), unanswered: [], slots: 5, me: "Anton Haskevych", layouts: new Map(), launched: [] })).toEqual([{ spec: "mine", phase: "2" }, { spec: "shared", phase: "3" }]);
  });
});

describe("lanes in spec-branch mode", () => {
  const lanes: SpecState = {
    spec: { name: "checkout", dir: "/s" },
    hasProgress: true,
    phases: [
      phaseState({ id: "1", done: true, edges: { declared: true, needs: [], needsDeployed: [], sameFilesAs: [], pr: "A" } }),
      phaseState({ id: "2", edges: { declared: true, needs: [], needsDeployed: [], sameFilesAs: [], pr: "A" } }),
      phaseState({ id: "3", edges: { declared: true, needs: ["1"], needsDeployed: [], sameFilesAs: [], pr: "B" } }),
      phaseState({ id: "4", edges: { declared: true, needs: [], needsDeployed: [], sameFilesAs: [], pr: "C" } }),
    ],
  };
  const states = new Map([["checkout", lanes]]);
  const on: ReadonlyMap<string, SpecLayout> = new Map([["checkout", specLayout(lanes, { cutFrom: "c0ffee", shipAlone: [] })]]);
  const off: ReadonlyMap<string, SpecLayout> = new Map([["checkout", specLayout(lanes)]]);
  const ready = ["2", "3", "4"].map((phase) => readyRow({ spec: "checkout", phase }));
  const pick = (layouts: ReadonlyMap<string, SpecLayout>, busy: string[] = [], launched: Array<{ spec: string; phase: string }> = []) =>
    pickRows({ ready, states, busy: new Set(busy), unanswered: [], slots: 5, me: "anton", layouts, launched }).map((row) => row.phase);

  test("groupKey is one per lane in the mode and one per spec outside it", () => {
    expect(groupKey("checkout", "B", on.get("checkout"))).toBe("checkout#B");
    expect(groupKey("checkout", "B", off.get("checkout"))).toBe("checkout");
    expect(groupKey("checkout", "B", undefined)).toBe("checkout");
    expect(workKey({ spec: "checkout", phase: "3" }, states, on)).toBe("checkout#B");
  });

  test("one worker per lane, lanes side by side; outside the mode one per spec", () => {
    expect(pick(on)).toEqual(["2", "3", "4"]);
    expect(pick(on, ["checkout#A"])).toEqual(["3", "4"]);
    expect(pick(off)).toEqual(["2"]);
  });

  test("a row needing a phase whose lane worker hasn't closed out waits; once it has, it goes", () => {
    expect(pick(on, ["checkout#A"], [{ spec: "checkout", phase: "1" }])).toEqual(["4"]);
    expect(pick(on, [], [])).toContain("3");
  });
});

describe("finalPrMoment", () => {
  const crew = "Crew: needs you 0 (in-flight.md) · say if wrong 0 · PR group ready A · next nothing · servers stopped none";
  const lane: CloseOut = { kind: "ok", report: crew, crewLine: findCrewLine(crew), lane: true };
  const phases = (doneB: boolean): SpecState => ({
    spec: { name: "checkout", dir: "/specs/checkout" },
    hasProgress: true,
    phases: [
      phaseState({ id: "3", done: true, edges: { ...phaseState().edges, pr: "A" } }),
      phaseState({ id: "4", done: doneB, edges: { ...phaseState().edges, pr: "B" } }),
      phaseState({ id: "5", done: false, edges: { ...phaseState().edges, pr: "D" } }),
    ],
  });
  const layout = (doneB: boolean) => specLayout(phases(doneB), { cutFrom: "c0ffee", shipAlone: ["D"] });

  test("the lane close-out that leaves every phase outside the ship-alone groups done prints the final PR's moment", () => {
    expect(finalPrMoment(worker, lane, layout(true))).toBe("PR moment: checkout final PR");
  });

  test("an open lane phase, an open ship-alone phase aside, prints nothing", () => {
    expect(finalPrMoment(worker, lane, layout(false))).toBeUndefined();
  });

  test("a close-out that isn't a lane's, or outside the mode, prints nothing", () => {
    expect(finalPrMoment(worker, { ...lane, lane: undefined }, layout(true))).toBeUndefined();
    expect(finalPrMoment(worker, lane, specLayout(phases(true)))).toBeUndefined();
    expect(finalPrMoment(worker, { kind: "waiting", claim: "x" }, layout(true))).toBeUndefined();
  });
});
