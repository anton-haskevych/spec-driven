import { afterEach, describe, expect, test } from "bun:test";
import { prCommand } from "../commands/pr";
import { PR_WAIT_USAGE, prWait } from "../commands/pr/wait";
import { gitAt, stateDir } from "../core/git";
import type { RunResult } from "../core/run";
import { appendEvent, readEvents } from "../pr/babysit/log";
import type { Check, PrView } from "../pr/checks/types";
import { fakeClock } from "./fake-clock";
import { isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";
import { check, ghPrViewJson, prView } from "./pr-factories";
import { routeGh, sequencedRunner } from "./stub-runner";

const START = Date.parse("2026-10-10T21:00:00Z");
const BRANCH = "feat/billing-pr-a";

describe("pr wait", () => {
  let repo: TestRepo;
  let tree: WorkingCopy;
  afterEach(() => repo?.cleanup());

  function setup() {
    repo = repoWithOrigin("spec-pr-wait-");
    repo.write("README.md", "x\n");
    repo.commitAll("init");
    tree = repo.addWorktree("tree", BRANCH);
    return tree.git("rev-parse", "HEAD").trim();
  }

  function waitWith(views: Array<Partial<PrView>>, args: string[] = ["921"], head = tree.git("rev-parse", "HEAD").trim()) {
    const reply = (view: Partial<PrView>): Partial<RunResult> => ({ stdout: ghPrViewJson({ number: 921, headRefOid: head, headRefName: BRANCH, ...view }) });
    const gh = sequencedRunner([[["gh", "pr", "view"], views.map(reply)]]);
    const clock = fakeClock(START);
    const run = () => prWait(tree.dir, args, { runner: routeGh(gh, isolatedRunner), clock });
    return { gh, clock, run };
  }

  const events = () => {
    const dir = stateDir(gitAt(tree.dir, isolatedRunner), "babysit");
    return dir.ok ? readEvents(dir.value, 921).events : [];
  };

  const running = check({ name: "E2E Tests", bucket: "running", startedAt: "2026-10-10T20:59:00Z" });

  test("pending → green: one line, and the log holds waiting then green", async () => {
    setup();
    const { gh, run } = waitWith([{ checks: [running] }, { checks: [running] }, { checks: [running] }, { checks: [check({ name: "E2E Tests" })] }]);
    expect(await run()).toBe("PR #921: green · 1 passed");
    expect(events().map((event) => [event.event, event.detail])).toEqual([["waiting", expect.stringMatching(/^1 checks · for [0-9a-f]{7}$/)], ["green", "1 passed"]]);
    expect(gh.calls.every((argv) => argv.includes("--json"))).toBe(true);
  });

  test("pending → red names the failure", async () => {
    setup();
    const failed = check({ name: "E2E Tests", bucket: "fail", startedAt: "2026-10-10T21:00:00Z", completedAt: "2026-10-10T21:09:03Z" });
    expect(await waitWith([{ checks: [running] }, { checks: [running] }, { checks: [failed] }]).run()).toBe("PR #921: red · E2E Tests failed (9m03s)");
  });

  test("a queued re-run beside the old failure keeps waiting to the timeout, naming it", async () => {
    setup();
    const dir = stateDir(gitAt(tree.dir, isolatedRunner), "babysit");
    if (dir.ok) appendEvent(dir.value, 921, { at: "2026-10-10T20:58:00Z", event: "rerun", detail: "Backend Tests · attempt 2 of 3" });
    const oldFailure = check({ name: "Backend Tests", bucket: "fail", completedAt: "2026-10-10T20:50:00Z" });
    const { clock, run } = waitWith([{ checks: [check(), oldFailure] }], ["921", "--timeout", "5m"]);
    expect(await run()).toBe("PR #921: timeout · after 5m · queued: Backend Tests (re-run not started)");
    expect(clock.now() - START).toBe(300_000);
  });

  test("no rows on the head, poll after poll, settles none after the grace", async () => {
    setup();
    const { clock, run } = waitWith([{ checks: [] }]);
    expect(await run()).toMatch(/^PR #921: none · no checks on [0-9a-f]{7} after 3m$/);
    expect(clock.now() - START).toBe(180_000);
  });

  test("merged mid-wait reports the merge commit", async () => {
    setup();
    expect(await waitWith([{ checks: [running] }, { state: "MERGED", mergeCommit: "9b0c1d2e3f4a" }]).run()).toBe("PR #921: merged · 9b0c1d2");
    expect(events().at(-1)).toMatchObject({ event: "merged", detail: "9b0c1d2" });
  });

  test("in the PR's tree, --sha defaults to HEAD: a lagging GitHub head keeps it waiting", async () => {
    const head = setup();
    const green = { checks: [check()] };
    const { gh, run } = waitWith([{ ...green, headRefOid: "0ld0ld0ld0ld" }, { ...green, headRefOid: "0ld0ld0ld0ld" }, { ...green, headRefOid: head }], ["921"], head);
    expect(await run()).toBe("PR #921: green · 1 passed");
    expect(gh.calls.filter((argv) => argv[1] === "pr")).toHaveLength(3);
  });

  test("in another branch's tree there is no --sha default", async () => {
    setup();
    tree.git("checkout", "-q", "-b", "elsewhere");
    expect(await waitWith([{ checks: [check()], headRefOid: "0ld0ld0ld0ld" }]).run()).toBe("PR #921: green · 1 passed");
  });

  test("a failed gh read never settles; the timeout says why", async () => {
    setup();
    const gh = sequencedRunner([[["gh", "pr", "view"], [{ stdout: JSON.stringify(prView({ number: 921 })) }, { code: 1, stderr: "timed out after 10000 ms" }]]]);
    expect(await prWait(tree.dir, ["921", "--timeout", "1m"], { runner: routeGh(gh, isolatedRunner), clock: fakeClock(START) })).toBe("PR #921: timeout · after 1m · gh: timed out after 10000 ms");
  });

  test("bad flags are refused with the usage or the reason", async () => {
    expect(await prWait("/nowhere", ["--bogus"])).toBe(`usage: ${PR_WAIT_USAGE}`);
    expect(await prWait("/nowhere", ["--timeout", "soon"])).toBe("pr wait: --timeout and --interval take a duration like 25m, 30s or 1h");
    expect(await prWait("/nowhere", ["--since", "yesterday"])).toBe("pr wait: --since yesterday is not a date");
    expect(await prCommand("/nowhere", ["wait", "1", "2", "3"])).toBe(`usage: ${PR_WAIT_USAGE}`);
  });
});
