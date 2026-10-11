import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { checksVerdict, externalMatcher, type Verdict } from "../pr/checks/verdict";
import type { Check } from "../pr/checks/types";
import { toPrView } from "../pr/gh-records";
import { check } from "./pr-factories";

const rollupChecks = async (name: string): Promise<Check[]> =>
  toPrView(await Bun.file(join(import.meta.dir, "fixtures", `gh-pr-view-rollup-${name}.json`)).json())?.checks ?? [];
const VERCEL = externalMatcher(["Vercel*"]);
const names = (checks: readonly Check[]) => checks.map((one) => one.name);

describe("checksVerdict over real rollup shapes", () => {
  const cases: Array<[fixture: string, expected: (verdict: Verdict) => void]> = [
    ["states", (verdict) => expect(verdict).toMatchObject({ kind: "red" })],
    ["vercel-pending", (verdict) => expect(verdict).toEqual({ kind: "green", passed: 2, skipped: 1 })],
    ["stale-rows", (verdict) => expect(verdict).toEqual({ kind: "green", passed: 2, skipped: 0 })],
    ["same-name-two-workflows", (verdict) => expect(verdict.kind === "red" && verdict.failed.map((one) => one.workflow)).toEqual(["E2E Tests"])],
    ["all-skipped", (verdict) => expect(verdict).toEqual({ kind: "none", reason: "skipped" })],
    ["queued-rerun", (verdict) => expect(verdict.kind === "waiting" && names(verdict.queued)).toEqual(["Backend Tests"])],
  ];
  for (const [fixture, expected] of cases) test(fixture, async () => expected(checksVerdict(await rollupChecks(fixture), VERCEL)));

  test("states: the failures are named, external ones left out", async () => {
    const verdict = checksVerdict(await rollupChecks("states"), VERCEL);
    expect(verdict.kind === "red" && names(verdict.failed)).toEqual(["Backend Tests", "Backend Test Results"]);
  });
});

describe("checksVerdict precedence", () => {
  const of = (...buckets: Check["bucket"][]) => buckets.map((bucket, index) => check({ name: `c${index}`, bucket }));
  const none = () => false;

  test("red > cancelled > waiting > green", () => {
    expect(checksVerdict(of("pass", "running", "cancel", "fail"), none).kind).toBe("red");
    expect(checksVerdict(of("pass", "running", "cancel"), none).kind).toBe("cancelled");
    expect(checksVerdict(of("pass", "queued", "skipping"), none)).toMatchObject({ kind: "waiting", running: [], queued: [{ name: "c1" }] });
    expect(checksVerdict(of("pass", "skipping"), none)).toEqual({ kind: "green", passed: 1, skipped: 1 });
  });

  test("green needs one passed check; zero checks and all-skipped are none", () => {
    expect(checksVerdict([], none)).toEqual({ kind: "none", reason: "no-checks" });
    expect(checksVerdict(of("skipping", "skipping"), none)).toEqual({ kind: "none", reason: "skipped" });
  });

  test("external checks never block and never count", () => {
    const vercel = check({ name: "Vercel – a", bucket: "fail" });
    expect(checksVerdict([vercel, check({ bucket: "pass" })], VERCEL)).toEqual({ kind: "green", passed: 1, skipped: 0 });
    expect(checksVerdict([vercel], VERCEL)).toEqual({ kind: "none", reason: "no-checks" });
  });
});

describe("externalMatcher", () => {
  test("matches check names against any glob; no globs match nothing", () => {
    expect(VERCEL(check({ name: "Vercel – crm-dance-landing" }))).toBe(true);
    expect(VERCEL(check({ name: "Backend Tests" }))).toBe(false);
    expect(externalMatcher([])(check({ name: "Vercel – a" }))).toBe(false);
  });
});
