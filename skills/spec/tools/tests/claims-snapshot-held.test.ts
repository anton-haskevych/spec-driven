import { expect, test } from "bun:test";
import { heldPhasesFromSnapshot, type SessionPhaseClaim } from "../claims/snapshot-held";
import type { RuntimeSession, SessionRef, SessionSnapshot, SourceCoverage } from "../runtime/sessions";

const claude = { runtime: "claude", key: "home-a" } as const;
const codex = { runtime: "codex", key: "daemon-a" } as const;
const otherCodex = { runtime: "codex", key: "daemon-b" } as const;
const own: SessionRef = { source: codex, id: "same" };
const claim = (ref: SessionRef, phase = "1"): SessionPhaseClaim => ({ spec: "one", phase, ref });
const session = (ref: SessionRef): RuntimeSession => ({ ref, cwd: "/repo", status: "idle", observedAt: "now", changedAt: "now", changedFrom: "updatedAt" });
const held = (claims: SessionPhaseClaim[], coverage: SourceCoverage[], sessions: RuntimeSession[] = []) => {
  const snapshot: SessionSnapshot = { coverage, sessions };
  return [...heldPhasesFromSnapshot(claims, { own, snapshot })];
};

test("equal native IDs in another runtime/source are not the caller's claim", () => {
  const refs = [{ source: claude, id: "same" }, { source: otherCodex, id: "same" }];
  expect(held([claim(own, "1"), claim(refs[0]!, "2"), claim(refs[1]!, "3")], [], refs.map(session))).toEqual([
    ["one#2", "session same"], ["one#3", "session same"],
  ]);
});

test("only complete coverage of the exact claim source proves absence", () => {
  const other = { source: otherCodex, id: "other" };
  expect(held([claim(other)], [{ source: codex, state: "complete" }])).toHaveLength(1);
  for (const state of ["complete", "verified-absent"] as const) expect(held([claim(other)], [{ source: otherCodex, state }])).toEqual([]);
});

test("partial or missing source coverage holds claims while healthy sources remain usable", () => {
  const missing = { source: otherCodex, id: "missing" };
  const closed = { source: claude, id: "closed" };
  expect(held([claim(missing), claim(closed, "2")], [
    { source: otherCodex, state: "unavailable", reason: "partial page" }, { source: claude, state: "complete" },
  ])).toEqual([["one#1", "session missing"]]);
  expect(held([claim(missing)], [])).toHaveLength(1);
});

test("live rows hold claims even with partial or contradictory coverage", () => {
  const ref = { source: claude, id: "live" };
  expect(held([{ ...claim(ref), sessionName: "working" }], [{ source: claude, state: "unavailable", reason: "incomplete" }], [session(ref)])).toEqual([["one#1", "working"]]);
  expect(held([claim(ref)], [{ source: claude, state: "complete" }, { source: claude, state: "unavailable", reason: "duplicate" }])).toHaveLength(1);
});
