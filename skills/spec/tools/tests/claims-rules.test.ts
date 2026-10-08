import { describe, expect, test } from "bun:test";
import type { PhaseActivity } from "../board/activity";
import type { SpecState } from "../core/spec-state";
import type { Result } from "../core/result";
import type { LiveSession } from "../sessions/live";
import { claimStatus, isStale, takeRefusal, type ClaimContext } from "../claims/rules";
import type { Claim } from "../claims/store";
import { claim, liveSession, phaseState } from "./factories";

const holder: Claim = claim({ phase: "4", sessionId: "s1", sessionName: "alpha execute 4", workspace: "/wt/alpha" });

function sessionOf(sessionId: string): LiveSession {
  return liveSession({ sessionId, cwd: "/wt/alpha", status: "busy", updatedAt: new Date(0) });
}

function specState(name: string, phases: SpecState["phases"]): SpecState {
  return { spec: { name, dir: `/base/docs/specs/${name}` }, hasProgress: true, phases };
}

function context(overrides: { sessions?: Result<LiveSession[]>; worktrees?: string[]; done?: boolean } = {}): ClaimContext {
  return {
    sessions: overrides.sessions ?? { ok: true, value: [] },
    worktrees: new Set(overrides.worktrees ?? ["/wt/alpha"]),
    baseStates: new Map([["alpha", specState("alpha", [phaseState({ id: "4", done: overrides.done ?? false })])]]),
  };
}

describe("claimStatus", () => {
  test("unknown when liveness can't be read, whatever else holds", () => {
    expect(claimStatus(holder, context({ sessions: { ok: false, reason: "no sessions dir" }, worktrees: [], done: true }))).toBe("unknown");
  });

  test("live when its session is live, even if the phase is done", () => {
    expect(claimStatus(holder, context({ sessions: { ok: true, value: [sessionOf("s1")] }, done: true }))).toBe("live");
  });

  test("done when the phase is ticked on base", () => {
    expect(claimStatus(holder, context({ done: true, worktrees: [] }))).toBe("done");
  });

  test("gone when its worktree is no longer listed", () => {
    expect(claimStatus(holder, context({ worktrees: ["/wt/other"] }))).toBe("gone");
  });

  test("closed when its session ended and the work is unfinished", () => {
    expect(claimStatus(holder, context())).toBe("closed");
  });

  test("only done, gone and closed claims are stale", () => {
    expect((["unknown", "live", "done", "gone", "closed"] as const).filter(isStale)).toEqual(["done", "gone", "closed"]);
  });
});

describe("takeRefusal", () => {
  const base = specState("alpha", [phaseState({ id: "4" }), phaseState({ id: "5" })]);
  const activity = (entries: [string, PhaseActivity][] = []) => new Map(entries);

  test("a phase in the spec with no work elsewhere can be taken", () => {
    expect(takeRefusal("alpha", "4", { baseState: base, activity: activity(), currentPath: "/wt/a" })).toBeUndefined();
  });

  test("an unknown spec or phase id is refused", () => {
    expect(takeRefusal("beta", "1", { activity: activity(), currentPath: "/wt/a" })).toBe("no spec named beta");
    expect(takeRefusal("alpha", "9", { baseState: base, activity: activity(), currentPath: "/wt/a" })).toBe("phase 9 is not in alpha");
  });

  test("a phase that exists only on the caller's branch can be taken", () => {
    const own = specState("alpha", [...base.phases, phaseState({ id: "5a" })]);
    expect(takeRefusal("alpha", "5a", { baseState: base, ownState: own, activity: activity(), currentPath: "/wt/a" })).toBeUndefined();
  });

  test("a phase in progress or ticked in another workspace is refused", () => {
    const busy = activity([["alpha#4", { tickedIn: [], wipIn: ["/wt/b"] }], ["alpha#5", { tickedIn: ["/wt/c"], wipIn: [] }]]);
    expect(takeRefusal("alpha", "4", { baseState: base, activity: busy, currentPath: "/wt/a" })).toBe("phase 4 is in progress in /wt/b");
    expect(takeRefusal("alpha", "5", { baseState: base, activity: busy, currentPath: "/wt/a" })).toBe("phase 5 is in progress in /wt/c");
  });

  test("work in the caller's own workspace is no reason to refuse", () => {
    const own = activity([["alpha#4", { tickedIn: [], wipIn: ["/wt/a"] }]]);
    expect(takeRefusal("alpha", "4", { baseState: base, activity: own, currentPath: "/wt/a" })).toBeUndefined();
  });
});
