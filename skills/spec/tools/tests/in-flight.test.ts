import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inFlightFilesIn, notesForPhase, readInFlight } from "../core/in-flight";
import { phaseEdges, phaseState } from "./factories";

describe("readInFlight", () => {
  test("reads each phase's file, each PR group's file, then the legacy in-flight.md", () => {
    const files: Record<string, string> = {
      "in-flight/phase-2.md": "half-wired parser",
      "in-flight/pr-A.md": "waiting on CI",
      "in-flight.md": "old notes",
      "in-flight/phase-9.md": "not a phase of this spec",
    };
    const phases = [
      phaseState({ id: "1", edges: phaseEdges({ pr: "A" }) }),
      phaseState({ id: "2", edges: phaseEdges({ pr: "A" }) }),
    ];
    expect(readInFlight((path) => files[path], phases)).toEqual([
      { file: "in-flight/phase-2.md", text: "half-wired parser" },
      { file: "in-flight/pr-A.md", text: "waiting on CI" },
      { file: "in-flight.md", text: "old notes" },
    ]);
  });

  test("is empty when no session left notes", () => {
    expect(readInFlight(() => undefined, [phaseState()])).toEqual([]);
  });
});

describe("notesForPhase", () => {
  test("keeps the phase's own file and the legacy file, never another phase's", () => {
    const notes = [
      { file: "in-flight/phase-1.md", text: "one" },
      { file: "in-flight/phase-2.md", text: "two" },
      { file: "in-flight/pr-A.md", text: "pr" },
      { file: "in-flight.md", text: "legacy" },
    ];
    expect(notesForPhase(notes, "2").map((note) => note.file)).toEqual(["in-flight/phase-2.md", "in-flight.md"]);
  });
});

describe("inFlightFilesIn", () => {
  const dir = mkdtempSync(join(tmpdir(), "in-flight-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test("lists every file in in-flight/ and the legacy file, as paths in the spec", () => {
    expect(inFlightFilesIn(dir)).toEqual([]);
    mkdirSync(join(dir, "in-flight"));
    writeFileSync(join(dir, "in-flight", "phase-3.md"), "x");
    writeFileSync(join(dir, "in-flight", "stray.md"), "x");
    writeFileSync(join(dir, "in-flight.md"), "x");
    expect(inFlightFilesIn(dir)).toEqual(["in-flight/phase-3.md", "in-flight/stray.md", "in-flight.md"]);
  });
});
