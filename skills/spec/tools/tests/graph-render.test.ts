import { describe, expect, test } from "bun:test";
import { renderLinks } from "../graph/render";

describe("renderLinks", () => {
  test("marks a linked or overlapping spec another session is working on", () => {
    const inFlight = new Map([["loop", "loop execute 3"], ["shared", "shared execute 1"]]);
    const text = renderLinks([{ type: "related", other: "loop", note: "built packs", open: false }], [{ other: "shared", shared: ["a.ts"] }], inFlight);
    expect(text).toBe(
      "- related: loop  (built packs)  (in flight: loop execute 3)\n- overlap?: shared shares a.ts and no relation is declared  (in flight: shared execute 1)",
    );
  });

  test("without anything in flight the lines are unchanged", () => {
    expect(renderLinks([], [{ other: "shared", shared: ["a.ts"] }])).toBe("- overlap?: shared shares a.ts and no relation is declared");
  });
});
