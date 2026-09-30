import { describe, expect, test } from "bun:test";
import { normalizePhaseHint, parseContextRequest } from "../context/request";

describe("parseContextRequest", () => {
  test.each([
    [["execute", "checkout", "phase", "3a"], { mode: "execute", name: "checkout", hint: "phase 3a" }],
    [["checkout resume"], { mode: "resume", name: "checkout" }],
    [["checkout"], { mode: "route", name: "checkout" }],
    [["EXECUTE checkout\n"], { mode: "execute", name: "checkout" }],
  ])("keeps today's forms: %p", (argv, expected) => {
    expect(parseContextRequest(argv)).toEqual({ hint: undefined, ...expected });
  });

  test.each([
    ["my-spec.", { mode: "route", name: "my-spec" }],
    ["execute my-spec!", { mode: "execute", name: "my-spec" }],
    ["execute v1.2-migration", { mode: "execute", name: "v1.2-migration" }],
  ])("strips trailing punctuation from %p", (text, expected) => {
    expect(parseContextRequest([text])).toEqual({ hint: undefined, ...expected });
  });

  test("the last-token form keeps middle tokens as the hint", () => {
    expect(parseContextRequest(["x phase 2 execute"])).toEqual({ mode: "execute", name: "x", hint: "phase 2" });
  });

  test.each(["phase15", "phase-3", "3", "7ab", "9.10", "next", "phase 3a", "Phase 2"])(
    "a chunk reference in the name slot becomes the hint: %p",
    (reference) => {
      expect(parseContextRequest([`execute ${reference}`])).toEqual({ mode: "execute", name: undefined, hint: reference });
    },
  );

  test("a chunk reference works for resume and status too", () => {
    expect(parseContextRequest(["resume 3"])).toEqual({ mode: "resume", name: undefined, hint: "3" });
  });

  test.each(["phase2-rollout", "phase", "2fa-login"])("a name that only starts like a chunk reference stays a name: %p", (name) => {
    expect(parseContextRequest([`execute ${name}`])).toEqual({ mode: "execute", name, hint: undefined });
  });

  test("an existing spec name always wins over the chunk-reference reading", () => {
    const isSpecName = (name: string) => name === "2fa";
    expect(parseContextRequest(["execute 2fa"], isSpecName)).toEqual({ mode: "execute", name: "2fa", hint: undefined });
    expect(parseContextRequest(["execute 2fa"])).toEqual({ mode: "execute", name: undefined, hint: "2fa" });
  });

  test("no name at all", () => {
    expect(parseContextRequest(["execute\n"])).toEqual({ mode: "execute", name: undefined, hint: undefined });
  });
});

describe("normalizePhaseHint", () => {
  test.each([
    ["phase 3a", "3a"],
    ["phase15", "15"],
    ["phase-3", "3"],
    ["Phase 2", "2"],
    ["7ab", "7ab"],
    ["next", "next"],
  ])("%p → %p", (hint, id) => {
    expect(normalizePhaseHint(hint)).toBe(id);
  });
});
