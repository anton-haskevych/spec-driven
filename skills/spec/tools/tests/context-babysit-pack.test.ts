import { describe, expect, test } from "bun:test";
import { babysitPack } from "../context/babysit-pack";
import type { SpecState } from "../core/spec-state";
import { phaseEdges, phaseState } from "./factories";

const state: SpecState = {
  spec: { name: "pr-babysit", dir: "/specs/pr-babysit" },
  hasProgress: true,
  phases: [phaseState({ id: "1", done: true, edges: phaseEdges({ pr: "B" }) })],
};

describe("babysitPack", () => {
  test("`<group> hold` names group B and says the PR is held for review", () => {
    const pack = babysitPack({ state, doctor: "doctor: clean" }, "B hold");
    expect(pack).toContain("### PR group B · branch feat/pr-babysit-pr-b");
    expect(pack).toContain("Mode: hold-for-review (`hold`)");
  });

  test("without `hold` the mode line is absent", () => {
    const pack = babysitPack({ state, doctor: "doctor: clean" }, "B");
    expect(pack).toContain("### PR group B");
    expect(pack).not.toContain("Mode:");
  });

  test("an unknown group still says so", () => {
    expect(babysitPack({ state, doctor: "" }, "C hold")).toBe("No PR group C in pr-babysit; its groups: B. Tell the user and stop.");
  });
});
