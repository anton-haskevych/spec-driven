import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PHASE_ACTIONS } from "../commands/phase";
import { COMMANDS, run, USAGE } from "../spec";

const SKILL_DIR = join(import.meta.dir, "..", "..");
const MODE_FILES = readdirSync(SKILL_DIR).filter((file) => file.endsWith(".md"));

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

  test("every spec.ts command and phase action a mode file names exists", () => {
    for (const file of MODE_FILES) {
      const text = readFileSync(join(SKILL_DIR, file), "utf8");
      for (const [, name] of text.matchAll(/tools\/spec\.ts ([a-z-]+)/g)) expect({ file, name, known: Object.hasOwn(COMMANDS, name ?? "") }).toEqual({ file, name, known: true });
      for (const [, action] of text.matchAll(/spec\.ts phase ([a-z]+)/g)) expect({ file, action, known: PHASE_ACTIONS.includes(action ?? "") }).toEqual({ file, action, known: true });
    }
  });
});
