import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { focusCommand, focusLine, parseFocusArgs } from "../commands/focus";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

describe("parseFocusArgs", () => {
  test("reads add, drop and move with their places", () => {
    expect(parseFocusArgs(["add", "a"])).toEqual({ kind: "add", spec: "a", place: { kind: "end" } });
    expect(parseFocusArgs(["add", "a", "--top"])).toEqual({ kind: "add", spec: "a", place: { kind: "top" } });
    expect(parseFocusArgs(["add", "a", "--after", "b"])).toEqual({ kind: "add", spec: "a", place: { kind: "after", spec: "b" } });
    expect(parseFocusArgs(["drop", "a"])).toEqual({ kind: "drop", spec: "a" });
    expect(parseFocusArgs(["move", "a", "--top"])).toEqual({ kind: "move", spec: "a", place: { kind: "top" } });
  });

  test("prints the verb's usage for a malformed call", () => {
    for (const args of [["add"], ["add", "a", "--top", "--after", "b"], ["add", "a", "b"], ["add", "a", "--first"], ["drop", "a", "--top"]]) {
      expect(parseFocusArgs(args)).toBe(`usage: focus ${args[0]} ${args[0] === "add" ? "<spec> [--top | --after <spec>]" : "<spec>"}`);
    }
    expect(parseFocusArgs(["move", "a"])).toBe("usage: focus move <spec> (--top | --after <spec>)");
  });

  test("prints every usage for an unknown verb", () => {
    expect(parseFocusArgs(["toString"])).toBe(
      "usage: focus add <spec> [--top | --after <spec>] | focus drop <spec> | focus move <spec> (--top | --after <spec>)",
    );
  });
});

describe("focusLine", () => {
  const sha = "0123456789abcdef";

  test("says what landed, where, and the short sha", () => {
    expect(focusLine({ kind: "add", spec: "a", place: { kind: "end" } }, { kind: "landed", sha, landed: { verb: "added", spec: "a", position: { position: 3, total: 3 } } })).toBe(
      "focus: added a at 3/3 (0123456)",
    );
    expect(focusLine({ kind: "move", spec: "a", place: { kind: "top" } }, { kind: "landed", sha, landed: { verb: "moved", spec: "a", position: { position: 1, total: 3 } } })).toBe(
      "focus: moved a to 1/3 (0123456)",
    );
    expect(focusLine({ kind: "drop", spec: "a" }, { kind: "landed", sha, landed: { verb: "dropped", spec: "a" } })).toBe("focus: dropped a (0123456)");
  });

  test("names the action on a refusal and not on a git failure", () => {
    expect(focusLine({ kind: "drop", spec: "a" }, { kind: "refused", reason: "a is not in focus" })).toBe("focus drop: a is not in focus");
    expect(focusLine({ kind: "drop", spec: "a" }, { kind: "failed", reason: "push to main refused: x" })).toBe("focus: push to main refused: x");
  });
});

describe("focusCommand (real git)", () => {
  let repo: TestRepo;

  beforeEach(() => {
    repo = repoWithOrigin("spec-focus-command-");
    repo.write("docs/specs/a/CLAUDE.md", "---\nstatus: active\n---\n");
    repo.commitAll("spec a");
    repo.git("push", "-q", "origin", "main");
  });

  afterEach(() => repo.cleanup());

  test("adds a spec on origin and then refuses to add it twice", async () => {
    expect(await focusCommand(repo.dir, ["add", "a"], isolatedRunner)).toMatch(/^focus: added a at 1\/1 \([0-9a-f]{7}\)$/);
    expect(await focusCommand(repo.dir, ["add", "a"], isolatedRunner)).toBe("focus add: a is already in focus (1/1)");
  });
});
