import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { claudeSnapshot } from "../runtime/claude/sessions";
import { hookResponse } from "../hooks/spec-file-check";
import { ownSessionId } from "../sessions/own";
import { parseSessionFile } from "../sessions/live";
import { sessionLaunch } from "../launch/command-line";
import { liveSession } from "./factories";
import { createTree, type Tree } from "./tree";

const source = { runtime: "claude", key: "fixture-home" } as const;
const observedAt = "2026-11-09T04:00:00.000Z";
let tree: Tree | undefined;
afterEach(() => tree?.cleanup());

describe("Claude compatibility boundary", () => {
  test("Codex variables never create a legacy Claude identity", () => {
    expect(ownSessionId({ CODEX_THREAD_ID: "native-thread", CODEX_SESSION_ID: "other" })).toBeUndefined();
    expect(ownSessionId({ CLAUDE_CODE_SESSION_ID: "claude", CODEX_THREAD_ID: "native-thread" })).toBe("claude");
  });

  test("the normal launch remains the named qualified Claude command", () => {
    expect(sessionLaunch("/work/spec", ["execute", "alpha", "1"])).toEqual({
      ok: true,
      value: {
        title: "alpha execute 1", projectDir: "/work/spec", prompt: "/spec-driven:spec execute alpha 1",
        command: "claude -n 'alpha execute 1' '/spec-driven:spec execute alpha 1'",
        shellLine: "cd '/work/spec' && claude -n 'alpha execute 1' '/spec-driven:spec execute alpha 1'",
      },
    });
  });

  test("normalization retains name, change provenance and parked continuation without PID data", () => {
    const parked = parseSessionFile(JSON.stringify({
      pid: 1, sessionId: "parent", cwd: "/work", status: "busy", procStart: "start",
      startedAt: "2026-11-09T03:00:00.000Z", name: "alpha execute 1", nameSource: "user", parkedJobId: "job",
    }));
    expect(parked).toBeDefined();
    expect(claudeSnapshot(source, { ok: true, value: parked ? [parked] : [] }, observedAt)).toEqual({
      sessions: [{
        ref: { source, id: "parent" }, cwd: "/work", status: "idle", observedAt,
        changedAt: "2026-11-09T03:00:00.000Z", changedFrom: "startedAt",
        name: "alpha execute 1", nameSource: "user", continuation: { source, id: "job" },
      }],
      coverage: [{ source, state: "complete" }],
    });
  });

  test("shell and unknown-as-busy semantics survive normalization", () => {
    const sessions = [liveSession({ status: "shell" }), liveSession({ status: "busy", sessionId: "second" })];
    expect(claudeSnapshot(source, { ok: true, value: sessions }, observedAt).sessions.map((s) => s.status)).toEqual(["shell", "busy"]);
  });

  test("an unreadable Claude source is unavailable, while a verified empty read is complete", () => {
    expect(claudeSnapshot(source, { ok: false, reason: "unreadable session file" }, observedAt)).toEqual({
      sessions: [], coverage: [{ source, state: "unavailable", reason: "unreadable session file" }],
    });
    expect(claudeSnapshot(source, { ok: true, value: [] }, observedAt)).toEqual({
      sessions: [], coverage: [{ source, state: "complete" }],
    });
  });

  test("Claude validation emits its original exact block envelope", () => {
    tree = createTree();
    const file = tree.write("docs/specs/alpha/ledger/gotcha-invalid.md", "# Missing metadata\n");
    expect(hookResponse({ tool_name: "Edit", tool_input: { file_path: file }, cwd: tree.root }, tree.root)).toBe(JSON.stringify({
      decision: "block",
      reason: "spec doctor found problems in the file you just wrote:\nerror  docs/specs/alpha/ledger/gotcha-invalid.md: ledger entry has no frontmatter (needs kind, applies-to, created)\nFix them before moving on.",
    }));
    expect(hookResponse({ tool_name: "Read", tool_input: { file_path: join(tree.root, "x") } }, tree.root)).toBeUndefined();
  });
});
