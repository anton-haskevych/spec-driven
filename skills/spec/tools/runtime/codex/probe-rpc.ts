import { isRecord } from "../../core/frontmatter";
import type { Result } from "../../core/result";
import { parseJson } from "../../pr/gh-records";

export interface ProbeRpc {
  request(method: string, params: Record<string, unknown>): Promise<Result<unknown>>;
  close(): void;
}

export interface ConnectionOptions {
  url: string;
  bearerToken?: string;
  timeoutMs: number;
}

const MAX_FRAME_BYTES = 2 * 1024 * 1024;

export async function connectProbeRpc(options: ConnectionOptions & { experimentalApi?: true }, observe: (frame: Record<string, unknown>) => void): Promise<Result<ProbeRpc>> {
  if (!options.url.startsWith("ws+unix:///") || !Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > 30_000) {
    return { ok: false, reason: "unsupported Codex probe endpoint or deadline" };
  }
  const opened = await openSocket(options);
  if (!opened.ok) return opened;
  const client = rpcClient(opened.value, options.timeoutMs, observe);
  const initialized = await client.send("initialize", {
    clientInfo: { name: "spec-driven-capability-probe", version: "1" },
    ...(options.experimentalApi ? { capabilities: { experimentalApi: true } } : {}),
  });
  if (!initialized.ok || !isRecord(initialized.value)) {
    client.close();
    return initialized.ok ? { ok: false, reason: "invalid Codex initialize response" } : initialized;
  }
  try { opened.value.send(JSON.stringify({ method: "initialized" })); }
  catch { client.close(); return { ok: false, reason: "Codex initialization connection lost" }; }
  return { ok: true, value: { request: client.send, close: client.close } };
}

async function openSocket(options: ConnectionOptions): Promise<Result<WebSocket>> {
  const ready = Promise.withResolvers<Result<WebSocket>>();
  let socket: WebSocket;
  try {
    socket = new WebSocket(options.url, {
      perMessageDeflate: false,
      ...(options.bearerToken ? { headers: { Authorization: `Bearer ${options.bearerToken}` } } : {}),
    });
  } catch {
    return { ok: false, reason: "Codex socket construction failed" };
  }
  const deadline = AbortSignal.timeout(options.timeoutMs);
  const failed = () => ready.resolve({ ok: false, reason: "Codex socket connection failed" });
  const timedOut = () => ready.resolve({ ok: false, reason: "Codex RPC timed out" });
  socket.addEventListener("open", () => ready.resolve({ ok: true, value: socket }), { once: true });
  socket.addEventListener("error", failed);
  socket.addEventListener("close", failed);
  deadline.addEventListener("abort", timedOut, { once: true });
  const result = await ready.promise;
  deadline.removeEventListener("abort", timedOut);
  socket.removeEventListener("error", failed);
  socket.removeEventListener("close", failed);
  if (!result.ok) socket.terminate();
  return result;
}

function rpcClient(socket: WebSocket, timeoutMs: number, observe: (frame: Record<string, unknown>) => void) {
  const pending = new Map<number, (result: Result<unknown>) => void>();
  let nextId = 0;
  let closed = false;
  const fail = (reason: string) => {
    closed = true;
    for (const finish of pending.values()) finish({ ok: false, reason });
    pending.clear();
    socket.terminate();
  };
  socket.addEventListener("error", () => fail("Codex socket error"));
  socket.addEventListener("close", () => fail("Codex socket closed"));
  socket.addEventListener("message", ({ data }) => {
    const frame = typeof data === "string" && Buffer.byteLength(data) <= MAX_FRAME_BYTES ? parseJson(data) : undefined;
    if (!isRecord(frame)) return fail("invalid Codex RPC frame");
    if (typeof frame.method === "string") {
      try { observe(frame); }
      catch { fail("Codex probe observer failed"); }
      return;
    }
    if (typeof frame.id !== "number") return;
    const finish = pending.get(frame.id);
    if (!finish) return;
    pending.delete(frame.id);
    finish(rpcResult(frame));
  });
  const send = (method: string, params: Record<string, unknown>): Promise<Result<unknown>> => {
    if (closed || socket.readyState !== WebSocket.OPEN) return Promise.resolve({ ok: false, reason: "Codex socket closed" });
    const id = ++nextId;
    const reply = Promise.withResolvers<Result<unknown>>();
    const deadline = AbortSignal.timeout(timeoutMs);
    const timedOut = () => fail("Codex RPC timed out");
    deadline.addEventListener("abort", timedOut, { once: true });
    pending.set(id, reply.resolve);
    try { socket.send(JSON.stringify({ id, method, params })); }
    catch { fail("Codex RPC send failed"); }
    return reply.promise.finally(() => deadline.removeEventListener("abort", timedOut));
  };
  return { send, close: () => fail("Codex probe disconnected") };
}

function rpcResult(frame: Record<string, unknown>): Result<unknown> {
  if (isRecord(frame.error)) return { ok: false, reason: `Codex RPC error ${typeof frame.error.code === "number" ? frame.error.code : "unknown"}` };
  return "result" in frame ? { ok: true, value: frame.result } : { ok: false, reason: "invalid Codex RPC response" };
}
