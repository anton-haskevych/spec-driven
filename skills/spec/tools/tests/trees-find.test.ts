import { describe, expect, test } from "bun:test";
import type { HeldClaim } from "../claims/rules";
import type { Claim } from "../claims/store";
import type { LiveSession } from "../sessions/live";
import { busyHolder, findTree, type FindInputs } from "../trees/find";
import type { Workspace } from "../workspaces/list";
import { NOW } from "./board-factories";

const worktree = (path: string, branch?: string, extra: Partial<Workspace> = {}): Workspace => ({ path, head: "abc", ...(branch ? { branch } : {}), detached: !branch, locked: false, prunable: false, isMain: false, ...extra });
const claim = (phase: string, workspace: string, extra: Partial<Claim> = {}): Claim => ({ spec: "s", phase, sessionId: "other", sessionName: "s execute " + phase, workspace, claimedAt: NOW.toISOString(), ...extra });
const held = (status: HeldClaim["status"], value: Claim): HeldClaim => ({ claim: value, status });
const session = (cwd: string, sessionId = "other"): LiveSession => ({ pid: 1, sessionId, cwd, status: "busy", name: "s execute 2", updatedAt: NOW, procStart: "x" });

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

describe("busyHolder", () => {
  const paths = ["/repo", "/repo/.claude/worktrees/x", "/t/old"];

  test("a live or unknown claim of another session naming the tree", () => {
    expect(busyHolder("/t/old", { ok: true, value: [] }, [held("live", claim("3", "/t/old"))], paths, "me")).toBe("after s 3 (s execute 3)");
    expect(busyHolder("/t/old", { ok: false, reason: "x" }, [held("unknown", claim("3", "/t/old"))], paths, "me")).toBe("after s 3 (s execute 3)");
  });

  test("a live session working inside the tree", () => {
    expect(busyHolder("/t/old", { ok: true, value: [session("/t/old/src")] }, [], paths, "me")).toBe("after s execute 2");
  });

  test("a session in an in-repo tree doesn't make the main checkout busy", () => {
    expect(busyHolder("/repo", { ok: true, value: [session("/repo/.claude/worktrees/x")] }, [], paths, "me")).toBeUndefined();
  });

  test("the caller's own session and claim, and closed claims, never make it busy", () => {
    const own = [held("live", claim("3", "/t/old", { sessionId: "me" })), held("closed", claim("2", "/t/old"))];
    expect(busyHolder("/t/old", { ok: true, value: [session("/t/old", "me")] }, own, paths, "me")).toBeUndefined();
  });
});
