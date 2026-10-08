import { describe, expect, test } from "bun:test";
import { attributeSessions } from "../board/attribution";
import type { BoardInputs } from "../board/inputs";
import type { LiveSession } from "../sessions/live";
import { boardInputs, specFixture, workspaceView } from "./board-factories";
import { heldClaim, liveSession } from "./factories";

const ALPHA = specFixture("alpha");
const BETA = specFixture("beta");
const PLAIN = specFixture("plain");
const FOCUS = new Set(["alpha", "beta"]);

function inputs(overrides: Partial<BoardInputs> = {}): BoardInputs {
  return boardInputs([ALPHA, BETA, PLAIN], {
    workspaces: [workspaceView("/repo", [ALPHA], { isMain: true }), workspaceView("/wt/a", [ALPHA]), workspaceView("/wt/ab", [ALPHA, BETA])],
    worktreePaths: ["/repo", "/wt/a", "/wt/ab", "/wt/clean"],
    ...overrides,
  });
}

const session = (sessionId: string, cwd: string, name?: string): LiveSession => liveSession({ sessionId, cwd, ...(name ? { name } : {}) });
const ids = (sessions: readonly LiveSession[] | undefined) => (sessions ?? []).map((one) => one.sessionId);

function attribute(sessions: LiveSession[], overrides: Partial<BoardInputs> = {}) {
  const { bySpec, unattributed } = attributeSessions(sessions, inputs(overrides), FOCUS);
  return { alpha: ids(bySpec.get("alpha")), beta: ids(bySpec.get("beta")), other: ids(unattributed), specs: [...bySpec.keys()] };
}

describe("attributeSessions", () => {
  test("a session in another repo is dropped before any rule runs", () => {
    expect(attribute([session("far", "/elsewhere/crm", "alpha execute 2")])).toEqual({ alpha: [], beta: [], other: [], specs: [] });
  });

  test("a session in a clean worktree the scan left out is still this repo's", () => {
    expect(attribute([session("c", "/wt/clean/src")]).other).toEqual(["c"]);
  });

  test("a claim names the spec, ahead of the launch title and the tree", () => {
    const claims = [heldClaim("live", { spec: "beta", phase: "1", sessionId: "s1", workspace: "/wt/a" })];
    expect(attribute([session("s1", "/wt/a", "alpha execute 2")], { claims }).beta).toEqual(["s1"]);
  });

  test("a claim on a spec outside focus puts the session in other sessions", () => {
    const claims = [heldClaim("live", { spec: "plain", phase: "1", sessionId: "s1" })];
    expect(attribute([session("s1", "/wt/a", "alpha execute 2")], { claims }).other).toEqual(["s1"]);
  });

  test("another machine's claim never matches a session here", () => {
    const claims = [heldClaim("remote", { spec: "beta", phase: "1", sessionId: "s1" })];
    expect(attribute([session("s1", "/wt/a")], { claims }).alpha).toEqual(["s1"]);
  });

  test("a launch title names a base spec; the name wins over the tree", () => {
    expect(attribute([session("s1", "/wt/a", "beta execute 3")]).beta).toEqual(["s1"]);
    expect(attribute([session("s2", "/repo", "alpha resume")]).alpha).toEqual(["s2"]);
  });

  test("a launch title naming a spec not on the base falls through to the tree", () => {
    expect(attribute([session("s1", "/wt/a", "ghost execute 1")]).alpha).toEqual(["s1"]);
  });

  test("a free-text -n name falls through to the tree", () => {
    expect(attribute([session("s1", "/wt/a/src", "fixing the flaky test")]).alpha).toEqual(["s1"]);
  });

  test("every session in a tree touching one focus spec shows, not just the newest", () => {
    const sessions = ["8", "9", "10"].map((phase) => session(`s${phase}`, "/wt/a"));
    expect(attribute(sessions).alpha).toEqual(["s8", "s9", "s10"]);
  });

  test("the main checkout never attributes by tree, even when its changes name one spec", () => {
    expect(attribute([session("m", "/repo", "repo-82")]).other).toEqual(["m"]);
  });

  test("a tree touching two focus specs is ambiguous: other sessions", () => {
    expect(attribute([session("s1", "/wt/ab")]).other).toEqual(["s1"]);
  });

  test("the own session is attributed like any other", () => {
    expect(attribute([session("me", "/wt/a")], { ownSessionId: "me" }).alpha).toEqual(["me"]);
  });
});
