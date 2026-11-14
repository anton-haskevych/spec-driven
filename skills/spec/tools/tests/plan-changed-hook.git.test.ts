import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planChangedResponse, readPlansForHook, type HookRead } from "../hooks/plan-changed";
import type { JoinedPlan } from "../plan/state-source";
import { planShapeOf } from "../plan/plan-diff";
import { sessionPlanMemory, type PlanMemory } from "../plan/plan-version";
import { isolatedRunner, type TestRepo } from "./git-repo";
import { ALPHA_PHASES, joinedRepo } from "./joined-repo";
import { phaseDoc, specDoc } from "./record-factories";

const T0 = new Date("2026-11-12T10:00:00Z");
const at = (seconds: number) => new Date(T0.getTime() + seconds * 1_000);
const edit = { tool_name: "Edit", cwd: "/repo", tool_input: { file_path: "/repo/src/a.ts" } };

function plan(version: number, ids: string[]): JoinedPlan {
  return { spec: specDoc({ name: "alpha", planVersion: version, phases: ids }), phases: ids.map((id) => phaseDoc({ id })) };
}

function fakeRead(current: () => JoinedPlan | undefined, ok = true): { calls: number; read: HookRead } {
  const read = {
    calls: 0,
    read: () => {
      read.calls += 1;
      return { ok, joined: (spec: string) => (spec === "alpha" ? current() : undefined) };
    },
  };
  return read;
}

const contextOf = (response: string | undefined) =>
  response === undefined ? undefined : (JSON.parse(response) as { hookSpecificOutput: { additionalContext: string } }).hookSpecificOutput.additionalContext;

describe("planChangedResponse", () => {
  let dir: string;
  let memory: PlanMemory;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "spec-plan-hook-"));
    memory = sessionPlanMemory("s1", dir);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test("a session that was never shown a joined spec reads nothing and says nothing", () => {
    const read = fakeRead(() => plan(2, ["1", "2"]));
    expect(planChangedResponse(edit, "/repo", memory, T0, read.read)).toBeUndefined();
    expect(read.calls).toBe(0);
  });

  test("a moved version is named once, as additional context; the same version again says nothing", () => {
    memory.show("alpha", planShapeOf(plan(1, ["1"])));
    let current = plan(2, ["1", "2"]);
    const read = fakeRead(() => current);
    expect(contextOf(planChangedResponse(edit, "/repo", memory, T0, read.read))).toBe("alpha: Plan changed since this session loaded it (v1 → v2): phase 2 added");
    expect(planChangedResponse(edit, "/repo", memory, at(121), read.read)).toBeUndefined();
    current = plan(3, ["1", "2", "3"]);
    expect(contextOf(planChangedResponse(edit, "/repo", memory, at(242), read.read))).toContain("(v2 → v3): phase 3 added");
  });

  test("at most one read every 120 s, counted from the last attempt", () => {
    memory.show("alpha", planShapeOf(plan(1, ["1"])));
    const read = fakeRead(() => plan(1, ["1"]));
    for (const seconds of [0, 30, 119]) planChangedResponse(edit, "/repo", memory, at(seconds), read.read);
    expect(read.calls).toBe(1);
    planChangedResponse(edit, "/repo", memory, at(120), read.read);
    expect(read.calls).toBe(2);
  });

  test("after a failed fetch it waits 10 minutes", () => {
    memory.show("alpha", planShapeOf(plan(1, ["1"])));
    const read = fakeRead(() => plan(1, ["1"]), false);
    for (const seconds of [0, 121, 599]) planChangedResponse(edit, "/repo", memory, at(seconds), read.read);
    expect(read.calls).toBe(1);
    planChangedResponse(edit, "/repo", memory, at(600), read.read);
    expect(read.calls).toBe(2);
  });

  test("other tools, and a spec no longer on the board, say nothing", () => {
    memory.show("alpha", planShapeOf(plan(1, ["1"])));
    const read = fakeRead(() => undefined);
    expect(planChangedResponse({ ...edit, tool_name: "Read" }, "/repo", memory, T0, read.read)).toBeUndefined();
    expect(read.calls).toBe(0);
    expect(planChangedResponse(edit, "/repo", memory, T0, read.read)).toBeUndefined();
  });
});

describe("the before-edit check with origin unreachable (real git)", () => {
  let repo: TestRepo;
  let dir: string;

  beforeAll(() => {
    repo = joinedRepo("spec-plan-hook-offline-");
    dir = mkdtempSync(join(tmpdir(), "spec-plan-hook-offline-memory-"));
  });
  afterAll(() => {
    repo.cleanup();
    rmSync(dir, { recursive: true, force: true });
  });

  test("20 edits in a row add under 4 s in total, and say nothing", () => {
    const tree = repo.clone("pr-a");
    tree.git("fetch", "-q", "origin", "+refs/spec-board/record:refs/spec-board-remote/record");
    // A routable-looking address nothing answers on: the fetch hangs until its limit, the slow case.
    tree.git("remote", "set-url", "origin", "http://10.255.255.1/nowhere.git");
    const memory = sessionPlanMemory("s-offline", dir);
    memory.show("alpha", planShapeOf({ spec: specDoc({ name: "alpha", phases: ALPHA_PHASES.map((p) => p.id) }), phases: [...ALPHA_PHASES] }));
    const payload = { ...edit, cwd: tree.dir, tool_input: { file_path: join(tree.dir, "src/a.ts") } };

    const started = performance.now();
    const responses = Array.from({ length: 20 }, (_, n) => planChangedResponse(payload, tree.dir, memory, at(n), (projectDir) => readPlansForHook(projectDir, isolatedRunner, at(n))));
    const elapsed = performance.now() - started;

    expect(responses.every((response) => response === undefined)).toBe(true);
    expect(memory.lastFetch()).toEqual({ at: T0, ok: false });
    expect(elapsed).toBeLessThan(4_000);
  }, 15_000);
});
