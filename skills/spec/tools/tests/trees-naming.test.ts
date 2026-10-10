import { describe, expect, test } from "bun:test";
import { specOfBranch, treeName } from "../trees/naming";

describe("treeName", () => {
  test("a PR group names the branch and folder the way people already cut them", () => {
    expect(treeName("spec-board", "B")).toEqual({ branch: "feat/spec-board-pr-b", folder: "spec-board-pr-b" });
    expect(treeName("double-charge-proof-checkout", "2")).toEqual({ branch: "feat/double-charge-proof-checkout-pr-2", folder: "double-charge-proof-checkout-pr-2" });
  });

  test("a phase with no PR group gets the spec's own branch", () => {
    expect(treeName("spec-board")).toEqual({ branch: "feat/spec-board", folder: "spec-board" });
  });
});

describe("specOfBranch", () => {
  test("reads the spec back from any branch treeName cuts", () => {
    expect(specOfBranch(treeName("spec-board", "B").branch)).toBe("spec-board");
    expect(specOfBranch(treeName("double-charge-proof-checkout", "2").branch)).toBe("double-charge-proof-checkout");
    expect(specOfBranch(treeName("spec-board").branch)).toBe("spec-board");
  });

  test("a branch outside feat/ names no spec", () => {
    expect(specOfBranch("main")).toBeUndefined();
    expect(specOfBranch("fix/typo")).toBeUndefined();
  });
});
