import { describe, expect, test } from "bun:test";
import { COMMANDS, run, USAGE } from "../spec";

describe("spec.ts command table", () => {
  test("every command has usage text that starts with its name", () => {
    for (const [name, command] of Object.entries(COMMANDS)) {
      expect(command.usage.startsWith(name)).toBe(true);
    }
  });

  test("USAGE lists every command", () => {
    for (const command of Object.values(COMMANDS)) expect(USAGE).toContain(command.usage);
  });

  test("an unknown or missing command prints USAGE", async () => {
    expect(await run(["nope"], "/nowhere")).toBe(USAGE);
    expect(await run([], "/nowhere")).toBe(USAGE);
    expect(await run(["toString"], "/nowhere")).toBe(USAGE);
  });
});
