import { describe, expect, test } from "bun:test";
import { claimRef, decodeRemotePayload, encodeRemotePayload, pushOutcome } from "../claims/remote-payload";
import type { Claim } from "../claims/store";

const CLAIM: Claim = { spec: "alpha", phase: "4a", sessionId: "s1", sessionName: "alpha execute 4a", workspace: "/work/crm", branch: "feat/alpha", claimedAt: "2026-10-01T20:00:00.000Z" };
const HOLDER = { user: "Taras", host: "taras-mbp" };
const REF = "refs/spec-claims/alpha/4a";

describe("claimRef", () => {
  test("one ref per spec phase under refs/spec-claims", () => {
    expect(claimRef("alpha", "4a")).toBe(REF);
  });
});

describe("remote payload", () => {
  test("round-trips the claim and its holder", () => {
    expect(decodeRemotePayload(encodeRemotePayload(CLAIM, HOLDER))).toEqual({ claim: CLAIM, holder: HOLDER });
  });

  test("a commit message with trailing newlines still decodes", () => {
    expect(decodeRemotePayload(`${encodeRemotePayload(CLAIM, HOLDER)}\n\n`)).toEqual({ claim: CLAIM, holder: HOLDER });
  });

  test("a payload without a holder or claim fields is unreadable", () => {
    expect(decodeRemotePayload(JSON.stringify(CLAIM))).toBeUndefined();
    expect(decodeRemotePayload(JSON.stringify({ holder: HOLDER }))).toBeUndefined();
    expect(decodeRemotePayload("not json")).toBeUndefined();
  });
});

// Lines as GitHub printed them in the probe (ledger domain-github-claim-ref-leases.md).
describe("pushOutcome", () => {
  const result = (code: number, stdout: string, stderr = "") => ({ code, stdout, stderr });
  const to = "To https://github.com/o/r.git\n";

  test("a new, forced or deleted ref is pushed", () => {
    expect(pushOutcome(result(0, `${to}*\tabc:${REF}\t[new reference]\nDone\n`), REF)).toEqual({ kind: "pushed" });
    expect(pushOutcome(result(0, `${to}+\tabc:${REF}\te1a5f2d...41c76aa (forced update)\nDone\n`), REF)).toEqual({ kind: "pushed" });
    expect(pushOutcome(result(0, `${to}-\t:${REF}\t[deleted]\nDone\n`), REF)).toEqual({ kind: "pushed" });
  });

  test("a stale lease or a server-side rejection is refused", () => {
    expect(pushOutcome(result(1, `${to}!\tabc:${REF}\t[rejected] (stale info)\nDone\n`), REF)).toEqual({ kind: "refused" });
    expect(pushOutcome(result(1, `${to}!\tabc:${REF}\t[remote rejected] (failed to update ref)\nDone\n`), REF)).toEqual({ kind: "refused" });
  });

  test("no line for the ref means origin was never reached", () => {
    const outcome = pushOutcome(result(128, "", "fatal: unable to access 'https://github.com/o/r.git/': Could not resolve host\n"), REF);
    expect(outcome).toEqual({ kind: "offline", reason: "fatal: unable to access 'https://github.com/o/r.git/': Could not resolve host" });
  });

  test("a line for another ref does not count", () => {
    expect(pushOutcome(result(0, `${to}*\tabc:refs/spec-claims/alpha/4\t[new reference]\n`), REF).kind).toBe("offline");
  });
});
