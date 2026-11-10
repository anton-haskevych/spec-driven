import { expect, test } from "bun:test";
import { decodeClaimDocument } from "../claims/document";
import { claim } from "./factories";

const claude = { runtime: "claude", key: "explicit-home" } as const;
const codex = { runtime: "codex", key: "explicit-daemon" } as const;
const ref = { source: codex, id: "same" };
const legacy = claim({ sessionId: "same", takenFrom: "previous" });
const qualified = {
  schemaVersion: 1, spec: legacy.spec, phase: legacy.phase, workspace: legacy.workspace,
  claimedAt: legacy.claimedAt, ref, takenFrom: { source: claude, id: "same" },
};

test("legacy identity and takeover require the caller's explicit Claude source", () => {
  expect(decodeClaimDocument(JSON.stringify(legacy)).ok).toBe(false);
  const decoded = decodeClaimDocument(JSON.stringify(legacy), claude);
  expect(decoded.ok && decoded.value.claim).toEqual({
    spec: legacy.spec, phase: legacy.phase, workspace: legacy.workspace, claimedAt: legacy.claimedAt,
    ref: { source: claude, id: "same" }, takenFrom: { source: claude, id: "previous" },
  });
  expect(decoded.ok && decoded.value.record).toEqual({ ...legacy });
});

test("versioned identity and takeover keep their exact sources regardless of legacy binding", () => {
  const decoded = decodeClaimDocument(JSON.stringify(qualified), claude);
  expect(decoded.ok && decoded.value.claim).toEqual({
    spec: legacy.spec, phase: legacy.phase, workspace: legacy.workspace, claimedAt: legacy.claimedAt,
    ref, takenFrom: { source: claude, id: "same" },
  });
});

test("unknown fields survive at document, reference, source and takeover levels", () => {
  const record = { ...qualified, future: { token: [1, 2] },
    ref: { ...ref, future: true, source: { ...codex, future: "source" } },
    takenFrom: { source: claude, id: "previous", future: { generation: 3 } },
  };
  const decoded = decodeClaimDocument(JSON.stringify(record));
  expect(decoded.ok && decoded.value.record).toEqual(record);
  expect(decoded.ok && decoded.value.claim.ref).toEqual(ref);
  const oldRecord = { ...legacy, extension: { keep: true } };
  const oldDecoded = decodeClaimDocument(JSON.stringify(oldRecord), claude);
  expect(oldDecoded.ok && oldDecoded.value.record).toEqual(oldRecord);
});

test("identity or version evidence never falls back to a legacy claim", () => {
  for (const marker of [
    { schemaVersion: 2 }, { schemaVersion: "1" }, { schemaVersion: null },
    { runtime: "codex" }, { version: 1 }, { source: codex }, { ref }, { sessionRef: ref },
  ]) expect(decodeClaimDocument(JSON.stringify({ ...legacy, ...marker }), claude).ok).toBe(false);
});

test("malformed runtime, source, opaque ID, takeover and optional fields refuse the record", () => {
  for (const changes of [
    { ref: { source: { runtime: "other", key: "x" }, id: "same" } },
    { ref: { source: { runtime: "codex", key: "" }, id: "same" } },
    { ref: { source: codex, id: " same " } }, { ref: { source: codex, id: 1 } },
    { takenFrom: "previous" }, { takenFrom: null },
    { takenFrom: { source: { runtime: "codex", key: "" }, id: "previous" } },
    { sessionId: "conflicting" }, { sessionName: 12 }, { branch: false }, { workspace: "" },
  ]) expect(decodeClaimDocument(JSON.stringify({ ...qualified, ...changes }), claude).ok).toBe(false);
  expect(decodeClaimDocument(JSON.stringify({ ...legacy, takenFrom: ref }), claude).ok).toBe(false);
  expect(decodeClaimDocument(JSON.stringify(legacy), { runtime: "claude", key: " " }).ok).toBe(false);
});

test("invalid JSON and non-record values are reported explicitly", () => {
  for (const text of ["{half", "null", "[]", '"claim"', "{}"])
    expect(decodeClaimDocument(text, claude).ok).toBe(false);
});
