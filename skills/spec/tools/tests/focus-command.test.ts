import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { focusCommand, focusLine, parseFocusArgs } from "../commands/focus";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

describe("parseFocusArgs", () => {
  test("reads add and move with a band, and drop", () => {
    expect(parseFocusArgs(["add", "a", "must"])).toEqual({ kind: "add", spec: "a", band: "must" });
    expect(parseFocusArgs(["move", "a", "Could"])).toEqual({ kind: "move", spec: "a", band: "could" });
    expect(parseFocusArgs(["drop", "a"])).toEqual({ kind: "drop", spec: "a" });
  });

  test("prints the verb's usage for a malformed call, a missing band included", () => {
    for (const args of [["add"], ["add", "a"], ["add", "a", "must", "b"], ["add", "a", "must", "--first"], ["drop", "a", "must"]]) {
      expect(parseFocusArgs(args)).toBe(`usage: focus ${args[0]} ${args[0] === "add" ? "<spec> <must|should|could>" : "<spec>"}`);
    }
    expect(parseFocusArgs(["move", "a"])).toBe("usage: focus move <spec> <must|should|could>");
  });

  test("refuses a word that is not a band", () => {
    expect(parseFocusArgs(["add", "a", "top"])).toBe("focus add: top is not a band; use must, should or could");
    expect(parseFocusArgs(["move", "a", "1"])).toBe("focus move: 1 is not a band; use must, should or could");
  });

  test("says --top and --after are gone", () => {
    for (const args of [["add", "a", "--top"], ["move", "a", "--after", "b"], ["add", "a", "--after=b"]]) {
      expect(parseFocusArgs(args)).toBe(`usage: focus ${args[0]} <spec> <must|should|could>\nfocus: --top and --after are gone; give a band (must, should, could)`);
    }
  });

  test("prints every usage for an unknown verb", () => {
    expect(parseFocusArgs(["toString"])).toBe("usage: focus add <spec> <must|should|could> | focus drop <spec> | focus move <spec> <must|should|could>");
  });
});

describe("focusLine", () => {
  const sha = "0123456789abcdef";

  test("says what landed, in which band, and the short sha", () => {
    expect(focusLine({ kind: "add", spec: "a", band: "must" }, { kind: "landed", sha, landed: { verb: "added", spec: "a", band: "must" } })).toBe("focus: added a to must (0123456)");
    expect(focusLine({ kind: "move", spec: "a", band: "could" }, { kind: "landed", sha, landed: { verb: "moved", spec: "a", band: "could" } })).toBe("focus: moved a to could (0123456)");
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
    expect(await focusCommand(repo.dir, ["add", "a", "should"], isolatedRunner)).toMatch(/^focus: added a to should \([0-9a-f]{7}\)$/);
    expect(await focusCommand(repo.dir, ["add", "a", "must"], isolatedRunner)).toBe("focus add: a is already in focus (should); use move");
  });
});
