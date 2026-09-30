import { describe, expect, test } from "bun:test";
import { findPhase } from "../phases/find-phase";
import { phaseState } from "./factories";

const state = {
  spec: { name: "checkout", dir: "/specs/checkout" },
  hasProgress: true,
  phases: [phaseState({ id: "1" }), phaseState({ id: "2a", name: "Split" })],
};

describe("findPhase", () => {
  test("accepts a bare id, a phase-prefixed id and any case", () => {
    expect(findPhase(state, "2a")).toMatchObject({ id: "2a" });
    expect(findPhase(state, "Phase 2A")).toMatchObject({ id: "2a" });
    expect(findPhase(state, "phase-1")).toMatchObject({ id: "1" });
  });

  test("names the spec and its phases when the id is unknown", () => {
    expect(findPhase(state, "9")).toBe("no Phase 9 in checkout; phases: 1, 2a");
  });
});
