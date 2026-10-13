import { describe, expect, test } from "bun:test";
import { overseerLine, whoseRun } from "../crew/overseer";
import { liveSession } from "./factories";

const OWN = "48777164-0d07-4950-a27e-f5187ba29739";
const TAB = "4efef1e3-0f75-4623-beeb-95b1e6509824";

describe("whoseRun", () => {
  test("no run yet, or the recorded id is this session: it is this session's", () => {
    expect(whoseRun(undefined, [], OWN)).toEqual({ kind: "own" });
    expect(whoseRun(OWN, [liveSession({ sessionId: OWN })], OWN)).toEqual({ kind: "own" });
  });

  test("a recorded overseer that is no longer live is taken over", () => {
    expect(whoseRun(TAB, [liveSession({ sessionId: OWN })], OWN)).toEqual({ kind: "take-over", from: TAB, why: "closed" });
  });

  test("a live recorded overseer is another overseer", () => {
    expect(whoseRun(TAB, [liveSession({ sessionId: TAB, name: "repo oversee-crew" })], OWN)).toEqual({ kind: "other", id: TAB, name: "repo oversee-crew" });
  });

  test("the recorded tab parked into this session's job: this session takes its own run over (first crew run)", () => {
    const sessions = [liveSession({ sessionId: TAB, parkedJobId: "48777164" }), liveSession({ sessionId: OWN })];
    expect(whoseRun(TAB, sessions, OWN)).toEqual({ kind: "take-over", from: TAB, why: "parked into this session" });
  });

  test("the recorded tab parked into another live job: that job is the overseer", () => {
    const job = "9a8b7c6d-0000-4000-8000-000000000000";
    const sessions = [liveSession({ sessionId: TAB, parkedJobId: "9a8b7c6d" }), liveSession({ sessionId: job, name: "repo oversee-crew" })];
    expect(whoseRun(TAB, sessions, OWN)).toEqual({ kind: "other", id: job, name: "repo oversee-crew" });
  });

  test("the recorded tab parked into a job that has ended: taken over", () => {
    expect(whoseRun(TAB, [liveSession({ sessionId: TAB, parkedJobId: "9a8b7c6d" })], OWN)).toEqual({ kind: "take-over", from: TAB, why: "closed" });
  });
});

describe("overseerLine", () => {
  test("one line per verdict", () => {
    expect(overseerLine({ kind: "own" })).toBe("Overseer: this session");
    expect(overseerLine({ kind: "take-over", from: TAB, why: "closed" })).toBe(`Overseer: taking over from ${TAB} (closed)`);
    expect(overseerLine({ kind: "other", id: TAB, name: "x" })).toBe(`Overseer: another live overseer ${TAB} · x`);
  });
});
