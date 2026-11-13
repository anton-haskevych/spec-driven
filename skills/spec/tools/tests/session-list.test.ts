import { describe, expect, test } from "bun:test";
import { readSessions, sessionLine, sessionsOnSpec, SESSION_LISTED_HOURS } from "../sessions/list";
import { CLAUDE_CODE_SOURCE, sessionDocPath } from "../sessions/session-doc";
import { viewOf } from "./fake-record";
import { sessionDoc, specDoc } from "./record-factories";

const NOW = new Date("2026-11-13T18:00:00Z");
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString().replace(".000Z", "Z");
const ref = (id: string) => ({ source: CLAUDE_CODE_SOURCE, id });
const viewWith = (...docs: ReturnType<typeof sessionDoc>[]) => viewOf({ ...Object.fromEntries(docs.map((doc) => [sessionDocPath(doc.ref), doc])), "specs/checkout/spec.json": specDoc({ planVersion: 9 }) });

describe("readSessions", () => {
  test("reads every session document, newest write first, and leaves out one that doesn't read", () => {
    const view = viewOf({
      [sessionDocPath(ref("a"))]: sessionDoc({ ref: ref("a"), lastWriteAt: minutesAgo(30) }),
      [sessionDocPath(ref("b"))]: sessionDoc({ ref: ref("b"), lastWriteAt: minutesAgo(5) }),
      [sessionDocPath(ref("c"))]: { mode: 3 },
    });
    expect(readSessions(view).map((doc) => doc.ref.id)).toEqual(["b", "a"]);
  });
});

describe("sessionsOnSpec", () => {
  test("lists other sessions on the spec that wrote recently, with their mode", () => {
    const view = viewWith(
      sessionDoc({ ref: ref("me"), spec: "checkout", lastWriteAt: minutesAgo(1) }),
      sessionDoc({ ref: ref("rev"), spec: "checkout", mode: "review", lastWriteAt: minutesAgo(12) }),
      sessionDoc({ ref: ref("elsewhere"), spec: "other", lastWriteAt: minutesAgo(2) }),
      sessionDoc({ ref: ref("old"), spec: "checkout", lastWriteAt: minutesAgo(SESSION_LISTED_HOURS * 60 + 1) }),
    );
    expect(sessionsOnSpec(view, "checkout", ref("me"), NOW).map((doc) => doc.ref.id)).toEqual(["rev"]);
  });

  test("without an identity every session on the spec is listed", () => {
    const view = viewWith(sessionDoc({ ref: ref("a"), spec: "checkout", lastWriteAt: minutesAgo(3) }));
    expect(sessionsOnSpec(view, "checkout", undefined, NOW)).toHaveLength(1);
  });
});

describe("sessionLine", () => {
  test("names mode, person, machine, tree and how long ago it wrote", () => {
    const doc = sessionDoc({ ref: ref("rev"), spec: "checkout", mode: "execute", who: "Taras", host: "laptop", tree: "checkout-pr-b", lastWriteAt: minutesAgo(12) });
    expect(sessionLine(doc, NOW, 9)).toBe("Session: execute by Taras on laptop (tree checkout-pr-b), last wrote 12m ago");
  });

  test("a review or prep says it can change the plan", () => {
    const doc = sessionDoc({ ref: ref("rev"), mode: "review", lastWriteAt: minutesAgo(12) });
    expect(sessionLine(doc, NOW, 9)).toEndWith("— a review can change this spec's plan");
    expect(sessionLine({ ...doc, mode: "prep" }, NOW, 9)).toEndWith("— a prep can change this spec's plan");
  });

  test("a session on an older plan version says so", () => {
    const doc = sessionDoc({ ref: ref("a"), mode: "execute", planVersion: 7, lastWriteAt: minutesAgo(3) });
    expect(sessionLine(doc, NOW, 9)).toEndWith("· on plan v7, the plan is v9");
  });
});
