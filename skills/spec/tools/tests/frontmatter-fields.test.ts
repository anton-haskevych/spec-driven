import { describe, expect, test } from "bun:test";
import { booleanField, numberField, recordField } from "../core/frontmatter";

describe("typed frontmatter fields", () => {
  const data = { draft: false, at: 500000, text: "yes", pr: { merge: "squash" }, list: [1] };

  test("booleanField reads booleans only", () => {
    expect(booleanField(data, "draft")).toBe(false);
    expect(booleanField(data, "text")).toBeUndefined();
    expect(booleanField(data, "missing")).toBeUndefined();
  });

  test("numberField reads finite numbers only", () => {
    expect(numberField(data, "at")).toBe(500000);
    expect(numberField(data, "text")).toBeUndefined();
    expect(numberField({ at: Number.NaN }, "at")).toBeUndefined();
  });

  test("recordField reads nested maps only", () => {
    expect(recordField(data, "pr")).toEqual({ merge: "squash" });
    expect(recordField(data, "list")).toBeUndefined();
    expect(recordField(data, "text")).toBeUndefined();
  });
});
