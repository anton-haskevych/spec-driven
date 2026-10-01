import { describe, expect, test } from "bun:test";
import type { BoardInputs } from "../board/inputs";
import { attachPrs, attachSessions } from "../board/joins";
import type { CheckSummary } from "../pr/checks";
import type { PrRow } from "../pr/rollup";
import type { LiveSession } from "../sessions/live";
import { boardInputs, flightRow, workspaceView } from "./board-factories";

function session(cwd: string, overrides: Partial<LiveSession> = {}): LiveSession {
  return { pid: 1, sessionId: cwd, cwd, status: "busy", updatedAt: new Date("2026-10-01T20:00:00Z"), procStart: "x", ...overrides };
}

function checks(counts: Partial<CheckSummary["counts"]>): CheckSummary {
  return { counts: { pass: 0, fail: 0, pending: 0, skipping: 0, cancel: 0, ...counts }, external: 0, failing: [] };
}

function pr(number: number, branch: string, overrides: Partial<PrRow> = {}): PrRow {
  return { number, branch, state: "OPEN", draft: false, url: `https://x/pull/${number}`, ...overrides };
}

const FOO = "/wt/crm/foo";
const workspaces = [workspaceView(FOO, []), workspaceView("/wt/crm/foo-bar", []), workspaceView("/repo", [], { branch: "main", isMain: true })];

describe("attachSessions", () => {
  const sessionsFor = (rows = [flightRow({ workspace: FOO })], sessions: BoardInputs["sessions"] = { ok: true, value: [] }) =>
    attachSessions(rows, boardInputs([], { workspaces, sessions }));

  test("joins a session started in the worktree or below it", () => {
    const [row] = sessionsFor(undefined, { ok: true, value: [session(`${FOO}/skills`, { status: "idle" })] });
    expect(row?.session).toEqual({ status: "idle", since: "2026-10-01T20:00:00.000Z" });
  });

  test("matches whole path segments: /crm/foo-bar is not inside /crm/foo", () => {
    const [row] = sessionsFor(undefined, { ok: true, value: [session("/wt/crm/foo-bar")] });
    expect(row?.session).toBeUndefined();
  });

  test("a session belongs to the deepest worktree that holds its cwd", () => {
    const nested = [...workspaces, workspaceView(`${FOO}/inner`, [])];
    const rows = attachSessions([flightRow({ workspace: FOO })], boardInputs([], { workspaces: nested, sessions: { ok: true, value: [session(`${FOO}/inner/x`)] } }));
    expect(rows[0]?.session).toBeUndefined();
  });

  test("several sessions in one worktree show the most recent", () => {
    const older = session(FOO, { sessionId: "a", status: "idle", updatedAt: new Date("2026-10-01T10:00:00Z") });
    const newer = session(FOO, { sessionId: "b", status: "busy", updatedAt: new Date("2026-10-01T19:00:00Z") });
    expect(sessionsFor(undefined, { ok: true, value: [older, newer] })[0]?.session).toEqual({ status: "busy", since: "2026-10-01T19:00:00.000Z" });
  });

  test("an unreadable sessions source makes every cell unknown; --local leaves them empty", () => {
    expect(sessionsFor(undefined, { ok: false, reason: "no dir" })[0]?.session).toEqual({ status: "unknown" });
    expect(sessionsFor(undefined, "local")[0]?.session).toBeUndefined();
  });
});

describe("attachPrs", () => {
  const prsFor = (prs: PrRow[], prLinks = new Map<string, number[]>(), row = flightRow({ workspace: FOO })) =>
    attachPrs([row], boardInputs([], { workspaces, prs: { ok: true, value: prs }, prLinks }))[0];

  test("joins by the worktree's branch, open PR first", () => {
    const joined = prsFor([pr(5, "foo", { state: "MERGED" }), pr(4, "foo", { draft: true, checks: checks({ pass: 2, pending: 1 }) })]);
    expect(joined?.pr).toEqual({ number: 4, listed: true, draft: true, failing: 0, pending: 1, passing: 2 });
  });

  test("without an open PR, the newest one shows with its state", () => {
    expect(prsFor([pr(3, "foo", { state: "CLOSED" }), pr(7, "foo", { state: "MERGED" })])?.pr).toEqual({ number: 7, listed: true, state: "merged" });
  });

  test("falls back to the PRs pr-opening.md links, newest open first", () => {
    const links = new Map([["alpha", [10, 11, 12]]]);
    expect(prsFor([pr(10, "x"), pr(11, "y", { state: "MERGED" })], links)?.pr).toMatchObject({ number: 10, listed: true });
  });

  test("a linked PR missing from both lists shows ?", () => {
    expect(prsFor([], new Map([["alpha", [9, 12]]]))?.pr).toEqual({ number: 12, listed: false });
  });

  test("no branch match and no link: no PR", () => {
    expect(prsFor([pr(1, "other")])?.pr).toBeUndefined();
  });

  test("failing checks turn the next step into fix CI; cancelled runs count as failing", () => {
    expect(prsFor([pr(1, "foo", { checks: checks({ pass: 3, fail: 1 }) })])).toMatchObject({ next: "fix CI", pr: { failing: 1 } });
    expect(prsFor([pr(1, "foo", { checks: checks({ pass: 3, cancel: 1 }) })])).toMatchObject({ next: "fix CI", pr: { failing: 1 } });
  });

  test("a ready PR with at least one check, all passing, is next to merge", () => {
    expect(prsFor([pr(1, "foo", { checks: checks({ pass: 2, skipping: 4 }) })], undefined, flightRow({ workspace: FOO, next: "ticked on branch, not merged" }))?.next).toBe("merge");
    expect(prsFor([pr(1, "foo", { draft: true, checks: checks({ pass: 2 }) })])?.next).toBe("executing");
    expect(prsFor([pr(1, "foo", { checks: checks({ pass: 2, pending: 1 }) })])?.next).toBe("executing");
    expect(prsFor([pr(1, "foo", { checks: checks({ skipping: 2 }) })])?.next).toBe("executing");
  });

  test("gh failing makes every PR cell ?; --local leaves them empty", () => {
    expect(attachPrs([flightRow({ workspace: FOO })], boardInputs([], { workspaces, prs: { ok: false, reason: "offline" } }))[0]?.pr).toBe("unknown");
    expect(attachPrs([flightRow({ workspace: FOO })], boardInputs([], { workspaces, prs: "local" }))[0]?.pr).toBeUndefined();
  });
});
