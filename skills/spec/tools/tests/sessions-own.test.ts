import { describe, expect, test } from "bun:test";
import { ownSessionId } from "../sessions/own";

describe("ownSessionId", () => {
  test("is Claude Code's session id for this process", () => {
    expect(ownSessionId({ CLAUDE_CODE_SESSION_ID: "abc" })).toBe("abc");
  });

  test("an unset or empty variable means no session, never a session named ''", () => {
    expect(ownSessionId({})).toBeUndefined();
    expect(ownSessionId({ CLAUDE_CODE_SESSION_ID: "" })).toBeUndefined();
  });
});
