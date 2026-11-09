import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { probeCodex, type ProbeRequest } from "../runtime/codex/probe";
import type { ReadOnlyRpc } from "../runtime/codex/transport";
import type { Result } from "../core/result";
import { asyncStubRunner } from "./stub-runner";

interface Fixture {
  daemon: Record<string, unknown>;
  pages: Record<string, unknown>[];
  threads: Record<string, unknown>;
}
const fixture: Fixture = await Bun.file(join(import.meta.dir, "fixtures/codex-read-only.json")).json();
const request: ProbeRequest = { source: { runtime: "codex", key: "fixture-daemon" }, mode: "local-daemon", threadId: "own", cwd: "/work/assigned" };
const observedAt = "2026-11-09T04:00:00.000Z";

function setup(data: Fixture = fixture) {
  const runner = asyncStubRunner([[["codex", "app-server", "daemon", "version"], { stdout: JSON.stringify(data.daemon) }]]);
  const calls: { method: string; params: Record<string, unknown> }[] = [];
  let connections = 0;
  let closed = 0;
  let page = 0;
  const rpc: ReadOnlyRpc = {
    async request(method, params): Promise<Result<unknown>> {
      calls.push({ method, params });
      if (method === "thread/loaded/list") return { ok: true, value: data.pages[page++] };
      if (method === "thread/read") return { ok: true, value: data.threads[String(params.threadId)] };
      throw new Error(`unexpected write ${method}`);
    },
    close: () => { closed++; },
  };
  const deps = { runner, connect: async () => { connections++; return { ok: true, value: rpc } as const; }, observedAt };
  return { deps, calls, connections: () => connections, closed: () => closed };
}

describe("read-only Codex capability probe", () => {
  test("pages every loaded ID, correlates own ID/cwd and retains native attention", async () => {
    const harness = setup();
    const report = await probeCodex(request, harness.deps);
    expect(report.discovery.state).toBe("observed");
    expect(report.snapshot.coverage).toEqual([{ source: request.source, state: "complete" }]);
    expect(report.snapshot.sessions[1]).toMatchObject({
      ref: { source: request.source, id: "own" }, cwd: request.cwd, status: "busy", attention: "approval", observedAt,
    });
    expect(harness.calls).toEqual([
      { method: "thread/loaded/list", params: { limit: 100 } },
      { method: "thread/read", params: { threadId: "other", includeTurns: false } },
      { method: "thread/loaded/list", params: { limit: 100, cursor: "page-2" } },
      { method: "thread/read", params: { threadId: "own", includeTurns: false } },
    ]);
    expect(harness.closed()).toBe(1);
    expect(report.managed.map((c) => c.state)).toEqual(["unverified", "unverified", "unverified", "unverified"]);
  });

  test("unsupported environments and missing thread identity refuse before CLI/socket work", async () => {
    for (const mode of ["no-daemon", "remote", "cloud", "alternate-home"] as const) {
      const harness = setup();
      expect((await probeCodex({ ...request, mode }, harness.deps)).discovery.state).toBe("unsupported");
      expect(harness.deps.runner.calls).toEqual([]);
      expect(harness.connections()).toBe(0);
    }
    const harness = setup();
    expect((await probeCodex({ ...request, threadId: undefined }, harness.deps)).discovery.state).toBe("unverified");
    expect(harness.deps.runner.calls).toEqual([]);
  });

  test("version mismatch and undiscovered endpoints never connect", async () => {
    for (const daemon of [{ ...fixture.daemon, appServerVersion: "0.168.0" }, { ...fixture.daemon, socketPath: undefined }, { ...fixture.daemon, status: "stopped" }]) {
      const harness = setup({ ...fixture, daemon });
      expect((await probeCodex(request, harness.deps)).discovery.state).not.toBe("observed");
      expect(harness.connections()).toBe(0);
    }
  });

  test("partial pages preserve healthy rows but never certify complete coverage", async () => {
    for (const pages of [[fixture.pages[0]!, { data: [], nextCursor: "page-2" }], [fixture.pages[0]!, { data: "invalid" }]]) {
      const harness = setup({ ...fixture, pages });
      const report = await probeCodex(request, harness.deps);
      expect(report.snapshot.sessions).toHaveLength(1);
      expect(report.snapshot.coverage[0]?.state).toBe("unavailable");
      expect(report.discovery.state).toBe("unavailable");
      expect(harness.closed()).toBe(1);
    }
  });

  test("missing own ID, cwd mismatch and unknown native states never enable ownership", async () => {
    for (const threads of [
      { ...fixture.threads, own: { thread: { id: "own", cwd: request.cwd, updatedAt: 1794196800, status: { type: "new-state" } } } },
      { ...fixture.threads, own: { thread: { id: "own", cwd: "/other", updatedAt: 1794196800, status: { type: "idle" } } } },
    ]) {
      const report = await probeCodex(request, setup({ ...fixture, threads }).deps);
      expect(report.discovery.state).not.toBe("observed");
      expect(report.managed.every((c) => c.state === "unverified")).toBe(true);
    }
    const report = await probeCodex(request, setup({ ...fixture, pages: [{ data: [], nextCursor: null }] }).deps);
    expect(report.discovery.state).toBe("unverified");
  });
});
