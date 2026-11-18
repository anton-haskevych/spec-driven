import { afterEach, describe, expect, test } from "bun:test";
import { overseerNoticeFor, withOverseerNotice } from "../commands/phase/overseer-notice";
import { newRunFile } from "../crew/run-state";
import { appendNotice, type PhaseOutcome, type PhaseWriter } from "../plan/phase-writer";
import type { LiveSession } from "../sessions/live";
import { gitStub } from "./stub-runner";
import { liveSession } from "./factories";
import { createTree, type Tree } from "./tree";

const LANDED: PhaseOutcome = { kind: "landed", line: "add: phase 4 added" };
const NOTICE = 'Notice: alpha is overseen by 9a8b7c6d; tell it about this change (SendMessage "alpha oversee-crew")';
const OTHER = "9a8b7c6d";

function writerAnswering(outcome: PhaseOutcome | Promise<PhaseOutcome>): PhaseWriter {
  const answer = () => outcome;
  return { tick: answer, park: answer, unpark: answer, deployed: answer, add: answer, split: answer, move: answer, set: answer, task: answer, note: answer };
}

describe("appendNotice", () => {
  test("adds a line under the notice already there instead of replacing it", () => {
    expect(appendNotice({ ...LANDED, notice: "upgrade: record layout 4" }, "Plan changed")).toEqual({ ...LANDED, notice: "upgrade: record layout 4\nPlan changed" });
    expect(appendNotice(LANDED, "Plan changed")).toEqual({ ...LANDED, notice: "Plan changed" });
  });
});

describe("the overseer notice on plan writes", () => {
  const asked: string[] = [];
  const overseerOf = (spec: string) => {
    asked.push(spec);
    return OTHER;
  };

  test("a plan-shape write that landed or queued names the overseer; ticks, notes, parks and deploys never ask", async () => {
    const writer = withOverseerNotice(writerAnswering(LANDED), "alpha", overseerOf);
    for (const action of ["add", "split", "move", "set", "task"] as const) expect(await writer[action]({} as never)).toEqual({ ...LANDED, notice: NOTICE });
    asked.length = 0;
    for (const action of ["tick", "note", "park", "unpark", "deployed"] as const) expect(await writer[action]({} as never)).toEqual(LANDED);
    expect(asked).toEqual([]);
    expect(await withOverseerNotice(writerAnswering(Promise.resolve({ kind: "queued", pending: 2 })), "alpha", overseerOf).set({} as never)).toEqual({ kind: "queued", pending: 2, notice: NOTICE });
  });

  test("a refused or invalid write, or a spec nobody oversees, says nothing more", async () => {
    expect(await withOverseerNotice(writerAnswering({ kind: "refused", reason: "x" }), "alpha", overseerOf).add({} as never)).toEqual({ kind: "refused", reason: "x" });
    expect(await withOverseerNotice(writerAnswering(LANDED), "alpha", () => undefined).add({} as never)).toEqual(LANDED);
  });
});

describe("overseerNoticeFor", () => {
  let tree: Tree;
  afterEach(() => tree?.cleanup());
  const runner = () => gitStub({ commonDir: `${tree.root}/.git`, toplevel: tree.root });

  function lookup(own: string, sessions: LiveSession[] | undefined) {
    let loaded = 0;
    const of = overseerNoticeFor(tree.root, { runner: runner(), env: { CLAUDE_CODE_SESSION_ID: own } }, () => {
      loaded += 1;
      return sessions ? { ok: true, value: sessions } : { ok: false, reason: "ps failed" };
    });
    return { of, loads: () => loaded };
  }

  test("names a live overseer that isn't this session; liveness is read only once a run file is found", () => {
    tree = createTree("phase-notice-");
    tree.write(".git/spec-board/crew/run-alpha.md", newRunFile({ spec: "alpha", overseer: OTHER, runner: "anton", started: "t", caps: { workers: 1, babysitters: 1 } }));
    const fromWorker = lookup("worker-1", [liveSession({ sessionId: OTHER })]);
    expect(fromWorker.of("alpha")).toBe(OTHER);
    expect(fromWorker.of("beta")).toBeUndefined();
    expect(fromWorker.loads()).toBe(1);
    expect(lookup(OTHER, [liveSession({ sessionId: OTHER })]).of("alpha")).toBeUndefined();
    expect(lookup("worker-1", []).of("alpha")).toBeUndefined();
    expect(lookup("worker-1", undefined).of("alpha")).toBeUndefined();
  });

  test("a parked overseer tab counts as the session it parked into", () => {
    tree = createTree("phase-notice-");
    tree.write(".git/spec-board/crew/run-alpha.md", newRunFile({ spec: "alpha", overseer: "4efef1e3-old", runner: "anton", started: "t", caps: { workers: 1, babysitters: 1 } }));
    const sessions = [liveSession({ sessionId: "4efef1e3-old", parkedJobId: "48777164" }), liveSession({ sessionId: "48777164-new" })];
    expect(lookup("48777164-new", sessions).of("alpha")).toBeUndefined();
    expect(lookup("worker-1", sessions).of("alpha")).toBe("48777164-new");
  });
});
