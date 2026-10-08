import { describe, expect, test } from "bun:test";
import { sessionsByWorkspace } from "../sessions/by-workspace";
import { liveSession } from "./factories";

describe("sessionsByWorkspace", () => {
  test("keeps every session per worktree, under the deepest worktree that owns its cwd", () => {
    const first = liveSession({ sessionId: "a", cwd: "/repo/.claude/worktrees/x/src" });
    const second = liveSession({ sessionId: "b", cwd: "/repo/.claude/worktrees/x" });
    const main = liveSession({ sessionId: "c", cwd: "/repo/docs" });

    const owned = sessionsByWorkspace([first, second, main], ["/repo", "/repo/.claude/worktrees/x"]);

    expect(owned).toEqual(new Map([["/repo/.claude/worktrees/x", [first, second]], ["/repo", [main]]]));
  });

  test("drops sessions outside every worktree", () => {
    expect(sessionsByWorkspace([liveSession({ cwd: "/elsewhere" })], ["/repo"])).toEqual(new Map());
  });
});
