import { describe, expect, test } from "bun:test";
import { readSessionSnapshot, type SessionReader } from "../runtime/read-sessions";
import type { RuntimeSession, SessionSnapshot, SourceCoverage, SourceRef } from "../runtime/sessions";

const claude = { runtime: "claude", key: "home" } as const;
const codex = { runtime: "codex", key: "daemon" } as const;
const other = { runtime: "codex", key: "other" } as const;
const observedAt = "2026-11-09T04:00:00.000Z";
const session = (source: SourceRef): RuntimeSession => ({
  ref: { source, id: "same" }, cwd: "/work", status: "busy", observedAt,
  changedAt: observedAt, changedFrom: "updatedAt",
});
const snapshot = (source: SourceRef, coverage?: SourceCoverage): SessionSnapshot => ({
  sessions: [session(source)], coverage: [coverage ?? { source, state: "complete" }],
});
const reader = (source: SourceRef, value = snapshot(source)): SessionReader => ({ source, read: async () => value });

describe("configured session snapshot composition", () => {
  test("reads each source once with one observation time and retains equal native IDs", async () => {
    const calls: string[] = [];
    const readers = [claude, codex, other].map((source): SessionReader => ({
      source, read: async (at) => { calls.push(`${source.key}:${at}`); return snapshot(source); },
    }));
    expect(await readSessionSnapshot(readers, observedAt)).toEqual({
      ok: true, value: {
        sessions: [session(claude), session(codex), session(other)],
        coverage: [claude, codex, other].map((source) => ({ source, state: "complete" })),
      },
    });
    expect(calls).toEqual([claude, codex, other].map((source) => `${source.key}:${observedAt}`));
  });

  test("a failing source preserves healthy sources and valid partial observations", async () => {
    const failure = { source: codex, state: "unavailable", reason: "connection lost" } as const;
    expect(await readSessionSnapshot([reader(claude), reader(codex, snapshot(codex, failure))], observedAt)).toEqual({
      ok: true, value: { sessions: [session(claude), session(codex)], coverage: [{ source: claude, state: "complete" }, failure] },
    });
    const throwing: SessionReader = { source: codex, read: async () => { throw new Error("private endpoint details"); } };
    const result = await readSessionSnapshot([reader(claude), throwing], observedAt);
    expect(result).toEqual({ ok: true, value: {
      sessions: [session(claude)], coverage: [{ source: claude, state: "complete" }, { source: codex, state: "unavailable", reason: "session source read failed" }],
    } });
  });

  test("missing, foreign or contradictory coverage cannot certify a configured source", async () => {
    for (const invalid of [
      { sessions: [], coverage: [] },
      snapshot(other),
      { sessions: [session(other)], coverage: [{ source: codex, state: "complete" } as const] },
      { sessions: [], coverage: [{ source: codex, state: "complete" } as const, { source: codex, state: "unavailable", reason: "lost" } as const] },
      { sessions: [session(codex)], coverage: [{ source: codex, state: "verified-absent" } as const] },
      { sessions: [session(codex), session(codex)], coverage: [{ source: codex, state: "complete" } as const] },
    ]) {
      const result = await readSessionSnapshot([reader(claude), reader(codex, invalid)], observedAt);
      expect(result).toEqual({ ok: true, value: {
        sessions: [session(claude)], coverage: [{ source: claude, state: "complete" }, { source: codex, state: "unavailable", reason: "session source returned inconsistent observations" }],
      } });
    }
  });

  test("duplicate configured bindings refuse before any source is read", async () => {
    const duplicate: SessionReader = { source: codex, read: async () => { throw new Error("must not read"); } };
    expect(await readSessionSnapshot([duplicate, { ...duplicate, source: { ...codex } }], observedAt)).toEqual({
      ok: false, reason: "duplicate execution source configuration",
    });
  });

  test("only explicitly participating sources contribute coverage", async () => {
    const absent: SessionSnapshot = { sessions: [], coverage: [{ source: codex, state: "verified-absent" }] };
    expect(await readSessionSnapshot([reader(codex, absent)], observedAt)).toEqual({ ok: true, value: absent });
    expect(await readSessionSnapshot([reader(claude)], observedAt)).toEqual({ ok: true, value: snapshot(claude) });
    expect(await readSessionSnapshot([], observedAt)).toEqual({ ok: true, value: { sessions: [], coverage: [] } });
  });
});
