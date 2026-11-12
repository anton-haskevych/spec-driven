import { describe, expect, test } from "bun:test";
import { count, oneOf, stringArray } from "../core/read-fields";

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
