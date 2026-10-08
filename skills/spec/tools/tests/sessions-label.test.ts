import { describe, expect, test } from "bun:test";
import { sessionLabel } from "../sessions/label";

describe("sessionLabel", () => {
  test("uses the session's name when it has one", () => {
    expect(sessionLabel("checkout execute 2", "0123456789abcdef")).toBe("checkout execute 2");
  });

  test("falls back to the first 8 characters of the session id", () => {
    expect(sessionLabel(undefined, "0123456789abcdef")).toBe("session 01234567");
  });
});
