import { describe, expect, test } from "bun:test";
import { hasMatchKey, INVALID_OWNER, isOffered, ownerOf, personKey, samePerson } from "../core/people";
import { specMeta } from "./factories";

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

describe("hasMatchKey", () => {
  test("needs 3 letters or digits after dropping the rest", () => {
    expect(hasMatchKey("tar")).toBe(true);
    expect(hasMatchKey("Taras Korpach")).toBe(true);
    expect(hasMatchKey("tk")).toBe(false);
    expect(hasMatchKey("t.k.")).toBe(false);
    expect(hasMatchKey("Тарас")).toBe(false);
  });
});

describe("isOffered", () => {
  test("an unowned row is offered to everyone", () => {
    expect(isOffered(undefined, "anton-haskevych")).toBe(true);
  });

  test("an owned row is offered to its owner, matched by prefix", () => {
    expect(isOffered("taras", "Taras Korpach")).toBe(true);
    expect(isOffered("Taras Korpach", "taraskorpach")).toBe(true);
  });

  test("an owned row is not offered to someone else", () => {
    expect(isOffered("taras", "anton-haskevych")).toBe(false);
  });

  test("an invalid, too short or non-ASCII owner is offered to no one", () => {
    expect(isOffered(INVALID_OWNER, "anton-haskevych")).toBe(false);
    expect(isOffered("tk", "tk")).toBe(false);
    expect(isOffered("Тарас", "Тарас")).toBe(false);
  });
});

describe("ownerOf", () => {
  test("is the spec's owner, nothing when unset, and INVALID_OWNER when malformed", () => {
    expect(ownerOf(specMeta({ owner: "taras" }))).toBe("taras");
    expect(ownerOf(specMeta())).toBeUndefined();
    expect(ownerOf(specMeta({ ownerInvalid: true }))).toBe(INVALID_OWNER);
  });
});
