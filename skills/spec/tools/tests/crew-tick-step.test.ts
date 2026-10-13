import { describe, expect, test } from "bun:test";
import type { CloseOut } from "../crew/close-out";
import { findCrewLine } from "../crew/crew-line";
import { pickRows } from "../crew/pick";
import { actionLines, afterCloseOut, nextAction } from "../crew/tick-step";
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
      "Needs you: checkout 3 asks 2 (its in-flight note on its branch)",
      "Say if wrong: checkout 3 lists 1 in its handoff",
    ]);
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
    expect(pickRows(ready, states, new Set(), [], 2)).toEqual([{ spec: "a", phase: "1" }, { spec: "b", phase: "4" }]);
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
    expect(pickRows(ready, states, new Set(["running"]), [{ id: "q1", spec: "asked", phase: "5" }], 5)).toEqual([{ spec: "free", phase: "7" }]);
  });
});
