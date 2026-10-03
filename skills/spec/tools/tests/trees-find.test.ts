import { describe, expect, test } from "bun:test";
import type { HeldClaim } from "../claims/rules";
import type { Claim } from "../claims/store";
import type { LiveSession } from "../sessions/live";
import { describeHolder, findTree, treeHolder, treeOccupant, type FindInputs, type TreeView } from "../trees/find";
import type { Workspace } from "../workspaces/list";
import { NOW } from "./board-factories";

const worktree = (path: string, branch?: string, extra: Partial<Workspace> = {}): Workspace => ({ path, head: "abc", ...(branch ? { branch } : {}), detached: !branch, locked: false, prunable: false, isMain: false, ...extra });
const claim = (phase: string, workspace: string, extra: Partial<Claim> = {}): Claim => ({ spec: "s", phase, sessionId: "other", sessionName: "s execute " + phase, workspace, claimedAt: NOW.toISOString(), ...extra });
const held = (status: HeldClaim["status"], value: Claim): HeldClaim => ({ claim: value, status });
const session = (cwd: string, sessionId = "other", status: LiveSession["status"] = "busy"): LiveSession => ({ pid: 1, sessionId, cwd, status, name: "s execute 2", updatedAt: NOW, procStart: "x" });

const name = { branch: "feat/s-pr-b", folder: "s-pr-b" };
const group = { spec: "s", phases: ["2", "3"] };
const inputs = (extra: Partial<FindInputs> = {}): FindInputs => ({
  worktrees: [worktree("/repo", "main", { isMain: true }), worktree("/t/old", "worktree-old"), worktree("/t/other", "feat/other")],
  claims: [],
  activity: new Map(),
  defaultBranch: "main",
  ...extra,
});

describe("findTree", () => {
  test("the PR group's branch finds its tree wherever it lives", () => {
    const found = findTree(name, group, inputs({ worktrees: [...inputs().worktrees, worktree("/repo/.claude/worktrees/x", "feat/s-pr-b")] }));
    expect(found?.path).toBe("/repo/.claude/worktrees/x");
  });

  test("a pruned tree on the branch doesn't count", () => {
    expect(findTree(name, group, inputs({ worktrees: [worktree("/t/gone", "feat/s-pr-b", { prunable: true })] }))).toBeUndefined();
  });

  test("no branch match: a claim on a same-group phase names the tree", () => {
    expect(findTree(name, group, inputs({ claims: [held("closed", claim("3", "/t/old"))] }))?.path).toBe("/t/old");
  });

  test("no claim: a tree with activity on a same-group phase", () => {
    const activity = new Map([["s#2", { tickedIn: [], wipIn: ["/t/old"] }]]);
    expect(findTree(name, group, inputs({ activity }))?.path).toBe("/t/old");
  });

  test("ignores other groups, remote claims and the default branch's checkout", () => {
    const activity = new Map([["s#2", { tickedIn: ["/repo"], wipIn: [] }], ["s#9", { tickedIn: ["/t/other"], wipIn: [] }]]);
    const claims = [held("remote", claim("2", "/t/other")), held("live", claim("9", "/t/old"))];
    expect(findTree(name, group, inputs({ activity, claims }))).toBeUndefined();
  });
});

const paths = ["/repo", "/repo/.claude/worktrees/x", "/t/old"];
const view = (sessions: LiveSession[] | "unreadable", claims: HeldClaim[] = []): TreeView => ({
  sessions: sessions === "unreadable" ? { ok: false, reason: "x" } : { ok: true, value: sessions },
  claims,
  worktreePaths: paths,
  ownSessionId: "me",
});
const clean = () => false;
const edited = () => true;

describe("treeHolder: may another session work in this tree?", () => {
  test("a live or unknown claim of another session holds it", () => {
    expect(treeHolder("/t/old", view([], [held("live", claim("3", "/t/old"))]))).toEqual({ kind: "claim", spec: "s", phase: "3", who: "s execute 3" });
    expect(treeHolder("/t/old", view("unreadable", [held("unknown", claim("3", "/t/old"))]))).toEqual({ kind: "claim", spec: "s", phase: "3", who: "s execute 3" });
  });

  test("a session mid-turn in the tree holds it", () => {
    expect(treeHolder("/t/old", view([session("/t/old/src")]), clean)).toEqual({ kind: "mid-task", who: "s execute 2" });
  });

  test("an idle session with no claim holds it only while the tree has uncommitted changes", () => {
    const idle = view([session("/t/old", "other", "idle")]);
    expect(treeHolder("/t/old", idle, clean)).toBeUndefined();
    expect(treeHolder("/t/old", idle, edited)).toEqual({ kind: "uncommitted", who: "s execute 2" });
  });

  test("a session whose turn is over but whose background shell runs (a local stack left up) holds it like an idle one", () => {
    const shell = view([session("/t/old", "other", "shell")]);
    expect(treeHolder("/t/old", shell, clean)).toBeUndefined();
    expect(treeHolder("/t/old", shell, edited)).toEqual({ kind: "uncommitted", who: "s execute 2" });
  });

  test("without an uncommitted check (the board), an idle session never holds it", () => {
    expect(treeHolder("/t/old", view([session("/t/old", "other", "idle")]))).toBeUndefined();
  });

  test("the tree is checked for changes only when an idle session is in it", () => {
    let checks = 0;
    const counted = () => (checks += 1) > 0;
    treeHolder("/t/old", view([]), counted);
    treeHolder("/t/old", view([session("/t/old/src")]), counted);
    expect(checks).toBe(0);
  });

  test("unreadable sessions leave the decision to claims", () => {
    expect(treeHolder("/t/old", view("unreadable"), edited)).toBeUndefined();
  });

  test("a session in an in-repo tree doesn't hold the main checkout", () => {
    expect(treeHolder("/repo", view([session("/repo/.claude/worktrees/x")]), edited)).toBeUndefined();
  });

  test("the caller's own session and claim, and closed claims, never hold it", () => {
    const claims = [held("live", claim("3", "/t/old", { sessionId: "me" })), held("closed", claim("2", "/t/old"))];
    expect(treeHolder("/t/old", view([session("/t/old", "me")], claims), edited)).toBeUndefined();
  });
});

describe("describeHolder", () => {
  test("says who holds the tree and why", () => {
    expect(describeHolder({ kind: "claim", spec: "s", phase: "3", who: "s execute 3" })).toBe("after s 3 (s execute 3)");
    expect(describeHolder({ kind: "mid-task", who: "s execute 2" })).toBe("s execute 2 is mid-task there");
    expect(describeHolder({ kind: "uncommitted", who: "s execute 2" })).toBe("s execute 2 left uncommitted changes there");
  });
});

describe("treeOccupant: may this tree be deleted?", () => {
  test("any other live session in it keeps it, idle too", () => {
    expect(treeOccupant("/t/old", view([session("/t/old", "other", "idle")]))).toBe("s execute 2 is open there");
  });

  test("a live or unknown claim keeps it", () => {
    expect(treeOccupant("/t/old", view([], [held("live", claim("3", "/t/old"))]))).toBe("after s 3 (s execute 3)");
  });

  test("unreadable sessions keep it: nothing is deleted on a guess", () => {
    expect(treeOccupant("/t/old", view("unreadable"))).toBe("sessions can't be read");
  });

  test("the caller's own session and closed claims don't keep it", () => {
    expect(treeOccupant("/t/old", view([session("/t/old", "me")], [held("closed", claim("2", "/t/old"))]))).toBeUndefined();
  });
});
