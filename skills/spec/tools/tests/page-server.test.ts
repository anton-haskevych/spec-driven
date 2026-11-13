import { afterEach, describe, expect, test } from "bun:test";
import type { AnswerReply } from "../page/answer";
import { refresher } from "../page/refresh";
import { originRefusal, startPageServer, type PageServer } from "../page/server";
import { pageModel } from "./page-fixture";

const decoder = new TextDecoder();

async function readEvents(response: Response, count: number): Promise<string[]> {
  const reader = response.body?.getReader();
  const events: string[] = [];
  let buffer = "";
  while (reader && events.length < count) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value);
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    events.push(...parts);
  }
  await reader?.cancel();
  return events;
}

describe("the page server", () => {
  let server: PageServer | undefined;
  let tip = "t1";
  let idle = 0;
  let clock = 0;
  const answers: unknown[] = [];
  const start = (answer: AnswerReply = { status: 200, body: { ok: true, line: "question: q12 answered" } }) => {
    [clock, tip] = [0, "t1"];
    return startPageServer({
      port: 0,
      version: "9.9.9",
      refresher: refresher({ readTip: () => tip, buildModel: async () => ({ ok: true, value: pageModel() }), now: () => clock }),
      answer: async (body) => (answers.push(body), answer),
      tickMs: 60_000,
      onIdle: () => idle++,
      idleExitMs: 1_000,
      now: () => clock,
    });
  };
  afterEach(() => server?.stop());

  test("serves the page, its model and its health on 127.0.0.1", async () => {
    server = await start();
    expect(server.url).toStartWith("http://127.0.0.1:");
    const page = await fetch(server.url);
    expect(page.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await page.text()).toContain("<title>(");
    expect(((await (await fetch(`${server.url}/model.json`)).json()) as { repo: string }).repo).toBe("crm");
    expect(await (await fetch(`${server.url}/health`)).json()).toEqual({ ok: true, pid: process.pid, version: "9.9.9" });
    expect((await fetch(`${server.url}/nope`)).status).toBe(404);
  });

  test("every cycle reaches open pages: a tick when nothing moved, a render when the tip did", async () => {
    server = await start();
    const stream = await fetch(`${server.url}/events`);
    clock = 5_000;
    await server.cycle();
    tip = "t2";
    await server.cycle();
    const events = await readEvents(stream, 3);
    expect(events[0]).toStartWith("retry: 3000\nevent: tick\n");
    expect(events[1]).toBe("event: tick\ndata: 5000");
    expect(events[2]).toStartWith('event: render\ndata: {"title":"(');
  });

  test("the answer is taken only as JSON from the page's own address", async () => {
    server = await start();
    const post = (headers: Record<string, string>) => fetch(`${server?.url}/answer`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ spec: "schedule-fixes", id: "q12", text: "No reset", ifVersion: "v" }) });
    expect((await post({ Origin: "https://evil.example" })).status).toBe(403);
    expect((await fetch(`${server.url}/answer`, { method: "POST", body: "text=No reset" })).status).toBe(403);
    expect(answers).toEqual([]);
    const ok = await post({ Origin: server.url });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true, line: "question: q12 answered" });
    expect(answers).toEqual([{ spec: "schedule-fixes", id: "q12", text: "No reset", ifVersion: "v" }]);
  });

  test("exits once no page has been open for the idle limit", async () => {
    server = await start();
    clock = 2_000;
    await server.cycle();
    expect(idle).toBe(1);
  });
});

test("own-origin rules", () => {
  const headers = (fields: Record<string, string>) => new Headers({ "content-type": "application/json", ...fields });
  expect(originRefusal(headers({ host: "127.0.0.1:4790" }), 4790)).toBeUndefined();
  expect(originRefusal(headers({ host: "localhost:4790", origin: "http://localhost:4790" }), 4790)).toBeUndefined();
  expect(originRefusal(headers({ host: "evil.example:4790" }), 4790)).toBe("not this page's address");
  expect(originRefusal(headers({ host: "127.0.0.1:4790", origin: "http://127.0.0.1:9999" }), 4790)).toBe("not sent from this page");
  expect(originRefusal(new Headers({ host: "127.0.0.1:4790", "content-type": "text/plain" }), 4790)).toBe("an answer is sent as JSON");
});
