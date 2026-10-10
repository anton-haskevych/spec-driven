import { describe, expect, test } from "bun:test";
import { alignColumns } from "../core/columns";

describe("alignColumns", () => {
  test("pads every column but the last to its widest cell, measuring glyphs by display width", () => {
    expect(alignColumns([["★ a", "x", ""], ["bbbb", "yy", "end"]])).toEqual(["★ a   x", "bbbb  yy  end"]);
  });
});
