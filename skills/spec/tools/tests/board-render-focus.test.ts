import { describe, expect, test } from "bun:test";
import type { Board, FocusRow, FocusSession } from "../board/model";
import { renderBoard } from "../board/render";
import { board, readyRow } from "./board-factories";

const focusRow = (overrides: Partial<FocusRow> = {}): FocusRow => ({ spec: "alpha", rank: 10, progress: { done: 0, total: 3 }, overdue: false, now: { kind: "none" }, sessions: [], work: [], unattributedPrs: [], ...overrides });
const session = (overrides: Partial<FocusSession> = {}): FocusSession => ({ label: "alpha execute 2", sub: "execute", phase: "2", status: "busy", since: "2026-10-01T19:55:00.000Z", ...overrides });

function withFocus(focus: FocusRow[], footer: Partial<Board["footer"]> = {}, ready: Board["lanes"]["ready"] = []): Board {
  const base = board();
  return board({ lanes: { ...base.lanes, focus, ready }, footer: { ...base.footer, ...footer } });
}

const focusLines = (target: Board) => renderBoard(target, { lane: "focus" }).split("\n").slice(3);

describe("FOCUS lane", () => {
  test("prints first, with the header count, each row's position, progress, now and sessions", () => {
    const text = renderBoard(withFocus([focusRow({ sessions: [session(), session({ phase: "3", status: "idle", since: "2026-10-01T14:00:00.000Z" })] }), focusRow({ spec: "beta", rank: 20 })]));
    expect(text.split("\n").slice(0, 7)).toEqual([
      "spec board · crm · origin/main e43d948 · fetched 20:00",
      "2 focus · 0 in flight · 0 ready · 0 blocked · 0 need you",
      "",
      "FOCUS",
      "  1  alpha  0/3  —  me: execute 2 busy 5m, execute 3 idle 6h",
      "  2  beta   0/3  —  —",
      "",
    ]);
    expect(text.indexOf("FOCUS")).toBeLessThan(text.indexOf("IN FLIGHT"));
  });

  test("now: in flight, ready (capped at 3), deploy, blocked, paused, merging", () => {
    const rows: FocusRow[] = [
      focusRow({ spec: "a", now: { kind: "flight", phases: ["2", "6caaa"], next: ["executing", "ticked on branch, not merged"] } }),
      focusRow({ spec: "b", now: { kind: "ready", phases: ["3", "4", "5", "6", "7"], step: "execute" } }),
      focusRow({ spec: "c", progress: undefined, stage: "create", now: { kind: "ready", phases: [], step: "create" } }),
      focusRow({ spec: "d", now: { kind: "deploy", phases: ["1", "other#2"] } }),
      focusRow({ spec: "e", now: { kind: "blocked", reason: "needs other#1" } }),
      focusRow({ spec: "f", now: { kind: "paused" } }),
      focusRow({ spec: "g", now: { kind: "merging", pr: 42 } }),
      focusRow({ spec: "h", progress: undefined, stage: "prep", now: { kind: "ready", phases: [], step: "prep" } }),
    ];
    expect(focusLines(withFocus(rows))).toEqual([
      "FOCUS",
      "  1  a  0/3    executing 2 · 6caaa on branch  —",
      "  2  b  0/3    ready 3, 4, 5 +2               —",
      "  3  c  draft  ready: /spec create            —",
      "  4  d  0/3    needs deploy of 1, other#2     —",
      "  5  e  0/3    blocked: needs other#1         —",
      "  6  f  0/3    paused                         —",
      "  7  g  0/3    merging #42                    —",
      "  8  h  prep   ready: /spec prep              —",
    ]);
  });

  test("overdue marks the spec; a due day that hasn't passed follows now", () => {
    expect(focusLines(withFocus([focusRow({ overdue: true, due: "2026-09-01" }), focusRow({ spec: "beta", due: "2026-10-20" })]))).toEqual([
      "FOCUS",
      "  1  alpha ⚠  0/3  —              —",
      "  2  beta     0/3  — · due 10-20  —",
    ]);
  });

  test("a session without a launch title shows its label", () => {
    expect(focusLines(withFocus([focusRow({ sessions: [{ label: "poking around", status: "shell", since: "2026-10-01T17:00:00.000Z" }] })]))[1]).toBe("  1  alpha  0/3  —  me: poking around shell 3h");
  });

  test("who: my sessions, claims and PRs first under my name, then each teammate's, then PRs with no author", () => {
    const work: FocusRow["work"] = [
      { person: "spectests", mine: true, claims: [{ phase: "4", since: "2026-09-30T20:00:00.000Z" }], prs: [{ number: 8, listed: true, draft: true }] },
      { person: "taraskorpach", mine: false, claims: [{ phase: "2", since: "2026-09-29T20:00:00.000Z" }], prs: [{ number: 7, listed: true, failing: 2, pending: 0, passing: 3 }] },
    ];
    const row = focusRow({ sessions: [session()], work, unattributedPrs: [{ number: 9, listed: true }] });
    expect(focusLines(board({ ...withFocus([row]), me: "spec-tests" }))[1]).toBe(
      "  1  alpha  0/3  —  spectests: execute 2 busy 5m · claim 4 1d · #8 draft; taraskorpach: claim 2 2d · #7 ✗ 2; #9",
    );
  });

  test("my sessions show under me when git gave no name; more than 2 claims collapse to a count and the oldest age", () => {
    const claims = ["2", "3", "4"].map((phase, index) => ({ phase, since: `2026-09-2${index + 7}T20:00:00.000Z` }));
    const row = focusRow({ sessions: [session()], work: [{ person: "taras", mine: false, claims, prs: [] }] });
    expect(focusLines(withFocus([row]))[1]).toBe("  1  alpha  0/3  —  me: execute 2 busy 5m; taras: 3 claims 4d");
  });

  test("other sessions close the lane, at most 5, then +N", () => {
    const others = ["r-1", "r-2", "r-3", "r-4", "r-5", "r-6", "r-7"].map((label) => ({ label, status: "idle" as const, since: "2026-10-01T19:00:00.000Z" }));
    expect(focusLines(withFocus([focusRow()], { otherSessions: others })).at(-1)).toBe("  other sessions: r-1 idle 1h, r-2 idle 1h, r-3 idle 1h, r-4 idle 1h, r-5 idle 1h, +2");
  });

  test("with no focus rows the lane and header count are left out; board focus prints none", () => {
    const text = renderBoard(board());
    expect(text).not.toContain("FOCUS");
    expect(text.split("\n")[1]).toBe("0 in flight · 0 ready · 0 blocked · 0 need you");
    expect(focusLines(board())).toEqual(["FOCUS", "  none"]);
  });

  test("a ready row of a focus spec notes its position before any other note", () => {
    const text = renderBoard(withFocus([focusRow()], {}, [readyRow({ focus: 1, unblocks: 2 }), readyRow({ spec: "beta", focus: 2 })]), { lane: "ready" });
    expect(text.split("\n").slice(4)).toEqual(["  1 ★  alpha · 1  /spec execute      focus 1 · unblocks 2", "  2 ★  beta · 1   /spec execute      focus 2"]);
  });
});
