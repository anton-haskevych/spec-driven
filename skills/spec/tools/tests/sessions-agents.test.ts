import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { loadAgents, ownedAgents, parseAgents } from "../sessions/agents";
import { stubRunner } from "./stub-runner";

const fixture = () => Bun.file(join(import.meta.dir, "fixtures", "claude-agents.json")).text();

describe("parseAgents", () => {
  test("reads each session's id, state and what it waits for", async () => {
    const parsed = parseAgents(await fixture());
    if (!parsed.ok) throw new Error(parsed.reason);
    expect(parsed.value).toHaveLength(5);
    expect(parsed.value[3]).toEqual({
      id: "a41317ec",
      sessionId: "a41317ec-2fd1-4617-af1a-23f1136724df",
      name: "checkout execute 2",
      cwd: "/trees/checkout-pr-b",
      kind: "background",
      pid: 74912,
      status: "busy",
      state: "blocked",
      waitingFor: "permission prompt",
    });
  });

  test("an interactive session has no short id and no state; a stopped background one has no pid", async () => {
    const parsed = parseAgents(await fixture());
    if (!parsed.ok) throw new Error(parsed.reason);
    expect(parsed.value[1]).toMatchObject({ kind: "interactive", status: "idle" });
    expect(parsed.value[1]?.id).toBeUndefined();
    expect(parsed.value[1]?.state).toBeUndefined();
    expect(parsed.value[0]?.pid).toBeUndefined();
  });

  test("a state this reader doesn't know reads unknown, so nobody acts on it", () => {
    const parsed = parseAgents(JSON.stringify([{ id: "x1", sessionId: "x1-1", cwd: "/repo", kind: "background", state: "napping" }]));
    expect(parsed.ok && parsed.value[0]?.state).toBe("unknown");
  });

  test("anything but an array of sessions is refused, not read as empty", () => {
    expect(parseAgents("{}")).toEqual({ ok: false, reason: "claude agents --json printed no session list" });
    expect(parseAgents("not json").ok).toBe(false);
  });
});

describe("ownedAgents", () => {
  test("keeps only sessions inside this repo's worktrees", async () => {
    const parsed = parseAgents(await fixture());
    if (!parsed.ok) throw new Error(parsed.reason);
    const names = ownedAgents(parsed.value, ["/repo", "/trees/checkout-pr-a", "/trees/checkout-pr-b"]).map((agent) => agent.name);
    expect(names).toEqual(["bg-launch-probe", "repo-93", "checkout execute 1", "checkout execute 2"]);
  });
});

describe("loadAgents", () => {
  test("runs claude agents --json --all", async () => {
    const runner = stubRunner([[["claude", "agents"], { stdout: await fixture() }]]);
    const loaded = loadAgents(runner);
    expect(runner.calls[0]).toEqual(["claude", "agents", "--json", "--all"]);
    expect(loaded.ok && loaded.value).toHaveLength(5);
  });

  test("a failed run is a refusal with claude's first stderr line", () => {
    const runner = stubRunner([[["claude", "agents"], { code: 1, stderr: "service down\nmore" }]]);
    expect(loadAgents(runner)).toEqual({ ok: false, reason: "claude agents failed: service down" });
  });
});
