import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { checkBucket, rollupToChecks, toPrRows } from "../pr/rollup";
import type { Bucket } from "../pr/types";

const fixture = async (name: string) => JSON.parse(await Bun.file(join(import.meta.dir, "fixtures", name)).text());

interface ListedPr {
  number: number;
  statusCheckRollup: unknown;
}

const tally = (buckets: readonly Bucket[]) => buckets.toSorted().join(",");

describe("checkBucket", () => {
  test("agrees with gh's own bucket for every state gh pr checks reported", async () => {
    const reported: { state: string; bucket: Bucket }[] = [
      ...(await fixture("gh-pr-checks.json")),
      ...Object.values((await fixture("gh-pr-checks-by-pr.json")) as Record<string, { state: string; bucket: Bucket }[]>).flat(),
    ];
    for (const { state, bucket } of reported) expect([state, checkBucket(state)]).toEqual([state, bucket]);
  });

  test("never reads an unknown or cancelled state as passing", () => {
    expect(checkBucket("CANCELLED")).toBe("cancel");
    expect(checkBucket("STALE")).toBe("pending");
    expect(checkBucket("SOMETHING_NEW")).toBe("pending");
  });
});

describe("rollupToChecks", () => {
  test("gives the same buckets as gh pr checks on the same PR", async () => {
    const open: ListedPr[] = await fixture("gh-pr-list-open.json");
    const reported: Record<string, { bucket: Bucket }[]> = await fixture("gh-pr-checks-by-pr.json");
    for (const [number, checks] of Object.entries(reported)) {
      const pr = open.find((candidate) => candidate.number === Number(number));
      expect(tally(rollupToChecks(pr?.statusCheckRollup).map((check) => check.bucket))).toBe(tally(checks.map((check) => check.bucket)));
    }
  });

  test("keeps same-named checks from different workflows, like gh", async () => {
    const open: ListedPr[] = await fixture("gh-pr-list-open.json");
    const timing = rollupToChecks(open.find((pr) => pr.number === 566)?.statusCheckRollup).filter((check) => check.name === "Timing Summary");
    expect(timing.map((check) => check.workflow).toSorted()).toEqual(["E2E Tests", "Monorepo CI"]);
  });

  test("a failed run followed by a passing re-run is green", () => {
    const run = (conclusion: string, startedAt: string) => ({ __typename: "CheckRun", name: "build", workflowName: "CI", status: "COMPLETED", conclusion, startedAt, detailsUrl: `https://x/${startedAt}` });
    const checks = rollupToChecks([run("FAILURE", "2026-10-01T10:00:00Z"), run("SUCCESS", "2026-10-01T11:00:00Z")]);
    expect(checks).toEqual([{ name: "build", bucket: "pass", workflow: "CI", link: "https://x/2026-10-01T11:00:00Z" }]);
  });

  test("an unfinished check run is pending whatever its stale conclusion says", () => {
    const checks = rollupToChecks([{ __typename: "CheckRun", name: "e2e", status: "IN_PROGRESS", conclusion: "", startedAt: "2026-10-01T10:00:00Z" }]);
    expect(checks.map((check) => check.bucket)).toEqual(["pending"]);
  });

  test("status contexts use context, state and targetUrl", () => {
    const checks = rollupToChecks([{ __typename: "StatusContext", context: "Vercel", state: "PENDING", targetUrl: "https://vercel.com/x", startedAt: "2026-10-01T10:00:00Z" }]);
    expect(checks).toEqual([{ name: "Vercel", bucket: "pending", workflow: "", link: "https://vercel.com/x" }]);
  });

  test("a missing or malformed rollup has no checks", () => {
    expect(rollupToChecks(undefined)).toEqual([]);
    expect(rollupToChecks([null, 3, "x"])).toEqual([]);
  });
});

describe("toPrRows", () => {
  test("open PRs carry their check summary; merged and closed ones come from the recent list", async () => {
    const rows = toPrRows(await fixture("gh-pr-list-open.json"), await fixture("gh-pr-list-all.json"), []);
    const byNumber = new Map(rows.map((row) => [row.number, row]));
    expect(byNumber.get(874)).toMatchObject({ branch: "dependabot/github_actions/all-actions-e71a03c6fe", state: "OPEN", draft: false });
    expect(byNumber.get(874)?.checks?.counts.fail).toBeGreaterThan(0);
    expect(byNumber.get(566)).toMatchObject({ branch: "ops-provisioning-dx", state: "OPEN", draft: true });
    expect(byNumber.get(880)).toEqual({ number: 880, branch: "feat/video-workspace-product-videos", state: "MERGED", draft: false, url: "https://github.com/CRM-Dance/crm/pull/880" });
    expect(byNumber.get(869)?.state).toBe("CLOSED");
    expect(rows.filter((row) => row.number === 879)).toHaveLength(1);
  });

  test("external check globs are left out of the counts", async () => {
    const open = await fixture("gh-pr-list-open.json");
    const counted = toPrRows(open, [], [])[0]?.checks;
    const external = toPrRows(open, [], ["Vercel*"])[0]?.checks;
    expect(external?.external).toBeGreaterThan(0);
    expect((external?.external ?? 0) + Object.values(external?.counts ?? {}).reduce((a, b) => a + b, 0)).toBe(Object.values(counted?.counts ?? {}).reduce((a, b) => a + b, 0));
  });

  test("records without a number or branch are dropped", () => {
    expect(toPrRows([{ headRefName: "x" }, { number: 1 }], [{ number: 2, state: "MERGED" }], [])).toEqual([]);
  });
});
