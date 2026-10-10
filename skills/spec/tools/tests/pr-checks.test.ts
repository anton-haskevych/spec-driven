import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { actionsJob, prState, summarizeChecks } from "../pr/checks/checks";
import { toPrView } from "../pr/gh-records";
import { prView } from "./pr-factories";

const CHECKS = toPrView(await Bun.file(join(import.meta.dir, "fixtures", "gh-pr-view-rollup-states.json")).json())?.checks ?? [];
const OPEN = prView();

describe("summarizeChecks", () => {
  test("counts buckets and sets external checks apart", () => {
    const summary = summarizeChecks(CHECKS, ["Vercel*"]);
    expect(summary.counts).toEqual({ pass: 2, fail: 2, queued: 1, running: 1, skipping: 1, cancel: 1 });
    expect(summary.external).toBe(2);
    expect(summary.failing.map((check) => check.name)).toEqual(["Backend Tests", "Backend Test Results"]);
  });

  test("without external patterns every check counts", () => {
    expect(summarizeChecks(CHECKS, []).counts.fail).toBe(3);
  });
});

describe("prState", () => {
  const summary = (overrides: Partial<Record<"fail" | "queued", number>>) => {
    const base = summarizeChecks([], []);
    return { ...base, counts: { ...base.counts, ...overrides } };
  };

  test("follows merged/closed → conflicting → draft → red → pending → green", () => {
    expect(prState({ ...OPEN, state: "MERGED", mergeable: "CONFLICTING" }, summary({ fail: 1 }))).toBe("merged");
    expect(prState({ ...OPEN, state: "CLOSED" }, summary({}))).toBe("closed");
    expect(prState({ ...OPEN, mergeable: "CONFLICTING", isDraft: true }, summary({ fail: 1 }))).toBe("conflicting");
    expect(prState({ ...OPEN, isDraft: true }, summary({ fail: 1 }))).toBe("draft");
    expect(prState(OPEN, summary({ fail: 1, queued: 3 }))).toBe("red");
    expect(prState(OPEN, summary({ queued: 3 }))).toBe("pending");
    expect(prState(OPEN, summary({}))).toBe("green");
  });

  test("unknown mergeability outranks only green", () => {
    const unknown = { ...OPEN, mergeable: "UNKNOWN" };
    expect(prState(unknown, summary({}))).toBe("unknown");
    expect(prState(unknown, summary({ fail: 1 }))).toBe("red");
  });

  test("unreadable checks never read as green", () => {
    expect(prState(OPEN, undefined)).toBe("unknown");
    expect(prState({ ...OPEN, isDraft: true }, undefined)).toBe("draft");
  });
});

describe("actionsJob", () => {
  test("reads run and job ids from an Actions job link", () => {
    expect(actionsJob("https://github.com/acme/app/actions/runs/36796809320/job/110162211428")).toEqual({
      runId: 36796809320,
      jobId: 110162211428,
    });
  });

  test("check runs and other providers have no job", () => {
    expect(actionsJob("https://github.com/acme/app/runs/110164445230")).toBeUndefined();
    expect(actionsJob("https://vercel.com/acme/site-a/4ncc")).toBeUndefined();
  });
});
