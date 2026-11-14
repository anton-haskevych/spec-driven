import { describe, expect, test } from "bun:test";
import { gitAt } from "../core/git";
import { recordPortsOf, seamsOf, systemGitSeams } from "../core/git-seams";
import type { Runner } from "../core/run";
import { recordWorld } from "../plan/record-send";
import { phaseDeps } from "./command-deps";
import { fakeRecord, fakeRecordReadPort } from "./fake-record";
import { notARepoRunner, stubRunner } from "./stub-runner";

const NO_GIT: Runner = {
  run(argv) {
    throw new Error(`no git expected, got: ${argv.join(" ")}`);
  },
};

describe("seamsOf", () => {
  test("fills every seam a deps object leaves out with the system one", () => {
    expect(seamsOf({})).toEqual(systemGitSeams);
  });

  test("keeps the seams a deps object passes", () => {
    const recordPorts = () => undefined;
    expect(seamsOf({ seams: { recordPorts } }).recordPorts).toBe(recordPorts);
  });
});

describe("recordPortsOf", () => {
  test("hands back the injected ports without asking git anything", () => {
    const record = fakeRecord();
    const ports = { port: record, read: fakeRecordReadPort(record) };
    expect(recordPortsOf(gitAt("/nowhere", NO_GIT), { seams: { recordPorts: () => ports } })).toBe(ports);
  });

  test("a checkout without an origin has no record ports", () => {
    expect(recordPortsOf(gitAt("/nowhere", notARepoRunner), {})).toBeUndefined();
  });

  test("the system ports ask git for origin once for both the write and the read port", () => {
    const runner = stubRunner([[["git", "remote", "get-url", "origin"], { stdout: "/origin.git\n" }]]);
    const ports = recordPortsOf(gitAt("/checkout", runner), {});
    expect(ports?.port).toBeDefined();
    expect(ports?.read).toBeDefined();
    expect(runner.calls).toEqual([["git", "remote", "get-url", "origin"]]);
  });
});

describe("recordWorld", () => {
  test("writes through the injected port, even where no default branch is known", () => {
    const record = fakeRecord();
    const world = recordWorld("/checkout", phaseDeps({ runner: stubRunner([]), seams: { recordPorts: () => ({ port: record, read: fakeRecordReadPort(record) }) } }));
    expect(world.port).toBe(record);
    expect(world.defaultBranch).toBeUndefined();
  });
});
