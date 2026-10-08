import { describe, expect, test } from "bun:test";
import { personKey, samePerson } from "../board/people";

describe("samePerson", () => {
  test("a git name, a gh login and a short name of one person match each other, both ways", () => {
    const names = ["Taras Korpach", "taraskorpach", "taras"];
    for (const a of names) for (const b of names) expect([a, b, samePerson(a, b)]).toEqual([a, b, true]);
    expect(samePerson("anton-haskevych", "anton-haskevych")).toBe(true);
  });

  test("a prefix is enough, so anton matches antonio Ruiz: bucketing only ever compares against me", () => {
    expect(samePerson("anton", "antonio Ruiz")).toBe(true);
    expect(samePerson("antonio Ruiz", "anton")).toBe(true);
  });

  test("unknown never matches, not even itself", () => {
    expect(samePerson("unknown", "unknown")).toBe(false);
    expect(samePerson("Unknown", "unknown-person")).toBe(false);
  });

  test("different people, and prefixes under 3 characters, don't match", () => {
    expect(samePerson("taras", "anton-haskevych")).toBe(false);
    expect(samePerson("an", "anton")).toBe(false);
    expect(samePerson("", "")).toBe(false);
  });
});

describe("personKey", () => {
  test("lowercases and drops everything but letters and digits", () => {
    expect(personKey("Taras Korpach")).toBe("taraskorpach");
    expect(personKey("anton-haskevych")).toBe("antonhaskevych");
    expect(personKey("app/dependabot")).toBe("appdependabot");
  });
});
