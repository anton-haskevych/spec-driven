import { describe, expect, test } from "bun:test";
import type { Task } from "../plan/docs/phase-doc";
import { recordedCommit } from "../plan/docs/task-evidence";

const task = (id: string, evidence: string | undefined, done = true): Task => ({ id, text: `task ${id}`, done, ...(evidence ? { evidence } : {}) });

describe("recordedCommit", () => {
  test("the last done task's pushed commit, note and all", () => {
    expect(recordedCommit([task("4.1", "aaaa111 on origin/feat/x-pr-c"), task("4.2", "bbbb2222 on origin/feat/x-pr-c · 2 edited files")])).toBe("bbbb2222");
  });

  test("join's bare sha counts; evidence with no sha and open tasks are skipped", () => {
    expect(recordedCommit([task("4.1", "c0ffee1"), task("4.2", "approved by Anton, 2026-11-17"), task("4.3", undefined, false)])).toBe("c0ffee1");
  });

  test("no commit recorded: undefined", () => {
    expect(recordedCommit([task("4.1", "https://example.com/page"), task("4.2", undefined)])).toBeUndefined();
  });
});
