import { describe, expect, test } from "bun:test";
import { LOG_LINES, newRunFile, parseRunFile, withLaunched, withLog, withOverseer } from "../crew/run-state";

const RUN = `---
overseer: 4efef1e3-0f75-4623-beeb-95b1e6509824
started: 2026-10-12T21:00:00-07:00
state: running
workers: 2
babysitters: 1
cli: 2.1.296
---

## Launched
- f1a579ba · checkout execute 1 · 2026-10-12T21:04:00-07:00
- a41317ec · checkout babysit B · 2026-10-12T21:30

## Questions
- [q1] checkout 2 · asked 2026-10-12T21:40 · "Parking notes?" · recommend no
  - answer 2026-10-12T21:52 (Anton): "no, later"
- [q2] billing 3 · asked 2026-10-12T22:00 · "Which provider?" · recommend Stripe

## Stood down

## Log
- 2026-10-12T21:51 checkout 1 done · close-out ok · stopped 510ad568
`;

describe("parseRunFile", () => {
  test("reads the overseer, caps, launched sessions and unanswered questions", () => {
    const run = parseRunFile(RUN);
    expect(run.overseer).toBe("4efef1e3-0f75-4623-beeb-95b1e6509824");
    expect(run.state).toBe("running");
    expect(run.caps).toEqual({ workers: 2, babysitters: 1 });
    expect(run.launched).toEqual([
      { id: "f1a579ba", title: "checkout execute 1", at: "2026-10-12T21:04:00-07:00" },
      { id: "a41317ec", title: "checkout babysit B", at: "2026-10-12T21:30" },
    ]);
    expect(run.unanswered).toEqual([{ id: "q2", spec: "billing", phase: "3" }]);
  });

  test("missing caps fall back to 3 workers and 2 babysitters; no sections read as empty", () => {
    const run = parseRunFile("---\noverseer: x\n---\n");
    expect(run.caps).toEqual({ workers: 3, babysitters: 2 });
    expect(run.launched).toEqual([]);
    expect(run.unanswered).toEqual([]);
  });
});

describe("writers", () => {
  test("withLaunched rewrites only that section; Questions stay byte-identical", () => {
    const text = withLaunched(RUN, [{ id: "f1a579ba", title: "checkout execute 1", at: "2026-10-12T21:04:00-07:00" }]);
    expect(parseRunFile(text).launched.map((entry) => entry.id)).toEqual(["f1a579ba"]);
    expect(text).toContain(RUN.slice(RUN.indexOf("## Questions"), RUN.indexOf("## Log")));
  });

  test("withLaunched adds the section when the file has none", () => {
    const text = withLaunched("---\noverseer: x\n---\n", [{ id: "a1", title: "s execute 1", at: "t" }]);
    expect(parseRunFile(text).launched).toEqual([{ id: "a1", title: "s execute 1", at: "t" }]);
  });

  test("withLog appends and keeps the last 30 lines", () => {
    let text = RUN;
    for (let index = 0; index < LOG_LINES + 5; index += 1) text = withLog(text, [`line ${index}`]);
    const log = text.slice(text.indexOf("## Log")).trim().split("\n").slice(1);
    expect(log).toHaveLength(LOG_LINES);
    expect(log.at(-1)).toBe(`- line ${LOG_LINES + 4}`);
  });

  test("withOverseer replaces the id in the frontmatter", () => {
    expect(parseRunFile(withOverseer(RUN, "48777164-0d07")).overseer).toBe("48777164-0d07");
  });

  test("newRunFile carries the overseer, caps and every section", () => {
    const text = newRunFile({ overseer: "abc", started: "2026-10-12T21:00:00-07:00", caps: { workers: 4, babysitters: 1 }, cli: "2.1.296" });
    const run = parseRunFile(text);
    expect(run).toMatchObject({ overseer: "abc", state: "running", caps: { workers: 4, babysitters: 1 }, launched: [] });
    for (const heading of ["## Launched", "## Questions", "## Stood down", "## Log"]) expect(text).toContain(heading);
  });
});
