import { describe, expect, test } from "bun:test";
import { setFrontmatterLine } from "../core/frontmatter-patch";

describe("setFrontmatterLine", () => {
  test("replaces an inline value", () => {
    expect(setFrontmatterLine("---\nkind: gotcha\ncreated: old\n---\n# T\n", "created", "new")).toEqual({
      kind: "ok",
      text: "---\nkind: gotcha\ncreated: new\n---\n# T\n",
    });
  });

  test("replaces a block list with its continuation lines", () => {
    const text = "---\nseen-in:\n  - a\n  - b\npaths: [x/**]\n---\n";
    expect(setFrontmatterLine(text, "seen-in", "[a, b, c]")).toEqual({ kind: "ok", text: "---\nseen-in: [a, b, c]\npaths: [x/**]\n---\n" });
  });

  test("inserts a missing key before the closing fence", () => {
    expect(setFrontmatterLine("---\nkind: gotcha\n---\n# T\n", "created", "now")).toEqual({
      kind: "ok",
      text: "---\nkind: gotcha\ncreated: now\n---\n# T\n",
    });
  });

  test("leaves a body line that starts with the key alone", () => {
    const text = "---\nkind: gotcha\n---\nseen-in: is a field name\n";
    expect(setFrontmatterLine(text, "seen-in", "[a]")).toEqual({ kind: "ok", text: "---\nkind: gotcha\nseen-in: [a]\n---\nseen-in: is a field name\n" });
  });

  test("does not match a key that only shares a prefix", () => {
    const text = "---\ncreated-by: x\n---\n";
    expect(setFrontmatterLine(text, "created", "now")).toEqual({ kind: "ok", text: "---\ncreated-by: x\ncreated: now\n---\n" });
  });

  test("refuses text without a closed frontmatter block", () => {
    expect(setFrontmatterLine("# T\n", "a", "b")).toEqual({ kind: "invalid", reason: "entry has no frontmatter" });
    expect(setFrontmatterLine("---\nkind: x\n", "a", "b")).toEqual({ kind: "invalid", reason: "frontmatter has no closing ---" });
  });
});
