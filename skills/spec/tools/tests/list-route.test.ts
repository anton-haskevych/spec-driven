import { describe, expect, test } from "bun:test";
import { LIST_USAGE, listRoute } from "../commands/list";

describe("listRoute", () => {
  test("no words: the board, fetched", () => {
    expect(listRoute([])).toEqual({ kind: "board", local: false });
  });

  test("--local alone: the board without fetching", () => {
    expect(listRoute(["--local"])).toEqual({ kind: "board", local: true });
  });

  test("table, all, --json or filter words: the table, which ignores --local", () => {
    expect(listRoute(["table"])).toEqual({ kind: "table", args: ["table"] });
    expect(listRoute(["all", "--json"])).toEqual({ kind: "table", args: ["all", "--json"] });
    expect(listRoute(["growth", "--local"])).toEqual({ kind: "table", args: ["growth"] });
  });

  test("an unknown -- flag prints usage instead of filtering by it", () => {
    expect(listRoute(["--mine"])).toBe(`usage: ${LIST_USAGE}`);
    expect(listRoute(["table", "--locale"])).toBe(`usage: ${LIST_USAGE}`);
  });
});
