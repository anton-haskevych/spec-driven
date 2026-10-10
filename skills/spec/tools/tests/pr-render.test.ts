import { describe, expect, test } from "bun:test";
import { summarizeChecks } from "../pr/checks/checks";
import { renderReport } from "../pr/render";
import type { PrReport } from "../pr/report";
import type { Check } from "../pr/checks/types";
import { check as checkOf, prView } from "./pr-factories";

const check = (name: string, bucket: Check["bucket"], workflow = "Landing Tests", link = ""): Check => checkOf({ name, bucket, workflow, link });
const VIEW = prView({ number: 871, headRefOid: "084ec54f1be9c7c7" });
const CHECKS = [check("Unit tests", "fail"), check("Lint", "pass"), check("E2E", "skipping"), check("Vercel – a", "pass", "")];

function report(overrides: Partial<PrReport> = {}): PrReport {
  return { view: VIEW, state: "red", summary: summarizeChecks(CHECKS, ["Vercel*"]), externalPatterns: ["Vercel*"], failures: [], otherPrs: [], ...overrides };
}

describe("renderReport", () => {
  test("header, state, then checks — the design's layout", () => {
    const failure = {
      check: CHECKS[0]!,
      job: { runId: 36775362173, jobId: 110039001343 },
      main: { kind: "ran" as const, runId: 36379694472, day: "2026-09-28", conclusion: "success" },
      tail: { ok: true as const, value: ["FAILED TESTS:", "##[error]Process completed with exit code 1."] },
    };
    expect(renderReport(report({ failures: [failure] }))).toBe(
      [
        "PR #871 ready · mergeable CLEAN · head 084ec54f",
        "state: red",
        "checks: 1 pass · 1 fail · 1 skipped · 0 pending · 1 external (Vercel*)",
        "FAIL Landing Tests › Unit tests (run 36775362173, job 110039001343)",
        "  main: last ran 09-28 (run 36379694472) → success — failure is this branch's",
        "  tail:",
        "    FAILED TESTS:",
        "    ##[error]Process completed with exit code 1.",
      ].join("\n"),
    );
  });

  test("main verdicts, non-Actions checks and unavailable parts", () => {
    const text = renderReport(
      report({
        failures: [
          { check: check("Unit tests", "fail"), job: { runId: 1, jobId: 2 }, main: { kind: "ran", runId: 3, day: "2026-09-28", conclusion: "failure" }, tail: { ok: false, reason: "gh call budget (30) spent" } },
          { check: check("Results", "fail", "E2E Tests", "https://github.com/acme/app/runs/5"), job: undefined },
          { check: check("Smoke", "fail"), job: { runId: 1, jobId: 4 }, main: { kind: "not-run", runs: 15 } },
        ],
        otherPrs: [779, 801],
      }),
    );
    expect(text).toContain("  main: last ran 09-28 (run 3) → failure — main fails too");
    expect(text).toContain("  tail: unavailable (gh call budget (30) spent)");
    expect(text).toContain("FAIL E2E Tests › Results (not an Actions job: https://github.com/acme/app/runs/5)");
    expect(text).toContain("  main: not run in the last 15 runs");
    expect(text.split("\n").at(-1)).toBe("other PRs in this spec: #779, #801");
  });

  test("a merged PR has no check line", () => {
    const merged = renderReport(report({ view: { ...VIEW, state: "MERGED" }, state: "merged", summary: undefined }));
    expect(merged.split("\n").slice(0, 2)).toEqual(["PR #871 merged · mergeable CLEAN · head 084ec54f", "state: merged"]);
    expect(merged).not.toContain("checks:");
  });
});
