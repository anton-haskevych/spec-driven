import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PlanShape } from "../plan/plan-diff";
import { noticePlanChange, planMemoryFor, sessionPlanMemory } from "../plan/plan-version";

const shape = (version: number, ids: string[] = ["1"]): PlanShape => ({ version, phases: ids.map((id) => ({ id, needs: [], tasks: [`${id}.1`] })) });

describe("session plan memory", () => {
  let dir: string;
  beforeEach(() => (dir = mkdtempSync(join(tmpdir(), "spec-plan-memory-"))));
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test("the first sight of a spec says nothing; a later version is named once, then not again", () => {
    const memory = sessionPlanMemory("s1", dir);
    expect(noticePlanChange(memory, "alpha", shape(3))).toBeUndefined();
    expect(noticePlanChange(memory, "alpha", shape(3))).toBeUndefined();
    expect(noticePlanChange(memory, "alpha", shape(4, ["1", "2"]))).toBe("Plan changed since this session loaded it (v3 → v4): phase 2 added");
    expect(noticePlanChange(memory, "alpha", shape(4, ["1", "2"]))).toBeUndefined();
  });

  test("it lives in a file per session, so the hook's process and a command's share it", () => {
    noticePlanChange(sessionPlanMemory("s1", dir), "alpha", shape(3));
    sessionPlanMemory("s1", dir).triedFetch(new Date("2026-11-12T10:00:00Z"), false);
    const again = sessionPlanMemory("s1", dir);
    expect(again.specs()).toEqual(["alpha"]);
    expect(again.lastFetch()).toEqual({ at: new Date("2026-11-12T10:00:00Z"), ok: false });
    expect(sessionPlanMemory("s2", dir).specs()).toEqual([]);
  });

  test("a damaged file reads as an empty memory", () => {
    writeFileSync(join(dir, "spec-driven-plan-s1.json"), "{not json");
    const memory = sessionPlanMemory("s1", dir);
    expect([memory.specs(), memory.lastFetch()]).toEqual([[], undefined]);
    expect(noticePlanChange(memory, "alpha", shape(1))).toBeUndefined();
  });

  test("no session id, no memory: nothing is remembered or said", () => {
    expect(planMemoryFor({}, dir)).toBeUndefined();
    expect(planMemoryFor({ CLAUDE_CODE_SESSION_ID: "s1" }, dir)?.specs()).toEqual([]);
  });
});
