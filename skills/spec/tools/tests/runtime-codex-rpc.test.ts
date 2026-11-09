import { afterEach, expect, test } from "bun:test";
import { join } from "node:path";
import { connectProbeRpc } from "../runtime/codex/probe-rpc";
import { createTree } from "./tree";

const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).reverse().forEach((stop) => stop()));

test("probe RPC distinguishes server requests and notifications from responses sharing an ID", async () => {
  const tree = createTree("probe-rpc-");
  cleanup.push(tree.cleanup);
  const socket = join(tree.root, "rpc.sock");
  const frames: Record<string, unknown>[] = [];
  const server = Bun.serve({
    unix: socket,
    fetch(request, server) { return server.upgrade(request) ? undefined : new Response("bad", { status: 400 }); },
    websocket: {
      message(ws, data) {
        const request = JSON.parse(String(data));
        if (request.method === "initialize") ws.send(JSON.stringify({ id: request.id, result: {} }));
        if (request.method === "thread/read") {
          ws.send(JSON.stringify({ id: request.id, method: "item/tool/requestUserInput", params: { threadId: "owned", turnId: "turn", isBlocking: true } }));
          ws.send(JSON.stringify({ method: "thread/status/changed", params: { threadId: "owned", status: { type: "active", activeFlags: ["waitingOnUserInput"] } } }));
          ws.send(JSON.stringify({ id: request.id, result: { thread: { id: "owned" } } }));
        }
      },
    },
  });
  cleanup.push(() => server.stop(true));
  const result = await connectProbeRpc({ url: `ws+unix://${socket}`, timeoutMs: 500 }, (frame) => frames.push(frame));
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  cleanup.push(result.value.close);
  expect(await result.value.request("thread/read", { threadId: "owned" })).toEqual({ ok: true, value: { thread: { id: "owned" } } });
  expect(frames.map((f) => f.method)).toEqual(["item/tool/requestUserInput", "thread/status/changed"]);
  expect(frames[0]?.id).toBe(2);
});

test("probe RPC refuses public endpoints before any native request", async () => {
  expect(await connectProbeRpc({ url: "ws://public.example/rpc", timeoutMs: 500 }, () => {})).toEqual({ ok: false, reason: "unsupported Codex probe endpoint or deadline" });
});
