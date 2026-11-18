import { describe, expect, test } from "bun:test";
import { MACHINE_WORKERS, machineFree, machineWorkers } from "../crew/machine";
import type { Agent } from "../sessions/agents";

const agent = (name: string | undefined, state: Agent["state"]): Agent => ({ sessionId: "s", cwd: "/w", kind: "background", state, ...(name ? { name } : {}) });

describe("machineWorkers", () => {
  test("counts execute workers that are working or blocked, in any repo; done, stopped, babysitters and others hold no slot", () => {
    const agents = [
      agent("checkout execute 1", "working"),
      agent("billing execute 3a", "blocked"),
      agent("crm-other execute 2", "working"),
      agent("checkout execute 2", "done"),
      agent("checkout execute 4", "stopped"),
      agent("checkout babysit A", "working"),
      agent("repo oversee-crew", "working"),
      agent(undefined, "working"),
    ];
    expect(machineWorkers(agents)).toBe(3);
  });

  test("the limit is 6, and what is free never goes below zero", () => {
    expect(MACHINE_WORKERS).toBe(6);
    expect([machineFree(2), machineFree(6), machineFree(9)]).toEqual([4, 0, 0]);
  });
});
