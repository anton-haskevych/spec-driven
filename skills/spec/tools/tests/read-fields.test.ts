import { describe, expect, test } from "bun:test";
import { count, flag, oneOf, optionalText, requiredText, stringArray, wholeNumber, withoutUndefined } from "../core/read-fields";

describe("field readers shared by settings and record documents", () => {
  test("oneOf keeps an allowed value and names the choices otherwise", () => {
    const problems: string[] = [];
    expect(oneOf("on", ["on", "off"], "board.record", problems)).toBe("on");
    expect(oneOf(undefined, ["on", "off"], "board.record", problems)).toBeUndefined();
    expect(oneOf("yes", ["on", "off"], "board.record", problems)).toBeUndefined();
    expect(oneOf("x", ["a", "b", "c"], "k", problems)).toBeUndefined();
    expect(problems).toEqual(['board.record must be on or off, not "yes"', 'k must be a, b or c, not "x"']);
  });

  test("stringArray reads a list of strings, empty when absent", () => {
    const problems: string[] = [];
    expect(stringArray(["a", "b"], "needs", problems)).toEqual(["a", "b"]);
    expect(stringArray(undefined, "needs", problems)).toEqual([]);
    expect(stringArray([1], "needs", problems)).toEqual([]);
    expect(problems).toEqual(['needs must be a list of strings, e.g. needs: ["Vercel*"]']);
  });

  test("count reads a whole number, 0 or more", () => {
    const problems: string[] = [];
    expect(count(3, "crew.workers", problems)).toBe(3);
    expect(count(undefined, "crew.workers", problems)).toBeUndefined();
    expect(count(-1, "crew.workers", problems)).toBeUndefined();
    expect(problems).toEqual(["crew.workers must be a whole number, 0 or more"]);
  });
});

describe("readers for record documents", () => {
  test("requiredText and optionalText", () => {
    const problems: string[] = [];
    expect(requiredText(" a ", "id", problems)).toBe("a");
    expect(requiredText("", "id", problems)).toBeUndefined();
    expect(optionalText(undefined, "pr", problems)).toBeUndefined();
    expect(optionalText(3, "pr", problems)).toBeUndefined();
    expect(problems).toEqual(["id must be text", "pr must be text"]);
  });

  test("flag and wholeNumber", () => {
    const problems: string[] = [];
    expect(flag(false, "code", problems)).toBe(false);
    expect(flag(undefined, "code", problems)).toBeUndefined();
    expect(wholeNumber(2, "planVersion", problems, 1)).toBe(2);
    expect(wholeNumber(0, "planVersion", problems, 1)).toBeUndefined();
    expect(wholeNumber(undefined, "layout", problems)).toBeUndefined();
    expect(problems).toEqual(["code must be true or false", "planVersion must be a whole number, 1 or more", "layout must be a whole number, 0 or more"]);
  });

  test("withoutUndefined drops absent optional fields", () => {
    expect(withoutUndefined<Record<string, unknown>>({ a: 1, b: undefined })).toEqual({ a: 1 });
    expect(Object.keys(withoutUndefined({ a: 1, b: undefined }))).toEqual(["a"]);
  });
});
