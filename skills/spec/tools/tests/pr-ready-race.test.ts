import { describe, expect, test } from "bun:test";
import type { Result } from "../core/result";
import { markReadySafely, READY_RACE_TIMINGS, type RaceReads } from "../pr/actions/ready-race";
import type { CommitRun, Job } from "../pr/checks/types";
import { fakeClock } from "./fake-clock";

const run = (id: number, status = "queued", conclusion = ""): CommitRun => ({ id, status, conclusion });
const job = (conclusion: string): Job => ({ id: 1, name: "prepare", conclusion });

function fakeReads(listPerCallLastRepeats: CommitRun[][], jobs: Record<number, Job[]> = {}) {
  const log: string[] = [];
  const reads: RaceReads = {
    commitRuns: () => {
      log.push("runs");
      const lists = listPerCallLastRepeats;
      return { ok: true, value: lists.length > 1 ? lists.shift()! : lists[0]! };
    },
    runJobs: (id) => {
      log.push(`jobs ${id}`);
      return { ok: true, value: jobs[id] ?? [] };
    },
  };
  return { reads, log };
}

function fakeReady(result: Result<void> = { ok: true, value: undefined }, log: string[] = []) {
  return { ready: (pr: number) => (log.push(`ready ${pr}`), result) };
}

const PUSH_RUNS = [run(100, "completed", "success")];

describe("markReadySafely", () => {
  test("waits for the push's runs to register before marking ready", async () => {
    const { reads, log } = fakeReads([[], [], PUSH_RUNS, [...PUSH_RUNS, run(200)]]);
    const clock = fakeClock();
    const outcome = await markReadySafely(921, "1a2b3c4", { reads, writes: fakeReady({ ok: true, value: undefined }, log), clock });
    expect(log.slice(0, 4)).toEqual(["runs", "runs", "runs", "ready 921"]);
    expect(outcome).toEqual({ ok: true, value: { kind: "started", runId: 200 } });
  });

  test("a new run whose first job is queued or running counts as started", async () => {
    const { reads } = fakeReads([PUSH_RUNS, [...PUSH_RUNS, run(200, "in_progress")]], { 200: [job("")] });
    expect(await markReadySafely(921, "1a2b3c4", { reads, writes: fakeReady(), clock: fakeClock() })).toEqual({ ok: true, value: { kind: "started", runId: 200 } });
  });

  test("CI that skipped itself on the ready run reads skipped", async () => {
    const { reads } = fakeReads([PUSH_RUNS, [...PUSH_RUNS, run(200, "completed", "success")]], { 200: [job("skipped"), job("skipped")] });
    expect(await markReadySafely(921, "1a2b3c4", { reads, writes: fakeReady(), clock: fakeClock() })).toEqual({ ok: true, value: { kind: "skipped" } });
  });

  test("a late push run that cancels the ready run is caught by the re-check", async () => {
    const late = [...PUSH_RUNS, run(200, "completed", "cancelled"), run(201, "completed", "success")];
    const { reads, log } = fakeReads([PUSH_RUNS, [...PUSH_RUNS, run(200, "in_progress")], late], { 201: [job("skipped")] });
    const outcome = await markReadySafely(921, "1a2b3c4", { reads, writes: fakeReady(), clock: fakeClock() });
    expect(outcome).toEqual({ ok: true, value: { kind: "skipped" } });
    expect(log.filter((line) => line.startsWith("jobs"))).toEqual(["jobs 201"]);
  });

  test("of several new runs the newest live one is named", async () => {
    const { reads } = fakeReads([PUSH_RUNS, [...PUSH_RUNS, run(200), run(201), run(202, "completed", "cancelled")]], { 201: [job("")] });
    expect(await markReadySafely(921, "1a2b3c4", { reads, writes: fakeReady(), clock: fakeClock() })).toEqual({ ok: true, value: { kind: "started", runId: 201 } });
  });

  test("no new run within the bound reports no-run; the whole race stays under 90 s", async () => {
    const { reads } = fakeReads([PUSH_RUNS]);
    const clock = fakeClock();
    expect(await markReadySafely(921, "1a2b3c4", { reads, writes: fakeReady(), clock })).toEqual({ ok: true, value: { kind: "no-run", waitedMs: READY_RACE_TIMINGS.readyRunMs } });
    expect(clock.now()).toBeLessThanOrEqual(90_000);
  });

  test("a head with no CI at all still gets marked ready after the register bound", async () => {
    const { reads, log } = fakeReads([[]]);
    const clock = fakeClock();
    const outcome = await markReadySafely(921, "1a2b3c4", { reads, writes: fakeReady({ ok: true, value: undefined }, log), clock });
    expect(log).toContain("ready 921");
    expect(outcome).toMatchObject({ ok: true, value: { kind: "no-run" } });
    expect(clock.now()).toBeLessThanOrEqual(90_000);
  });

  test("gh refusing ready is the result, and nothing is polled after it", async () => {
    const { reads, log } = fakeReads([PUSH_RUNS]);
    const outcome = await markReadySafely(921, "1a2b3c4", { reads, writes: fakeReady({ ok: false, reason: "GraphQL: Pull request #921 is closed" }, log), clock: fakeClock() });
    expect(outcome).toEqual({ ok: false, reason: "GraphQL: Pull request #921 is closed" });
    expect(log.at(-1)).toBe("ready 921");
  });
});
