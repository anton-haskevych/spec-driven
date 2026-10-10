import { describe, expect, test } from "bun:test";
import { NO_CHECKS_GRACE_MS, settleLine, waitStep, type WaitContext } from "../pr/babysit/wait-step";
import type { Check } from "../pr/checks/types";
import { check, prView } from "./pr-factories";

const START = Date.parse("2026-10-10T21:00:00Z");
const at = (minutes: number) => START + minutes * 60_000;
const iso = (minutes: number) => new Date(at(minutes)).toISOString();
const context = (overrides: Partial<WaitContext> = {}): WaitContext => ({ isExternal: (row) => row.name.startsWith("Vercel"), startedMs: START, ...overrides });
const step = (checks: Check[], overrides: Partial<WaitContext> = {}, now = at(1), view = {}) => waitStep(prView({ checks, ...view }), context(overrides), now);

describe("waitStep", () => {
  test("running and queued checks keep it waiting, named with how long they ran", () => {
    const running = check({ name: "E2E Tests", bucket: "running", startedAt: iso(0) });
    expect(step([running, check({ name: "Stripe", bucket: "queued" })], {}, at(24))).toEqual({ waiting: "running: E2E Tests 24m · queued: Stripe" });
  });

  test("green counts passed and skipped; pending external checks are listed as not blocking", () => {
    const rows = [check(), check({ name: "Lint" }), check({ name: "Ops", bucket: "skipping" }), check({ name: "Vercel – landing", bucket: "queued" })];
    expect(step(rows)).toEqual({ settle: { event: "green", detail: "2 passed · 1 skipped · external 1 pending (not blocking)" } });
  });

  test("red names each failed check with its duration", () => {
    const failed = check({ name: "E2E Tests", bucket: "fail", startedAt: iso(0), completedAt: "2026-10-10T21:09:03.000Z" });
    expect(step([check(), failed, check({ name: "Docs", bucket: "fail" })])).toEqual({ settle: { event: "red", detail: "E2E Tests failed (9m03s), Docs failed" } });
  });

  test("long lists show three names and count the rest", () => {
    const failed = ["A", "B", "C", "D", "E"].map((name) => check({ name, bucket: "fail" }));
    expect(step(failed)).toEqual({ settle: { event: "red", detail: "A failed, B failed, C failed +2 more" } });
    const queued = ["A", "B", "C", "D"].map((name) => check({ name, bucket: "queued" }));
    expect(step(queued)).toEqual({ waiting: "queued: A, B, C +1 more" });
  });

  test("a cancelled check with no newer run settles cancelled", () => {
    expect(step([check(), check({ name: "Backend Tests", bucket: "cancel" })])).toEqual({ settle: { event: "cancelled", detail: "Backend Tests cancelled, no newer run" } });
  });

  test("a failure that completed before --since waits for its re-run instead of settling red", () => {
    const stale = check({ name: "Backend Tests", bucket: "fail", completedAt: iso(2) });
    expect(step([check(), stale], { since: iso(3) }, at(4))).toEqual({ waiting: "queued: Backend Tests (re-run not started)" });
    expect(step([check(), stale], { since: iso(1) }, at(4))).toMatchObject({ settle: { event: "red" } });
  });

  test("a queued re-run beside the old failure stays waiting (the rollup keeps the re-run)", () => {
    expect(step([check(), check({ name: "Backend Tests", bucket: "queued" })])).toEqual({ waiting: "queued: Backend Tests" });
  });

  test("no checks wait out the grace, then settle none", () => {
    const view = { headRefOid: "1a2b3c4d5e" };
    expect(step([], {}, at(2), view)).toEqual({ waiting: "no checks yet on 1a2b3c4" });
    expect(step([], {}, START + NO_CHECKS_GRACE_MS, view)).toEqual({ settle: { event: "none", detail: "no checks on 1a2b3c4 after 3m" } });
  });

  test("all skipped waits out the grace too, then says to push a new commit", () => {
    const skipped = [check({ bucket: "skipping" })];
    expect(step(skipped, {}, at(1), { headRefOid: "1a2b3c4d5e" })).toEqual({ waiting: "CI skipped itself so far on 1a2b3c4" });
    expect(step(skipped, {}, at(3), { headRefOid: "1a2b3c4d5e" })).toEqual({ settle: { event: "none", detail: "CI skipped itself on 1a2b3c4 — push a new commit" } });
  });

  test("only external checks count as no checks", () => {
    expect(step([check({ name: "Vercel – site", bucket: "pass" })], {}, at(3))).toMatchObject({ settle: { event: "none" } });
  });

  test("while GitHub's head lags --sha it keeps waiting, whatever the checks say", () => {
    const lagging = { headRefOid: "0ld0ld0ld0" };
    expect(step([check({ bucket: "fail" })], { sha: "5e6f7a8" }, at(1), lagging)).toEqual({ waiting: "head 0ld0ld0, waiting for 5e6f7a8" });
    expect(step([check()], { sha: "5e6f7a8" }, at(1), { headRefOid: "5e6f7a8b9c" })).toMatchObject({ settle: { event: "green" } });
  });

  test("merged, closed and conflicting settle before anything else", () => {
    expect(step([], { sha: "x" }, at(0), { state: "MERGED", mergeCommit: "9b0c1d2e3f" })).toEqual({ settle: { event: "merged", detail: "9b0c1d2" } });
    expect(step([], {}, at(0), { state: "CLOSED" })).toEqual({ settle: { event: "closed" } });
    expect(step([check({ bucket: "running" })], {}, at(0), { mergeable: "CONFLICTING" })).toEqual({ settle: { event: "conflicting" } });
  });
});

describe("settleLine", () => {
  test("is the PR, the event and its detail", () => {
    expect(settleLine(921, { event: "red", detail: "E2E Tests failed" })).toBe("PR #921: red · E2E Tests failed");
    expect(settleLine(921, { event: "conflicting" })).toBe("PR #921: conflicting");
  });
});
