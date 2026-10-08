import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { renderBoard } from "../board/render";
import type { BoardInputs } from "../board/inputs";
import { boardInputs, NOW, prRow, specFixture, workspaceView } from "./board-factories";
import { heldClaim, liveSession, phaseEdges, phaseState } from "./factories";

const open = (id: string, needs: string[] = []) => phaseState({ id, edges: phaseEdges({ declared: true, needs }) });
const ALPHA = specFixture("alpha", { phases: [{ ...open("1"), done: true }, open("2"), open("3"), open("4", ["3"])], meta: { priority: "p1" } });
const BETA = specFixture("beta", { stage: "prep" });
const GAMMA = specFixture("gamma", { status: "paused", phases: [open("1")] });

function busyRepo(): BoardInputs {
  return boardInputs([ALPHA, BETA, GAMMA], {
    workspaces: [workspaceView("/repo", [], { isMain: true, branch: "main" }), workspaceView("/wt/a", [ALPHA])],
    sessions: {
      ok: true,
      value: [
        liveSession({ sessionId: "s2", name: "alpha execute 2", nameSource: "user", cwd: "/wt/a", status: "busy", updatedAt: new Date("2026-10-01T19:50:00Z") }),
        liveSession({ sessionId: "s9", name: "repo-82", nameSource: "derived", cwd: "/repo", updatedAt: new Date("2026-10-01T14:00:00Z") }),
        liveSession({ sessionId: "s7", name: "other execute 1", cwd: "/elsewhere/x" }),
      ],
    },
    claims: [heldClaim("live", { spec: "alpha", phase: "2", sessionId: "s2", sessionName: "alpha execute 2", workspace: "/wt/a" })],
    prs: { ok: true, value: [prRow({ number: 7, branch: "a" })] },
    prLinks: new Map([["alpha", [7]]]),
    worktreePaths: ["/repo", "/wt/a", "/wt/merged"],
  });
}

// Captured from 2.36.7's builder and renderer: with no `focus:` anywhere, the board must not change.
const GOLDEN = `spec board · crm · origin/main e43d948 · fetched 20:00
1 in flight · 2 ready · 1 blocked · 0 need you

IN FLIGHT
  alpha · 2  a  busy 10m  #7  executing

READY   ★ = shares no files with anything in flight
  1    alpha · 3  /spec execute  p1    after alpha 2 (alpha execute 2)
  2 ★  beta       /spec prep

BLOCKED
  alpha · 4  needs 3

NEEDS YOU
  none

1 paused · 0 backlog ideas → /spec list table`;

describe("no focus set", () => {
  test("the built and rendered board is the one 2.36.7 printed", () => {
    expect(renderBoard(buildBoard(busyRepo(), NOW))).toBe(GOLDEN);
  });
});
