import { describe, expect, test } from "bun:test";
import { environPwd, procStartDirs, statStartTime, systemProcfs, type Procfs } from "../sessions/procfs";
import { psProcStarts } from "../sessions/proc-starts";
import { stubRunner } from "./stub-runner";

const STAT = "6610043 (claude (main)) S 1136281 6610043 1136281 34816 6610043 4194560 12 0 0 0 5 2 0 0 20 0 11 0 6610043 1 2 3";
const procfs = (stat: Record<number, string>, environ: Record<number, string> = {}): Procfs => ({
  stat: (pid) => stat[pid],
  environ: (pid) => environ[pid],
});

describe("/proc start time", () => {
  test("reads field 22, counting after the command name's last parenthesis", () => {
    expect(statStartTime(STAT)).toBe("6610043");
  });

  test("a short or empty stat has none", () => {
    expect(statStartTime("1 (x) S 0")).toBeUndefined();
  });

  test("on Linux a pid matches by ps's lstart or by the clock-tick start Claude Code records there", () => {
    const runner = stubRunner([[["ps"], { stdout: "25603 Thu Oct  1 22:53:33 2026\n" }]]);
    expect(psProcStarts(runner, procfs({ 25603: STAT }))([25603])).toEqual(new Map([[25603, ["Thu Oct  1 22:53:33 2026", "6610043"]]]));
  });

  test("without /proc it is ps alone, as before", () => {
    const runner = stubRunner([[["ps"], { stdout: "25603 Thu Oct  1 22:53:33 2026\n" }]]);
    expect(psProcStarts(runner, undefined)([25603])).toEqual(new Map([[25603, ["Thu Oct  1 22:53:33 2026"]]]));
  });

  test("a pid ps doesn't list is still matched by /proc", () => {
    expect(psProcStarts(stubRunner([[["ps"], { stdout: "" }]]), procfs({ 7: STAT }))([7])).toEqual(new Map([[7, ["6610043"]]]));
  });
});

describe("start folders", () => {
  test("a session's start folder is the PWD it was launched with", () => {
    expect(environPwd("HOME=/home/a\0PWD=/repo/.claude/worktrees/b2\0SHELL=/bin/zsh\0")).toBe("/repo/.claude/worktrees/b2");
    expect(environPwd("HOME=/home/a\0")).toBeUndefined();
  });

  test("reads each pid's environment; an unreadable one is left out", () => {
    const dirs = procStartDirs(procfs({}, { 1: "PWD=/t/old\0", 2: "HOME=/h\0" }))([1, 2, 3]);
    expect(dirs).toEqual(new Map([[1, "/t/old"]]));
  });

  test("without /proc nothing is known, so nothing changes", () => {
    expect(procStartDirs(undefined)([1])).toEqual(new Map());
  });

  test("/proc is read on Linux only", () => {
    expect(systemProcfs("darwin")).toBeUndefined();
    expect(systemProcfs("linux")).toBeDefined();
  });
});
