import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { renderBoard } from "../board/render";
import { UNSAVED_WORK_HOURS, unsavedWork } from "../board/unsaved-work";
import { CLAUDE_CODE_SOURCE, type SessionDoc } from "../sessions/session-doc";
import { boardInputs, NOW } from "./board-factories";
import { sessionDoc } from "./record-factories";

const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();
const doc = (id: string, overrides: Partial<SessionDoc> = {}): SessionDoc =>
  sessionDoc({ ref: { source: CLAUDE_CODE_SOURCE, id }, who: "Taras", host: "desktop", tree: "alpha-pr-b", ahead: 3, edited: 5, lastWriteAt: hoursAgo(UNSAVED_WORK_HOURS + 1), ...overrides });
const inputs = (docs: SessionDoc[], worktreePaths: string[] = []) => boardInputs([], { sessionDocs: docs, thisHost: "laptop", worktreePaths });

describe("unsavedWork", () => {
  test("a tree holding commits and edits no remote has, quiet for hours, is a row", () => {
    expect(unsavedWork(inputs([doc("t1")]), NOW)).toEqual([{ kind: "unsaved-work", who: "Taras", host: "desktop", tree: "alpha-pr-b", ahead: 3, edited: 5, since: hoursAgo(UNSAVED_WORK_HOURS + 1), here: false }]);
  });

  test("a tree still being written to, or holding nothing, is not", () => {
    expect(unsavedWork(inputs([doc("t1", { lastWriteAt: hoursAgo(1) })]), NOW)).toEqual([]);
    expect(unsavedWork(inputs([doc("t1", { ahead: 0, edited: 0 })]), NOW)).toEqual([]);
    expect(unsavedWork(inputs([doc("t1", { ahead: undefined, edited: undefined })]), NOW)).toEqual([]);
  });

  test("edited files alone are enough, and so are commits alone", () => {
    expect(unsavedWork(inputs([doc("t1", { ahead: 0 })]), NOW)).toMatchObject([{ ahead: 0, edited: 5 }]);
    expect(unsavedWork(inputs([doc("t1", { edited: 0 })]), NOW)).toMatchObject([{ ahead: 3, edited: 0 }]);
  });

  test("two sessions in one tree make one row, from the later write", () => {
    const older = doc("a", { ahead: 9, lastWriteAt: hoursAgo(10) });
    const newer = doc("b", { ahead: 2, lastWriteAt: hoursAgo(5) });
    expect(unsavedWork(inputs([older, newer]), NOW)).toMatchObject([{ ahead: 2 }]);
  });

  test("a later write that finds the tree clean ends the row", () => {
    expect(unsavedWork(inputs([doc("a", { lastWriteAt: hoursAgo(10) }), doc("b", { ahead: 0, edited: 0, lastWriteAt: hoursAgo(5) })]), NOW)).toEqual([]);
  });

  test("this machine's tree must still exist; another machine's can't be checked", () => {
    const here = doc("h", { host: "laptop", tree: "alpha-pr-a" });
    expect(unsavedWork(inputs([here], ["/wt/other"]), NOW)).toEqual([]);
    expect(unsavedWork(inputs([here], ["/wt/alpha-pr-a"]), NOW)).toMatchObject([{ tree: "alpha-pr-a", here: true }]);
    expect(unsavedWork(inputs([doc("t1")], []), NOW)).toHaveLength(1);
  });
});

test("the board lists it under needs you, in words", () => {
  const board = buildBoard(inputs([doc("t1")]), NOW);
  expect(board.lanes.needsYou).toMatchObject([{ kind: "unsaved-work", tree: "alpha-pr-b" }]);
  expect(renderBoard(board)).toContain("3 commits and 5 edited files not on origin");
  expect(renderBoard(board)).toContain("alpha-pr-b · Taras on desktop");
});
