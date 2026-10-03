import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { defaultClaudeHome, loadLiveSessions, parseSessionFile, type ProcStarts } from "../sessions/live";
import { parseProcStarts, psProcStarts } from "../sessions/proc-starts";
import { stubRunner } from "./stub-runner";
import { createTree, type Tree } from "./tree";

const BUSY = await Bun.file(join(import.meta.dir, "fixtures", "session-busy.json")).text();
const PROC_START = "Thu Oct  1 22:53:33 2026";
const alive: ProcStarts = () => new Map([[25603, PROC_START]]);

function session(fields: Record<string, unknown>): string {
  return JSON.stringify({ ...JSON.parse(BUSY), ...fields });
}

describe("parseSessionFile", () => {
  test("reads the fields the board uses from a real session file", () => {
    expect(parseSessionFile(BUSY)).toEqual({
      pid: 25603,
      sessionId: "724dec4a-b455-4e21-92f9-dda2f0faa749",
      cwd: "/work/crm-wt/alpha",
      status: "busy",
      name: "alpha execute 4",
      updatedAt: new Date(1790895692399),
      procStart: PROC_START,
    });
  });

  test("updatedAt may be epoch ms or ISO; without it, startedAt stands in", () => {
    expect(parseSessionFile(session({ updatedAt: "2026-10-01T22:00:00Z" }))?.updatedAt).toEqual(new Date("2026-10-01T22:00:00Z"));
    expect(parseSessionFile(session({ updatedAt: undefined }))?.updatedAt).toEqual(new Date(1790895214501));
  });

  test("idle and shell (turn over, a background shell still running) read as themselves; anything else as busy", () => {
    expect(parseSessionFile(session({ status: "idle" }))?.status).toBe("idle");
    expect(parseSessionFile(session({ status: "shell" }))?.status).toBe("shell");
    expect(parseSessionFile(session({ status: "waiting" }))?.status).toBe("busy");
  });

  test("a file missing pid, sessionId, cwd or procStart, or not JSON, doesn't parse", () => {
    for (const missing of ["pid", "sessionId", "cwd", "procStart"]) expect(parseSessionFile(session({ [missing]: undefined }))).toBeUndefined();
    expect(parseSessionFile("{half")).toBeUndefined();
  });
});

describe("loadLiveSessions", () => {
  let tree: Tree;
  afterEach(() => tree?.cleanup());

  test("keeps a session whose pid is alive with the same start time", () => {
    tree = createTree();
    tree.write("sessions/25603.json", BUSY);
    tree.write("sessions/25603.abc.key", "secret");
    const loaded = loadLiveSessions(tree.root, alive);
    expect(loaded.ok && loaded.value.map((live) => live.sessionId)).toEqual(["724dec4a-b455-4e21-92f9-dda2f0faa749"]);
  });

  test("drops a file left by a crash whose pid now belongs to another process", () => {
    tree = createTree();
    tree.write("sessions/25603.json", BUSY);
    tree.write("sessions/111.json", session({ pid: 111, sessionId: "gone" }));
    const reused: ProcStarts = () => new Map([[25603, PROC_START], [111, "Fri Oct  2 09:00:00 2026"]]);
    const loaded = loadLiveSessions(tree.root, reused);
    expect(loaded.ok && loaded.value.map((live) => live.pid)).toEqual([25603]);
  });

  test("start times compare with whitespace collapsed", () => {
    tree = createTree();
    tree.write("sessions/25603.json", BUSY);
    const loaded = loadLiveSessions(tree.root, () => new Map([[25603, "Thu Oct 1 22:53:33 2026"]]));
    expect(loaded.ok && loaded.value).toHaveLength(1);
  });

  test("two files with one sessionId keep the newest", () => {
    tree = createTree();
    tree.write("sessions/25603.json", BUSY);
    tree.write("sessions/222.json", session({ pid: 222, updatedAt: 1790899999999, status: "idle" }));
    const loaded = loadLiveSessions(tree.root, () => new Map([[25603, PROC_START], [222, PROC_START]]));
    expect(loaded.ok && loaded.value.map((live) => [live.pid, live.status])).toEqual([[222, "idle"]]);
  });

  test("a cwd that exists is resolved like worktree paths", () => {
    tree = createTree();
    mkdirSync(join(tree.root, "checkout"));
    tree.write("sessions/25603.json", session({ cwd: join(tree.root, "checkout") }));
    const loaded = loadLiveSessions(tree.root, alive);
    expect(loaded.ok && loaded.value[0]?.cwd).toBe(realpathSync(join(tree.root, "checkout")));
  });

  test("a missing sessions folder fails, so callers treat liveness as unknown", () => {
    tree = createTree();
    expect(loadLiveSessions(tree.root, alive)).toEqual({ ok: false, reason: `no ${join(tree.root, "sessions")}` });
  });

  test("an unreadable folder or a file that never parses fails", () => {
    tree = createTree();
    tree.write("sessions/1.json", "{half");
    expect(loadLiveSessions(tree.root, alive)).toEqual({ ok: false, reason: "unreadable session file 1.json" });
    chmodSync(join(tree.root, "sessions"), 0o000);
    const blocked = loadLiveSessions(tree.root, alive);
    chmodSync(join(tree.root, "sessions"), 0o755);
    expect(blocked.ok).toBe(false);
  });

  test("an empty folder is no sessions, not a failure, and asks ps nothing", () => {
    tree = createTree();
    mkdirSync(join(tree.root, "sessions"));
    let asked = false;
    expect(loadLiveSessions(tree.root, () => ((asked = true), new Map()))).toEqual({ ok: true, value: [] });
    expect(asked).toBe(false);
  });
});

describe("ps start times", () => {
  test("parses ps rows by pid, in any order, with padding and trailing spaces", () => {
    const stdout = "25603 Thu Oct  1 22:53:33 2026    \n  901 Wed Sep 30 14:08:12 2026    \n";
    expect(parseProcStarts(stdout)).toEqual(new Map([[25603, "Thu Oct  1 22:53:33 2026"], [901, "Wed Sep 30 14:08:12 2026"]]));
  });

  test("runs one ps call in UTC, the zone session files record procStart in", () => {
    const seen: { argv: readonly string[]; tz?: string }[] = [];
    const runner = stubRunner([[["ps"], { stdout: "25603 Thu Oct  1 22:53:33 2026\n" }]]);
    const spy = { run: (argv: readonly string[], options: { env?: Record<string, string> } = {}) => (seen.push({ argv, tz: options.env?.TZ }), runner.run(argv)) };
    expect(psProcStarts(spy)([25603, 901])).toEqual(new Map([[25603, "Thu Oct  1 22:53:33 2026"]]));
    expect(seen).toEqual([{ argv: ["ps", "-o", "pid=,lstart=", "-p", "25603,901"], tz: "UTC" }]);
  });

  test("no pids, no ps call", () => {
    const runner = stubRunner([]);
    expect(psProcStarts(runner)([])).toEqual(new Map());
    expect(runner.calls).toEqual([]);
  });
});

describe("defaultClaudeHome", () => {
  test("CLAUDE_CONFIG_DIR wins, else ~/.claude", () => {
    expect(defaultClaudeHome({ CLAUDE_CONFIG_DIR: "/cfg" })).toBe("/cfg");
    expect(defaultClaudeHome({})).toBe(join(homedir(), ".claude"));
  });
});
