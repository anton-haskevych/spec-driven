import { describe, expect, test } from "bun:test";
import type { Board } from "../board/model";
import { renderBoard } from "../board/render";
import { board, flightRow, readyRow } from "./board-factories";

const lanes = (overrides: Partial<Board["lanes"]>): Board["lanes"] => ({ inFlight: [], ready: [], blocked: [], needsYou: [], ...overrides });

describe("renderBoard", () => {
  test("prints the header, every lane in aligned columns and the footer", () => {
    const output = renderBoard(
      board({
        lanes: lanes({
          ready: [
            readyRow({ spec: "alert-noise-cleanup", phase: "5", prGroup: "C", priority: "p1", due: "2026-10-14", unblocks: 2 }),
            readyRow({ spec: "user-facing-errors", phase: undefined, next: "prep", overdue: true, due: "2026-09-28" }),
          ],
          blocked: [{ spec: "alert-noise-cleanup", phase: "7", reasons: ["needs deployed 4", "same files as 6; lands after it"] }],
          needsYou: [
            { kind: "deploy", spec: "alert-noise-cleanup", phase: "4", waiting: ["alert-noise-cleanup#7"] },
            { kind: "overdue", spec: "user-facing-errors", due: "2026-09-28" },
          ],
        }),
        footer: { merged: 0, unknownBase: 0, unreadable: 0, paused: 2, backlog: 27, duplicates: [] },
      }),
    );

    expect(output).toBe(
      [
        "spec board · crm · origin/main e43d948 · fetched 20:00",
        "0 in flight · 2 ready · 1 blocked · 2 need you",
        "",
        "IN FLIGHT",
        "  none",
        "",
        "READY   ★ = shares no files with anything in flight",
        "  1 ★  alert-noise-cleanup · 5 (PR C)  /spec execute  p1  10-14      unblocks 2",
        "  2 ★  user-facing-errors              /spec prep         ⚠ overdue",
        "",
        "BLOCKED",
        "  alert-noise-cleanup · 7  needs deployed 4; same files as 6; lands after it",
        "",
        "NEEDS YOU",
        "  not deployed → deploy  alert-noise-cleanup · 4  needed by alert-noise-cleanup#7",
        "  ⚠ overdue (due 09-28)  user-facing-errors",
        "",
        "2 paused · 27 backlog ideas → /spec list table",
      ].join("\n"),
    );
  });

  test("the header says when the base is not freshly fetched", () => {
    const header = (mode: Board["base"]["mode"]) => renderBoard(board({ base: { ...board().base, mode } })).split("\n")[0];
    expect(header("offline")).toBe("spec board · crm · offline, origin/main as of e43d948 10-01 20:40");
    expect(header("busy")).toBe("spec board · crm · fetch skipped (busy), origin/main as of e43d948 10-01 20:40");
    expect(header("local")).toBe("spec board · crm · local, origin/main as of e43d948 10-01 20:40");
  });

  test("caps ready and blocked, pointing at the full lane", () => {
    const ready = Array.from({ length: 10 }, (_, index) => readyRow({ spec: `s${index}` }));
    const blocked = Array.from({ length: 7 }, (_, index) => ({ spec: `b${index}`, reasons: ["needs x"] }));
    const output = renderBoard(board({ lanes: lanes({ ready, blocked }) }));

    expect(output).toContain("  8 ★  s7");
    expect(output).not.toContain("s8");
    expect(output).toContain("  +2 more → /spec list ready");
    expect(output).toContain("  +2 more → /spec list blocked");
  });

  test("a lane asked for alone prints uncapped under the header", () => {
    const ready = Array.from({ length: 10 }, (_, index) => readyRow({ spec: `s${index}` }));
    const output = renderBoard(board({ lanes: lanes({ ready }) }), { lane: "ready" });

    expect(output).toContain("  10 ★  s9");
    expect(output).not.toContain("BLOCKED");
    expect(output).not.toContain("backlog ideas");
  });

  test("in-flight rows show the workspace, session, PR and next step", () => {
    const output = renderBoard(
      board({
        lanes: lanes({
          inFlight: [
            flightRow({ phase: "8", prGroup: "D", workspace: "/w/alpha-pr-d", session: { status: "busy", since: "2026-10-01T19:58:00Z" } }),
            flightRow({ phase: "4", workspace: "/w/alpha-pr-b", session: { status: "idle", since: "2026-10-01T17:00:00Z" }, pr: { number: 881, listed: true, draft: true, failing: 2 }, next: "fix CI" }),
            flightRow({ phase: "3", session: { status: "closed" }, pr: { number: 861, listed: true, failing: 0, pending: 0 }, next: "merge" }),
            flightRow({ phase: "2", pr: { number: 12, listed: false }, next: "ticked on branch, not merged" }),
          ],
        }),
      }),
    );

    expect(output).toContain("  alpha · 8 (PR D)  alpha-pr-d  busy 2m  —               executing");
    expect(output).toContain("  alpha · 4         alpha-pr-b  idle 3h  #881 draft ✗ 2  fix CI");
    expect(output).toContain("  alpha · 3         —           closed   #861 ✓          merge");
    expect(output).toContain("  alpha · 2         —           —        #12 ?           ticked on branch, not merged");
  });

  test("the footer lists worktree counts, duplicates and unavailable sources", () => {
    const footer = { merged: 43, unknownBase: 4, unreadable: 1, paused: 0, backlog: 0, duplicates: ["twin"], prs: "gh not installed", sessions: "no sessions dir" };
    const output = renderBoard(board({ footer }));

    expect(output).toEndWith(
      [
        "43 worktrees merged · 4 unknown base · 1 unreadable · 0 backlog ideas → /spec list table",
        "duplicate spec names: twin",
        "PRs unavailable: gh not installed",
        "sessions unavailable: no sessions dir",
      ].join("\n"),
    );
  });
});
