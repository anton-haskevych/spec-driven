import type { AnswerReply } from "./answer";
import type { PageModel } from "./model";
import type { Refresher } from "./refresh";
import { renderApp, renderPage } from "./render";

export const HOST = "127.0.0.1";
export const IDLE_EXIT_MS = 2 * 60 * 60_000;
const MAX_BODY_BYTES = 8_192;
const encoder = new TextEncoder();

export interface PageServerDeps {
  port: number;
  version: string;
  refresher: Refresher;
  answer(body: unknown): Promise<AnswerReply>;
  tickMs: number;
  onIdle(): void;
  idleExitMs?: number;
  now?: () => number;
}

export interface PageServer {
  url: string;
  port: number;
  cycle(): Promise<void>;
  stop(): void;
}

type Client = ReadableStreamDefaultController<Uint8Array>;

// A web page the user visits can post to 127.0.0.1 too, and a rebinding DNS name can pose as it: the one
// write is taken only from this server's own address, as JSON.
export function originRefusal(headers: Headers, port: number): string | undefined {
  const own = [`${HOST}:${port}`, `localhost:${port}`];
  if (!own.includes(headers.get("host") ?? "")) return "not this page's address";
  const origin = headers.get("origin");
  if (origin !== null && !own.some((host) => origin === `http://${host}`)) return "not sent from this page";
  if (!(headers.get("content-type") ?? "").startsWith("application/json")) return "an answer is sent as JSON";
  if (Number(headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return "too long";
  return undefined;
}

export async function startPageServer(deps: PageServerDeps): Promise<PageServer> {
  const now = deps.now ?? Date.now;
  const clients = new Set<Client>();
  let lastOpen = now();
  await deps.refresher.tick();

  const send = (event: string, data: string) => {
    const chunk = encoder.encode(`event: ${event}\ndata: ${data}\n\n`);
    for (const client of clients) {
      try {
        client.enqueue(chunk);
      } catch {
        clients.delete(client);
      }
    }
  };

  const cycle = async () => {
    const result = await deps.refresher.tick();
    if (result.kind === "rebuilt") send("render", JSON.stringify(renderApp(result.model)));
    else send("tick", String(now()));
    if (clients.size > 0) lastOpen = now();
    else if (now() - lastOpen >= (deps.idleExitMs ?? IDLE_EXIT_MS)) deps.onIdle();
  };

  const server = Bun.serve({
    hostname: HOST,
    port: deps.port,
    development: false,
    routes: {
      "/": () => html(deps.refresher.current()),
      "/model.json": () => Response.json(deps.refresher.current() ?? null, { headers: { "Cache-Control": "no-store" } }),
      "/health": () => Response.json({ ok: true, pid: process.pid, version: deps.version }),
      "/events": (req, srv) => {
        srv.timeout(req, 0);
        lastOpen = now();
        return events(req, clients);
      },
      "/answer": {
        POST: async (req) => {
          const refusal = originRefusal(req.headers, server.port ?? deps.port);
          if (refusal) return Response.json({ ok: false, line: `Refused: ${refusal}.` }, { status: 403 });
          const body = await req.json().catch(() => undefined);
          const reply = await deps.answer(body);
          deps.refresher.rebuildNext();
          void cycle();
          return Response.json(reply.body, { status: reply.status });
        },
      },
    },
    fetch: () => new Response("Not found", { status: 404 }),
  });

  const timer = setInterval(() => void cycle(), deps.tickMs);
  return {
    url: `http://${HOST}:${server.port}`,
    port: server.port ?? deps.port,
    cycle,
    stop: () => {
      clearInterval(timer);
      for (const client of clients) closeQuietly(client);
      clients.clear();
      void server.stop(true);
    },
  };
}

function html(model: PageModel | undefined): Response {
  const body = model ? renderPage(model) : "<!doctype html><title>Live board</title><p>Loading the board…</p><script>setTimeout(() => location.reload(), 3000)</script>";
  return new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

function events(req: Request, clients: Set<Client>): Response {
  let own: Client | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      own = controller;
      clients.add(controller);
      controller.enqueue(encoder.encode(`retry: 3000\nevent: tick\ndata: ${Date.now()}\n\n`));
      req.signal.addEventListener("abort", () => {
        clients.delete(controller);
        closeQuietly(controller);
      });
    },
    cancel() {
      if (own) clients.delete(own);
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
}

function closeQuietly(client: Client): void {
  try {
    client.close();
  } catch {
    return;
  }
}
