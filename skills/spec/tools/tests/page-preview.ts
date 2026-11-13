import { refresher } from "../page/refresh";
import { startPageServer } from "../page/server";
import { pageModel } from "./page-fixture";

// For looking at the page in a browser with factory data: `bun skills/spec/tools/tests/page-preview.ts [port]`.
const port = Number(Bun.argv[2] ?? 41_960);
const server = await startPageServer({
  port,
  version: "preview",
  refresher: refresher({ readTip: () => "t1", buildModel: async () => ({ ok: true, value: pageModel() }), now: Date.now }),
  answer: async () => ({ status: 200, body: { ok: true, line: "question: q12 answered (preview, nothing written)" } }),
  tickMs: 5_000,
  onIdle: () => process.exit(0),
});
console.log(`page preview: ${server.url}`);
