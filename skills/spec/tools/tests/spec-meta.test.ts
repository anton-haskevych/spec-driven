import { describe, expect, test } from "bun:test";
import { readFocusFields, readSpecMeta } from "../core/spec-meta";

describe("readFocusFields", () => {
  test("reads a rank and an owner", () => {
    expect(readFocusFields({ focus: 12.5, owner: "taras" })).toEqual({ focus: 12.5, owner: "taras", problems: [] });
    expect(readFocusFields({ focus: 0 })).toEqual({ focus: 0, problems: [] });
  });

  test("is silent when neither key is set", () => {
    expect(readFocusFields({ status: "active" })).toEqual({ problems: [] });
  });

  test("a focus that is not a finite number ≥ 0 is no rank, and a problem", () => {
    for (const focus of ["soon", -1, Number.POSITIVE_INFINITY, null, [1]]) {
      const fields = readFocusFields({ focus });
      expect(fields.focus).toBeUndefined();
      expect(fields.problems).toEqual([`focus ${JSON.stringify(focus)} is not a number ≥ 0`]);
    }
  });

  test("an owner that is not a name is a problem", () => {
    for (const owner of [42, null, ["anton"], " "]) {
      const fields = readFocusFields({ owner });
      expect(fields.owner).toBeUndefined();
      expect(fields.problems).toEqual([`owner ${JSON.stringify(owner)} is not a name`]);
    }
  });
});

describe("readSpecMeta", () => {
  test("carries focus and owner, dropping a malformed focus", () => {
    expect(readSpecMeta({ focus: 20, owner: "anton" })).toMatchObject({ focus: 20, owner: "anton" });
    expect(readSpecMeta({ focus: "top" }).focus).toBeUndefined();
  });
});
