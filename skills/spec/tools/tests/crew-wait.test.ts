import { describe, expect, test } from "bun:test";
import { crewWait } from "../commands/crew/wait";
import { fakeClock } from "./fake-clock";
import { sequencedRunner } from "./stub-runner";

const roster = (...rows: Array<[string, string, string?]>) => ({
  stdout: JSON.stringify(rows.map(([id, state, waitingFor]) => ({ id, sessionId: `${id}-full`, cwd: "/t", kind: "background", state, ...(waitingFor ? { waitingFor } : {}) }))),
});

describe("crew wait", () => {
  test("exits on the first change with its line", async () => {
    const runner = sequencedRunner([[["claude", "agents"], [roster(["a1", "working"], ["b2", "working"]), roster(["a1", "working"], ["b2", "working"]), roster(["a1", "done"], ["b2", "working"])]]]);
    const clock = fakeClock();
    expect(await crewWait("/repo", ["a1", "b2"], { runner, clock })).toBe("a1 done");
    expect(clock.sleeps).toEqual([20_000, 20_000]);
  });

  test("a launched id missing from the roster exits at once as gone", async () => {
    const runner = sequencedRunner([[["claude", "agents"], [roster(["a1", "working"])]]]);
    expect(await crewWait("/repo", ["a1", "b2"], { runner, clock: fakeClock() })).toBe("b2 gone");
  });

  test("a failed poll is skipped, never read as everyone gone", async () => {
    const runner = sequencedRunner([[["claude", "agents"], [roster(["a1", "working"]), { code: 1, stderr: "service restarting" }, roster(["a1", "blocked", "permission prompt"])]]]);
    expect(await crewWait("/repo", ["a1"], { runner, clock: fakeClock() })).toBe("a1 blocked (permission prompt)");
  });

  test("no change by the timeout is the heartbeat", async () => {
    const runner = sequencedRunner([[["claude", "agents"], [roster(["a1", "working"])]]]);
    const clock = fakeClock();
    expect(await crewWait("/repo", ["a1", "--timeout", "1m", "--interval", "20s"], { runner, clock })).toBe("heartbeat");
    expect(clock.now()).toBe(60_000);
  });

  test("ids are argv words, never a shell-split string; none is a usage line", async () => {
    const runner = sequencedRunner([[["claude", "agents"], [roster(["a1", "working"])]]]);
    expect(await crewWait("/repo", ["a1 b2"], { runner, clock: fakeClock() })).toBe("crew wait: not a session id: a1 b2");
    expect(await crewWait("/repo", [], { runner, clock: fakeClock() })).toStartWith("usage: crew wait");
    expect(await crewWait("/repo", ["a1", "--timeout", "soon"], { runner, clock: fakeClock() })).toBe("crew wait: --timeout and --interval take a duration like 30m, 20s or 1h");
  });
});
