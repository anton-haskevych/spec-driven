import { describe, expect, test } from "bun:test";
import { focusBand, readFocusFields, readShipField, readSpecMeta, shipMode } from "../core/spec-meta";

describe("focusBand", () => {
  test("reads must, should and could in any case", () => {
    expect(["must", "Should", "COULD", " must "].map(focusBand)).toEqual(["must", "should", "could", "must"]);
  });

  test("anything else is no band, a number included", () => {
    for (const value of ["soon", "", 10, null, ["must"], undefined]) expect(focusBand(value)).toBeUndefined();
  });
});

describe("readFocusFields", () => {
  test("reads a band and an owner", () => {
    expect(readFocusFields({ focus: "must", owner: "taras" })).toEqual({ focus: "must", owner: "taras", problems: [], warnings: [] });
    expect(readFocusFields({ focus: "Could" })).toEqual({ focus: "could", problems: [], warnings: [] });
  });

  test("is silent when neither key is set", () => {
    expect(readFocusFields({ status: "active" })).toEqual({ problems: [], warnings: [] });
  });

  test("a 2.37.0 rank reads as should, with a warning", () => {
    expect(readFocusFields({ focus: 10 })).toEqual({ focus: "should", problems: [], warnings: ["focus 10 is a 2.37.0 rank; use must, should or could"] });
    expect(readFocusFields({ focus: 2.5 }).focus).toBe("should");
  });

  test("anything else is no band, and a problem", () => {
    for (const focus of ["soon", null, ["must"], Number.POSITIVE_INFINITY]) {
      const fields = readFocusFields({ focus });
      expect(fields.focus).toBeUndefined();
      expect(fields.problems).toEqual([`focus ${JSON.stringify(focus)} is not one of must, should, could`]);
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
    expect(readSpecMeta({ focus: "should", owner: "anton" })).toMatchObject({ focus: "should", owner: "anton" });
    expect(readSpecMeta({ focus: 20 }).focus).toBe("should");
    expect(readSpecMeta({ focus: "top" }).focus).toBeUndefined();
  });
});

describe("shipMode", () => {
  test("reads auto and hold-for-review in any case", () => {
    expect(["auto", "Hold-For-Review", " auto "].map(shipMode)).toEqual(["auto", "hold-for-review", "auto"]);
  });

  test("anything else is no mode", () => {
    for (const value of ["hold", "", 1, null, ["auto"], undefined]) expect(shipMode(value)).toBeUndefined();
  });
});

describe("readShipField", () => {
  test("reads a mode, and is silent without the key", () => {
    expect(readShipField({ ship: "hold-for-review" })).toEqual({ ship: "hold-for-review", problems: [] });
    expect(readShipField({ status: "active" })).toEqual({ problems: [] });
  });

  test("an unknown value is no mode, and a problem", () => {
    for (const ship of ["merge", null, ["auto"]]) {
      expect(readShipField({ ship })).toEqual({ problems: [`ship ${JSON.stringify(ship)} is not one of auto, hold-for-review`] });
    }
  });

  test("readSpecMeta carries it", () => {
    expect(readSpecMeta({ ship: "auto" }).ship).toBe("auto");
    expect(readSpecMeta({ ship: "later" }).ship).toBeUndefined();
  });
});
