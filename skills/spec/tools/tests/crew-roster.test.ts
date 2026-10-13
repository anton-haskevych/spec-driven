import { describe, expect, test } from "bun:test";
import { rosterChange, rosterSnapshot } from "../crew/roster";
import type { Agent } from "../sessions/agents";

const agent = (id: string, state: Agent["state"], waitingFor?: string): Agent => ({
  id,
  sessionId: `${id}-full`,
  cwd: "/trees/x",
  kind: "background",
  state,
  ...(waitingFor ? { waitingFor } : {}),
});

describe("rosterSnapshot", () => {
  test("one line per launched id, in the roster wait's format; other sessions are ignored", () => {
    const snapshot = rosterSnapshot([agent("a1", "working"), agent("b2", "blocked", "permission prompt"), agent("zz", "done")], ["a1", "b2"]);
    expect([...snapshot.entries()]).toEqual([
      ["a1", "a1 working"],
      ["b2", "b2 blocked (permission prompt)"],
    ]);
  });
});

describe("rosterChange", () => {
  const ids = ["a1", "b2"];
  const before = rosterSnapshot([agent("a1", "working"), agent("b2", "working")], ids);

  test("nothing changed: no lines", () => {
    expect(rosterChange(before, rosterSnapshot([agent("a1", "working"), agent("b2", "working")], ids), ids)).toEqual([]);
  });

  test("a changed state prints the new line", () => {
    expect(rosterChange(before, rosterSnapshot([agent("a1", "done"), agent("b2", "working")], ids), ids)).toEqual(["a1 done"]);
  });

  test("a launched id missing from the roster is gone, first", () => {
    expect(rosterChange(before, rosterSnapshot([agent("a1", "done")], ids), ids)).toEqual(["b2 gone", "a1 done"]);
  });

  test("with no earlier snapshot only gone ids count", () => {
    expect(rosterChange(undefined, rosterSnapshot([agent("a1", "done")], ids), ids)).toEqual(["b2 gone"]);
  });
});
