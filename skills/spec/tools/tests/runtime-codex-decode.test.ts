import { describe, expect, test } from "bun:test";
import { codexSession, loadedPage } from "../runtime/codex/decode";
import { scanLoaded } from "../runtime/codex/scan";
import { unverifiedManagedCapabilities } from "../runtime/capabilities";
import type { ReadOnlyRpc } from "../runtime/codex/transport";

const source = { runtime: "codex", key: "fixture" } as const;
const observedAt = "2026-11-09T04:00:00Z";
const metadata = (status: unknown) => ({ thread: { id: "own", cwd: "/work", updatedAt: 1794196800, status } });

describe("native session values", () => {
  test("retains native parentThreadId as a qualified delegation reference", () => {
    const raw = metadata({ type: "idle" });
    expect(codexSession({ thread: { ...raw.thread, parentThreadId: "parent" } }, "own", source, observedAt)).toMatchObject({
      ok: true, value: { parent: { source, id: "parent" } },
    });
    for (const fields of [{}, { parentThreadId: null }, { forkedFromId: "parent" }]) {
      const result = codexSession({ thread: { ...raw.thread, ...fields } }, "own", source, observedAt);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).not.toHaveProperty("parent");
    }
  });

  test("malformed or self-parent metadata cannot grant delegation", () => {
    for (const parentThreadId of ["", "  ", 7, {}, "own"]) {
      expect(codexSession({ thread: { ...metadata({ type: "idle" }).thread, parentThreadId } }, "own", source, observedAt).ok).toBe(false);
    }
  });

  test("keeps input/approval/error attention while never mapping unloaded or future states to idle", () => {
    for (const flag of ["waitingOnApproval", "waitingOnUserInput"]) {
      const result = codexSession(metadata({ type: "active", activeFlags: [flag] }), "own", source, observedAt);
      expect(result.ok && result.value.attention).toBe(flag === "waitingOnApproval" ? "approval" : "input");
    }
    expect(codexSession(metadata({ type: "systemError" }), "own", source, observedAt)).toMatchObject({ ok: true, value: { status: "busy", attention: "error" } });
    for (const state of [{ type: "notLoaded" }, { type: "future" }, { type: "active", activeFlags: ["future"] }]) {
      expect(codexSession(metadata(state), "own", source, observedAt).ok).toBe(false);
    }
    expect(codexSession(metadata({ type: "idle" }), "different-id", source, observedAt).ok).toBe(false);
  });

  test("rejects malformed pages and timestamps", () => {
    for (const value of [undefined, {}, { data: [1] }, { data: [], nextCursor: 2 }]) expect(loadedPage(value).ok).toBe(false);
    expect(codexSession({ thread: { id: "own", cwd: "/work", updatedAt: Number.NaN } }, "own", source, observedAt).ok).toBe(false);
  });

  test("transport failure never certifies complete empty coverage", async () => {
    const rpc: ReadOnlyRpc = {
      request: async (method) => method === "thread/loaded/list" ? { ok: true, value: { data: ["own", "later"], nextCursor: null } } : { ok: false, reason: "connection lost" },
      close() {},
    };
    const result = await scanLoaded(rpc, source, observedAt);
    expect(result.reason).toBe("connection lost");
    expect(result.snapshot.coverage).toEqual([{ source, state: "unavailable", reason: "connection lost" }]);
  });

  test("read-only observations cannot enable any managed capability", () => {
    expect(unverifiedManagedCapabilities(source).map((c) => [c.capability, c.state])).toEqual([
      ["managed-ownership", "unverified"], ["background-workers", "unverified"], ["mixed-writers", "unverified"], ["native-installation", "unverified"],
    ]);
  });
});
