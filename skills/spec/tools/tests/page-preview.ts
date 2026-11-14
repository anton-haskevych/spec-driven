import { answerFromPage } from "../page/answer";
import { refresher } from "../page/refresh";
import { startPageServer } from "../page/server";
import { validateRecordDoc } from "../plan/kinds";
import { parseDoc } from "../record/document";
import { sendIntent } from "../record/outbox";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeRecord, seedRecord } from "./fake-record";
import { pageDocs, pageInputs, pageModel } from "./page-fixture";

// The page with factory data on an in-memory record, for looking at it in a browser: answers really land
// there, so the loop shows end to end. `bun skills/spec/tools/tests/page-preview.ts [port]`.
const port = Number(Bun.argv[2] ?? 41_960);
const record = fakeRecord();
seedRecord(record, pageDocs());
const outbox = join(mkdtempSync(join(tmpdir(), "spec-page-preview-")), "outbox");
const docsAtTip = () => Object.fromEntries([...record.filesAt(record.tip)].map(([path, text]) => [path, parseDoc(text)]));

const server = await startPageServer({
  port,
  version: "preview",
  refresher: refresher({ readTip: () => record.tip, buildModel: async () => ({ ok: true, value: pageModel(pageInputs(docsAtTip())) }), now: Date.now }),
  answer: (body) =>
    answerFromPage(body, {
      send: (intent, plan) => sendIntent(record, outbox, { session: undefined, command: "answer", args: intent }, {}, { validate: validateRecordDoc }, new Date(), plan),
      by: "Anton",
      now: () => new Date(),
    }),
  tickMs: 5_000,
  onIdle: () => process.exit(0),
});
console.log(`page preview: ${server.url}`);
