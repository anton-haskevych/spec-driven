import { afterEach, describe, expect, test } from "bun:test";
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prCommand } from "../commands/pr";
import { PR_LOG_USAGE, prLog } from "../commands/pr/log";
import type { Runner } from "../core/run";
import { appendEvent, parseEvents, readEvents, renderTimeline, type BabysitEvent } from "../pr/babysit/log";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { prView } from "./pr-factories";
import { routeGh, stubRunner, type CannedRuns } from "./stub-runner";

const ZONE = "America/Los_Angeles";

const start: BabysitEvent = { at: "2026-10-11T04:06:00Z", event: "babysit-start", spec: "fast-parallel-backend-tests", group: "B" };
const timeline: BabysitEvent[] = [
  start,
  { at: "2026-10-11T04:06:30Z", event: "opened", sha: "1a2b3c4", detail: "ready · head 1a2b3c4" },
  { at: "2026-10-11T04:16:04Z", event: "red", sha: "1a2b3c4", detail: "E2E Tests failed (9m03s)" },
  { at: "2026-10-11T04:18:00Z", event: "note", detail: "test failure · ours" },
  { at: "2026-10-11T04:31:00Z", event: "pushed", sha: "5e6f7a8", detail: "5e6f7a8 · fix: reset the simulated reader between specs" },
  { at: "2026-10-11T04:45:00Z", event: "rerun", detail: "Backend Tests · attempt 2 of 3 · run 3787" },
  { at: "2026-10-11T04:58:00Z", event: "merged", sha: "9b0c1d2", detail: "merge · 9b0c1d2" },
];

describe("parseEvents", () => {
  test("reads one event per line and counts the lines it can't read", () => {
    const lines = [JSON.stringify(timeline[0]), "{not json", JSON.stringify({ at: "2026-10-11T04:07:00Z", event: "exploded" }), JSON.stringify({ event: "green" }), "", JSON.stringify(timeline[1])];
    expect(parseEvents(lines.join("\n"))).toEqual({ events: [timeline[0]!, timeline[1]!], skipped: 3 });
  });

  test("drops optional fields that are not strings", () => {
    expect(parseEvents(`${JSON.stringify({ at: "2026-10-11T04:07:00Z", event: "note", detail: 7 })}\n`)).toEqual({
      events: [{ at: "2026-10-11T04:07:00Z", event: "note" }],
      skipped: 0,
    });
  });
});

describe("renderTimeline", () => {
  test("header from the latest babysit-start, one local-time line per event", () => {
    expect(renderTimeline(921, { events: timeline, skipped: 0 }, ZONE)).toBe(
      [
        "PR #921 babysit · B · fast-parallel-backend-tests · started 21:06 · 1 rerun · 1 fix push",
        "21:06 babysit-start",
        "21:06 opened · ready · head 1a2b3c4",
        "21:16 red · E2E Tests failed (9m03s)",
        "21:18 note · test failure · ours",
        "21:31 pushed · 5e6f7a8 · fix: reset the simulated reader between specs",
        "21:45 rerun · Backend Tests · attempt 2 of 3 · run 3787",
        "21:58 merged · merge · 9b0c1d2",
      ].join("\n"),
    );
  });

  test("counts reruns and pushes since the latest babysit-start only", () => {
    const again: BabysitEvent = { at: "2026-10-11T05:00:00Z", event: "babysit-start", spec: "fast-parallel-backend-tests", group: "B" };
    const pushed: BabysitEvent = { at: "2026-10-11T05:10:00Z", event: "pushed", sha: "aaaaaaa" };
    const header = renderTimeline(921, { events: [...timeline, again, pushed, pushed], skipped: 0 }, ZONE).split("\n")[0];
    expect(header).toBe("PR #921 babysit · B · fast-parallel-backend-tests · started 22:00 · 0 reruns · 2 fix pushes");
  });

  test("a log spanning days marks each new day", () => {
    const late: BabysitEvent = { at: "2026-10-11T06:59:00Z", event: "waiting", detail: "26 checks" };
    const next: BabysitEvent = { at: "2026-10-11T07:01:00Z", event: "green" };
    expect(renderTimeline(921, { events: [late, next], skipped: 0 }, ZONE).split("\n")).toEqual([
      "PR #921 babysit log · no babysit started",
      "2026-10-10",
      "23:59 waiting · 26 checks",
      "2026-10-11",
      "00:01 green",
    ]);
  });

  test("says how many lines it skipped", () => {
    expect(renderTimeline(921, { events: [start], skipped: 2 }, ZONE).split("\n").at(-1)).toBe("skipped 2 malformed lines");
  });

  test("an empty log is one line", () => {
    expect(renderTimeline(921, { events: [], skipped: 0 }, ZONE)).toBe("PR #921: no babysit log on this machine");
    expect(renderTimeline(921, { events: [], skipped: 1 }, ZONE)).toBe("PR #921: no babysit log on this machine · skipped 1 malformed line");
  });
});

describe("appendEvent and readEvents", () => {
  let dir: string;
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test("one jsonl file per PR, created on first append", () => {
    dir = join(mkdtempSync(join(tmpdir(), "spec-babysit-")), "babysit");
    expect(readEvents(dir, 921)).toEqual({ events: [], skipped: 0 });
    appendEvent(dir, 921, timeline[0]!);
    appendEvent(dir, 921, timeline[1]!);
    appendEvent(dir, 922, timeline[2]!);
    appendFileSync(join(dir, "pr-921.jsonl"), "garbage\n");
    expect(readEvents(dir, 921)).toEqual({ events: [timeline[0]!, timeline[1]!], skipped: 1 });
    expect(readEvents(dir, 922).events).toEqual([timeline[2]!]);
  });
});

describe("pr log", () => {
  let repo: TestRepo;
  afterEach(() => repo?.cleanup());
  const at = new Date("2026-10-11T04:18:00Z");
  const withGh = (canned: CannedRuns): Runner => routeGh(stubRunner(canned), isolatedRunner);

  test("--add writes a note that every worktree's pr log reads", () => {
    repo = repoWithOrigin("spec-pr-log-");
    const tree = repo.addWorktree("tree", "feat/tree");
    expect(prCommand(repo.dir, ["log", "921"])).toBe("PR #921: no babysit log on this machine");
    expect(prLog(tree.dir, ["#921", "--add", "test failure · ours"], isolatedRunner, at)).toBe("PR #921: note added");
    expect(prLog(repo.dir, ["921"], isolatedRunner, at, ZONE)).toBe("PR #921 babysit log · no babysit started\n21:18 note · test failure · ours");
  });

  test("no target is the current branch's PR", () => {
    repo = repoWithOrigin("spec-pr-log-branch-");
    const runner = withGh([[["gh", "pr", "view"], { stdout: JSON.stringify(prView({ number: 930 })) }]]);
    expect(prLog(repo.dir, ["--add", "stopped by hand"], runner, at)).toBe("PR #930: note added");
    expect(prLog(repo.dir, [], withGh([[["gh", "pr", "view"], { code: 1, stderr: "no pull requests found" }]]), at)).toBe("pr log: no pull requests found");
  });

  test("refuses an empty note and unknown flags", () => {
    repo = repoWithOrigin("spec-pr-log-usage-");
    expect(prLog(repo.dir, ["921", "--add", " "], isolatedRunner, at)).toBe("pr log: --add needs the note's text");
    expect(prLog(repo.dir, ["921", "--tail"], isolatedRunner, at)).toBe(`usage: ${PR_LOG_USAGE}`);
  });
});
