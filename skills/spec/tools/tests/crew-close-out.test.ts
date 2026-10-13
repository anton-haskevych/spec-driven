import { describe, expect, test } from "bun:test";
import { babysitterVerdict, closeOutLine, closeOutVerdict, type CloseOutFacts } from "../crew/close-out";
import { findCrewLine } from "../crew/crew-line";

const CREW = "Crew: needs you 1 (in-flight.md) · say if wrong 3 · PR group ready B · next nothing · servers stopped none";

describe("findCrewLine", () => {
  test("reads the counts, the PR group and what's next from the last Crew: line", () => {
    expect(findCrewLine(`Done.\n${CREW}\nHanded off.`)).toEqual({ raw: CREW, needsYou: 1, sayIfWrong: 3, prGroupReady: "B", next: "nothing" });
  });

  test("PR group ready no is no group; next same phase is kept whole", () => {
    const line = findCrewLine("Crew: needs you 0 (in-flight.md) · say if wrong 0 · PR group ready no · next same phase · servers stopped none");
    expect(line).not.toHaveProperty("prGroupReady");
    expect(line?.next).toBe("same phase");
  });

  test("no Crew: line is undefined", () => {
    expect(findCrewLine("Handed off.")).toBeUndefined();
  });
});

describe("closeOutVerdict", () => {
  const clean: CloseOutFacts = { tree: "/trees/a", dirty: false, pushed: true, handedOff: true, crewLine: findCrewLine(CREW), claimLive: false };

  test("all four checks pass: ok with the Crew: line", () => {
    expect(closeOutLine(closeOutVerdict(clean))).toBe(`Close-out: ok · ${CREW}`);
  });

  test("each failed check is named", () => {
    const verdict = closeOutVerdict({ ...clean, dirty: true, pushed: false, handedOff: false, crewLine: undefined, claimLive: true });
    expect(closeOutLine(verdict)).toBe("Close-out: missing uncommitted changes in /trees/a, commits not on origin, no [handoff] commit since launch, no Crew: line, claim still live");
  });

  test("a gone session with no claim has no tree to check", () => {
    expect(closeOutLine(closeOutVerdict({ ...clean, tree: undefined }))).toBe("Close-out: missing its tree (session gone, no claim)");
  });
});

describe("babysitterVerdict", () => {
  test("a live PR claim is waiting on CI: never closed out", () => {
    expect(closeOutLine(babysitterVerdict("B", true, "anything"))).toBe("Close-out: waiting (pr-B claim live)");
  });

  test("released: ok with its final line", () => {
    expect(closeOutLine(babysitterVerdict("B", false, "PR #31 is green.\nMerged #31 checkout B\n"))).toBe("Close-out: ok · Merged #31 checkout B");
  });
});
