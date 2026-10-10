import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { actionsJob, prState, summarizeChecks } from "../pr/checks/checks";
import { toPrView } from "../pr/gh-records";
import type { Check } from "../pr/checks/types";
import { check, prView } from "./pr-factories";

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
  const summary = (...buckets: Check["bucket"][]) => summarizeChecks(buckets.map((bucket, index) => check({ name: `c${index}`, bucket })), []);

  test("PR-level states first, then the checks verdict", () => {
    expect(prState({ ...OPEN, state: "MERGED", mergeable: "CONFLICTING" }, summary("fail"))).toBe("merged");
    expect(prState({ ...OPEN, state: "CLOSED" }, summary())).toBe("closed");
    expect(prState({ ...OPEN, mergeable: "CONFLICTING", isDraft: true }, summary("fail"))).toBe("conflicting");
    expect(prState({ ...OPEN, isDraft: true }, summary("fail"))).toBe("draft");
    expect(prState(OPEN, summary("fail", "queued"))).toBe("red");
    expect(prState(OPEN, summary("pass", "cancel"))).toBe("cancelled");
    expect(prState(OPEN, summary("pass", "queued"))).toBe("waiting");
    expect(prState(OPEN, summary("pass", "skipping"))).toBe("green");
  });

  test("a PR CI never ran is none, not green", () => {
    expect(prState(OPEN, summary())).toBe("none");
    expect(prState(OPEN, summary("skipping"))).toBe("none");
  });

  test("unknown mergeability outranks only green", () => {
    const unknown = { ...OPEN, mergeable: "UNKNOWN" };
    expect(prState(unknown, summary("pass"))).toBe("unknown");
    expect(prState(unknown, summary("fail"))).toBe("red");
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
