import { describe, expect, test } from "bun:test";
import { withoutTakenOver } from "../claims/held";
import type { HeldClaim } from "../claims/rules";
import { heldClaim } from "./factories";

const held = (sessionId: string, phase: string, status: HeldClaim["status"] = "live"): HeldClaim =>
  heldClaim(status, { phase, sessionId, workspace: "/work/alpha", claimedAt: "2026-10-01T00:00:00Z" });

describe("withoutTakenOver", () => {
  test("origin is the arbiter: a local claim whose phase another machine took over is dropped", () => {
    const local = [held("mine", "4"), held("mine", "5")];
    const remote = [held("theirs", "4", "remote")];
    expect(withoutTakenOver(local, remote)).toEqual([held("mine", "5")]);
  });

  test("with no remote claims the local ones stand", () => {
    expect(withoutTakenOver([held("mine", "4")], [])).toEqual([held("mine", "4")]);
  });
});
