import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { connectReadOnly } from "../runtime/codex/transport";
import { createTree, type Tree } from "./tree";

let tree: Tree;
const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).forEach((stop) => stop()); tree?.cleanup(); });

function endpoint(reply: (request: Record<string, unknown>) => unknown, token?: string): { url: string; calls: Record<string, unknown>[] } {
  tree = createTree("runtime-ws-");
  const calls: Record<string, unknown>[] = [];
  const socket = join(tree.root, "rpc.sock");
  const server = Bun.serve({
    unix: socket,
    fetch(request, server) {
      if (token && request.headers.get("authorization") !== `Bearer ${token}`) return new Response("unauthorized", { status: 401 });
      return server.upgrade(request) ? undefined : new Response("bad handshake", { status: 400 });
    },
    websocket: {
      message(ws, message) {
        const request = JSON.parse(String(message));
        calls.push(request);
        const response = reply(request);
        if (response !== undefined) ws.send(typeof response === "string" ? response : JSON.stringify(response));
      },
    },
  });
  cleanup.push(() => server.stop(true));
  return { url: `ws+unix://${socket}`, calls };
}

const successful = (r: Record<string, unknown>) => r.id === undefined ? undefined : { id: r.id, result: r.method === "initialize" ? { userAgent: "codex/0.167.0" } : { data: ["own"], nextCursor: null } };

describe("bounded read-only native transport", () => {
  test("uses Unix HTTP Upgrade, initialize/initialized, bearer auth and correlated results", async () => {
    const server = endpoint(successful, "fixture-token");
    const connected = await connectReadOnly({ url: server.url, bearerToken: "fixture-token", timeoutMs: 500 });
    expect(connected.ok).toBe(true);
    if (!connected.ok) return;
    cleanup.push(connected.value.close);
    expect(await connected.value.request("thread/loaded/list", { limit: 1 })).toEqual({ ok: true, value: { data: ["own"], nextCursor: null } });
    expect(server.calls.map((r) => r.method)).toEqual(["initialize", "initialized", "thread/loaded/list"]);
    expect(server.calls[0]?.params).toMatchObject({ clientInfo: { name: "spec-driven-capability-probe", version: "1" } });
  });

  test("refuses every write before sending it", async () => {
    const server = endpoint(successful);
    const connected = await connectReadOnly({ url: server.url, timeoutMs: 500 });
    expect(connected.ok).toBe(true);
    if (!connected.ok) return;
    cleanup.push(connected.value.close);
    for (const method of ["thread/start", "turn/start", "turn/interrupt", "thread/archive", "plugin/install", "initialize"]) {
      expect((await connected.value.request(method, {})).ok).toBe(false);
    }
    expect(server.calls.filter((r) => r.id !== undefined).map((r) => r.method)).toEqual(["initialize"]);
  });

  test("returns typed failures on malformed data and lost connection", async () => {
    const server = endpoint((r) => r.method === "initialize" ? successful(r) : r.id === undefined ? undefined : "{half");
    const connected = await connectReadOnly({ url: server.url, timeoutMs: 500 });
    expect(connected.ok).toBe(true);
    if (!connected.ok) return;
    cleanup.push(connected.value.close);
    expect(await connected.value.request("thread/read", { threadId: "own" })).toEqual({ ok: false, reason: "invalid Codex RPC frame" });
    expect((await connected.value.request("thread/read", {})).ok).toBe(false);
  });

  test("RPC errors and rejected handshake never become empty success", async () => {
    const server = endpoint((r) => r.method === "initialize" ? successful(r) : r.id === undefined ? undefined : { id: r.id, error: { code: -32601, message: "unsupported" } }, "fixture-token");
    expect((await connectReadOnly({ url: server.url, timeoutMs: 500 })).ok).toBe(false);
    const connected = await connectReadOnly({ url: server.url, bearerToken: "fixture-token", timeoutMs: 500 });
    expect(connected.ok).toBe(true);
    if (!connected.ok) return;
    cleanup.push(connected.value.close);
    expect(await connected.value.request("thread/read", {})).toEqual({ ok: false, reason: "Codex RPC error -32601" });
  });

  test("a silent peer times out rather than reporting empty success", async () => {
    const server = endpoint(() => undefined);
    expect(await connectReadOnly({ url: server.url, timeoutMs: 30 })).toEqual({ ok: false, reason: "Codex RPC timed out" });
  });

  test("unsupported network endpoints and invalid bounds refuse before connection", async () => {
    expect((await connectReadOnly({ url: "ws://public.example/rpc", timeoutMs: 500 })).ok).toBe(false);
    expect((await connectReadOnly({ url: "ws+unix:///unused", timeoutMs: 0 })).ok).toBe(false);
  });
});
