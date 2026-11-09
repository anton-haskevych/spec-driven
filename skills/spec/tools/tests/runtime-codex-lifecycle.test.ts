import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import evidence from "./fixtures/codex-lifecycle/observed.json";
import { codexSession } from "../runtime/codex/decode";
import { unverifiedManagedCapabilities } from "../runtime/capabilities";

const source = { runtime: "codex", key: "configured-local-daemon" } as const;

test("controlled finite process fixture matches the exact observed source", () => {
  const script = readFileSync(new URL("./fixtures/codex-lifecycle/process-tree.ts", import.meta.url));
  expect(createHash("sha256").update(script).digest("hex")).toBe(evidence.processFixtureSha256);
});

test("owned reconnect evidence retains the same in-progress turn and all three marked processes", () => {
  const run = evidence.yielded;
  expect(evidence.cliVersion).toBe("0.167.0");
  expect(evidence.bunVersion).toBe("1.4.4");
  expect(run.turnId).toBe(run.reconnected.turnId);
  expect(run.reconnected.turnStatus).toBe("inProgress");
  expect(run.reconnected.processes).toHaveLength(3);
  expect(new Date(run.disconnectedAt).getTime()).toBeLessThan(new Date(run.reconnected.at).getTime());
  expect(run.markers[1]?.ppid).toBe(run.markers[0]?.pid);
  expect(run.markers[2]?.ppid).toBe(run.markers[1]?.pid);
});

test("foreground and yielded shutdown observations require independent descendant evidence", () => {
  expect(evidence.foreground.interrupt.response).toEqual({});
  expect(evidence.foreground.turnAfterInterrupt).toBe("interrupted");
  expect(evidence.foreground.afterInterrupt.processes).toEqual([]);
  const run = evidence.yielded;
  expect(run.interrupt.response).toEqual({});
  expect(run.turnAfterInterrupt).toBe("interrupted");
  expect(run.afterInterrupt.processes).toHaveLength(3);
  expect(run.terminate.response).toEqual({ terminated: true });
  expect(run.initialTerminals.data[0]?.processId).toBe(run.terminatedProcessId);
  expect(run.afterTerminate.processes).toEqual([]);
  expect(run.finalTerminals).toEqual({ data: [], nextCursor: null });
});

test("real native user-input request remains busy and interruption resolves that exact request", () => {
  const attention = evidence.attention;
  const request = attention.events.find((e) => e.method === "item/tool/requestUserInput");
  const resolved = attention.events.find((e) => e.method === "serverRequest/resolved");
  expect(request).toMatchObject({ id: 0, turnId: attention.turnId, isBlocking: true });
  expect(resolved?.requestId).toBe(request?.id);
  const result = codexSession({ thread: {
    id: evidence.threadId, cwd: "/owned-scratch", updatedAt: 1794196800, status: attention.observation.status,
  } }, evidence.threadId, source, attention.observation.at);
  expect(result).toMatchObject({ ok: true, value: { status: "busy", attention: "input" } });
  expect(attention.final).toEqual({ status: { type: "idle" }, turnStatus: "interrupted" });
});

test("archiving follows quiescence and the finite source proof enables no managed feature", () => {
  expect(evidence.cleanup.processes).toEqual([]);
  expect(evidence.cleanup.pids).toHaveLength(9);
  expect(new Date(evidence.cleanup.at).getTime()).toBeLessThan(new Date(evidence.archived.at).getTime());
  expect(evidence.archived.response).toEqual({});
  expect(evidence.archiveVerified).toMatchObject({ threadId: evidence.threadId, archived: true });
  expect(evidence.approvalAttention).toBe("unverified: configured approval policy never");
  expect(unverifiedManagedCapabilities(source).every((c) => c.state === "unverified")).toBe(true);
});
